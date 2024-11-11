import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import psutil
import pytz
from syftbox.lib import Client, SyftPermission

from sdk import (
    Settings,
    datasites_file_glob,
    ensure,
    public_url,
    should_run,
    truncate_file,
)

# define version for future changes
__version__ = "1.0.0"
__author__ = "madhava@openmined.org"

# load client
try:
    client = Client.load()
except Exception:
    # temp work around for old syftbox
    config_path = os.path.expanduser("~/.syftbox/config.json")

    with open(config_path, "r") as f:
        data = json.load(f)

    data["sync_folder"] = data["data_dir"] + "/datasites"
    data["config_path"] = config_path
    del data["data_dir"]
    del data["client_url"]
    client = Client(**data)

# settings
settings = Settings()
last_run = settings.get("last_run", None)
settings.set("last_run", datetime.now().isoformat())

# do something on first install
if last_run is None:
    print("First run.")


# define paths
DATASITES = Path(client.sync_folder)
MY_DATASITE = DATASITES / client.email

PUBLIC_PATH = MY_DATASITE / "public"

METRIC_STUB = "metrics/ftop.jsonl"
METRIC_FILE_PATH = PUBLIC_PATH / METRIC_STUB
PUBLISH_PATH = PUBLIC_PATH / "ftop"

HOME_URL = f"{public_url(PUBLISH_PATH)}/index.html"

MAX_LINES = 60 * 48  # 48 hours of data at one reading per minute
INTERVAL = 60  # Metric collection interval in seconds


# write json lines to a file periodically
def get_metrics():
    if not should_run(METRIC_FILE_PATH, interval=INTERVAL):
        print("Skipping metric collection, not enough time has passed.")
        return

    num_cores = psutil.cpu_count(logical=True)
    load_avg = psutil.getloadavg()
    mem_info = psutil.virtual_memory()
    total_ram = mem_info.total
    used_ram = mem_info.used
    uptime = datetime.now(timezone.utc) - datetime.fromtimestamp(
        psutil.boot_time()
    ).astimezone(timezone.utc)

    timestamp = datetime.now(timezone.utc)
    data = {
        "timestamp": timestamp.isoformat(),
        "version": __version__,
        "num_cores": num_cores,
        "cpu_load_1min": load_avg[0],
        "cpu_load_5min": load_avg[1],
        "cpu_load_15min": load_avg[2],
        "total_ram": total_ram,
        "used_ram": used_ram,
        "uptime_seconds": int(uptime.total_seconds()),
    }

    if not os.path.exists(METRIC_FILE_PATH.parent):
        os.makedirs(METRIC_FILE_PATH.parent, exist_ok=True)

    permission = SyftPermission.mine_with_public_read(email=client.email)
    permission.ensure(METRIC_FILE_PATH.parent)

    with open(METRIC_FILE_PATH, mode="a") as f:
        f.write(json.dumps(data) + "\n")

    truncate_file(METRIC_FILE_PATH, max_lines=MAX_LINES)


# aggregate metrics into a dataframe
def load_metrics_to_dataframe():
    records = []
    results = datasites_file_glob(client, pattern=f"**/{METRIC_STUB}")
    print("results", results)
    for datasite, file_path in results:
        print("Found file:", file_path)
        with open(file_path, "r") as f:
            for line in f:
                record = json.loads(line)
                records.append(
                    {
                        **record,
                        "datasite": datasite,
                    }
                )

    df = pd.DataFrame(records)
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    return df


# turn metrics into a dashboard
def analyze_metrics():
    run_analysis = settings.get("run_analysis", None)
    if (run_analysis is None and client.email != __author__) or run_analysis is False:
        return

    metrics_df = load_metrics_to_dataframe()
    metrics_df.to_csv("./metrics.csv")
    if metrics_df.empty:
        print("No data available for analysis.")
        return {}

    # Convert timestamp to datetime if it's not already
    metrics_df["timestamp"] = pd.to_datetime(metrics_df["timestamp"])

    # Calculate the cutoff time for 48 hours ago (in UTC)
    cutoff_time = datetime.now(pytz.UTC) - timedelta(hours=48)

    # Filter for last 48 hours
    recent_df = metrics_df[metrics_df["timestamp"] >= cutoff_time]

    # Group data into 30-minute intervals for the time series
    time_intervals = pd.date_range(
        start=cutoff_time, end=datetime.now(pytz.UTC), freq="30T", tz="UTC"
    )

    historical_data = []

    for interval in time_intervals:
        interval_end = interval + timedelta(minutes=30)
        interval_df = recent_df[
            (recent_df["timestamp"] >= interval)
            & (recent_df["timestamp"] < interval_end)
        ]

        if not interval_df.empty:
            historical_data.append(
                {
                    "timestamp": interval.isoformat(),
                    "cpu_load_avg": round(interval_df["cpu_load_1min"].mean(), 2),
                    "ram_usage_percent": round(
                        (interval_df["used_ram"].sum() / interval_df["total_ram"].sum())
                        * 100,
                        2,
                    ),
                    "active_systems": len(interval_df["datasite"].unique()),
                }
            )

    # Rest of the function remains the same
    systems_data = []
    datasites = []

    for datasite in metrics_df["datasite"].unique():
        system_df = metrics_df[metrics_df["datasite"] == datasite]
        latest = system_df.sort_values("timestamp").iloc[-1]

        system_data = {
            "timestamp": latest["timestamp"].isoformat(),
            "num_cores": int(latest["num_cores"]),
            "cpu_load_1min": float(latest["cpu_load_1min"]),
            "cpu_load_5min": float(latest["cpu_load_5min"]),
            "cpu_load_15min": float(latest["cpu_load_15min"]),
            "total_ram": int(latest["total_ram"]),
            "used_ram": int(latest["used_ram"]),
            "uptime_seconds": int(latest["uptime_seconds"]),
            "email": str(datasite),
        }
        systems_data.append(system_data)
        datasites.append(datasite)

    summary_stats = {
        "total_systems": len(systems_data),
        "total_cpus": sum(sys["num_cores"] for sys in systems_data),
        "cpu_load": {
            "average": round(
                sum(sys["cpu_load_1min"] for sys in systems_data) / len(systems_data), 2
            ),
            "min": round(min(sys["cpu_load_1min"] for sys in systems_data), 2),
            "max": round(max(sys["cpu_load_1min"] for sys in systems_data), 2),
        },
        "ram": {
            "total": sum(sys["total_ram"] for sys in systems_data),
            "used": sum(sys["used_ram"] for sys in systems_data),
            "average_usage_percentage": round(
                sum(sys["used_ram"] for sys in systems_data)
                / sum(sys["total_ram"] for sys in systems_data)
                * 100,
                2,
            ),
        },
        "datasites": sorted(datasites),
        "historical_data": historical_data,
    }

    ensure(
        ["./widget/index.html", "./widget/index.js", "./widget/syftbox-sdk.js"],
        PUBLISH_PATH,
    )

    output_path = PUBLISH_PATH / "dashboard_metrics.json"
    with open(output_path, "w") as f:
        json.dump(summary_stats, f, indent=2)

    print(f"Dashboard published to {HOME_URL}")
    return summary_stats


# Run metric collection
get_metrics()
analyze_metrics()

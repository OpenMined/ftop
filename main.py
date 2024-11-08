from datetime import datetime, timezone
import os
import json
from pathlib import Path
import psutil
import pandas as pd
from syftbox.lib import Client, SyftPermission

__version__ = "1.0.0"  # Define version for tracking
GENERATE_PAGE = True  # Control whether data analysis is run

client = Client.load()
METRIC_FILE_PATH = Path(f"{client.datasite_path}/metrics/ftop/metrics.jsonl")
PUBLISH_PATH = Path(f"{client.datasite_path}/public/ftop")
MAX_LINES = 60 * 48  # 48 hours of data at one reading per minute
INTERVAL = 60  # Metric collection interval in seconds


def should_run(output_file_path: str) -> bool:
    if not os.path.exists(output_file_path):
        return True

    last_modified_time = datetime.fromtimestamp(os.path.getmtime(output_file_path))
    time_diff = datetime.now(timezone.utc) - last_modified_time.astimezone(timezone.utc)

    return time_diff.total_seconds() >= INTERVAL


def truncate_file(file_path: Path):
    with open(file_path, "r") as f:
        lines = f.readlines()

    if len(lines) > MAX_LINES:
        with open(file_path, "w") as f:
            f.writelines(lines[-MAX_LINES:])


def get_metrics():
    if not should_run(METRIC_FILE_PATH):
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

    truncate_file(METRIC_FILE_PATH)


def load_metrics_to_dataframe():
    records = []
    # path = client.datasite_path
    path = "/Users/madhavajay/dev/syft/.clients/madhava@openmined.org/sync"
    for file_path in Path(path).glob("*/metrics/ftop/metrics.jsonl"):
        print("Found file:", file_path)
        datasite = str(file_path).split("sync/")[-1].split("/metrics")[0]
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


def analyze_metrics():
    metrics_df = load_metrics_to_dataframe()
    metrics_df.to_csv("./metrics.csv")
    if metrics_df.empty:
        print("No data available for analysis.")
        return {}

    # Group by client/system (assuming files from different systems are in different paths)
    systems_data = []
    datasites = []

    for datasite in metrics_df["datasite"].unique():
        system_df = metrics_df[metrics_df["datasite"] == datasite]
        # Get the latest record for this system
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
            "email": str(datasite),  # Extracting email from path
        }
        systems_data.append(system_data)
        datasites.append(datasite)

    # Calculate summary statistics
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
    }

    # Save the output to a JSON file
    os.makedirs(PUBLISH_PATH, exist_ok=True)
    output_path = PUBLISH_PATH / "dashboard_metrics.json"
    with open(output_path, "w") as f:
        json.dump(summary_stats, f, indent=2)

    DASHBOARD = PUBLISH_PATH / "dashboard"

    # Clear the destination directory by removing it entirely, then recreate it
    if os.path.exists(DASHBOARD):
        import shutil

        shutil.rmtree(DASHBOARD)

    os.makedirs(DASHBOARD, exist_ok=True)
    shutil.copytree("./widget", DASHBOARD, dirs_exist_ok=True)

    print(f"Dashboard published to {DASHBOARD}")
    return summary_stats


# Run metric collection
get_metrics()

# Optionally run data analysis
if GENERATE_PAGE:
    analyze_metrics()

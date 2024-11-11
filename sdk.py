import hashlib
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Tuple

from syftbox.lib import Client


class Settings:
    def __init__(self, filename="./settings.json"):
        self.filename = filename
        self.data = self._load()

    def _load(self):
        if os.path.exists(self.filename):
            with open(self.filename, "r") as file:
                try:
                    return json.load(file)
                except json.JSONDecodeError:
                    return {}
        return {}

    def save(self):
        with open(self.filename, "w") as file:
            json.dump(self.data, file, indent=4)

    def get(self, key, default=None):
        return self.data.get(key, default)

    def set(self, key, value):
        self.data[key] = value
        self.save()

    def delete(self, key):
        if key in self.data:
            del self.data[key]
            self.save()

    def all(self):
        return self.data


def extract_datasite(path: str) -> Optional[str]:
    right = str(path).split("datasites/")
    datasite = right[1].split("/")[0]
    if "@" in datasite:
        return datasite
    return None


def datasites_file_glob(client: Client, pattern: str) -> List[Tuple[str, Path]]:
    datasites = Path(f"{client.sync_folder}")
    # fixes change in client paths
    if "datasites" not in str(datasites):
        datasites = datasites / "datasites"

    matches = datasites.glob(pattern)
    results = []
    for path in matches:
        datasite = extract_datasite(path)
        if datasite:
            results.append((datasite, path))
    return results


def public_url(path: str) -> Optional[str]:
    path = str(path)
    public_path = path.split("public")[-1]
    datasite = extract_datasite(path)
    if "public" not in path:
        return None
    public_path = f"/{public_path}".replace("//", "/")
    return f"https://syftbox.openmined.org/datasites/{datasite}{public_path}"


def calculate_file_hash(file_path, hash_func=hashlib.sha256):
    """Calculate the hash of a file."""
    hash_obj = hash_func()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            hash_obj.update(chunk)
    return hash_obj.hexdigest()


def ensure(files, destination_folder):
    """Ensure that specified files are in the destination folder with the same
    hashes. If the destination folder doesn't exist, create it.
    Copy files if missing or hashes differ."""

    # Ensure destination folder exists
    Path(destination_folder).mkdir(parents=True, exist_ok=True)

    for src_file_path in files:
        # Check if the source file exists
        if not os.path.exists(src_file_path):
            print(f"Source file '{src_file_path}' does not exist.")
            continue

        file_name = os.path.basename(src_file_path)
        dest_file_path = os.path.join(destination_folder, file_name)

        # Calculate the hash of the source file
        src_hash = calculate_file_hash(src_file_path)

        # Check if destination file exists and has the same hash
        if os.path.exists(dest_file_path):
            dest_hash = calculate_file_hash(dest_file_path)
            if src_hash == dest_hash:
                print(f"File '{file_name}' is up-to-date.")
                continue  # Skip copying as the file is the same

        # Copy file from source to destination
        shutil.copy2(src_file_path, dest_file_path)
        print(f"Copied '{file_name}' to '{dest_file_path}'.")


def should_run(output_file_path: str, interval: float) -> bool:
    if not os.path.exists(output_file_path):
        return True

    last_modified_time = datetime.fromtimestamp(os.path.getmtime(output_file_path))
    time_diff = datetime.now(timezone.utc) - last_modified_time.astimezone(timezone.utc)

    return time_diff.total_seconds() >= interval


def truncate_file(file_path: Path, max_lines: int):
    with open(file_path, "r") as f:
        lines = f.readlines()

    if len(lines) > max_lines:
        with open(file_path, "w") as f:
            f.writelines(lines[-max_lines:])

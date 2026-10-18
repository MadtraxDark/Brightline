"""Download the full NIH ChestX-ray14 dataset (1024x1024 PNGs) with integrity checks.

Source: the NIH Clinical Center AWS Open Data mirror of the dataset published at
https://nihcc.app.box.com/v/ChestXray-NIHCC (same 112,120 images and labels).
S3 listing provides size and MD5 (ETag) for every object, used to verify each file.
Resumable: files that already exist with the right size/MD5 are skipped. Existing
project files under data/ are reused (copied) instead of downloaded again, never modified.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

BUCKET = "https://nih-chest-x-rays.s3.us-east-2.amazonaws.com"
PREFIX = "images_1024x1024/"
META_BASE = "https://huggingface.co/datasets/alkzar90/NIH-Chest-X-ray-dataset/resolve/main/data/"
META_FILES = ["Data_Entry_2017_v2020.csv", "train_val_list.txt", "test_list.txt", "BBox_List_2017.csv"]
DEFAULT_ROOT = Path(r"D:\Datasets\NIH_ChestXray14")
PROJECT_IMAGES = Path(__file__).resolve().parents[1] / "data" / "nih-chestxray14" / "images"
NS = {"s3": "http://s3.amazonaws.com/doc/2006-03-01/"}


def http_get(url: str, timeout: int = 60) -> bytes:
    with urlopen(Request(url, headers={"User-Agent": "Brightline-NIH/1.0"}), timeout=timeout) as response:
        return response.read()


def list_objects(cache: Path) -> dict[str, dict]:
    if cache.is_file():
        return json.loads(cache.read_text(encoding="utf-8"))
    objects, token = {}, None
    while True:
        url = f"{BUCKET}/?list-type=2&prefix={PREFIX}&max-keys=1000"
        if token:
            url += "&continuation-token=" + quote(token, safe="")
        root = ET.fromstring(http_get(url))
        for item in root.findall("s3:Contents", NS):
            key = item.findtext("s3:Key", namespaces=NS)
            if key.endswith(".png"):
                objects[key[len(PREFIX):]] = {"size": int(item.findtext("s3:Size", namespaces=NS)),
                                              "etag": item.findtext("s3:ETag", namespaces=NS).strip('"')}
        if root.findtext("s3:IsTruncated", namespaces=NS) != "true":
            break
        token = root.findtext("s3:NextContinuationToken", namespaces=NS)
    cache.write_text(json.dumps(objects), encoding="utf-8")
    return objects


def md5(path: Path) -> str:
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "md5").hexdigest()


def is_valid(path: Path, meta: dict) -> bool:
    if not path.is_file() or path.stat().st_size != meta["size"]:
        return False
    return "-" in meta["etag"] or md5(path) == meta["etag"]  # multipart ETags are not MD5


def fetch(name: str, meta: dict, dest_dir: Path, attempts: int = 5) -> str:
    dest = dest_dir / name
    if is_valid(dest, meta):
        return "present"
    local = PROJECT_IMAGES / name
    if is_valid(local, meta):
        shutil.copyfile(local, dest)
        return "reused"
    part = dest.with_suffix(".part")
    for attempt in range(attempts):
        try:
            with urlopen(Request(f"{BUCKET}/{PREFIX}{name}", headers={"User-Agent": "Brightline-NIH/1.0"}),
                         timeout=60) as response, part.open("wb") as out:
                shutil.copyfileobj(response, out, 1 << 20)
            part.replace(dest)
            if is_valid(dest, meta):
                return "downloaded"
            dest.unlink(missing_ok=True)
        except Exception:
            part.unlink(missing_ok=True)
        time.sleep(1 + 2 * attempt)
    raise RuntimeError(f"download failed or corrupt: {name}")


def select_patients(root: Path, objects: dict[str, dict], target_bytes: int, seed: int = 42) -> list[str]:
    """Pick whole patients (never split a patient) until target_bytes is reached.

    All patients with a rare class (Hernia) are always included; the rest are added in a
    seeded random order so the subset is reproducible and not biased by file order.
    """
    import csv
    import random
    by_patient: dict[str, list[str]] = {}
    rare: set[str] = set()
    with (root / "Data_Entry_2017_v2020.csv").open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            if row["Image Index"] in objects:
                by_patient.setdefault(row["Patient ID"], []).append(row["Image Index"])
                if "Hernia" in row["Finding Labels"].split("|"):
                    rare.add(row["Patient ID"])
    order = sorted(rare) + random.Random(seed).sample(
        sorted(set(by_patient) - rare), len(set(by_patient) - rare))
    chosen, total = [], 0
    for patient in order:
        if total >= target_bytes:
            break
        chosen.extend(by_patient[patient])
        total += sum(objects[n]["size"] for n in by_patient[patient])
    return sorted(chosen)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--workers", type=int, default=16)
    parser.add_argument("--limit", type=int, default=0, help="download only the first N images (testing)")
    parser.add_argument("--target-gib", type=float, default=0,
                        help="download a patient-level subset of at least this size (0 = everything)")
    args = parser.parse_args()
    images = args.root / "images"
    images.mkdir(parents=True, exist_ok=True)
    free = shutil.disk_usage(args.root).free
    for name in META_FILES:
        if not (args.root / name).is_file():
            (args.root / name).write_bytes(http_get(META_BASE + name, 300))
    objects = list_objects(args.root / "s3_index.json")
    names = sorted(objects)
    if args.target_gib:
        names = select_patients(args.root, objects, int(args.target_gib * 2**30))
        (args.root / "selection.json").write_text(json.dumps(names), encoding="utf-8")
    names = names[: args.limit or None]
    need = sum(objects[n]["size"] for n in names if not (images / n).is_file())
    print(f"{len(names):,} images selected, remaining ~{need / 2**30:.1f} GiB, free {free / 2**30:.1f} GiB", flush=True)
    if need * 1.05 > free:
        raise SystemExit("Not enough free disk space")
    counts, failures, start = {}, [], time.time()
    with ThreadPoolExecutor(args.workers) as pool:
        futures = {pool.submit(fetch, n, objects[n], images): n for n in names}
        for i, future in enumerate(as_completed(futures), 1):
            try:
                status = future.result()
                counts[status] = counts.get(status, 0) + 1
            except Exception as error:
                failures.append((futures[future], str(error)))
            if i % 1000 == 0 or i == len(futures):
                print(f"{i:,}/{len(futures):,} {counts} failures={len(failures)} "
                      f"{i / (time.time() - start):.1f} img/s", flush=True)
    (args.root / "download_report.json").write_text(
        json.dumps({"counts": counts, "failures": failures, "expected": len(objects)}, indent=2), encoding="utf-8")
    if failures:
        raise SystemExit(f"{len(failures)} failures; rerun to resume")
    print("All requested images present and verified.")


if __name__ == "__main__":
    main()

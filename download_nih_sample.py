"""Download a reproducible, patient-split sample of NIH ChestX-ray14."""

from __future__ import annotations

import csv
import hashlib
import json
import os
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent / "data" / "nih-chestxray14"
IMAGE_DIR = ROOT / "images"
METADATA_URL = (
    "https://huggingface.co/datasets/alkzar90/NIH-Chest-X-ray-dataset/resolve/main/"
    "data/Data_Entry_2017_v2020.csv"
)
IMAGE_URL = "https://nih-chest-x-rays.s3.us-east-2.amazonaws.com/images_1024x1024/{}"
LABELS = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass", "Nodule",
    "Pneumonia", "Pneumothorax", "Consolidation", "Edema", "Emphysema", "Fibrosis",
    "Pleural_Thickening", "Hernia",
]
PER_LABEL = int(os.getenv("NIH_IMAGES_PER_LABEL", "100"))
SEED = 42


def fetch(url: str, destination: Path, attempts: int = 4) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(attempts):
        part = destination.with_suffix(destination.suffix + ".part")
        try:
            request = Request(url, headers={"User-Agent": "Brightline-NIH-sample/1.0"})
            with urlopen(request, timeout=90) as response, part.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    output.write(chunk)
            if part.stat().st_size == 0:
                raise OSError("empty response")
            part.replace(destination)
            return
        except (HTTPError, URLError, TimeoutError, OSError) as error:
            part.unlink(missing_ok=True)
            if attempt + 1 == attempts:
                raise RuntimeError(f"Download failed for {url}: {error}") from error
            time.sleep(1 + attempt * 2)


def stable_patient_split(patient_id: str) -> str:
    bucket = int(hashlib.sha256(patient_id.encode()).hexdigest()[:8], 16) % 5
    return "test" if bucket == 0 else "train"


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    metadata_path = ROOT / "Data_Entry_2017_v2020.csv"
    if not metadata_path.exists():
        print("Downloading NIH label metadata (9 MB)...", flush=True)
        fetch(METADATA_URL, metadata_path)

    with metadata_path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or not {"Image Index", "Finding Labels", "Patient ID"}.issubset(reader.fieldnames):
            raise SystemExit("Unexpected NIH metadata format")
        rows = list(reader)

    rng = random.Random(SEED)
    selected_by_label: dict[str, list[str]] = {}
    selected: set[str] = set()
    row_by_name = {row["Image Index"]: row for row in rows}
    for label in LABELS:
        candidates = [row for row in rows if label in row["Finding Labels"].split("|")]
        rng.shuffle(candidates)
        # Sample different patients within a class where possible.
        chosen: list[str] = []
        patients: set[str] = set()
        for row in candidates:
            patient = row["Patient ID"]
            if patient not in patients:
                chosen.append(row["Image Index"])
                patients.add(patient)
                if len(chosen) == PER_LABEL:
                    break
        if len(chosen) < PER_LABEL:
            raise SystemExit(f"Only {len(chosen)} distinct-patient images available for {label}")
        selected_by_label[label] = chosen
        selected.update(chosen)

    names = sorted(selected)
    print(f"Downloading {len(names):,} unique images ({PER_LABEL} selected per each of {len(LABELS)} labels)...", flush=True)
    failures: list[tuple[str, str]] = []
    completed = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {
            pool.submit(fetch, IMAGE_URL.format(name), IMAGE_DIR / name): name
            for name in names if not (IMAGE_DIR / name).is_file()
        }
        for future in as_completed(futures):
            name = futures[future]
            try:
                future.result()
            except Exception as error:  # keep downloading to report all missing assets
                failures.append((name, str(error)))
            completed += 1
            if completed % 50 == 0 or completed == len(futures):
                print(f"Downloaded {completed:,}/{len(futures):,} pending images", flush=True)
    if failures:
        (ROOT / "download_errors.json").write_text(json.dumps(failures, indent=2), encoding="utf-8")
        raise SystemExit(f"{len(failures)} image downloads failed; rerun to resume")

    sampled_rows = [row_by_name[name] for name in names]
    with metadata_path.open(encoding="utf-8-sig", newline="") as source:
        fieldnames = csv.DictReader(source).fieldnames
    with (ROOT / "Data_Entry_2017_v2020.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sampled_rows)

    train_files: list[str] = []
    test_files: list[str] = []
    for name in names:
        patient = row_by_name[name]["Patient ID"]
        (test_files if stable_patient_split(patient) == "test" else train_files).append(name)
    (ROOT / "train_val_list.txt").write_text("\n".join(train_files) + "\n", encoding="utf-8")
    (ROOT / "test_list.txt").write_text("\n".join(test_files) + "\n", encoding="utf-8")
    manifest = {
        "dataset": "NIH ChestX-ray14",
        "label_source": METADATA_URL,
        "image_source": "NIH ChestX-ray14 PNG mirror on AWS S3 (us-east-2)",
        "seed": SEED,
        "target_images_per_label": PER_LABEL,
        "unique_images": len(names),
        "train_images": len(train_files),
        "test_images": len(test_files),
        "selected_per_label": {label: len(items) for label, items in selected_by_label.items()},
        "class_sample_files": selected_by_label,
    }
    (ROOT / "sample_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in manifest.items() if k != "class_sample_files"}, indent=2), flush=True)


if __name__ == "__main__":
    main()

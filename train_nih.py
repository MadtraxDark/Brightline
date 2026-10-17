"""Train a multi-label TensorFlow model on NIH ChestX-ray14."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from pathlib import Path

import tensorflow as tf


LABELS = [
    "Atelectasis",
    "Cardiomegaly",
    "Effusion",
    "Infiltration",
    "Mass",
    "Nodule",
    "Pneumonia",
    "Pneumothorax",
    "Consolidation",
    "Edema",
    "Emphysema",
    "Fibrosis",
    "Pleural_Thickening",
    "Hernia",
]


def read_labels(csv_path: Path) -> dict[str, list[float]]:
    records: dict[str, list[float]] = {}
    with csv_path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or not {"Image Index", "Finding Labels"}.issubset(reader.fieldnames):
            raise ValueError("CSV must include 'Image Index' and 'Finding Labels' columns")
        for row in reader:
            findings = set(row["Finding Labels"].split("|"))
            records[row["Image Index"]] = [float(label in findings) for label in LABELS]
    return records


def read_split(path: Path) -> list[str]:
    return [line.strip() for line in path.read_text(encoding="utf-8-sig").splitlines() if line.strip()]


def patient_key(filename: str) -> str:
    return filename.split("_", 1)[0]


def validation_patients(train_files: list[str], fraction: float = 0.1) -> set[str]:
    patients = sorted({patient_key(name) for name in train_files})
    count = max(1, round(len(patients) * fraction))
    return set(sorted(patients, key=lambda value: hashlib.sha256(value.encode()).hexdigest())[:count])


def make_dataset(
    files: list[str], labels: dict[str, list[float]], image_root: Path, size: int, batch_size: int,
    training: bool, database_url: str | None = None,
) -> tf.data.Dataset:
    targets = [labels[name] for name in files]
    if database_url:
        def read_from_database():
            import psycopg
            with psycopg.connect(database_url) as conn:
                for name, target in zip(files, targets):
                    row = conn.execute("SELECT content FROM dataset_images WHERE filename=%s", (name,)).fetchone()
                    if row is None:
                        raise RuntimeError(f"Image {name} is missing from PostgreSQL; run the NIH image import.")
                    yield bytes(row[0]), target

        dataset = tf.data.Dataset.from_generator(
            read_from_database,
            output_signature=(tf.TensorSpec((), tf.string), tf.TensorSpec((len(LABELS),), tf.float32)),
        )
    else:
        paths = [str(image_root / name) for name in files]
        dataset = tf.data.Dataset.from_tensor_slices((paths, targets))

    def load_image(source: tf.Tensor, target: tf.Tensor) -> tuple[tf.Tensor, tf.Tensor]:
        image = source if database_url else tf.io.read_file(source)
        image = tf.io.decode_png(image, channels=3)
        image = tf.image.resize(image, (size, size), antialias=True)
        if training:
            image = tf.image.random_flip_left_right(image)
        return image, target

    dataset = dataset.map(load_image, num_parallel_calls=tf.data.AUTOTUNE)
    if training:
        dataset = dataset.shuffle(min(len(files), 8192), reshuffle_each_iteration=True)
    return dataset.batch(batch_size).prefetch(tf.data.AUTOTUNE)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path(os.getenv("NIH_DATA_DIR", "/data/nih")))
    parser.add_argument("--output-dir", type=Path, default=Path(os.getenv("MODEL_OUTPUT_DIR", "/output")))
    parser.add_argument("--epochs", type=int, default=int(os.getenv("EPOCHS", "3")))
    parser.add_argument("--batch-size", type=int, default=int(os.getenv("BATCH_SIZE", "16")))
    parser.add_argument("--image-size", type=int, default=int(os.getenv("IMAGE_SIZE", "224")))
    args = parser.parse_args()
    database_url = os.getenv("DATABASE_URL")

    image_dir = args.data_dir / "images"
    csv_path = args.data_dir / "Data_Entry_2017_v2020.csv"
    train_path = args.data_dir / "train_val_list.txt"
    test_path = args.data_dir / "test_list.txt"
    missing = [str(path) for path in (csv_path, train_path, test_path) if not path.is_file()]
    if not database_url and not image_dir.is_dir():
        missing.append(str(image_dir))
    if missing:
        raise SystemExit("NIH dataset is incomplete. Missing: " + ", ".join(missing))

    labels = read_labels(csv_path)
    available = (lambda name: name in labels and (database_url or (image_dir / name).is_file()))
    test_files = [name for name in read_split(test_path) if available(name)]
    test_patients = {patient_key(name) for name in test_files}
    official_train = [
        name for name in read_split(train_path)
        if available(name) and patient_key(name) not in test_patients
    ]
    if not official_train or not test_files:
        raise SystemExit("No complete train/test images found. Extract all NIH image archives into data-dir/images.")

    val_patients = validation_patients(official_train)
    val_files = [name for name in official_train if patient_key(name) in val_patients]
    train_files = [name for name in official_train if patient_key(name) not in val_patients]
    if not train_files or not val_files:
        raise SystemExit("Could not create patient-disjoint train and validation splits")

    print(f"Images: train={len(train_files):,}, validation={len(val_files):,}, test={len(test_files):,}", flush=True)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    tf.keras.utils.set_random_seed(42)
    backbone = tf.keras.applications.EfficientNetB0(
        include_top=False, weights="imagenet", input_shape=(args.image_size, args.image_size, 3), pooling="avg"
    )
    backbone.trainable = False
    inputs = tf.keras.Input((args.image_size, args.image_size, 3))
    x = backbone(inputs, training=False)
    x = tf.keras.layers.Dropout(0.25)(x)
    outputs = tf.keras.layers.Dense(len(LABELS), activation="sigmoid", name="pathology_probabilities")(x)
    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=[tf.keras.metrics.AUC(name="macro_auc", multi_label=True, num_labels=len(LABELS))],
    )

    train_ds = make_dataset(train_files, labels, image_dir, args.image_size, args.batch_size, True, database_url)
    val_ds = make_dataset(val_files, labels, image_dir, args.image_size, args.batch_size, False, database_url)
    test_ds = make_dataset(test_files, labels, image_dir, args.image_size, args.batch_size, False, database_url)
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(args.output_dir / "best.keras", monitor="val_macro_auc", mode="max", save_best_only=True),
        tf.keras.callbacks.EarlyStopping(monitor="val_macro_auc", mode="max", patience=2, restore_best_weights=True),
        tf.keras.callbacks.CSVLogger(args.output_dir / "training.csv"),
    ]
    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)
    metrics = model.evaluate(test_ds, return_dict=True)
    model.save(args.output_dir / "nih_chestxray14.keras")
    report = {
        "labels": LABELS,
        "counts": {"train": len(train_files), "validation": len(val_files), "test": len(test_files)},
        "test_metrics": {key: float(value) for key, value in metrics.items()},
        "note": "Research benchmark only; not validated for clinical diagnosis.",
    }
    (args.output_dir / "metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()

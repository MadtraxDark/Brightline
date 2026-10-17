"""Idempotently copy the checked-out NIH sample image set into PostgreSQL."""
import argparse
import csv
import hashlib
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from .app.config import get_settings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=Path("/data/nih"))
    parser.add_argument("--batch-size", type=int, default=16)
    args = parser.parse_args()
    metadata = args.data_dir / "Data_Entry_2017_v2020.csv"
    image_dir = args.data_dir / "images"
    with metadata.open(encoding="utf-8-sig", newline="") as handle:
        records = list(csv.DictReader(handle))
    if not records or not image_dir.is_dir():
        raise SystemExit("NIH dataset incompleto: metadados ou diretório de imagens ausente.")
    missing = [row["Image Index"] for row in records if not (image_dir / row["Image Index"]).is_file()]
    if missing:
        raise SystemExit(f"Há {len(missing)} imagens faltando; nenhuma carga foi iniciada.")

    query = """INSERT INTO dataset_images(filename,patient_id,finding_labels,sha256,content)
        VALUES (%s,%s,%s,%s,%s) ON CONFLICT(filename) DO UPDATE SET
        patient_id=EXCLUDED.patient_id,finding_labels=EXCLUDED.finding_labels,
        sha256=EXCLUDED.sha256,content=EXCLUDED.content"""
    imported = 0
    with psycopg.connect(get_settings().database_url, row_factory=dict_row) as conn:
        for start in range(0, len(records), args.batch_size):
            batch = []
            for row in records[start:start + args.batch_size]:
                content = (image_dir / row["Image Index"]).read_bytes()
                batch.append((row["Image Index"], row["Patient ID"], row["Finding Labels"].split("|"),
                              hashlib.sha256(content).hexdigest(), content))
            with conn.transaction():
                with conn.cursor() as cursor:
                    cursor.executemany(query, batch)
            imported += len(batch)
            print(f"{imported}/{len(records)} imagens", flush=True)
        count = conn.execute("SELECT count(*) AS n FROM dataset_images").fetchone()["n"]
        size = conn.execute("SELECT pg_size_pretty(pg_total_relation_size('dataset_images')) AS size").fetchone()["size"]
    print(f"Concluído: {count} imagens na tabela dataset_images ({size}).")


if __name__ == "__main__":
    main()

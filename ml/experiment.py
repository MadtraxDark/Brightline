"""Fine-tune and evaluate TorchXRayVision (DenseNet121, NIH weights) on a local NIH ChestX-ray14 subset.

Subcommands (run in order; every step is resumable and never modifies the original images):
  cache     decode PNGs once into a uint8 224x224 memmap (same crop/resize as the API) + split table
  baseline  evaluate the unmodified pretrained model on the held-out test split
  train     fine-tune (all 14 NIH classes, class-weighted loss, augmentation), select by VALIDATION AUROC
  report    calibrate + pick thresholds on VALIDATION, compare baseline vs fine-tuned on TEST once

Research use only: scores are not clinical probabilities and no output may guide patient care.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import platform
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd

LABELS = ["Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass", "Nodule", "Pneumonia",
          "Pneumothorax", "Consolidation", "Edema", "Emphysema", "Fibrosis", "Pleural_Thickening", "Hernia"]
DATA_ROOT = Path(os.getenv("NIH_ROOT", r"D:\Datasets\NIH_ChestXray14"))
OUT = Path(os.getenv("NIH_EXPERIMENT_DIR", r"D:\Datasets\NIH_ChestXray14\experiment"))
RESULTS = Path(__file__).resolve().parents[1] / "artifacts" / "nih-torchxrayvision"
WEIGHTS = "densenet121-res224-nih"
SIZE = 224
SEED = 42


# ----------------------------------------------------------------------------- data
def patient_bucket(patient_id: str, salt: str = "brightline-val") -> float:
    """Deterministic patient-level pseudo-random number in [0, 1)."""
    return int(hashlib.sha256(f"{salt}:{patient_id}".encode()).hexdigest()[:8], 16) / 16 ** 8


def build_table() -> pd.DataFrame:
    meta = pd.read_csv(DATA_ROOT / "Data_Entry_2017_v2020.csv")
    meta = meta.rename(columns={"Image Index": "image", "Patient ID": "patient", "Finding Labels": "findings"})
    official_test = set((DATA_ROOT / "test_list.txt").read_text().split())
    present = {p.name for p in (DATA_ROOT / "images").glob("*.png")}
    meta = meta[meta.image.isin(present)].reset_index(drop=True)
    meta["patient"] = meta.patient.astype(str)
    for label in LABELS:
        meta[label] = meta.findings.str.split("|").apply(lambda items, l=label: int(l in items))
    # Official NIH test list is patient-disjoint from train_val by construction.
    # Validation is carved out of train_val by PATIENT hash, so no patient spans two splits.
    split = np.where(meta.image.isin(official_test), "test",
                     np.where(meta.patient.map(patient_bucket) < 0.15, "val", "train"))
    meta["split"] = split
    patient_splits = meta.groupby("patient").split.nunique()
    assert patient_splits.max() == 1, "patient leakage across splits"
    return meta


def _load(name: str) -> np.ndarray:
    import torchxrayvision as xrv
    from PIL import Image
    with Image.open(DATA_ROOT / "images" / name) as source:
        gray = np.asarray(source.convert("L"), dtype=np.float32)[None, ...]
    gray = xrv.datasets.XRayCenterCrop()(gray)
    gray = xrv.datasets.XRayResizer(SIZE)(gray)
    return np.clip(np.rint(gray[0]), 0, 255).astype(np.uint8)


def cmd_cache(args) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    table = build_table()
    table.to_csv(OUT / "table.csv", index=False)
    if (OUT / "cache.done").exists() and (OUT / f"cache_{SIZE}.npy").exists():
        print("cache already complete")
        return
    array = np.lib.format.open_memmap(OUT / f"cache_{SIZE}.npy", mode="w+", dtype=np.uint8,
                                      shape=(len(table), SIZE, SIZE))
    with ProcessPoolExecutor(args.workers) as pool:
        for i, img in enumerate(pool.map(_load, table.image, chunksize=32)):
            array[i] = img
            if i % 2000 == 0 or i == len(table) - 1:
                print(f"cached {i+1}/{len(table)}", flush=True)
    array.flush()
    (OUT / "cache.done").write_text(str(len(table)))
    print(table.groupby("split")[LABELS].sum().T.assign(total=table[LABELS].sum()).to_string())
    print(table.split.value_counts().to_string(), "| patients:", table.groupby("split").patient.nunique().to_dict())


class NIHDataset:
    """Fast on-the-fly image dataset, reads from disk or memory map if available."""
    def __init__(self, table: pd.DataFrame, use_cache: bool = True):
        self.table = table.reset_index(drop=True)
        self.images_dir = DATA_ROOT / "images"
        self.has_cache = use_cache and (OUT / f"cache_{SIZE}.npy").exists() and (OUT / "cache.done").exists()
        if self.has_cache:
            self.mmap = np.load(OUT / f"cache_{SIZE}.npy", mmap_mode="r")
        else:
            self.mmap = None

    def __len__(self):
        return len(self.table)

    def get_image(self, idx: int) -> np.ndarray:
        if self.mmap is not None:
            return self.mmap[idx]
        return _load(self.table.iloc[idx]["image"])

    def get_batch(self, indices: list[int] | np.ndarray) -> np.ndarray:
        if self.mmap is not None:
            return np.array(self.mmap[indices])
        return np.stack([_load(self.table.iloc[i]["image"]) for i in indices])


def load_dataset():
    table = build_table() if not (OUT / "table.csv").exists() else pd.read_csv(OUT / "table.csv", dtype={"patient": str})
    return table, NIHDataset(table)


# ----------------------------------------------------------------------------- model
def get_device():
    import torch
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_model(raw: bool = True, checkpoint: Path | None = None):
    """DenseNet121-NIH. raw=True drops the op_norm remapping so outputs are logits."""
    import torch
    import torchxrayvision as xrv
    model = xrv.models.DenseNet(weights=WEIGHTS)
    ops = model.op_threshs.clone() if model.op_threshs is not None else None
    if raw:
        model.op_threshs = None
        model.apply_sigmoid = False
    if checkpoint is not None:
        model.load_state_dict(torch.load(checkpoint, map_location="cpu"))
    idx = [model.pathologies.index(l) for l in LABELS]
    return model, idx, ops


def to_tensor(batch_u8, device):
    import torch
    x = torch.from_numpy(np.ascontiguousarray(batch_u8)).to(device).float()
    return ((x / 255.0) * 2 - 1).mul(1024).unsqueeze(1)  # == xrv.datasets.normalize(img, 255)


def predict_logits(model, idx, dataset: NIHDataset, rows, device, batch=64, desc="") -> np.ndarray:
    import torch
    model.eval().to(device)
    out = []
    total = len(rows)
    with torch.inference_mode():
        for i in range(0, total, batch):
            batch_indices = rows[i:i + batch]
            x = to_tensor(dataset.get_batch(batch_indices), device)
            out.append(model(x)[:, idx].float().cpu().numpy())
            if (i // batch) % 20 == 0 or (i + batch) >= total:
                print(f"[{desc}] inference {min(i + batch, total)}/{total}", flush=True)
    return np.concatenate(out)


# ----------------------------------------------------------------------------- metrics
def sigmoid(z):
    return 1 / (1 + np.exp(-z))


def ece(y, p, bins=10) -> float:
    edges = np.linspace(0, 1, bins + 1)
    total = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (p >= lo) & (p < hi if hi < 1 else p <= hi)
        if m.any():
            total += m.mean() * abs(y[m].mean() - p[m].mean())
    return float(total)


def metrics_at(y, score, threshold) -> dict:
    pred = score >= threshold
    tp, fp = int((pred & (y == 1)).sum()), int((pred & (y == 0)).sum())
    fn, tn = int((~pred & (y == 1)).sum()), int((~pred & (y == 0)).sum())
    div = lambda a, b: a / b if b else float("nan")
    sens, prec = div(tp, tp + fn), div(tp, tp + fp)
    return {"sensitivity": sens, "specificity": div(tn, tn + fp), "precision": prec,
            "f1": div(2 * prec * sens, prec + sens) if not (math.isnan(prec) or math.isnan(sens)) else float("nan"),
            "tp": tp, "fp": fp, "fn": fn, "tn": tn}


def auc_ap(y, s):
    from sklearn.metrics import average_precision_score, roc_auc_score
    if y.sum() == 0 or y.sum() == len(y):
        return float("nan"), float("nan")
    return float(roc_auc_score(y, s)), float(average_precision_score(y, s))


def macro_auc(Y, S) -> float:
    return float(np.nanmean([auc_ap(Y[:, j], S[:, j])[0] for j in range(Y.shape[1])]))


def bootstrap_ci(y, patients, scores_by_name: dict, reps=200, seed=SEED):
    """Patient-clustered bootstrap CI of AUROC difference for one class."""
    rng = np.random.default_rng(seed)
    uniq = np.unique(patients)
    groups = {p: np.where(patients == p)[0] for p in uniq}
    names = list(scores_by_name)
    draws = {n: [] for n in names}
    for _ in range(reps):
        sample = rng.choice(uniq, len(uniq))
        rows = np.concatenate([groups[p] for p in sample])
        if y[rows].sum() == 0 or y[rows].sum() == len(rows):
            continue
        for n in names:
            draws[n].append(auc_ap(y[rows], scores_by_name[n][rows])[0])
    return {n: (float(np.percentile(d, 2.5)), float(np.percentile(d, 97.5))) for n, d in draws.items()}, \
           float(np.percentile(np.array(draws[names[1]]) - np.array(draws[names[0]]), 2.5)), \
           float(np.percentile(np.array(draws[names[1]]) - np.array(draws[names[0]]), 97.5))


def split_arrays(table, split):
    rows = np.where(table.split.values == split)[0]
    return rows, table.loc[rows, LABELS].values.astype(np.float32), table.loc[rows, "patient"].values


# ----------------------------------------------------------------------------- commands
def cmd_baseline(args) -> None:
    table, dataset = load_dataset()
    device = get_device()
    model, idx, ops = load_model(raw=True)
    for split in ("val", "test"):
        rows, Y, _ = split_arrays(table, split)
        Z = predict_logits(model, idx, dataset, rows, device, desc=f"baseline-{split}")
        np.save(OUT / f"baseline_logits_{split}.npy", Z)
        print(split, len(rows), "macro AUROC (raw logits):", round(macro_auc(Y, Z), 4), flush=True)


def augment(x):
    """GPU augmentation on normalized images: small affine + intensity jitter. No flips (cardiac situs)."""
    import torch
    import torch.nn.functional as F
    n = x.shape[0]
    angle = (torch.rand(n, device=x.device) - 0.5) * 2 * math.radians(10)
    scale = 1 + (torch.rand(n, device=x.device) - 0.5) * 0.2
    shift = (torch.rand(n, 2, device=x.device) - 0.5) * 0.1
    cos, sin = torch.cos(angle) / scale, torch.sin(angle) / scale
    theta = torch.stack([torch.stack([cos, -sin, shift[:, 0]], 1), torch.stack([sin, cos, shift[:, 1]], 1)], 1)
    grid = F.affine_grid(theta, x.shape, align_corners=False)
    x = F.grid_sample(x, grid, padding_mode="border", align_corners=False)
    contrast = 1 + (torch.rand(n, 1, 1, 1, device=x.device) - 0.5) * 0.3
    brightness = (torch.rand(n, 1, 1, 1, device=x.device) - 0.5) * 200
    return (x * contrast + brightness).clamp(-1024, 1024)


def cmd_train(args) -> None:
    import torch
    import torch.nn as nn
    table, dataset = load_dataset()
    device = get_device()
    torch.manual_seed(SEED)
    np.random.seed(SEED)
    model, idx, _ = load_model(raw=True)
    model.to(device)
    tr_rows, Ytr, _ = split_arrays(table, "train")
    va_rows, Yva, _ = split_arrays(table, "val")
    pos = Ytr.sum(0)
    # sqrt-scaled, capped positive weight: gentler than neg/pos, keeps logits usable before recalibration.
    pos_weight = torch.tensor(np.minimum(np.sqrt((len(Ytr) - pos) / np.maximum(pos, 1)), args.max_pos_weight),
                              dtype=torch.float32, device=device)
    # class-aware sampling: images with rare positives (Hernia etc.) are oversampled up to x`rare_boost`.
    freq = Ytr.mean(0)
    w = 1 + (Ytr * (np.clip(freq.max() / np.maximum(freq, 1e-6), 1, args.rare_boost) - 1)).max(1)
    loss_fn = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    params = [{"params": [p for n, p in model.named_parameters() if not n.startswith("features")], "lr": args.lr},
              {"params": [p for n, p in model.named_parameters() if n.startswith("features")], "lr": args.lr * 0.3}]
    opt = torch.optim.AdamW(params, weight_decay=1e-4)
    steps = args.epochs * math.ceil(len(tr_rows) / args.batch)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=[args.lr, args.lr * 0.3], total_steps=steps, pct_start=0.1)
    scaler = torch.amp.GradScaler(enabled=device.type == "cuda")
    config = {**vars(args), "weights_init": WEIGHTS, "seed": SEED, "labels": LABELS,
              "pos_weight": pos_weight.cpu().tolist(), "n_train": int(len(tr_rows)), "n_val": int(len(va_rows)),
              "device": str(device), "torch": torch.__version__, "platform": platform.platform()}
    RESULTS.mkdir(parents=True, exist_ok=True)
    best, history = -1.0, []
    order_rng = np.random.default_rng(SEED)
    for epoch in range(args.epochs):
        model.train()
        order = tr_rows[order_rng.choice(len(tr_rows), len(tr_rows), p=w / w.sum())]
        t0, running = time.time(), 0.0
        for b, i in enumerate(range(0, len(order), args.batch)):
            rows = order[i:i + args.batch]
            x = augment(to_tensor(dataset.get_batch(rows), device))
            y = torch.from_numpy(table.loc[rows, LABELS].values.astype(np.float32)).to(device)
            with torch.autocast(device.type, enabled=device.type == "cuda"):
                logits = model(x)[:, idx]
            loss = loss_fn(logits.float(), y)
            opt.zero_grad(set_to_none=True)
            scaler.scale(loss).backward()
            scaler.step(opt)
            scaler.update()
            sched.step()
            running += loss.item()
            if b % 100 == 0 or b == len(order) // args.batch:
                print(f"epoch {epoch} step {b}/{len(order)//args.batch} loss {loss.item():.4f}", flush=True)
        Zva = predict_logits(model, idx, dataset, va_rows, device)
        val_auc = macro_auc(Yva, Zva)
        history.append({"epoch": epoch, "train_loss": running / (b + 1), "val_macro_auroc": val_auc,
                        "seconds": time.time() - t0})
        print(history[-1], flush=True)
        if val_auc > best:  # model selection on validation AUROC, not on loss
            best = val_auc
            torch.save(model.state_dict(), RESULTS / "best_finetuned.pt")
            np.save(OUT / "finetuned_logits_val.npy", Zva)
    config["history"] = history
    config["best_val_macro_auroc"] = best
    (RESULTS / "training_config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")


def cmd_report(args) -> None:
    from sklearn.linear_model import LogisticRegression
    table, dataset = load_dataset()
    device = get_device()
    model, idx, ops = load_model(raw=True, checkpoint=RESULTS / "best_finetuned.pt")
    base = {s: np.load(OUT / f"baseline_logits_{s}.npy") for s in ("val", "test")}
    fine = {}
    data = {}
    for s in ("val", "test"):
        rows, Y, P = split_arrays(table, s)
        data[s] = (Y, P)
        fine[s] = np.load(OUT / "finetuned_logits_val.npy") if s == "val" else predict_logits(model, idx, dataset, rows, device)
    if len(fine["val"]) != len(base["val"]):
        raise SystemExit("validation logits are stale; rerun train")
    # Baseline operating point as shipped by TorchXRayVision: normalized score >= 0.5 <=> raw sigmoid >= op_thresh.
    base_thr = ops[[load_model()[0].pathologies.index(l) for l in LABELS]].numpy()
    Yva, _ = data["val"]
    Yte, Pte = data["test"]
    cal = {}
    rows_out, ci_out = [], {}
    for j, label in enumerate(LABELS):
        zv, zt = fine["val"][:, j], fine["test"][:, j]
        n_pos_val = int(Yva[:, j].sum())
        entry = {"n_pos_val": n_pos_val}
        if n_pos_val >= 5:  # Platt scaling and a validation-chosen threshold need a handful of positives
            platt = LogisticRegression(C=1e6, max_iter=1000).fit(zv[:, None], Yva[:, j])
            pv = platt.predict_proba(zv[:, None])[:, 1]
            pt = platt.predict_proba(zt[:, None])[:, 1]
            from sklearn.metrics import roc_curve
            fpr, tpr, thr = roc_curve(Yva[:, j], pv)
            youden = float(thr[np.argmax(tpr - fpr)])
            sens_target = float(thr[np.argmax(tpr >= args.target_sensitivity)])
            thr_use = sens_target if label == "Hernia" else youden
            entry |= {"platt_coef": float(platt.coef_[0, 0]), "platt_intercept": float(platt.intercept_[0]),
                      "threshold_youden": youden, "threshold_sens_target": sens_target, "threshold_used": thr_use}
        else:
            pt, thr_use = sigmoid(zt), None
        cal[label] = entry
        b_auc, b_ap = auc_ap(Yte[:, j], base["test"][:, j])
        f_auc, f_ap = auc_ap(Yte[:, j], zt)
        row = {"class": label, "n_pos_test": int(Yte[:, j].sum()), "n_test": len(Yte),
               "auroc_base": b_auc, "auroc_ft": f_auc, "auprc_base": b_ap, "auprc_ft": f_ap,
               "brier_ft": float(np.mean((pt - Yte[:, j]) ** 2)), "ece_ft": ece(Yte[:, j], pt)}
        for tag, (score, thr) in {"base": (sigmoid(base["test"][:, j]), base_thr[j]), "ft": (pt, thr_use)}.items():
            if thr is not None and not np.isnan(thr):
                m = metrics_at(Yte[:, j], score, thr)
                row |= {f"{k}_{tag}": m[k] for k in ("sensitivity", "specificity", "precision", "f1", "fn")}
        if row["n_pos_test"] >= 5 and not math.isnan(b_auc):
            cis, lo, hi = bootstrap_ci(Yte[:, j], Pte, {"base": base["test"][:, j], "ft": zt}, reps=args.bootstrap)
            row |= {"auroc_diff_ci95_low": lo, "auroc_diff_ci95_high": hi}
        rows_out.append(row)
    result = pd.DataFrame(rows_out)
    result.to_csv(RESULTS / "test_comparison.csv", index=False)
    summary = {"macro_auroc_base": float(result.auroc_base.mean()), "macro_auroc_ft": float(result.auroc_ft.mean()),
               "macro_auprc_base": float(result.auprc_base.mean()), "macro_auprc_ft": float(result.auprc_ft.mean()),
               "n_test_images": int(len(Yte)), "n_test_patients": int(len(set(Pte)))}
    (RESULTS / "calibration.json").write_text(json.dumps({"calibration": cal, "labels": LABELS,
                                                         "baseline_op_thresholds": dict(zip(LABELS, map(float, base_thr)))}, indent=2))
    (RESULTS / "test_summary.json").write_text(json.dumps(summary, indent=2))
    pd.set_option("display.width", 250)
    print(result.round(3).to_string(index=False))
    print(summary)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("cache"); c.add_argument("--workers", type=int, default=5); c.set_defaults(fn=cmd_cache)
    sub.add_parser("baseline").set_defaults(fn=cmd_baseline)
    t = sub.add_parser("train")
    t.add_argument("--epochs", type=int, default=5); t.add_argument("--batch", type=int, default=32)
    t.add_argument("--lr", type=float, default=1e-4); t.add_argument("--max-pos-weight", type=float, default=10.0)
    t.add_argument("--rare-boost", type=float, default=4.0); t.set_defaults(fn=cmd_train)
    r = sub.add_parser("report")
    r.add_argument("--target-sensitivity", type=float, default=0.9)
    r.add_argument("--bootstrap", type=int, default=200); r.set_defaults(fn=cmd_report)
    args = parser.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()

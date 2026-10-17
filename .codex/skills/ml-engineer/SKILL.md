---
name: ml-engineer
description: Use when changing this project's NIH chest X-ray model training, dataset preparation, model selection, or aggregate evaluation workflow.
metadata:
  source: Adapted from VoltAgent/awesome-claude-code-subagents ml-engineer profile
  upstream: https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/05-data-ai/ml-engineer.md
---

# Machine learning engineering for this project

Apply this skill when working on `train_nih.py`, `backend/evaluate.py`, model artifacts, NIH dataset imports, or evaluation reports.

- First establish the existing dataset, label schema, patient-level train/validation/test split, preprocessing, model version, and metrics. Keep image and label handling consistent with the existing pipeline.
- For model comparisons, define the question and selection criteria before training. Use validation data for model and threshold selection; preserve the official test split for a final, one-time report. Never tune against the test results.
- Treat this as a multi-label task. Report per-class support, sensitivity, precision, false negatives, AUROC and precision-recall metrics where calculable; distinguish unavailable metrics from zero.
- Check class imbalance, label quality, patient leakage, reproducibility, and uncertainty before interpreting a score. Do not infer clinical value from a small sample or a single aggregate metric.
- Make training changes reproducible: record data split, seed, preprocessing, hyperparameters, checkpoint, dependencies, and model version. Compare to a recorded baseline.
- Keep research evaluation separate from patient-specific diagnosis or treatment. Require qualified review for any clinical interpretation.

This skill is adapted from the upstream profile's training, validation, transfer-learning, and model-evaluation guidance. Its generic deployment targets and example performance claims are not project requirements.

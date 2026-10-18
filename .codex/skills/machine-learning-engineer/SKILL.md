---
name: machine-learning-engineer
description: Use when changing model inference, image preprocessing, prediction APIs, serving performance, or model-version handling in this project.
metadata:
  source: Adapted from VoltAgent/awesome-claude-code-subagents machine-learning-engineer profile
  upstream: https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/categories/05-data-ai/machine-learning-engineer.md
---

# Model serving for this project

Apply this skill when changing the radiograph classifier API, model loading, inference preprocessing, or deployment configuration.

- Trace the full path from image upload through validation, preprocessing, model prediction, and response formatting before changing it.
- Preserve parity between training and inference: image mode, dimensions, scaling, channel order, label order, and model version must match the training artifact.
- Validate unsupported, corrupt, oversized, and empty inputs with clear client errors. Avoid logging image contents or other sensitive data.
- Keep model loading reusable across requests. Measure latency and memory before optimizing; do not add infrastructure or throughput targets without a stated need.
- Version model artifacts and prediction schemas so a deployment can identify which weights and preprocessing produced a result.
- Keep output language appropriate for an experimental model. Do not present predictions as a diagnosis, treatment recommendation, triage decision, or substitute for a qualified clinician.

This skill is adapted from the upstream profile's inference, reliability, versioning, and serving guidance. Its generic high-scale targets and infrastructure assumptions are not project requirements.

## graphify

## Stack

- This project is not using Supabase. Do not add Supabase dependencies, integrations, or instructions unless the user explicitly changes this decision.

This project can have a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user invokes `$graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## NIH radiograph model skills

Use these project skills when the task matches their scope:

- For NIH dataset preparation, training, model comparisons, split design, or aggregate performance analysis, read `.codex/skills/ml-engineer/SKILL.md`. For study design before a new comparison or data collection, also read `.codex/skills/experimental-design/SKILL.md`.
- For model loading, preprocessing, classification API, inference performance, or model-version changes, read `.codex/skills/machine-learning-engineer/SKILL.md`.
- For research-only evaluation reporting, intended-use limits, subgroup analysis, calibration, uncertainty, privacy, or governance, read `.codex/skills/clinical-decision-support/SKILL.md`. Apply its data gate: use aggregate or synthetic inputs for its scripts and artifacts; do not feed individual radiographs or patient-level records to those helpers.
- Use the clinical-decision-support skill only for research and aggregate documentation. Never use this project or its predictions to diagnose a person, recommend treatment, triage, or make a live clinical decision. Keep limitations and human-review requirements visible in outputs.
- These skills guide relevant work; they do not authorize external data transfers, deployment, or changes to the model's intended use.

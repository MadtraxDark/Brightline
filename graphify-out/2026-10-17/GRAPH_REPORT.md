# Graph Report - Brightline  (2026-10-17)

## Corpus Check
- 28 files · ~13,948 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .keras 2, .csv 2)

## Summary
- 216 nodes · 505 edges · 18 communities (11 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3d037704`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Session
- Data processing pipeline
- config.py
- train_nih.py
- Product architecture and safeguards
- AI pipeline evaluation
- API models and schemas
- post
- db
- 002_dataset_images.sql
- Graphify project instructions
- Commit conventions
- main.py
- init.sql
- Offline extraction and evaluation cache
- advance
- authenticated

## God Nodes (most connected - your core abstractions)
1. `db()` - 22 edges
2. `PipelineTests` - 14 edges
3. `read_json()` - 12 edges
4. `write_json()` - 12 edges
5. `sample()` - 12 edges
6. `StrictModel` - 11 edges
7. `validate_extraction()` - 11 edges
8. `get_settings()` - 10 edges
9. `load_reports()` - 10 edges
10. `evaluate()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Human validates AI suggestions` --semantically_similar_to--> `Human review of labels and difficult cases`  [INFERRED] [semantically similar]
  README.md → data/revisao_laudos.md
- `signup()` --uses--> `Credentials`  [INFERRED]
  backend/app/main.py → backend/app/models.py
- `login()` --uses--> `Credentials`  [INFERRED]
  backend/app/main.py → backend/app/models.py
- `refresh()` --uses--> `RefreshInput`  [INFERRED]
  backend/app/main.py → backend/app/models.py
- `acknowledge()` --uses--> `AcknowledgeInput`  [INFERRED]
  backend/app/main.py → backend/app/models.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Offline data preparation pipeline** — ia_dados_offline_cache, prompts_extraction_rules, data_revisao_laudos_synthetic_reports, ia_dados_supabase_import [INFERRED 0.85]

## Communities (18 total, 7 thin omitted)

### Community 0 - "Session"
Cohesion: 0.23
Nodes (11): case_detail(), cases(), clock(), current_hour(), health(), list_cases(), me(), missed() (+3 more)

### Community 1 - "Data processing pipeline"
Cohesion: 0.14
Nodes (13): load_reports(), read_json(), validate_extraction(), write_json(), identity(), load_aliases(), main(), normalize() (+5 more)

### Community 2 - "config.py"
Cohesion: 0.21
Nodes (5): get_settings(), Settings, lifespan(), main(), main()

### Community 3 - "train_nih.py"
Cohesion: 0.14
Nodes (9): fetch(), main(), stable_patient_split(), main(), make_dataset(), patient_key(), read_labels(), read_split() (+1 more)

### Community 4 - "Product architecture and safeguards"
Cohesion: 0.16
Nodes (12): FastAPI backend, FastAPI dependency, HTTPX dependency, python-dotenv dependency, Uvicorn dependency, Eurorad educational case references, Radiologia Brasileira educational reference, Synthetic imaging report review dataset (+4 more)

### Community 5 - "AI pipeline evaluation"
Cohesion: 0.25
Nodes (5): evaluate(), extraction(), PipelineTests, caller(), sample()

### Community 6 - "API models and schemas"
Cohesion: 0.19
Nodes (10): AcknowledgeInput, ActionInput, Credentials, ExtractionInput, FindingInput, GroundTruth, ImportInput, RefreshInput (+2 more)

### Community 7 - "post"
Cohesion: 0.23
Nodes (11): issue_session(), login(), logout(), no_store_auth(), password_hash(), refresh(), signed_url(), signup() (+3 more)

### Community 8 - "db"
Cohesion: 0.48
Nodes (6): acknowledge(), action(), command(), db(), import_data(), reset()

### Community 14 - "init.sql"
Cohesion: 0.29
Nodes (13): cases, cases_owner_order, dataset_images, dataset_images_labels_gin, events, events_case_order, extractions, file_links (+5 more)

### Community 15 - "Offline extraction and evaluation cache"
Cohesion: 0.29
Nodes (5): Extraction evidence validation, Offline extraction and evaluation cache, Import prepared data into Supabase, Literal evidence requirement, Radiology finding extraction rules

## Knowledge Gaps
- **8 isolated node(s):** `Graphify workflow instructions`, `Commit message instructions`, `Eurorad educational case references`, `Radiologia Brasileira educational reference`, `Extraction evidence validation` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 55 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `advance()` connect `advance` to `db`, `Session`, `main.py`, `post`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `Graphify workflow instructions`, `Commit message instructions`, `Eurorad educational case references` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Data processing pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.1417004048582996 - nodes in this community are weakly interconnected._
- **Why does `write_json()` connect `Data processing pipeline` to `AI pipeline evaluation`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `train_nih.py` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._
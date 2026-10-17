# Graph Report - Brightline  (2026-10-17)

## Corpus Check
- 33 files · ~20,341,142 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .keras 2, .csv 2)

## Summary
- 281 nodes · 621 edges · 15 communities (11 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3d037704`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Backend API routes
- Data processing pipeline
- config.py
- train_nih.py
- Product architecture and safeguards
- AI pipeline evaluation
- API models and schemas
- Supabase schema and commands
- Migration verification
- 002_dataset_images.sql
- Graphify project instructions
- Commit conventions
- SupabaseApiTests
- init.sql

## God Nodes (most connected - your core abstractions)
1. `db()` - 22 edges
2. `SupabaseApiTests` - 16 edges
3. `PipelineTests` - 14 edges
4. `get_settings()` - 12 edges
5. `read_json()` - 12 edges
6. `write_json()` - 12 edges
7. `sample()` - 12 edges
8. `StrictModel` - 11 edges
9. `validate_extraction()` - 11 edges
10. `load_reports()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Supabase-backed application architecture` --semantically_similar_to--> `Per-account row-level security isolation`  [INFERRED] [semantically similar]
  README.md → supabase/README.md
- `Human validates AI suggestions` --semantically_similar_to--> `Human review of labels and difficult cases`  [INFERRED] [semantically similar]
  README.md → data/revisao_laudos.md
- `SupabaseApiTests` --uses--> `Settings`  [INFERRED]
  tests/test_supabase_api.py → backend/app/config.py
- `SupabaseApiTests` --uses--> `SupabaseGateway`  [INFERRED]
  tests/test_supabase_api.py → backend/app/supabase.py
- `Import prepared data into Supabase` --references--> `Supabase setup and migration guide`  [EXTRACTED]
  IA_DADOS.md → supabase/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Supabase account security model** — supabase_readme_rls_isolation, supabase_readme_private_storage, supabase_readme_supabase_auth [EXTRACTED 1.00]
- **Offline data preparation pipeline** — ia_dados_offline_cache, prompts_extraction_rules, data_revisao_laudos_synthetic_reports, ia_dados_supabase_import [INFERRED 0.85]

## Communities (15 total, 4 thin omitted)

### Community 0 - "Backend API routes"
Cohesion: 0.09
Nodes (32): acknowledge(), action(), advance(), authenticated(), case_detail(), cases(), clock(), command() (+24 more)

### Community 1 - "Data processing pipeline"
Cohesion: 0.14
Nodes (13): load_reports(), read_json(), validate_extraction(), write_json(), identity(), load_aliases(), main(), normalize() (+5 more)

### Community 2 - "config.py"
Cohesion: 0.22
Nodes (4): get_settings(), lifespan(), main(), main()

### Community 3 - "train_nih.py"
Cohesion: 0.14
Nodes (9): fetch(), main(), stable_patient_split(), main(), make_dataset(), patient_key(), read_labels(), read_split() (+1 more)

### Community 4 - "Product architecture and safeguards"
Cohesion: 0.09
Nodes (21): FastAPI backend, FastAPI dependency, HTTPX dependency, python-dotenv dependency, Uvicorn dependency, Eurorad educational case references, Radiologia Brasileira educational reference, Synthetic imaging report review dataset (+13 more)

### Community 5 - "AI pipeline evaluation"
Cohesion: 0.28
Nodes (5): evaluate(), extraction(), PipelineTests, caller(), sample()

### Community 6 - "API models and schemas"
Cohesion: 0.21
Nodes (10): AcknowledgeInput, ActionInput, Credentials, ExtractionInput, FindingInput, GroundTruth, ImportInput, RefreshInput (+2 more)

### Community 7 - "Supabase schema and commands"
Cohesion: 0.27
Nodes (8): brightline_private.build_cases(), cases_owner_order, events_case_order, public.cases, public.events, public.extractions, public.reports, public.sim_state

### Community 8 - "Migration verification"
Cohesion: 0.18
Nodes (5): data, db, invalid, report, ../../.validation/node_modules/@electric-sql/pglite/dist/index.js

### Community 13 - "SupabaseApiTests"
Cohesion: 0.08
Nodes (6): Settings, SupabaseGateway, ApiClient, SupabaseApiTests, transport(), handler()

### Community 14 - "init.sql"
Cohesion: 0.29
Nodes (13): cases, cases_owner_order, dataset_images, dataset_images_labels_gin, events, events_case_order, extractions, file_links (+5 more)

## Knowledge Gaps
- **9 isolated node(s):** `../../.validation/node_modules/@electric-sql/pglite/dist/index.js`, `Graphify workflow instructions`, `Commit message instructions`, `Eurorad educational case references`, `Radiologia Brasileira educational reference` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 74 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 2 inferred relationships involving `SupabaseApiTests` (e.g. with `Settings` and `SupabaseGateway`) actually correct?**
  _`SupabaseApiTests` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../.validation/node_modules/@electric-sql/pglite/dist/index.js`, `Graphify workflow instructions`, `Commit message instructions` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend API routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08711433756805807 - nodes in this community are weakly interconnected._
- **Should `Data processing pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.14082503556187767 - nodes in this community are weakly interconnected._
- **Should `train_nih.py` be split into smaller, more focused modules?**
  _Cohesion score 0.13666666666666666 - nodes in this community are weakly interconnected._
- **Should `Product architecture and safeguards` be split into smaller, more focused modules?**
  _Cohesion score 0.09230769230769231 - nodes in this community are weakly interconnected._
- **Should `SupabaseApiTests` be split into smaller, more focused modules?**
  _Cohesion score 0.08292682926829269 - nodes in this community are weakly interconnected._
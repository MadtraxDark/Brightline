# Graph Report - Brightline  (2026-10-17)

## Corpus Check
- Corpus is ~12,605 words - fits in a single context window. You may not need a graph.

## Summary
- 226 nodes · 476 edges · 13 communities (10 shown, 3 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.88)
- Token cost: unavailable (agent usage counts were not exposed)

## Community Hubs (Navigation)
- Backend API routes
- Data processing pipeline
- Backend services
- API test harness
- Product architecture and safeguards
- AI pipeline evaluation
- API models and schemas
- Supabase schema and commands
- Migration verification
- Runtime dependencies
- Graphify project instructions
- Commit conventions

## God Nodes (most connected - your core abstractions)
1. `SupabaseApiTests` - 16 edges
2. `PipelineTests` - 14 edges
3. `read_json()` - 12 edges
4. `write_json()` - 12 edges
5. `sample()` - 12 edges
6. `StrictModel` - 11 edges
7. `SupabaseGateway` - 11 edges
8. `validate_extraction()` - 11 edges
9. `get_settings()` - 10 edges
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
- **Offline data preparation pipeline** — ia_dados_offline_cache, prompts_extraction_rules, data_revisao_laudos_synthetic_reports, ia_dados_supabase_import [INFERRED 0.85]
- **Supabase account security model** — supabase_readme_rls_isolation, supabase_readme_private_storage, supabase_readme_supabase_auth [EXTRACTED 1.00]

## Communities (13 total, 3 thin omitted)

### Community 0 - "Backend API routes"
Cohesion: 0.09
Nodes (25): acknowledge(), action(), advance(), authenticated(), case_detail(), cases(), clock(), current_hour() (+17 more)

### Community 1 - "Data processing pipeline"
Cohesion: 0.13
Nodes (13): load_reports(), read_json(), validate_extraction(), write_json(), identity(), load_aliases(), main(), normalize() (+5 more)

### Community 2 - "Backend services"
Cohesion: 0.11
Nodes (5): get_settings(), Settings, get_gateway(), lifespan(), SupabaseGateway

### Community 3 - "API test harness"
Cohesion: 0.15
Nodes (4): ApiClient, SupabaseApiTests, transport(), handler()

### Community 4 - "Product architecture and safeguards"
Cohesion: 0.12
Nodes (14): Eurorad educational case references, Radiologia Brasileira educational reference, Synthetic imaging report review dataset, Extraction evidence validation, Offline extraction and evaluation cache, Import prepared data into Supabase, Literal evidence requirement, Radiology finding extraction rules (+6 more)

### Community 5 - "AI pipeline evaluation"
Cohesion: 0.25
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

### Community 9 - "Runtime dependencies"
Cohesion: 0.53
Nodes (6): FastAPI backend, FastAPI dependency, HTTPX dependency, python-dotenv dependency, Uvicorn dependency, Project runtime dependencies

## Knowledge Gaps
- **9 isolated node(s):** `../../.validation/node_modules/@electric-sql/pglite/dist/index.js`, `Graphify workflow instructions`, `Extraction evidence validation`, `Commit message instructions`, `Eurorad educational case references` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 65 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SupabaseApiTests` connect `API test harness` to `Backend services`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `SupabaseApiTests` (e.g. with `Settings` and `SupabaseGateway`) actually correct?**
  _`SupabaseApiTests` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../.validation/node_modules/@electric-sql/pglite/dist/index.js`, `Graphify workflow instructions`, `Extraction evidence validation` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend API routes` be split into smaller, more focused modules?**
  _Cohesion score 0.09098639455782313 - nodes in this community are weakly interconnected._
- **Why does `SupabaseGateway` connect `Backend services` to `Backend API routes`, `API test harness`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Data processing pipeline` be split into smaller, more focused modules?**
  _Cohesion score 0.1329268292682927 - nodes in this community are weakly interconnected._
- **Why does `get_settings()` connect `Backend services` to `Backend API routes`, `Data processing pipeline`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
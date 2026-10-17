# Graph Report - Brightline  (2026-10-17)

## Corpus Check
- 60 files · ~71,081 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 3, .keras 2, .csv 2)

## Summary
- 447 nodes · 863 edges · 29 communities (19 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a5db7c44`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- engine.test.js
- cal.DESIGN.md
- config.py
- test_ai_pipeline.py
- Extração e avaliação do Brightline
- PipelineTests
- main.py
- App.jsx
- frontend/package.json
- 002_dataset_images.sql
- Graphify project instructions
- Commit conventions
- LandingPage.jsx
- init.sql
- scripts
- dev.mjs
- Brightline — sistema visual
- main.jsx
- Revisão dos laudos sintéticos Brightline
- dependencies
- scripts
- react
- Brightline: regras de design
- design-tools.md
- PRODUCT.md
- NIH_TENSORFLOW.md

## God Nodes (most connected - your core abstractions)
1. `db()` - 22 edges
2. `PipelineTests` - 14 edges
3. `createStore()` - 13 edges
4. `read_json()` - 12 edges
5. `write_json()` - 12 edges
6. `sample()` - 12 edges
7. `StrictModel` - 11 edges
8. `validate_extraction()` - 11 edges
9. `get_settings()` - 10 edges
10. `load_reports()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `FastAPI backend` --conceptually_related_to--> `FastAPI dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `HTTPX dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `python-dotenv dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `Uvicorn dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --references--> `Brightline prototype`  [EXTRACTED]
  backend/README.md → README.md

## Import Cycles
- None detected.

## Communities (29 total, 10 thin omitted)

### Community 0 - "engine.test.js"
Cohesion: 0.07
Nodes (41): acknowledge(), advance(), getCase(), getStats(), listCases(), listMissed(), matches(), presentCase() (+33 more)

### Community 1 - "cal.DESIGN.md"
Cohesion: 0.05
Nodes (38): Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Collapsing Strategy, Colors, Components (+30 more)

### Community 2 - "config.py"
Cohesion: 0.22
Nodes (4): get_settings(), Settings, lifespan(), main()

### Community 3 - "test_ai_pipeline.py"
Cohesion: 0.08
Nodes (23): load_reports(), read_json(), validate_extraction(), write_json(), identity(), load_aliases(), main(), normalize() (+15 more)

### Community 4 - "Extração e avaliação do Brightline"
Cohesion: 0.10
Nodes (18): API Brightline, Executar, Persistência, Arquivos, Executar no PowerShell, Extração e avaliação do Brightline, Importar no PostgreSQL local, Interpretar a avaliação (+10 more)

### Community 5 - "PipelineTests"
Cohesion: 0.25
Nodes (5): evaluate(), extraction(), PipelineTests, caller(), sample()

### Community 6 - "main.py"
Cohesion: 0.06
Nodes (42): acknowledge(), action(), advance(), authenticated(), case_detail(), cases(), clock(), command() (+34 more)

### Community 7 - "App.jsx"
Cohesion: 0.13
Nodes (26): App(), afterMutation(), SUMMARY, CaseDetail(), CaseList(), normalize(), urgencyOrder, LEVELS (+18 more)

### Community 8 - "frontend/package.json"
Cohesion: 0.20
Nodes (9): devDependencies, vite, @vitejs/plugin-react, name, private, type, version, vite (+1 more)

### Community 13 - "LandingPage.jsx"
Cohesion: 0.25
Nodes (8): examples, LandingPage(), ProductPreview(), questions, easeOutCubic(), useLenisScroll(), navigateToAnchor(), lenis

### Community 14 - "init.sql"
Cohesion: 0.29
Nodes (13): cases, cases_owner_order, dataset_images, dataset_images_labels_gin, events, events_case_order, extractions, file_links (+5 more)

### Community 15 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, dev:backend, dev:frontend, install:frontend (+2 more)

### Community 16 - "dev.mjs"
Cohesion: 0.20
Nodes (6): children, localPython, root, start(), stop(), vite

### Community 17 - "Brightline — sistema visual"
Cohesion: 0.22
Nodes (7): Referência visual, Brightline — sistema visual, Direção aprovada, Hierarquia, Identidade, Referências, Tipografia e layout

### Community 18 - "main.jsx"
Cohesion: 0.25
Nodes (4): App, @fontsource/atkinson-hyperlegible-next, @fontsource/source-serif-4, react-dom

### Community 19 - "Revisão dos laudos sintéticos Brightline"
Cohesion: 0.29
Nodes (6): Cobertura dos casos difíceis, Composição, Inventário para revisão do gabarito, Referências consultadas, Revisão dos laudos sintéticos Brightline, Semelhanças para revisar com Bruno

### Community 20 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, @fontsource/atkinson-hyperlegible-next, @fontsource/source-serif-4, lenis, lucide-react, react, react-dom

### Community 21 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, preview, test, test:engine, test:store

### Community 22 - "react"
Cohesion: 0.33
Nodes (5): store, escalatedSet, getRecentlyEscalated(), useRecentlyEscalated(), react

## Knowledge Gaps
- **7 isolated node(s):** `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency`, `HTTPX dependency`, `python-dotenv dependency` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 175 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `frontend/package.json`, `main.jsx`, `LandingPage.jsx`, `App.jsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `engine.test.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06829573934837092 - nodes in this community are weakly interconnected._
- **Why does `scripts` connect `scripts` to `frontend/package.json`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Should `cal.DESIGN.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies` to `frontend/package.json`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Should `test_ai_pipeline.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0777928539122569 - nodes in this community are weakly interconnected._
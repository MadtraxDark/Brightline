# Graph Report - Brightline  (2026-10-17)

## Corpus Check
- 60 files · ~27,844 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .css 4, (none) 3, .example 1)

## Summary
- 461 nodes · 847 edges · 25 communities (16 shown, 9 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bb8f2698`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Backend API routes
- test_ai_pipeline.py
- test_supabase_api.py
- cal.DESIGN.md
- FastAPI backend
- App.jsx
- dev.mjs
- LandingPage.jsx
- engine.test.js
- frontend/package.json
- Graphify project instructions
- Commit conventions
- scripts
- Brightline — sistema visual
- dependencies
- main.jsx
- scripts
- useLenisScroll.js
- Brightline: regras de design
- design-tools.md
- LANDING.md
- PRODUCT.md

## God Nodes (most connected - your core abstractions)
1. `SupabaseApiTests` - 16 edges
2. `PipelineTests` - 14 edges
3. `createStore()` - 13 edges
4. `read_json()` - 12 edges
5. `write_json()` - 12 edges
6. `sample()` - 12 edges
7. `StrictModel` - 11 edges
8. `SupabaseGateway` - 11 edges
9. `validate_extraction()` - 11 edges
10. `react` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Aplicar ao projeto` --references--> `cases()`  [INFERRED]
  backend/supabase/README.md → backend/app/main.py
- `FastAPI backend` --conceptually_related_to--> `FastAPI dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `HTTPX dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `python-dotenv dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt
- `FastAPI backend` --conceptually_related_to--> `Uvicorn dependency`  [INFERRED]
  backend/README.md → backend/requirements.txt

## Import Cycles
- None detected.

## Communities (25 total, 9 thin omitted)

### Community 0 - "Backend API routes"
Cohesion: 0.07
Nodes (36): acknowledge(), action(), advance(), authenticated(), case_detail(), cases(), clock(), current_hour() (+28 more)

### Community 1 - "test_ai_pipeline.py"
Cohesion: 0.10
Nodes (18): load_reports(), read_json(), validate_extraction(), write_json(), evaluate(), identity(), load_aliases(), main() (+10 more)

### Community 2 - "test_supabase_api.py"
Cohesion: 0.07
Nodes (9): get_settings(), Settings, get_gateway(), lifespan(), SupabaseGateway, ApiClient, SupabaseApiTests, transport() (+1 more)

### Community 3 - "cal.DESIGN.md"
Cohesion: 0.05
Nodes (38): Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Collapsing Strategy, Colors, Components (+30 more)

### Community 4 - "FastAPI backend"
Cohesion: 0.06
Nodes (32): Cobertura dos casos difíceis, Composição, Inventário para revisão do gabarito, Referências consultadas, Revisão dos laudos sintéticos Brightline, Semelhanças para revisar com Bruno, Backend Brightline, Configuração (+24 more)

### Community 5 - "App.jsx"
Cohesion: 0.13
Nodes (26): App(), afterMutation(), SUMMARY, CaseDetail(), CaseList(), normalize(), urgencyOrder, LEVELS (+18 more)

### Community 6 - "dev.mjs"
Cohesion: 0.11
Nodes (10): data, db, invalid, report, children, localPython, root, start() (+2 more)

### Community 7 - "LandingPage.jsx"
Cohesion: 0.18
Nodes (11): benefits, BenefitsCarousel(), LandingHeader(), links, examples, LandingPage(), ProductPreview(), questions (+3 more)

### Community 8 - "engine.test.js"
Cohesion: 0.06
Nodes (45): acknowledge(), advance(), getCase(), getStats(), listCases(), listMissed(), matches(), presentCase() (+37 more)

### Community 9 - "frontend/package.json"
Cohesion: 0.20
Nodes (9): devDependencies, vite, @vitejs/plugin-react, name, private, type, version, vite (+1 more)

### Community 13 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, dev:backend, dev:frontend, install:frontend (+2 more)

### Community 14 - "Brightline — sistema visual"
Cohesion: 0.22
Nodes (7): Referência visual, Brightline — sistema visual, Direção aprovada, Hierarquia, Identidade, Referências, Tipografia e layout

### Community 15 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, @fontsource/atkinson-hyperlegible-next, @fontsource/source-serif-4, gsap, lenis, lucide-react, react, react-dom

### Community 16 - "main.jsx"
Cohesion: 0.25
Nodes (4): App, @fontsource/atkinson-hyperlegible-next, @fontsource/source-serif-4, react-dom

### Community 17 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, preview, test, test:engine, test:store

### Community 18 - "useLenisScroll.js"
Cohesion: 0.50
Nodes (4): easeOutCubic(), useLenisScroll(), navigateToAnchor(), lenis

## Knowledge Gaps
- **7 isolated node(s):** `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency`, `HTTPX dependency`, `python-dotenv dependency` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 191 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Configurar o Supabase` connect `FastAPI backend` to `Backend API routes`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `SupabaseApiTests` (e.g. with `Settings` and `SupabaseGateway`) actually correct?**
  _`SupabaseApiTests` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend API routes` be split into smaller, more focused modules?**
  _Cohesion score 0.0675990675990676 - nodes in this community are weakly interconnected._
- **Why does `Aplicar ao projeto` connect `Backend API routes` to `FastAPI backend`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `test_ai_pipeline.py` be split into smaller, more focused modules?**
  _Cohesion score 0.09701928696668614 - nodes in this community are weakly interconnected._
- **Should `test_supabase_api.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06745098039215686 - nodes in this community are weakly interconnected._
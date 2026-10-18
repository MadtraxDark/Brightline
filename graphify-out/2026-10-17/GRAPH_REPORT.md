# Graph Report - Brightline  (2026-10-17)

## Corpus Check
- 146 files · ~122,912 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: .keras 6, .css 5, (none) 4)

## Summary
- 1057 nodes · 2071 edges · 61 communities (43 shown, 18 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `81b37242`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CaseDetail.jsx
- cal.DESIGN.md
- check-data.js
- test_ai_pipeline.py
- Extração e avaliação do Brightline
- session.js
- main.py
- store.js
- frontend/package.json
- 002_dataset_images.sql
- Graphify project instructions
- report_analysis.py
- Commit conventions
- engine.test.js
- init.sql
- scripts
- store.test.js
- Brightline — sistema visual
- Evaluation.jsx
- Revisão dos laudos sintéticos Brightline
- LandingPage.jsx
- scripts/evaluate.js
- InputError
- Brightline: regras de design
- design-tools.md
- PRODUCT.md
- NIH_TENSORFLOW.md
- lib/evaluate.js
- LANDING.md
- doe_designs.py
- scripts
- Clinical Decision-Support Research and Evaluation
- GRADE Evidence Profiles
- Study Reporting and Appraisal
- Experimental Design
- Aggregate Model and Biomarker Evaluation
- Survival-Analysis Planning
- Aggregate Cohort Evaluation
- Decision-Logic Traceability
- Shell
- Privacy, De-identification, and Disclosure
- Authoritative Source Ledger
- Design Types and the Replication Structure
- Safety and Scope
- Security Validation Record
- Sequential and Adaptive Designs
- Clinical Decision-Support References
- Regulatory and Governance Context
- RadiographClassifier.jsx
- NavigationHighlight
- Avaliação do EfficientNetB0 NIH ChestX-ray14
- machine-learning-engineer/SKILL.md
- ml-engineer/SKILL.md

## God Nodes (most connected - your core abstractions)
1. `InputError` - 36 edges
2. `IssueLog` - 23 edges
3. `db()` - 23 edges
4. `load_json_object()` - 21 edges
5. `require_nonempty_text()` - 20 edges
6. `require_list()` - 19 edges
7. `react` - 19 edges
8. `analyze_report()` - 18 edges
9. `Shell()` - 18 edges
10. `CaseDetail()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Extração, privacidade e fila` --references--> `cases()`  [INFERRED]
  backend/docs/REPORT_ANALYSIS.md → backend/app/main.py
- `Full factorial` --references--> `full_factorial()`  [INFERRED]
  .codex/skills/experimental-design/references/factorial_and_doe.md → .codex/skills/experimental-design/scripts/doe_designs.py
- `Screening designs` --references--> `plackett_burman()`  [INFERRED]
  .codex/skills/experimental-design/references/factorial_and_doe.md → .codex/skills/experimental-design/scripts/doe_designs.py
- `Space-filling designs` --references--> `latin_hypercube()`  [INFERRED]
  .codex/skills/experimental-design/references/factorial_and_doe.md → .codex/skills/experimental-design/scripts/doe_designs.py
- `Documentation` --references--> `stratified_block_randomization()`  [INFERRED]
  .codex/skills/experimental-design/references/randomization_and_blocking.md → .codex/skills/experimental-design/scripts/randomization.py

## Import Cycles
- None detected.

## Communities (61 total, 18 thin omitted)

### Community 0 - "CaseDetail.jsx"
Cohesion: 0.05
Nodes (60): acknowledge(), advance(), getCase(), getStats(), listCases(), listMissed(), registerAction(), reset() (+52 more)

### Community 1 - "cal.DESIGN.md"
Cohesion: 0.05
Nodes (38): Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Collapsing Strategy, Colors, Components (+30 more)

### Community 2 - "check-data.js"
Cohesion: 0.09
Nodes (19): byId, byUrgency, cache, checkList(), confidences, dataDir, deadlines, doctors (+11 more)

### Community 3 - "test_ai_pipeline.py"
Cohesion: 0.05
Nodes (33): get_settings(), Settings, _extract_report(), lifespan(), load_reports(), read_json(), validate_extraction(), write_json() (+25 more)

### Community 4 - "Extração e avaliação do Brightline"
Cohesion: 0.08
Nodes (23): API Brightline, Executar, Persistência, Análise de laudos, Classificação de imagem independente, Extração, privacidade e fila, Requisição, Resposta (+15 more)

### Community 5 - "session.js"
Cohesion: 0.19
Nodes (16): App(), RequireAuth(), SUMMARY, Login(), onSubmit(), RadiographClassifier(), Register(), PROFILE_KEY (+8 more)

### Community 6 - "main.py"
Cohesion: 0.06
Nodes (45): acknowledge(), action(), advance(), analyze_report(), authenticated(), case_detail(), cases(), classify_radiograph() (+37 more)

### Community 7 - "store.js"
Cohesion: 0.14
Nodes (20): acknowledge(), advance(), clone(), loadCases(), OPEN_FOR_ESCALATION, registerAction(), replaceCase(), requireCase() (+12 more)

### Community 8 - "frontend/package.json"
Cohesion: 0.09
Nodes (16): devDependencies, vite, @vitejs/plugin-react, name, private, type, version, ErrorBoundary (+8 more)

### Community 11 - "report_analysis.py"
Cohesion: 0.06
Nodes (14): compare(), find_text_classes(), infer(), initialize_model(), laterality(), load_model(), _model(), model_metadata() (+6 more)

### Community 13 - "engine.test.js"
Cohesion: 0.18
Nodes (6): cache, dataDir, deepFreeze(), fixtureDir, reports, rootDir

### Community 14 - "init.sql"
Cohesion: 0.21
Nodes (17): cases, cases_owner_order, dataset_images, dataset_images_labels_gin, events, events_case_order, extractions, file_links (+9 more)

### Community 15 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, dev:backend, dev:frontend, install:frontend (+2 more)

### Community 16 - "store.test.js"
Cohesion: 0.13
Nodes (11): STORAGE_KEY, fakeTimers(), fixtureData, fixtureDir, openStore(), children, localPython, root (+3 more)

### Community 17 - "Brightline — sistema visual"
Cohesion: 0.13
Nodes (13): Referência visual, Barras de rolagem, Brightline — sistema visual, Cadastro, Continuidade da navegação, Direção aprovada, Hierarquia, Identidade (+5 more)

### Community 18 - "Evaluation.jsx"
Cohesion: 0.19
Nodes (11): cards, Evaluation(), FindingList(), precisionOverall, recallCritical, recallOverall, swapped, swappedKey() (+3 more)

### Community 19 - "Revisão dos laudos sintéticos Brightline"
Cohesion: 0.29
Nodes (6): Cobertura dos casos difíceis, Composição, Inventário para revisão do gabarito, Referências consultadas, Revisão dos laudos sintéticos Brightline, Semelhanças para revisar com Bruno

### Community 20 - "LandingPage.jsx"
Cohesion: 0.16
Nodes (14): benefits, BenefitsCarousel(), LandingHeader(), links, examples, LandingPage(), ProductPreview(), questions (+6 more)

### Community 21 - "scripts/evaluate.js"
Cohesion: 0.18
Nodes (8): cache, computed, current, dataDir, found, next, reports, write

### Community 22 - "InputError"
Cohesion: 0.09
Nodes (46): _build_table(), _format_count(), main(), _to_csv(), _to_markdown(), ensure_no_person_level_keys(), finite_number(), InputError (+38 more)

### Community 29 - "lib/evaluate.js"
Cohesion: 0.27
Nodes (5): byReportId(), computeEvaluation(), listItem(), normalizeName(), sameFinding()

### Community 37 - "doe_designs.py"
Cohesion: 0.06
Nodes (40): Choosing a design, Factorial and Design-of-Experiments (DOE), Fractional factorial, Full factorial, Resolution and aliasing, Response-surface designs, Screening designs, Space-filling designs (+32 more)

### Community 38 - "scripts"
Cohesion: 0.08
Nodes (24): dependencies, @fontsource/atkinson-hyperlegible-next, @fontsource/source-serif-4, gsap, lenis, lucide-react, react, react-dom (+16 more)

### Community 40 - "Clinical Decision-Support Research and Evaluation"
Cohesion: 0.09
Nodes (21): 1. Frame the Research Question, 2. Select the Artifact, 3. Run Locally, 4. Human Review, Aggregate Model and Biomarker Evaluation, Citing Scientific Agent Skills, Clinical Decision-Support Research and Evaluation, Cohort Tables (+13 more)

### Community 41 - "GRADE Evidence Profiles"
Cohesion: 0.10
Nodes (19): Certainty Domains, Dissemination Bias (Publication Bias), Effect, Evidence to Decision, Final Certainty, GRADE Evidence Profiles, Helper, Imprecision (+11 more)

### Community 43 - "Study Reporting and Appraisal"
Cohesion: 0.12
Nodes (15): AI Diagnostic Accuracy, AI Trial Protocols and Reports, Biomarker Studies, Cross-Cutting Reporting, Early Live Evaluation, First Principle, Observational Data, Prediction Models (+7 more)

### Community 44 - "Experimental Design"
Cohesion: 0.12
Nodes (15): Choosing a design, Citing Scientific Agent Skills, DOE matrices — `scripts/doe_designs.py`, Experimental Design, Generating the design, Installation, Key references, Overview (+7 more)

### Community 46 - "Aggregate Model and Biomarker Evaluation"
Cohesion: 0.13
Nodes (14): Aggregate Evaluator, Aggregate Model and Biomarker Evaluation, Analytical and Clinical Questions, Biomarker-Specific Controls, Boundary, Calibration, Change Control and Monitoring, Define the Target (+6 more)

### Community 47 - "Survival-Analysis Planning"
Cohesion: 0.14
Nodes (13): Bias and Missingness, Biomarker Evaluation, Competing Risks, Descriptive Estimation, Endpoint Definition, Group Comparisons, Plan Validator, Prediction Models (+5 more)

### Community 48 - "Aggregate Cohort Evaluation"
Cohesion: 0.15
Nodes (12): Aggregate Cohort Evaluation, Biomarker Cohorts, Confounding and Bias, Disclosure Controls, Effect Estimation, Interpretation Template, Participant Flow, Protocol Before Results (+4 more)

### Community 49 - "Decision-Logic Traceability"
Cohesion: 0.17
Nodes (11): Allowed Node Types, Change Control, Decision-Logic Traceability, Matrix Metadata, Matrix Purpose, Per Node, Required Fields, Rule-Writing Guidance (+3 more)

### Community 51 - "Shell"
Cohesion: 0.17
Nodes (6): crumb(), Shell(), ProfileMenu(), Settings(), saveProfile(), logout()

### Community 52 - "Privacy, De-identification, and Disclosure"
Cohesion: 0.18
Nodes (10): Actual-Knowledge and Residual-Risk Review, Aggregate Disclosure, Boundary, Expert Determination Record, HHS Methods, Output Language, Privacy, De-identification, and Disclosure, Safe Harbor Categories (+2 more)

### Community 53 - "Authoritative Source Ledger"
Cohesion: 0.18
Nodes (10): AI and Clinical-Study Reporting, Authoritative Source Ledger, Cohort, Survival, and Biomarker Methods, Deliberately Out of Scope, FDA: CDS and AI-Enabled Devices, GRADE, ICH, ONC / HTI-1 (+2 more)

### Community 54 - "Design Types and the Replication Structure"
Cohesion: 0.20
Nodes (9): Cluster / group-randomized designs, Completely randomized design, Design Types and the Replication Structure, Latin square, Nested designs and pseudoreplication, Randomized complete block design, Repeated-measures and crossover, Split-plot designs (+1 more)

### Community 55 - "Safety and Scope"
Cohesion: 0.22
Nodes (8): Audit Trail, Human Review Matrix, Intended Use, Prohibited Use, Required Intended-Use Elements, Safe Language, Safety and Scope, Stop Conditions

### Community 56 - "Security Validation Record"
Cohesion: 0.25
Nodes (7): Accepted LOW Findings, Baseline, Historical July 2026 Scan Results, Remediation, Reproduction, Security Validation Record, September 2026 Maintenance

### Community 57 - "Sequential and Adaptive Designs"
Cohesion: 0.25
Nodes (7): Adaptive designs, Group-sequential designs, Practical checklist, Sequential and Adaptive Designs, Tooling, When to use them, Why naive peeking fails

### Community 58 - "Clinical Decision-Support References"
Cohesion: 0.29
Nodes (6): Assets, Boundary, Clinical Decision-Support References, Method Selection, Navigation, Scripts

### Community 59 - "Regulatory and Governance Context"
Cohesion: 0.29
Nodes (6): FDA AI-Enabled Device Lifecycle, FDA Clinical Decision Support, Governance Crosswalk, ICH E6(R3), E9, and E9(R1), ONC HTI-1 Transparency, Regulatory and Governance Context

### Community 60 - "RadiographClassifier.jsx"
Cohesion: 0.29
Nodes (5): API_URL, LABELS, PT, classify(), readError()

### Community 61 - "NavigationHighlight"
Cohesion: 0.47
Nodes (5): NavigationHighlight(), move(), snap(), stop(), transition()

### Community 62 - "Avaliação do EfficientNetB0 NIH ChestX-ray14"
Cohesion: 0.40
Nodes (4): Avaliação do EfficientNetB0 NIH ChestX-ray14, Casos reservados e erros, Interpretação e limites, Métricas no subconjunto oficial de teste

## Knowledge Gaps
- **7 isolated node(s):** `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency`, `HTTPX dependency`, `python-dotenv dependency` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 514 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cases()` connect `main.py` to `Extração e avaliação do Brightline`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `InputError` (e.g. with `main()` and `main()`) actually correct?**
  _`InputError` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Graphify workflow instructions`, `Commit message instructions`, `FastAPI dependency` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `CaseDetail.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05465765501028504 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `LandingPage.jsx` to `CaseDetail.jsx`, `session.js`, `frontend/package.json`, `Evaluation.jsx`, `Shell`, `RadiographClassifier.jsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Should `cal.DESIGN.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Why does `react` connect `LandingPage.jsx` to `CaseDetail.jsx`, `session.js`, `frontend/package.json`, `Shell`, `RadiographClassifier.jsx`, `NavigationHighlight`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
# Graph Report - Brightline (2026-10-18)

## Corpus Check

- 186 files · ~174,670 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 6, .css 3, .example 1)

## Summary

- 1369 nodes · 2835 edges · 86 communities (65 shown, 21 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 84 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `813a079e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- selectors.js
- cal.DESIGN.md
- check-data.js
- test_ai_pipeline.py
- Extração e avaliação do Brightline
- session.js
- db
- react
- frontend/package.json
- 002_dataset_images.sql
- Graphify project instructions
- report_analysis.py
- Commit conventions
- experiment.py
- init.sql
- scripts
- store.test.js
- Brightline — sistema visual
- Evaluation.jsx
- Revisão dos laudos sintéticos Brightline
- api.js
- scripts/evaluate.js
- InputError
- Brightline: regras de design
- design-tools.md
- PRODUCT.md
- CaseDetail.jsx
- CaseList.jsx
- LANDING.md
- doe_designs.py
- App.jsx
- test_auth.py
- Clinical Decision-Support Research and Evaluation
- GRADE Evidence Profiles
- main.py
- Study Reporting and Appraisal
- Experimental Design
- Session
- Aggregate Model and Biomarker Evaluation
- Survival-Analysis Planning
- Aggregate Cohort Evaluation
- Decision-Logic Traceability
- models.py
- DashboardShell.jsx
- Privacy, De-identification, and Disclosure
- Authoritative Source Ledger
- Design Types and the Replication Structure
- Safety and Scope
- Security Validation Record
- Sequential and Adaptive Designs
- Clinical Decision-Support References
- Regulatory and Governance Context
- ref_node_assert
- list_dataset_images
- dashboardApi.js
- machine-learning-engineer/SKILL.md
- ml-engineer/SKILL.md
- analyze_report
- createStore
- lib/evaluate.js
- authenticated
- ExamViewer
- radiographApi.js
- selectors.test.js
- test_classifier_torchxrayvision.py
- Brightline: regras de design (v2)
- infer
- engine.test.js
- FakeConnection
- sidebarPref.test.js
- store.js
- run-tests.js
- escalationPath.test.js
- patientLabel.js
- classification-audit.md
- report-image.md

## God Nodes (most connected - your core abstractions)

1. `InputError` - 36 edges
2. `db()` - 33 edges
3. `react` - 27 edges
4. `Shell()` - 25 edges
5. `scripts` - 24 edges
6. `CaseDetail()` - 24 edges
7. `IssueLog` - 23 edges
8. `CaseList()` - 22 edges
9. `load_json_object()` - 21 edges
10. `lucide-react` - 21 edges

## Surprising Connections (you probably didn't know these)

- `Fluxo verificado` --references--> `infer()` [INFERRED]
  docs/classification-audit.md → backend/app/report_analysis.py
- `Urgência: nunca só cor` --references--> `UrgencyBadge()` [INFERRED]
  brightline-design.md → frontend/src/components/UrgencyBadge.jsx
- `Regras de trabalho para o Cursor` --references--> `useStore()` [INFERRED]
  brightline-design.md → frontend/src/store/useStore.js
- `Arquitetura` --references--> `files()` [INFERRED]
  docs/DATABASE_API.md → scripts/check-colors.js
- `Extração, privacidade e fila` --references--> `files()` [INFERRED]
  backend/docs/REPORT_ANALYSIS.md → scripts/check-colors.js

## Import Cycles

- None detected.

## Communities (86 total, 21 thin omitted)

### Community 0 - "selectors.js"

Cohesion: 0.20
Nodes (19): currentTarget(), getMissed(), timeRemaining(), buildNextDeadlineCard(), buildSidebarItems(), missedCount(), PRIORITY, fold() (+11 more)

### Community 1 - "cal.DESIGN.md"

Cohesion: 0.05
Nodes (38): Border Radius Scale, Brand & Accent, Breakpoints, Buttons, Cards & Containers, Collapsing Strategy, Colors, Components (+30 more)

### Community 2 - "check-data.js"

Cohesion: 0.09
Nodes (21): byId, byUrgency, cache, checkList(), confidences, contacts, dataDir, deadlines (+13 more)

### Community 3 - "test_ai_pipeline.py"

Cohesion: 0.06
Nodes (34): get_settings(), Settings, _extract_report(), lifespan(), load_reports(), read_json(), validate_extraction(), write_json() (+26 more)

### Community 4 - "Extração e avaliação do Brightline"

Cohesion: 0.05
Nodes (36): API Brightline, Executar, Persistência, Análise de laudos, Classificação de imagem independente, Extração, privacidade e fila, Requisição, Resposta (+28 more)

### Community 5 - "session.js"

Cohesion: 0.16
Nodes (24): App(), RequireAuth(), Login(), onSubmit(), Register(), PROFILE_KEY, AUTH_BASE, authRequest() (+16 more)

### Community 6 - "db"

Cohesion: 0.23
Nodes (11): dataset_image_signed_url(), download_file(), issue_session(), login(), logout(), no_store_auth(), refresh(), report_radiograph_url() (+3 more)

### Community 7 - "react"

Cohesion: 0.13
Nodes (19): benefits, BenefitsCarousel(), FaqItem(), LandingHeader(), links, LandingPage(), previewState, ProductPreview() (+11 more)

### Community 8 - "frontend/package.json"

Cohesion: 0.04
Nodes (47): dependencies, @fontsource/atkinson-hyperlegible-next, @fontsource/source-serif-4, gsap, lenis, lucide-react, react, react-dom (+39 more)

### Community 11 - "report_analysis.py"

Cohesion: 0.24
Nodes (7): compare(), find_text_classes(), initialize_model(), laterality(), load_model(), _model(), model_metadata()

### Community 13 - "experiment.py"

Cohesion: 0.12
Nodes (22): auc_ap(), augment(), bootstrap_ci(), build_table(), cmd_baseline(), cmd_cache(), cmd_report(), cmd_train() (+14 more)

### Community 14 - "init.sql"

Cohesion: 0.13
Nodes (25): cases, cases_owner_order, dataset_image_analyses, dataset_image_analyses_result_gin, dataset_image_links, dataset_image_links_expiry, dataset_images, dataset_images_labels_gin (+17 more)

### Community 15 - "scripts"

Cohesion: 0.09
Nodes (22): devDependencies, husky, lint-staged, prettier, lint-staged, **/*.{js,jsx,cjs,mjs,ts,tsx,json,jsonc,css,scss,md,mdx,html,yml,yaml}, name, private (+14 more)

### Community 16 - "store.test.js"

Cohesion: 0.16
Nodes (9): allowed, hits, source, children, localPython, root, start(), stop() (+1 more)

### Community 17 - "Brightline — sistema visual"

Cohesion: 0.13
Nodes (13): Referência visual, Barras de rolagem, Brightline — sistema visual, Cadastro, Continuidade da navegação, Direção aprovada, Hierarquia, Identidade (+5 more)

### Community 18 - "Evaluation.jsx"

Cohesion: 0.20
Nodes (10): cards, FindingList(), precisionOverall, recallCritical, recallOverall, swapped, swappedKey(), formatPercent() (+2 more)

### Community 19 - "Revisão dos laudos sintéticos Brightline"

Cohesion: 0.29
Nodes (6): Cobertura dos casos difíceis, Composição, Inventário para revisão do gabarito, Referências consultadas, Revisão dos laudos sintéticos Brightline, Semelhanças para revisar com Bruno

### Community 20 - "api.js"

Cohesion: 0.10
Nodes (19): advance(), getStats(), listCases(), listMissed(), reset(), DemoClock(), onAdvance(), onReset() (+11 more)

### Community 21 - "scripts/evaluate.js"

Cohesion: 0.18
Nodes (8): cache, computed, current, dataDir, found, next, reports, write

### Community 22 - "InputError"

Cohesion: 0.09
Nodes (46): _build_table(), _format_count(), main(), _to_csv(), _to_markdown(), ensure_no_person_level_keys(), finite_number(), InputError (+38 more)

### Community 23 - "Brightline: regras de design"

Cohesion: 0.50
Nodes (3): Brightline: regras de design, Contrato assumido em `src/api.js`, Lista clínica de casos

### Community 26 - "CaseDetail.jsx"

Cohesion: 0.17
Nodes (14): acknowledge(), getCase(), registerAction(), CaseDetail(), run(), submitAction(), goBack(), STEP_ICONS (+6 more)

### Community 29 - "CaseList.jsx"

Cohesion: 0.13
Nodes (22): CaseList(), onStageKeyDown(), nextStage(), OVERVIEW_STAGES, QUEUE_STAGES, statusDeviation(), useReducedMotion(), ClinicalQueue() (+14 more)

### Community 37 - "doe_designs.py"

Cohesion: 0.06
Nodes (40): Choosing a design, Factorial and Design-of-Experiments (DOE), Fractional factorial, Full factorial, Resolution and aliasing, Response-surface designs, Screening designs, Space-filling designs (+32 more)

### Community 38 - "App.jsx"

Cohesion: 0.15
Nodes (18): crumb(), LANES, Overview(), applyView(), Shell(), Evaluation(), ProfileMenu(), SectionTransition() (+10 more)

### Community 39 - "test_auth.py"

Cohesion: 0.17
Nodes (6): password_hash(), signup(), verify_password(), SignupInput, AuthDatabaseTests, AuthPolicyTests

### Community 40 - "Clinical Decision-Support Research and Evaluation"

Cohesion: 0.09
Nodes (21): 1. Frame the Research Question, 2. Select the Artifact, 3. Run Locally, 4. Human Review, Aggregate Model and Biomarker Evaluation, Citing Scientific Agent Skills, Clinical Decision-Support Research and Evaluation, Cohort Tables (+13 more)

### Community 41 - "GRADE Evidence Profiles"

Cohesion: 0.10
Nodes (19): Certainty Domains, Dissemination Bias (Publication Bias), Effect, Evidence to Decision, Final Certainty, GRADE Evidence Profiles, Helper, Imprecision (+11 more)

### Community 42 - "main.py"

Cohesion: 0.15
Nodes (6): acknowledge(), action(), command(), health(), import_data(), validation_error()

### Community 43 - "Study Reporting and Appraisal"

Cohesion: 0.12
Nodes (15): AI Diagnostic Accuracy, AI Trial Protocols and Reports, Biomarker Studies, Cross-Cutting Reporting, Early Live Evaluation, First Principle, Observational Data, Prediction Models (+7 more)

### Community 44 - "Experimental Design"

Cohesion: 0.12
Nodes (15): Choosing a design, Citing Scientific Agent Skills, DOE matrices — `scripts/doe_designs.py`, Experimental Design, Generating the design, Installation, Key references, Overview (+7 more)

### Community 45 - "Session"

Cohesion: 0.21
Nodes (18): case_detail(), cases(), classify_dataset_image(), clock(), current_hour(), dataset_image_content(), db(), get_dataset_image() (+10 more)

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

### Community 50 - "models.py"

Cohesion: 0.23
Nodes (10): AcknowledgeInput, ActionInput, Credentials, ExtractionInput, FindingInput, GroundTruth, ImportInput, RefreshInput (+2 more)

### Community 51 - "DashboardShell.jsx"

Cohesion: 0.16
Nodes (13): crumb(), DashboardShell(), Overview(), SUMMARY, summaryValue(), NavigationHighlight(), move(), snap() (+5 more)

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

### Community 60 - "ref_node_assert"

Cohesion: 0.17
Nodes (5): cases, isLunaVisible(), PUBLIC_ROUTES, splitEvidence(), joined()

### Community 61 - "list_dataset_images"

Cohesion: 0.10
Nodes (5): advance(), list_dataset_images(), Connection, DatasetImageApiTests, Result

### Community 62 - "dashboardApi.js"

Cohesion: 0.32
Nodes (7): closeCase(), confirmRead(), dashboardCase(), getCase(), getStats(), NETWORK_ERROR, registerAction()

### Community 65 - "analyze_report"

Cohesion: 0.32
Nodes (3): analyze_report(), classify_radiograph(), _read_pdf()

### Community 66 - "createStore"

Cohesion: 0.18
Nodes (10): createStore(), commit(), emit(), freshState(), persist(), readState(), fakeTimers(), fixtureData (+2 more)

### Community 67 - "lib/evaluate.js"

Cohesion: 0.60
Nodes (5): byReportId(), computeEvaluation(), listItem(), normalizeName(), sameFinding()

### Community 71 - "ExamViewer"

Cohesion: 0.12
Nodes (15): ExamViewer(), ask(), close(), CaseChat(), send(), CaseChatModal(), LunaPanel(), LunaWidget() (+7 more)

### Community 72 - "radiographApi.js"

Cohesion: 0.17
Nodes (20): LABELS, PT, RadiographClassifier(), classify(), PATHOLOGIES, RadiographLibrary(), chooseImage(), classifySelected() (+12 more)

### Community 73 - "selectors.test.js"

Cohesion: 0.19
Nodes (13): acknowledge(), advance(), clone(), loadCases(), OPEN_FOR_ESCALATION, registerAction(), replaceCase(), requireCase() (+5 more)

### Community 75 - "Brightline: regras de design (v2)"

Cohesion: 0.14
Nodes (13): Antes de dar uma tela por pronta, Brightline: regras de design (v2), Componentes, Conceito, Densidade de texto, Estrutura atual da aplicação, Peso visual, Proibido (+5 more)

### Community 76 - "infer"

Cohesion: 0.22
Nodes (3): infer(), preprocess(), ReportAnalysisTests

### Community 77 - "engine.test.js"

Cohesion: 0.18
Nodes (6): cache, dataDir, deepFreeze(), fixtureDir, reports, rootDir

### Community 78 - "FakeConnection"

Cohesion: 0.20
Nodes (3): FakeConnection, FakeResult, ReportEndpointTests

### Community 79 - "sidebarPref.test.js"

Cohesion: 0.31
Nodes (5): toggleSidebar(), readObject(), readSidebarCollapsed(), SIDEBAR_KEY, writeSidebarCollapsed()

### Community 80 - "store.js"

Cohesion: 0.28
Nodes (5): browserStorage(), dataSignature(), defaultTimers, memoryStorage(), STORAGE_KEY

### Community 81 - "run-tests.js"

Cohesion: 0.25
Nodes (7): collect(), files, frontend, nameWidth, root, rows, source

### Community 82 - "escalationPath.test.js"

Cohesion: 0.38
Nodes (5): escalationPath(), SETTLED, STEPS, path(), report

### Community 83 - "patientLabel.js"

Cohesion: 0.67
Nodes (5): ageOf(), nameOf(), patientLabel(), patientLine(), patientOf()

### Community 84 - "classification-audit.md"

Cohesion: 0.33
Nodes (5): Evidência reproduzível, Fluxo verificado, Melhorias implementadas, Resultado, Validação e limites

## Knowledge Gaps

- **11 isolated node(s):** `tailwindcss`, `husky`, `lint-staged`, `prettier`, `Graphify workflow instructions` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 610 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `files()` connect `Extração e avaliação do Brightline` to `store.test.js`?**
  _High betweenness centrality (0.325) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `InputError` (e.g. with `main()` and `main()`) actually correct?**
  _`InputError` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `tailwindcss`, `husky`, `lint-staged` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cal.DESIGN.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Why does `Extração, privacidade e fila` connect `Extração e avaliação do Brightline` to `Session`?**
  _High betweenness centrality (0.319) - this node is a cross-community bridge._
- **Should `check-data.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08666666666666667 - nodes in this community are weakly interconnected._
- **Why does `cases()` connect `Session` to `main.py`, `Extração e avaliação do Brightline`?**
  _High betweenness centrality (0.312) - this node is a cross-community bridge._

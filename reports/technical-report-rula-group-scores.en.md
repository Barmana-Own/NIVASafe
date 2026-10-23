# RULA group summary scores — technical

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | technical | English | 2026-10-23 | 1405-08-01 | release-rula-group-scores-20261023-01 |

The existing Group A and B badges now display an exact adjusted worksheet score when all group proposals are available. A completed but partial group displays the attainable minimum–maximum score over legal missing-member scores and current force/muscle controls. Unknown members are never replaced with a measured normal score. Untouched or pending groups remain unavailable.

The interval is a possible worksheet group score, not measured anatomy or a statistical confidence interval. Equal endpoints do not establish missing observations or approval. Overall score, gauge, final approval, audited observations, stored inputs, image/side selection and manual editing remain unchanged. Group scores can reach 13 with adjustments; final score caps do not apply to them.

## Validation

| Check | Status |
|---|---|
| Frontend tests | PASS — 533/533 |
| Frontend typecheck/lint, compilation and production build | PASS |
| Isolated actual-artifact browser / deployed acceptance | PASS — 6 / 3 |
| Scoped security, preservation, public bytes/API identity | PASS |

Backend/domain/dependency suites and real provider/anatomical validation: NOT_RUN — backend/domain/dependencies unchanged; isolated synthetic UI fixtures only.

Published to the application server.

## Scope and preservation

Only frontend/src/features/assessments/AssessmentPages.tsx changes at runtime. Existing product JSX elements, all nineteen stylesheets, APIs, dependencies, database paths, consent/auth/tenant and certification gates are preserved. The display computation has bounded legal domains (A: 144; B: 72), memoized per active analysis and modifiers; it never mutates observations. Persian/English numeric ranges are isolated LTR with explanatory accessible text on the existing badges. The first browser run passed 5/6 and exposed real wrapping of an English tablet interval at 768 px. The original source, build, diagnostics and QA are retained under attempt-01-range-wrap; only the two partial-range badges now prevent wrapping and shrinking. The same assertions are rerun; complete badges and all global stylesheets stay unchanged. The next unit run passed 532/533; an existing rendered-markup check depended on attribute order. It now verifies the scoped range, note role and nowrap/shrink styles semantically; the original failed report/test are retained under attempt-02-badge-attribute-order. Product source was unchanged by this test repair.

Restore C:/NIVASafe/.local/rula-group-scores-20261023-01/index.before.html atomically; retain immutable assets. API release-rula-review-population-20261023-01, PID 10380, environment and proxy are unchanged. No API restart, migration or production business mutation.

Scope gates: 01–02 requirement/design;03 frontend display;04–07 existing backend/database/API/auth preserved;08 scoped security;09 tests/build/type/lint;10 responsive QA;11 immutable frontend publication;12 independent final evidence/document review.

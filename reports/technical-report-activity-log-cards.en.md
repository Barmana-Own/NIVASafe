# Activity Log cards — technical report

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | technical | English | 2026-10-23 | 1405-08-01 | release-activity-log-cards-20261023-01 |

Registered activities in Activity Log now display four cards per desktop row, reducing to three, two or one column on narrower screens. All six original fields, full values and Details controls remain present. Search, event/entity filters, reset, retry and detail expansion keep their existing behavior. No unrelated product section or control changes.

## Implementation and preserved boundaries

The frozen source contains 526 files. Only frontend/src/styles.css changes, through the appended activity-card supplement. Selectors are restricted to the existing activity-log-table subtree; no JSX, route, JavaScript, API, schema, authentication or authorization change is introduced. Existing table headers remain in the accessible DOM and the six existing data-label attributes label card values. The sibling details row spans the grid; its original metadata, user agent and request/token information remain available. No dense auto-placement, content truncation or record reordering is added. Cards wrap long mixed-direction values and preserve visible keyboard focus and minimum 44 px Details targets. Breakpoints are 640 / 1024 / 1280 px for 2 / 3 / 4 columns.

The shared enterprise dense-table rule imposes an important 52 rem minimum width on six-column tables. A matching override scoped additionally to activity-log-table sets its minimum width to zero. This retains every unrelated dense table and lets TableRegion measure the fitting layout normally. The initial prepared source was preserved under .local/activity-log-cards-20261023-01-attempt-01-dense-table-preflight and reports/evidence/activity-log-cards-20261023-01-attempt-01-dense-table-preflight before any build or browser tests; the cascade issue was repaired before final validation.

## Verification

| Check | Result |
|---|---|
| Shared-domain compilation | PASS |
| Frontend typecheck / lint / compilation / production build | PASS |
| Isolated actual-bundle browser checks | PASS — 17 |
| Deployed artifact browser checks | PASS — 3 |
| Scoped security and preservation review | PASS |
| Public index/CSS bytes and unchanged API identity | PASS |
| Unit/backend/dependency audit | NOT_RUN — CSS only; logic and dependencies unchanged |
| Production activity/account mutation | NOT_RUN — synthetic API fixtures only |

Commands, logs, hash-bound browser results and screenshots are under reports/evidence/activity-log-cards-20261023-01/. Chrome uses the unchanged production module and fifteen previous stylesheets with only the new supplement added. Synthetic API data isolates activity viewing, filtering, retry and detail checks from production. Existing server authorization and audit-data handling remain authoritative; CSS introduces no executable HTML, outbound resource, secret or new dependency. No whole-product security or production-data functional certification is claimed.

## Deployment and rollback

Only /assets/activity-log-cards-bdb3ed1c3ff9.css and one stylesheet link were published. Module /assets/index-DT4v4FlK.js, all 837 prior non-index files and all fifteen previous stylesheet links are unchanged. API release-ai-text-connection-20261023-01, PID 11776, all 366 private backend files, environment and proxy remain unchanged. No API restart, data mutation or migration occurred. Atomically restore C:/NIVASafe/.local/activity-log-cards-20261023-01/index.before.html to roll back presentation while retaining immutable assets and business data.

## Scoped delivery stages

01 requirement and repository analysis; 02 design preservation; 03 CSS implementation; 04–07 existing backend, database, API and auth boundaries preserved; 08 scoped security review; 09 build/type/lint validation; 10 actual-page responsive QA; 11 immutable frontend publication; 12 independent source, evidence and deployed-artifact review.

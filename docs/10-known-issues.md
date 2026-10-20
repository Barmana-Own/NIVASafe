# Stage 10 — Known Issues

| Priority | Issue | Mitigation/next action |
|---|---|---|
| P1 release dependency | Clean local database migration and live FMEA/RULA process-information/posture-analysis/report API smoke were not run because MySQL was unavailable. | Start the approved MySQL/MariaDB test instance, deploy migrations `202609050001_fmea_process_information`, `202609050002_fmea_report_actions`, `202609050003_rula_process_information`, `202609050004_rula_posture_analysis` and `202609060001_rula_corrective_action_impact`, then run authenticated catalog, report/action and RULA activity/photo/analysis/report smoke tests. |
| P2 | The exact provider-catalog identifier for the requested alternate Qwen model is not verified in the repository. | Configure any alternate risk model only after confirming its current provider catalog ID; the application does not hard-code an unverified identifier. |


## Integrated final QA blockers — 16 October 2026 / 1405-07-24

| Priority | Issue | Evidence / next action |
|---|---|---|
| P1 — release blocker | RULA image provider rejects the staged synthetic request | ArvanCloud returned HTTP 401; app returned 503 and saved no score. Obtain authorized non-production credential/model entitlement, then rerun analysis, save, reopen and report with image consent enabled. Keep production image gates closed. |
| P1 — release blocker | Support policy fix is not deployed to the live app | Isolated MariaDB/API/browser flow passes; production allowlists were absent in the observed previous runtime configuration. Run production support acceptance only after an approved release cutover. |
| P1 — release blocker | Authenticated public UAT and new build cutover were not performed | Current browser session was unauthenticated; no live member/admin credentials were used. Current candidate remains isolated. |
| P2 | Runtime pnpm version does not match packageManager pin | Runtime pnpm 11.25.0 vs repository pnpm@10.13.1 causes wrapper preflight abort. Use a compatible pinned package-manager runtime in an isolated workspace. |
| P2 | Dependency audit has no verdict | Registry advisory endpoint returned EACCES. Rerun pnpm audit --prod when approved registry access is available. |
| P2 | WebKit/Safari/iOS and Playwright E2E not run | The working-tree frontend manifest has no `@playwright/test` dependency or E2E scripts although Playwright config/specs remain; registry access blocked restoration. WebKit/native Safari is unavailable. Do not represent Chromium fixture screenshots as Safari coverage. |
| P2 | Database backup restore has not been verified | Dump and manifest exist; restoreVerification is pending. No local mysql/mariadb client or Docker CLI was available for an isolated restore. |
| P2 | Runtime process and protected config inspection is limited | Current identity is srv9298144857\codexsandboxoffline; process command line, task scheduler and protected config enumeration were denied. No secrets were read. |

This list supersedes the earlier statement that no P1 issue remained. Overall stage gate remains BLOCKED.


## Scoped checkpoint rula-image-experience-20261019-01 — 2026-10-19 / 1405-07-27

Live RULA image activation remains BLOCKED. Missing real gateway-specific processing terms and owner decision are documented in the approval record. Final provider RIGHT standalone timed out120s; LEFT/BOTH image calls passed. Full browser run failed on report reload networkidle while pre-existing automatic text-generation retries consumed remaining budget. No further paid request attempted; second-organization BOTH NOT_RUN. Separate zero-provider reopen/manual workflows passed. No current anatomical-generalization claim.

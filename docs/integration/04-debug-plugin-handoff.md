# NIVASafe Debug handoff

## Confirmed integration state

No new backend/domain defect was reproduced in the integration checks. The original backend and shared domain sources are unchanged; frozen install, generation, lint, typecheck, all package tests, build and static route-contract validation passed. The following items are verification work or an observed build warning, not claims of confirmed product bugs.

## Follow-up items, ordered by severity

### P1 — Authenticated full-stack behavior still needs a disposable test environment

- **Status:** Blocked by missing test access; no API failure was reproduced.
- **Reproduction once access is supplied:** Start the full app against a disposable local/staging database; sign in with the authorized role accounts; select an organization; exercise one authorized create/edit/reload flow in FMEA and RULA, an admin action and a file upload/download; inspect requests and responses.
- **Expected:** Requests retain original API paths/payloads and organization headers; backend role and tenant checks remain authoritative; successful edits persist after reload; unauthorized requests are rejected server-side.
- **Likely inspection points:** `frontend/src/api/client.ts`, assessment/admin/file components, `backend/src/auth-guard.ts`, `backend/src/core.ts`, and the corresponding backend modules.
- **Current evidence:** 69/69 static frontend route patterns match declared backend routes; source comparison found 88 matching frontend API invocation arguments; browser inspection was limited to public routes.

### P2 — Responsive FMEA/RULA/admin tables need real authenticated browser data

- **Status:** Not verified in the browser; no overlap bug was reproduced in this run.
- **Reproduction:** With a test session and populated assessments, open `/fmea/:id/report`, `/rula/:id/report` and `/admin` at 390×844, 768×1024, 1024×768 and 1366×900 in Persian RTL and English LTR. Inspect full labels, action controls, horizontal scrolling and document width.
- **Expected:** No clipped or overlaid text; labels remain readable and details reachable; any specialist-table scrolling stays within its table region; no global overflow clipping is used to hide content.
- **Likely inspection points:** `frontend/src/styles.css`, `frontend/src/styles/responsive-tables.css`, `frontend/src/styles/assessments.css`, `frontend/src/styles/management.css`, `frontend/src/features/assessments/AssessmentPages.tsx`, and `frontend/src/features/admin/AdminPanelPage.tsx`.
- **Current evidence:** Responsive table tests pass and public routes fit a 390px viewport. Protected tables were not mounted because no authorized test session was available.

### P3 — Large JavaScript chunk advisory

- **Status:** Build warning, not a failed build.
- **Reproduction:** Run `pnpm build` and inspect Vite's output; current largest minified chunk is `512.57 kB`.
- **Expected:** If performance work is prioritized, identify safe shared chunk boundaries without changing route behavior or the existing backend API contract.
- **Likely inspection points:** `frontend/src/App.tsx`, assessment feature imports and `frontend/vite.config.ts`.

## Platform blocker

Windows rendering and PowerShell/deployment execution remain unverified because this task ran on macOS. The existing Windows scripts and deployment configuration were not modified. Validate them on a Windows host before claiming Windows compatibility.

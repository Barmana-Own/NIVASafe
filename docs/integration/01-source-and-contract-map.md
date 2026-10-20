# NIVASafe source and contract map

## Scope and provenance

This map compares the authoritative full-stack archive with the frontend redesign archive before merging source files. The original full-stack project remains the root of the working copy.

| Input | Location | Size | SHA-256 | Integrity |
|---|---|---:|---|---|
| Original full-stack source | `/Users/barmana/Downloads/nivasafe-project-download-b244b5e70f6e8aa239e6b8f8e60be74137f7739a66a1766573fd3c25ace72f89 (1).zip` | 2,923,179 bytes | `44aa560f2b01983b413a7f42f65bec74c84d0edc75cf3eb5d5ceef6aa05fc0f2` | `unzip -tq` passed |
| Redesigned frontend | `/Users/barmana/Downloads/NIVASafe-Project-Frontend-Design-2026-10-14.zip` | 10,818,065 bytes | `21bdb7f6c01307569eb19c230faeda7a2bebba589d150bfc11bfa743e6e3e48a` | `unzip -tq` passed |

The original archive was copied without changes to `../integration-source-snapshots/20261014/original-fullstack.zip`; its size and SHA-256 match the Downloads input. The integration working root is this extracted original project. The source ZIP has no `.git` directory, so there is no branch or historical commit to report. The existing frontend-only workspace was not overwritten. No `.env` file or real secret was present in the extracted source.

The original root declares pnpm `10.13.1`; its CI uses Node `22`. Validation used Node `22.23.3` (official macOS arm64 binary; downloaded checksum verified) and pnpm `10.13.1`. No package or lockfile upgrade was needed.

## Structure and file comparison

Verified original markers include `backend/src/app.ts`, `backend/prisma/schema.prisma`, `frontend/src/App.tsx`, `shared/domain`, the root `package.json`, and `pnpm-workspace.yaml`. The redesign uses the expected nested `nivaSafe/` root and contains `frontend/src/`, modular styles, `design/enterprise-ui-inventory.md`, tests and validation artifacts. It has no backend and is not a replacement project root.

Pre-merge frontend source comparison (`frontend/src`): **20 shared files changed, 23 redesign-only files added, zero original-only files removed**. During integration, 18 changed shared source files and all 23 source additions were adopted; the original `api/client.ts` and `api/client.test.ts` were retained. Public assets: **zero changed, zero added, zero removed**. The original public brand, offline, service worker, manifest and Windows web configuration therefore remain authoritative.

### Changed shared source files

| File | Observed change | Integration decision |
|---|---|---|
| `frontend/src/App.tsx` | Same public/protected routes and guards; lazy feature chunks, route recovery and loading fallback added. | Adopt the redesign shell behavior and preserve the exact original route/guard inventory. |
| `frontend/src/main.tsx` | Adds appearance provider, unsaved-change guard and enterprise/table CSS imports. | Adopt once, in a single provider/style-loading chain. |
| `frontend/src/api/client.ts` | Request/session logic is unchanged; local development default changes from `localhost` to fixture-only `127.0.0.1`. | Keep the original client and its normal local default. Keep same-origin `/api/v1` production default and its localhost protection. |
| `frontend/src/api/client.test.ts` | Adds an assertion for the fixture IPv4 host. | Do not copy this fixture-specific assertion. |
| `frontend/src/components/UI.tsx` | Adds accessible table regions, loading state, dialog focus lifecycle and icons. | Adopt the new shared primitives and keep existing control APIs. |
| `frontend/src/components/useMenuPlacement.ts` | Adds/updates menu placement behavior. | Adopt and verify under the existing menu consumers. |
| `frontend/src/features/account/AccountPages.tsx` | Auth/profile/member presentation, focus handling, tabs and unsaved-edit behavior updated. | Adopt after preserving form payloads, session/refresh handling and role-dependent member actions. |
| `frontend/src/features/account/RegistrationPage.tsx` | Authentication appearance controls, accessibility and localized stepper presentation. | Adopt; preserve registration validation, payloads and draft behavior. |
| `frontend/src/features/admin/AdminPanelPage.tsx` | Admin workspace tabs, responsive tables, approval cards and focused member editor. | Adopt presentation and preserve global/organization variants, protected-account rules, role checks and request payloads. |
| `frontend/src/features/assessments/AssessmentPages.tsx` | FMEA/RULA layout and responsive table/report presentation. | Adopt presentation only; original shared domain calculations and every API call/payload remain authoritative. |
| `frontend/src/features/assessments/RulaEvaluationRowDialog.tsx` | RULA row editor accessibility/focus changes. | Adopt; keep bilateral row identity and save contract. |
| `frontend/src/features/assessments/mobileReportTables.test.ts` | Adds a desktop column readability assertion. | Adopt this test update while retaining all existing assertions. |
| `frontend/src/features/assessments/rula-mobile-table.css` | Responsive report table rules updated. | Adopt with the modular table styles; preserve complete details on mobile. |
| `frontend/src/features/assistant/AssistantPage.tsx` | Localized UI text, mobile history drawer and status semantics. | Adopt; keep conversation/message API flow and user/org scoping. |
| `frontend/src/features/files/FilesPage.tsx` | Error/status semantics and accessible action names. | Adopt; keep existing upload, preview, download and delete handlers. |
| `frontend/src/features/general/GeneralPages.tsx` | Responsive table and semantic state treatment. | Adopt; retain CRUD handlers, role guards and server-backed reloads. |
| `frontend/src/i18n.tsx` | Merges `redesignMessages` into existing FA/EN dictionaries. | Adopt the additive dictionaries; retain existing locale keys and account preference behavior. |
| `frontend/src/layout/AppLayout.tsx` | Appearance provider, breadcrumbs, profile menu and keyboard-accessible mobile drawer. | Adopt while preserving the original organization context, role-based navigation and logout/session logic. |
| `frontend/src/styles.css` | Legacy shared style cascade updated for the redesign. | Adopt with the enterprise layer in the documented import order; do not duplicate imports. |
| `frontend/src/ui-rules.test.ts` | Same 152 test titles; assertions updated for the redesigned source markup. | Use the redesign version so layout regressions are checked without dropping existing test cases. |

### Redesign-only source files

Adopt the application source additions below, except the tests identified as fixture-only and without bringing the redesign's surrounding generated artifacts:

```text
frontend/src/AppearanceProvider.tsx
frontend/src/components/AuthAppearanceControls.tsx
frontend/src/components/LoadState.tsx
frontend/src/components/RouteRecovery.tsx
frontend/src/components/TableRegionKeyboard.test.ts
frontend/src/components/WorkspaceTabs.tsx
frontend/src/components/enterprisePresentation.test.tsx
frontend/src/components/useModalFocus.ts
frontend/src/components/useUnsavedChanges.ts
frontend/src/features/account/loginResponsive.test.ts
frontend/src/layout/ProfileMenu.tsx
frontend/src/pwa/staticRouteWarmup.test.ts
frontend/src/pwa/staticRouteWarmup.ts
frontend/src/redesignMessages.ts
frontend/src/styles/assessments.css
frontend/src/styles/assistant.css
frontend/src/styles/authentication.css
frontend/src/styles/enterprise.css
frontend/src/styles/foundations.css
frontend/src/styles/management.css
frontend/src/styles/responsive-tables.css
frontend/src/styles/shell.css
frontend/src/styles/tokens.css
```

The redesign's `enterprise.css` imports tokens, foundations, shell, authentication, assessment, management and assistant styles. `main.tsx` then imports `responsive-tables.css` after the existing `styles.css`. Keep that ordering and load each stylesheet once. Do not copy the redesign `.env.example` (it targets a hosted API), fixture pages, preview server, `.playwright-mcp`, screenshots, validation logs, `frontend/dist`, or `shared/domain/dist` into the shipping source. The original archive's existing test fixture directory remains as-is; Vite builds from the frontend entry and does not publish that directory. Keep the original `frontend/package.json`, root manifests, workspace, lockfile and CI configuration. The redesign requests Vitest `4.1.11` and Node types while the full-stack project uses Vitest `3.2.4`; the original workspace versions are the integration baseline. Do not replace the lockfile with the frontend-only lock.

## Routes, data contracts and authorization map

All original routes and route-level role guards match the redesign route inventory. `/audit` remains a redirect to `/activity-log`; `/checklists` and `/incidents` remain explicit Coming Soon pages. `authenticate` validates an active user and the selected `x-organization-id` membership; each backend query continues to scope records by organization and/or authenticated user. Backend permissions remain authoritative even where the frontend hides controls.

| Area and routes | Original API/data source | Action and expected persisted result | Effective role/permission | Existing verification surface |
|---|---|---|---|---|
| Account: `/login`, `/register`, `/accept-invitation`, `/forgot-password`, `/reset-password`, `/profile` | `/auth/*`, `/invitations*`, `/profile*`; auth/session client | Login/refresh/logout updates the local session; registration, invitation acceptance, profile and password changes persist on the server. | Public auth endpoints plus authenticated user; invitation and account rules remain server-enforced. | Frontend auth, session/client and registration tests; backend auth and invitation tests. |
| Organization: `/organizations` | `/organizations*`, `/organizations/current/subscription/*` | Create/update/select organization and update/cancel subscription; reload returns server state. | `organizations.manage` (ORG_ADMIN and SUPER_ADMIN); backend also checks organization status and subscription rules. | Frontend organization behavior tests; backend organization/subscription tests. |
| Authorization and memberships: `/members`, `/admin` | `/members*`, `/invitations*`, `/member-requests*`, `/admin/users*`, `/admin/memberships*` | Member request approval/rejection, invite, update, deactivate/remove, password or role changes persist; protected accounts and last-admin constraints remain in force. | `users.read`, `users.request`, `users.manage`; global administration requires SUPER_ADMIN; API enforces every mutation. | Frontend UI rules and backend user/admin/role/protected-admin tests. |
| Dashboard: `/` | `GET /dashboard` plus scoped assessment/project/action counts | Render live organization KPIs and recent data; dashboard widget preferences remain local preference state. | Authenticated organization member; backend organization-scopes data. | Dashboard widget UI rules and dashboard route/source checks. |
| Projects: `/projects` | `/projects*`, `/processes*`, `/activities*` | Create/edit/archive project and process/activity; refresh reads saved state. | `projects.read` for viewing; `projects.manage` for mutations. | Frontend project source rules; backend project tests. |
| FMEA: `/fmea`, `/fmea/:id/report` | `/fmea*`, `/fmea/process-suggestions`, `/fmea/process-image-analysis`, `/fmea/job-catalog*`, `/reports/*` | Create/edit/approve/delete assessments and risk rows; save report suggestions/actions; export existing Word/Excel/PDF formats. Reload must reflect persisted values. | `assessments.create/update/delete/approve`, `reports.generate`; server validates tenant scope, risk inputs and report access. | Original domain `calculateRpn`/`riskLevel` tests, frontend FMEA source tests, backend assessment/report tests. |
| RULA: `/rula`, `/rula/:id/report` | `/rula*`, RULA AI analysis/suggestion routes, `/files`, `/reports/*` | Save/reload bilateral posture, adjustments, image references, analyses, corrective actions and reports; exports use original server content. | `assessments.create/update/delete`, `reports.generate`; AI availability and quotas remain backend-controlled. | Original domain `calculateRula` tests, frontend RULA workflow/image/bilateral tests, backend RULA/report tests. |
| Corrective actions: `/actions` and report-linked actions | `/actions*`, FMEA item register/complete routes | Create/update/assign/complete/cancel action and persist dates, status, priority and body side; reload confirms state. | `assessments.update` for edits, `assessments.delete` for deletion; read via `projects.read`. | Frontend action workflow and backend action/RULA workflow tests. |
| Files: `/files` and assessment image pickers | `/files`, `/files/:id/download` | Multipart upload, preview/download and authorized soft delete; new fetch lists the saved attachment. | Authenticated org member for permitted uploads/downloads; `assessments.delete` for deletion; backend checks tenant ownership and size/type. | Frontend file/image picker tests; backend file tests. |
| Knowledge: `/knowledge` | `/knowledge*`, `/knowledge/attachments*`, quota route | Search and authorized document/category/attachment CRUD; reload returns the saved document and access scope. | Authenticated org user for reads; `knowledge.manage` for writes; global/selected visibility is server-enforced. | Existing knowledge source rules and backend knowledge tests. |
| Assistant: `/assistant` | `/chat/conversations*`, `/chat/conversations/:id/messages` | Create conversation and persist user/assistant messages/citations; show real provider/quota errors. | Authenticated user in the selected org; server owns conversation scoping, rate limits and AI provider state. | Assistant source rules, AI failure/connection tests and backend chat tests. |
| Notifications: header and `/notifications` | `/notifications*` | List and mark one/all read; preference updates persist by user and organization. | Authenticated org member; backend scopes to actor. | Notification model/source tests and backend notification tests. |
| Audit and health: `/activity-log`, `/audit`, `/health` | `/activity-log`, `/audit`, `/health` | Filter scoped audit events; health reads actual service/database status. `/audit` keeps its redirect. | `audit.read` or actual backend route guard; health has its existing SUPER_ADMIN/ORG_ADMIN UI guard and backend behavior. | Frontend route/UI rules and backend audit/health checks. |
| PWA, appearance and localization: every route | Original manifest, service worker and locale/theme preferences; no new API | Preserve install/update/offline fallback, theme and preference persistence, FA RTL and EN LTR. | Appearance/language preference is per browser/session; protected content still follows auth guards. | Existing PWA/theme/i18n tests plus redesign warmup and responsive tests. |

### Contract evidence before merge

- The original `scripts/check-api-contract.mjs` ran against the untouched extracted full-stack source: **69 unique frontend API paths matched 127 backend routes**. This is a static route check, not payload or live authorization proof.
- A source comparison found **88 frontend `api(...)` call expressions** in the original and **88 corresponding production expressions** in the redesign. Their first route argument and complete request-argument text are unchanged. The redesign's only extra API-client test expectation is the `127.0.0.1` fixture host; it is not a production request.
- Original `frontend/src/api/client.ts` remains the contract authority: it uses `http://localhost:5044/api/v1` for development and same-origin `/api/v1` by default in production; it attaches the bearer token and selected organization header, refreshes sessions and preserves structured API errors. Backend CORS allows the configured `APP_URL`, plus the two local development origins outside production; no wildcard change is planned.
- `shared/domain/src` and backend Prisma/schema/migration history are not merge targets. FMEA/RULA formulas, validation, bilateral isolation, API routes, response envelopes, roles and database contracts stay from the original project.

### Post-merge preservation check

- `backend/`, `shared/domain/`, `database/`, `deployment/`, `scripts/`, root and frontend package manifests, workspace configuration, lockfile, CI and public assets were compared with the original archive. Product sources remain byte-identical outside `frontend/src` and the narrow `turbo.json` test-environment declaration. Generated `node_modules`, `.turbo`, build output and empty test-created directories are not source changes and are excluded from the source package.
- Original `frontend/src/api/client.ts` and `frontend/src/api/client.test.ts` are byte-identical to the full-stack source. The original localhost development default, same-origin production default, localhost production guard, bearer-token/organization headers, refresh behavior and structured errors remain in place.
- The source comparison recorded 88 `api(...)` call expressions in both frontend revisions with matching route and request arguments. The post-merge static contract checker still reports 69 frontend API paths matched against 127 backend routes; it does not exercise payloads, user sessions or persistence.
- `frontend/src/ui-rules.test.ts` assertions were adjusted where the design moved a control into `ProfileMenu`, `AppearanceProvider`, modal focus helpers, or imported stylesheet modules. Existing checks were retained against the current source locations. No backend/domain test or business rule was modified.
- `turbo.json` adds the two documented PDF font-path variables to the `test` task's hashed environment so the exact root test command can run PDF export tests on hosts whose system fonts are not found automatically. This does not set deployment values or affect build/runtime tasks.

## Validation boundary at mapping time

The original source passes the static contract route check above. No database, live API, credentials, production deployment or Windows runtime has been used. Full test/build/browser/API checks are recorded separately after the merge; historical screenshots and the redesign archive's validation logs are not treated as current integration evidence.

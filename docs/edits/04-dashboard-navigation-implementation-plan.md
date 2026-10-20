# Task 04 Dashboard Navigation Implementation Plan

> **Execution:** Inline in the current workspace. The user supplied this Task 04 brief and asked for implementation through the UI UX Designer plugin.

**Goal:** Replace the flat sidebar with the requested bilingual, role-aware navigation hierarchy while routing FMEA/RULA create and saved destinations to their existing workflows and clearly marking unsupported modules as pending.

**Architecture:** Keep route definitions in the existing React Router application. Add a small typed navigation model for visibility, active-route matching, and breadcrumbs; render it in the existing app shell with native disclosure buttons and links. Add only destinations backed by current frontend/API workflows; pending modules remain non-interactive and are documented for Task 05.

**Tech Stack:** React 19, TypeScript, React Router 7, Vite, existing CSS tokens and i18n dictionaries, Vitest.

**Spec:** `/Users/barmana/Downloads/NIVASafe_04_UI_UX_Designer_Dashboard_Navigation_And_Modules.md`

## Global Constraints

- Preserve Persian RTL / English LTR, light/dark themes, responsive sidebar, active route, breadcrumbs, role visibility, keyboard support, escape-to-close, persisted sidebar collapse, and responsive content.
- Reuse existing FMEA/RULA pages, reports, saved entities, drafts, calculations, and routes.
- Do not invent API contracts, risk values, data, permissions, or successful actions.
- Do not implement a second demo or independent backend; keep unavailable modules explicitly pending.
- Preserve Task 02–03 token notifications and FMEA/RULA corrective-action work.
- The checkout has no `.git` metadata; Git status, commits, and commit-based rollback are unavailable. Keep edits scoped and report this blocker.

## Review Focus

- FMEA/RULA create, saved, edit, report, browser-back, and reload routes — navigation tests plus browser checks.
- Admin/member/system-health visibility — role-scope tests.
- Pending contract modules — navigation tests confirm they are non-links and have no fake route.
- Persian/English active breadcrumbs and RTL/LTR chevrons — browser checks at desktop/tablet/mobile.
- Collapsed desktop and mobile drawer focus/Escape behavior — browser checks at desktop/tablet/mobile.

## Files and Responsibilities

- `frontend/src/layout/navigation.ts`: typed tree, role filtering, route matching, assessment destinations, and breadcrumb trail.
- `frontend/src/layout/navigation.test.ts`: route, active-state, and role-filter regression checks.
- `frontend/src/layout/AppLayout.tsx`: render the tree with disclosure semantics and update shell breadcrumbs.
- `frontend/src/styles/shell.css`: responsive navigation styling using existing semantic theme tokens.
- `frontend/src/features/general/GeneralPages.tsx`: add quick links to the existing saved FMEA/RULA registers without changing dashboard widget storage/order.
- `frontend/src/i18n.tsx`: add Persian/English labels and pending-state copy.
- `docs/ux-navigation-audit.md`: baseline status and intentionally untouched functionality.
- `docs/dashboard-navigation-map.md`: final navigation tree, routes, permissions, redirects, and interaction rules.
- `docs/integration-contract.md`: Task 05 requirements for modules without current APIs.

## Tasks

### Task 1: Route-aware navigation model

**Files:** Create `frontend/src/layout/navigation.ts` and `frontend/src/layout/navigation.test.ts`.

- [x] Add failing tests for role visibility, exact distinction between FMEA/RULA creation and saved views, report deep links resolving to their saved-register ancestors, legacy `/choose-path` breadcrumb, and unavailable modules being non-routes.
- [x] Run the focused test and confirm it fails because the navigation model is missing.
- [x] Implement the typed model and pure helpers using the existing `view=registered` and `view=results` contracts.
- [x] Run focused tests and confirm they pass.

### Task 2: Accessible nested sidebar and breadcrumbs

**Files:** Modify `frontend/src/layout/AppLayout.tsx` and `frontend/src/styles/shell.css`.

- [x] Render top-level and nested disclosure groups as native buttons with `aria-expanded` / `aria-controls`; render real destinations as links and pending items as non-interactive status rows.
- [x] Automatically expand the active route's ancestors; preserve current mobile drawer focus trapping, Escape handling, body lock, background inertness, route-close, and focus restoration.
- [x] Keep persisted desktop collapse behavior; make controls usable when collapsed, keep labels wrapping, and use theme tokens in both themes and directions.
- [x] Verify TypeScript. The local browser smoke reached `/login`; without an authenticated session/backend, the protected navigation and its interactions could not be exercised in the mounted app.

### Task 3: Dashboard entry points and translations

**Files:** Modify `frontend/src/features/general/GeneralPages.tsx` and `frontend/src/i18n.tsx`.

- [x] Add direct saved-register links to the existing quick-access widget while leaving widget IDs, persisted order, KPI data, and analytics intact.
- [x] Add the required menu and pending-state labels in both locales.
- [x] Run i18n and frontend regression tests.

### Task 4: Audit and engineering handoff

**Files:** Create `docs/ux-navigation-audit.md`, `docs/dashboard-navigation-map.md`, and `docs/integration-contract.md`.

- [x] Record source-backed current status, final route map, permissions, pending backend domains, and intentionally untouched workflows.
- [x] Run frontend tests, typecheck/build, and the available unauthenticated browser smoke; state exact evidence and blockers.

## Verification Commands

- Focused: `PATH="/Users/barmana/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/vitest run src/layout/navigation.test.ts` from `frontend/`.
- Full frontend tests: `PATH="/Users/barmana/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/vitest run` from `frontend/`.
- Build/typecheck: `PATH="/Users/barmana/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc -b && PATH="/Users/barmana/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/vite build` from `frontend/`.
- Browser: local Vite `/login` shell loaded. Authenticated navigation checks at 1366px, 768px, 390px, and 320px, in both locales/themes, remain blocked by the unavailable authenticated backend session.

## Self-Review

- Coverage: The plan covers navigation, route modes, dashboard entry points, bilingual labels, responsive interaction, audit, and Task 05 API blockers.
- Safety: Existing FMEA/RULA components and action/notification modules remain outside the implementation edits; their route targets are reused.
- Contract boundary: Chemical risk and the other missing domain modules are not presented as functional routes until Task 05 contracts exist.
- Environment: Browser screenshots may be limited to a local development session because no application services were listening during the source audit; Windows rendering remains unavailable on this macOS workspace.

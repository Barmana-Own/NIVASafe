# NIVASafe UX Edits 01–03 — Engineering Handoff

**Date:** 2026-10-14  
**Project:** `integration-project-2026-10-14`  
**Source brief:** `NIVASafe_02_UI_UX_Designer_Edits_01-03.md`

## Implemented

- Added a shared report-action progress model and accessible FMEA chart/list. Persisted `COMPLETED` actions count as complete; persisted `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_FOR_REVIEW`, and `OVERDUE` actions count as registered and active. `CANCELLED` and `REJECTED` actions are excluded. Remaining recommendations are distinct from registered actions. Duplicate IDs, dismissed recommendations, and unsaved RULA preview selections are excluded. Empty inventories report 0%.
- Wired the FMEA and RULA report summaries to persisted action IDs and statuses. RULA progress is scoped to the selected body side, including actions marked `BOTH`.
- Added separate FMEA and RULA action creation and register tabs at the existing `/actions` route. Forms retain assessment context, autosave drafts remain scoped by user, organization, action type, and assessment, and existing status updates continue to use the established action endpoints.
- FMEA payloads contain FMEA assessment/risk-row links and no RULA body-side fields. RULA payloads contain the selected RULA assessment and only body sides permitted by that assessment.
- Typed registers use project-scoped pages from `GET /actions`, then filter by assessment and type in the frontend. The FMEA filter accepts either the assessment ID or an item ID present in that assessment. RULA filters by RULA assessment ID. The legacy unclassified register retains its existing 50-row server page.
- Project selectors are derived from the available FMEA/RULA summaries and constrain the assessment selector. Create forms and typed registers show both project and assessment explicitly.
- The FMEA form/register displays the selected saved row's effect, cause, S/O/D, RPN, and risk level. Its AP display mirrors the backend's existing report mapping (`VERY_LOW` → `LOW`; `CRITICAL`, `HIGH`, and `MEDIUM` map through; the backend default maps to `MEDIUM`). The summary API does not define a 5×5 matrix contract, so no new matrix or score recomputation was introduced.
- The RULA form shows saved score, action level, activity context, evaluated body parts, and side choices permitted by the saved assessment. Register cards show saved impact data when present.
- The action workspace reads `/fmea` and `/rula` summary collections instead of report endpoints. This retains project-read access for users who do not have `reports.generate`. Creation and status updates still depend on the existing `assessments.update` server permission.
- Persian/RTL and English/LTR labels, keyboard-operable tabs, responsive card layout, status/priority filtering, loading/error/empty states, and localized due dates are in place.

## Verified API contracts

- `GET /fmea` and `GET /rula` return assessment summaries, including project IDs. FMEA summaries include risk items and their saved effect/cause/S/O/D/RPN/risk-level values; RULA summaries include body side, score, action level, activity context, and posture analysis where available.
- `GET /actions` requires `projects.read` and accepts the existing page/limit/search/status/projectId/fmeaId parameters. It does not accept a `type` or `rulaId` filter. The UI does not send either unsupported filter.
- `GET /fmea/:id/report` and `GET /rula/:id/report` require `reports.generate`. The action workspace no longer calls these routes.
- `POST /actions` and `PATCH /actions/:id` require `assessments.update`; backend link and RULA body-side validation remains authoritative.

## Backend-dependent work that remains blocked

### Personal AI allowance

The `User` model stores `aiTokenLimit` and `aiTokensUsed`, and the server enforces allowances through its AI access checks. `GET /admin/ai-usage` is restricted to administrators. It returns allowance fields to global super-admin scope, but omits `aiTokenLimit` and `aiTokensUsed` in organization-admin scope. `PATCH /admin/users/:id/ai-access` is global-super-admin-only. There is no authenticated self-scoped quota read that a regular user can safely use to see their own remaining allowance. No personal quota progress/banner or guessed allowance was added.

### Support requests

The backend has member-access requests for account onboarding, but no support-ticket/request model, user support submission route, or administrator support inbox. The existing notification feed is not a support workflow. No disconnected support CTA or fabricated support status was added.

### FMEA recommendation dismissal

Dismissed FMEA recommendation keys are held in React component state and reset when the assessment or locale changes. They are not persisted across a reload, session, or device. A durable dismissal workflow needs an agreed storage/API contract and remains session-only.

## Verification evidence and limits

- Frontend typecheck: `node ./node_modules/typescript/bin/tsc -b --pretty false` — passed.
- Full frontend suite: `node ./node_modules/vitest/vitest.mjs run --reporter=dot` — **41 test files, 262 tests passed**.
- Focused UI/action/report-progress regression checks: `ui-rules.test.ts`, `actionViewModel.test.ts`, `reportActionProgress.test.ts`, and `FmeaActionProgressChart.test.tsx` — **4 files, 122 tests passed**.
- Production frontend build: `node ./node_modules/vite/bin/vite.js build` — passed. Vite emitted its existing bundle-size warning for a minified JavaScript chunk over 500 kB; no build error occurred.
- Browser review used the local Vite frontend at `127.0.0.1:5173` in isolated Chrome context `nivasafe-actions-review` with synthetic fetch responses and a test-only HSE specialist session. FMEA and RULA action forms/registers rendered separate fixture records. The FMEA fixture showed its saved risk context; the RULA form/register showed score/action level, activity, assessed part, permitted side, and saved impact. Persian RTL/blue-theme checks covered 320, 390, 768, and 1366 CSS-pixel widths; `document.documentElement.scrollWidth` matched the viewport at each size, and the tested action selectors/cards had no internal horizontal overflow. A fixture FMEA report rendered the completion chart at those same widths; the 320px report page stayed at 320px document width, the chart had no internal overflow, and the specialist risk table kept its explicit contained horizontal scroll. The chart showed one completed action, one active persisted action, and one unregistered suggestion at 33.3% each; selecting the active segment revealed the saved action. English LTR/blue-theme was checked at 390px for the RULA form/register; scroll width matched. Successful fixture pages had no console errors. No create/status control was submitted or changed.
- These browser results are fixture-only UI evidence. No real backend/authenticated account was available. No POST/PATCH mutation or real backend report data was tested. Backend endpoint integration, real permission behavior, production data, and Windows browser/deployment rendering were not validated.
- The installed UI UX Designer local skills were used for design and accessibility implementation. This task environment did not expose a separate UI UX Designer runtime call; no such call is claimed.

## Suggested backend acceptance items

1. Add an authenticated self-only quota read containing the user’s current limit, used amount, remaining amount, and a consistent accounting period if one is introduced. Do not return another user’s allowance to non-global admins.
2. Define support request persistence, submission permissions, validation, lifecycle/status, and an admin review route before adding support UI.
3. Decide whether FMEA recommendation dismissal should persist, and if so define assessment/user scoping and synchronization behavior.
4. Start the backend and verify project-read action visibility, `assessments.update` mutations, FMEA item linkage, RULA side validation, and pagination against real data.
5. Run the frontend in the supported Windows deployment/browser environment before release.

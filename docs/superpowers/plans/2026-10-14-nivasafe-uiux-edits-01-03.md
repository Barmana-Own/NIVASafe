# NIVASafe UI/UX Edits 01–03 Implementation Plan

> **For agentic workers:** Use the `superpowers:executing-plans` workflow to implement this plan task by task. Each behavior change starts with a failing test.

**Goal:** Integrate accessible, localized FMEA/RULA action forms and truthful report progress views in the existing NIVASafe frontend, and document the quota workflow that is blocked on secure backend support.

**Architecture:** Keep existing React routes and design tokens. Add a focused action-register UI and shared pure report-progress selectors/chart UI; consume existing authenticated assessment summaries and project-scoped action pages only. Do not add quota API calls or support controls until the engineering endpoints exist.

**Tech Stack:** React 19, TypeScript, React Router, existing CSS tokens/components, Vitest, Chrome DevTools.

**Spec:** `NIVASafe_02_UI_UX_Designer_Edits_01-03.md` (user-provided brief at `/Users/barmana/Downloads/NIVASafe_02_UI_UX_Designer_Edits_01-03.md`).

## Global Constraints

- Preserve business logic, permissions, API contracts, scoring, reports, route paths, and deployment configuration.
- Keep Persian RTL and English LTR; retain light/dark themes.
- No fake quota values, mock production records, invented endpoints, or disconnected support CTAs.
- FMEA never receives RULA body-side fields; RULA stays constrained by its selected assessment.
- Report categories are mutually exclusive: visible unregistered recommendations, persisted nonterminal actions, persisted `COMPLETED` actions.
- Keep accessible labels, keyboard operation, visible focus, responsive cards, and color-independent status.

## Review Focus

- A selected RULA assessment permits only the side(s) allowed by its saved body-side scope; verify the real form options and payload.
- An OPEN saved action is registered active, while CANCELLED/REJECTED and undismissed recommendations do not become completion; verify selector tests.
- Multiple persisted actions for one FMEA item count as actions, not one completed risk row; verify counts and drill-down.
- Empty inventories show zero items and 0% completion, never 100%; verify both locales.
- Unsupported quota/support behavior stays absent from production UI and is named in the backend handoff.

---

### Task 1: Shared, truthful report-progress model and accessible visualization

**Files:**
- Create: `frontend/src/features/assessments/reportActionProgress.ts`
- Create: `frontend/src/features/assessments/reportActionProgress.test.ts`
- Modify: `frontend/src/features/assessments/FmeaActionProgressChart.tsx`
- Modify: `frontend/src/features/assessments/FmeaActionProgressChart.test.tsx`
- Modify: `frontend/src/features/assessments/AssessmentPages.tsx`
- Modify: `frontend/src/features/assessments/RulaReportOverview.tsx`
- Modify: `frontend/src/features/assessments/rulaOverviewModel.ts` and its tests as needed
- Modify: `frontend/src/styles/assessments.css`, `frontend/src/i18n.tsx`

**Interfaces:**
- Consume persisted report actions with stable IDs and statuses, and recommendation objects with assessment-scoped identities.
- Produce `ReportActionProgress` with completed, registered-active, remaining-suggestion buckets and count/percentage totals.
- Chart legend selection reveals only the selected bucket’s items; FMEA and RULA remain scoped to the current report and RULA side.

- [x] Write failing tests for OPEN active, COMPLETED terminal, CANCELLED/REJECTED excluded, suggestion remaining, no optimistic registration, deduplication, and empty 0% state.
- [x] Run those focused tests and confirm they fail for the expected missing behavior.
- [x] Implement selectors and an accessible shared chart/list view with localized count, percentage, denominator, empty state, and keyboard-operable bucket controls.
- [x] Wire FMEA using report `actions` and current undismissed suggestions; wire RULA using persisted report actions and unregistered suggestions, excluding unsaved preview selections.
- [x] Run focused tests and relevant FMEA/RULA existing tests.

### Task 2: Separate FMEA and RULA action creation/register UX

**Files:**
- Create: `frontend/src/features/actions/ActionsPage.tsx`
- Create: `frontend/src/features/actions/actionViewModel.ts` and tests as needed
- Modify: `frontend/src/features/general/GeneralPages.tsx` to preserve/re-export the route component
- Modify: `frontend/src/styles/management.css`, `frontend/src/styles.css`, `frontend/src/i18n.tsx`

**Interfaces:**
- Consume `/fmea` and `/rula` summaries for available projects/assessments, `/actions` project-scoped pages, and authenticated user/org scope. Do not call report endpoints that require `reports.generate` for this workspace.
- Produce independent FMEA/RULA create tabs and assessment-specific registers with project, assessment, status, and priority filters.
- FMEA payloads contain only FMEA IDs/item context; RULA payloads contain only RULA IDs and permitted body side.
- Draft keys are distinct by action type and scoped to user/organization/assessment.

- [x] Add failing view-model/render tests for FMEA no-body-side and RULA side constraints, filtered assessments, mixed action isolation, deep-link selections, and RTL/LTR labels.
- [x] Confirm failures before changing product code.
- [x] Implement project/assessment-aware forms and assessment-specific registers using currently supported API calls; never infer API filters that the server does not implement.
- [x] Add responsive card presentation and explicit loading/error/empty/saving states without removing existing status-update behavior.
- [x] Verify focused tests and API payload shaping.

### Task 3: Quota/support boundary and required handoff

**Files:**
- Create: `docs/edits/02-ui-ux-01-03-handoff.md`

- [x] Recheck exact quota, notification, action-filter, and dismissal contracts in the integrated backend.
- [x] Document component inventory, present visual states, responsive/locale verification evidence, data shapes, and missing endpoint/field blockers for Engineering.
- [x] Do not render a fabricated quota banner, notification, support request form, or admin inbox in the shipped app while its secure API is absent.
- [x] Record exactly which frontend behaviors are integrated and which remain blocked, with commands and current results.

### Verification

- [x] Run focused frontend tests, the frontend typecheck/build, and the full frontend test suite.
- [x] Inspect the running action workspace and FMEA report chart with an isolated browser fixture at 1366px, 768px, 390px, and 320px in Persian RTL; inspect the RULA form/register at 390px in English LTR.
- [x] Confirm the tested page widths have no document overflow, the FMEA chart has no internal overflow, the specialist report table scroll stays contained, and successful mock-fixture pages have no console errors; report unavailable real backend and Windows validation honestly.

**Not validated:** Real authenticated API behavior, production mutations, report rendering with live backend data, and Windows rendering/deployment remain unverified because the backend and Windows environment were not available.

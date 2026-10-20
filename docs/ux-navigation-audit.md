# NIVASafe Task 04 — UX and Navigation Audit

**Reviewed:** 2026-10-15  
**Source brief:** `/Users/barmana/Downloads/NIVASafe_04_UI_UX_Designer_Dashboard_Navigation_And_Modules.md`  
**Repository:** `integration-project-2026-10-14` (current workspace, not an October 14 ZIP snapshot)

## Evidence boundary

The audit inspected the current React routes, shell, translations, feature pages, API client, backend route modules, and Prisma models. At the start of the task, no NIVASafe web/API service was listening, and this checkout had no `.git` directory. The attached Task 04 brief is the product specification; it does not establish that a backend feature exists. The installed UI UX Designer is exposed in this environment as local design skills, including `ui-ux-designer`, `dashboard-saas-ui`, and `information-architecture`; the tool catalog has no dedicated UI UX Designer MCP action. Those skills informed the implementation decisions.

## Item-by-item baseline status

| Requested area | Baseline status | Source and route evidence | Task 04 handling |
|---|---|---|---|
| Overview and dashboard widgets | working | `frontend/src/features/general/GeneralPages.tsx` (`DashboardPage`, `/`); backend `modules/dashboard.ts` | Preserved analytics, KPI destinations, custom widget IDs/order/storage. Added direct links to the existing FMEA/RULA registers inside Quick Access. |
| Projects and processes | working | `App.tsx` `/projects`; `GeneralPages.tsx` `ProjectsPage`; backend `modules/projects.ts` | Repositioned under Management. |
| Assistant | working | `App.tsx` `/assistant`; `features/assistant/AssistantPage.tsx`; backend assistant routes | Repositioned under Management; existing quota/history logic untouched. |
| FMEA create and saved register | working workflow / partial navigation | `App.tsx` `/fmea` and `/fmea/:id/report`; `AssessmentPages.tsx` recognizes `view=registered` and preserves report/edit parameters | Reused the same page; added separate direct destinations `/fmea` and `/fmea?view=registered`. |
| RULA create and saved register | working workflow / partial navigation | `App.tsx` `/rula` and `/rula/:id/report`; `AssessmentPages.tsx` recognizes `view=results` and preserves report/edit parameters | Reused the same page; added `/rula` and `/rula?view=results`. |
| Chemical risk | blocked by backend | No chemical-risk model or route was found in `backend/prisma/schema.prisma` or `backend/src/modules`; no frontend page or route | Shown as a non-interactive, API-pending item in both assessment groups; no FMEA/RULA substitution or risk classification invented. |
| Corrective actions | working | `App.tsx` `/actions`; `features/actions/ActionsPage.tsx`; backend `modules/actions.ts`; Task 02–03 handoff in `docs/edits/02-ui-ux-01-03-handoff.md` | Repositioned under Action Programs. Existing FMEA/RULA split, charts, forms, and APIs were left untouched. |
| Knowledge base and files | working | `/knowledge` and `/files`; `GeneralPages.tsx`, `features/files/FilesPage.tsx`; backend `modules/knowledge.ts` and `modules/files.ts` | Repositioned under Document Management. Existing upload, visibility, and AI-readability behavior retained. |
| Checklists and audits | partial / placeholder | `/checklists` renders `ComingSoonPage` in `App.tsx`; no dedicated checklist/audit model or route was found | Kept the legacy URL and marked it pending in navigation and page copy; no form or fake inspection results added. |
| Permits, questionnaires, plans/maps | missing / blocked by backend | No corresponding frontend routes/pages or domain models/routes were found; generic secure file storage exists but is not a permit/questionnaire/plan contract | Visible as non-interactive API-pending items. No new route or claim of secure document workflow. |
| Incident management | partial / placeholder | `/incidents` renders `ComingSoonPage`; no incident model or route was found | Kept the legacy URL and explicitly labeled the route pending its API and permission contract. |
| Workplace exposure measurements and guidance | blocked by backend | No measurement/guidance domain model or API routes were found | Shown in the requested nested navigation as non-interactive pending items. No limits, units, or measurements invented. |
| Occupational medicine / health surveillance | blocked by backend | No occupational-health model or route was found. `/health` is system health, not employee surveillance. | Kept separate from system health; pending menu item is limited to administrator roles and does not expose medical data. |
| Industrial ventilation | blocked by backend | No ventilation inventory, inspection, measurement, or route was found | Shown as a non-interactive pending item; no performance values or compliance claims added. |
| Notifications | working | `/notifications`; `features/notifications/` and backend notification routes | Repositioned under Help; Task 02–03 quota notifications unchanged. |
| Support / tickets | partial | `/support`; `features/support/SupportPage.tsx`; backend `modules/support.ts` supports organization-scoped requests, request detail, and a SUPER_ADMIN review/status/response. The UI offers request creation/list and admin review; it does not provide a reply timeline or optional ticket attachments. | Repositioned under Help. Existing quota/plan requests and support APIs retained. Reply threads and attachments remain a Task 05 contract gap. |
| Members, admin, organizations, activity log | working | `/members`, `/admin`, `/organizations`, `/activity-log`; route guards in `App.tsx`; backend `modules/users.ts`, `modules/admin.ts`, organization and audit routes | Repositioned in the organization group. Existing role visibility and route guards retained. |
| Profile and system health | working | `/profile`, `/health`; `AccountPages.tsx`, `GeneralPages.tsx`; `/health` guarded to SUPER_ADMIN/ORG_ADMIN in `App.tsx` | Repositioned under Settings. Employee health surveillance remains a separate pending item. |
| Sidebar interactions | partial | `AppLayout.tsx` already persisted desktop collapse, had mobile dialog/focus trap, Escape, background inertness, and route-close; navigation was flat with no disclosures or nested active trail | Replaced flat links with independent native disclosure controls and route-aware breadcrumbs; retained existing mobile and persistence behavior. |
| Persian/English and themes | working baseline | `i18n.tsx`, `AppearanceProvider.tsx`, theme tokens, direction-aware shell styles | Added paired Persian/English labels and semantic token-based shell styles for the new menu. |

## Intentionally untouched

- `frontend/src/features/assessments/AssessmentPages.tsx` scoring, drafts, reports, create/edit flows, and existing `view=registered` / `view=results` behavior.
- `frontend/src/features/assessments/RegistrationPage.tsx` and the legacy `/choose-path` route.
- Corrective-action workflows, chart truthfulness, and notification/token warning behavior from Tasks 02–03.
- API paths, business logic, permission guards, database schema/migrations, subscription behavior, and Windows deployment files.
- Dashboard analytics and persisted widget order/visibility; only Quick Access received additional route links.

## Environment blockers

- The workspace has no `.git` metadata, so `git status`, commit history, commits, and commit-based rollback cannot be supplied. No Git repository was initialized as part of this task.
- Final frontend checks: `vitest run` passed **43 test files / 272 tests**; `tsc -b --noEmit` (the frontend lint script) passed; `tsc -b` passed; `vite build` passed. Vite reports the existing main JavaScript chunk at about 533 kB, above its 500 kB advisory threshold.
- A local frontend server was started and the unauthenticated `/login` shell loaded. An authenticated session and backend services were unavailable, so the changed navigation could not be exercised in the mounted application. This browser check does not establish live backend, database, mutation, or production behavior. The remote Google Fonts request timed out in this environment.
- Windows rendering/deployment validation requires a Windows environment and is not available from this macOS checkout.

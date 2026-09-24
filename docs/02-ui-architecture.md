# Stage 02 — UI Architecture

## Assessment method selection

`/choose-path` is the authenticated entry surface for choosing an assessment method after login or registration. It presents FMEA and RULA as equal semantic cards with a short use-case description, differentiating tags, supporting bullets and a direct entry button. A single click marks a method as selected, the explicit entry button or double click continues immediately to `/fmea` or `/rula`, and the existing Continue action uses the selected method. The selected path is stored in the active session and a change-method link on both assessment surfaces returns to this screen so the user can switch without losing the choice.

The cards use real buttons rather than clickable containers, expose pressed state and descriptions to assistive technology, retain visible focus treatment and stack into one column on narrow screens. The selector stepper now contains exactly three steps—assessment type, assessment details, and review/confirmation—with assessment type as the current first step; the redundant basic-information step is no longer rendered, while downstream project/context fields remain intact. The session note and selected badge provide non-color feedback, while FMEA and RULA accents remain consistent with their existing semantic treatment.

## Dashboard and application shell

The authenticated dashboard preserves the existing KPI, risk, action, recent-activity and quick-action surfaces while exposing a widgetable layout editor. Each dashboard widget has an explicit visible/hidden state, a remove/restore action, keyboard-accessible up/down ordering controls and drag-and-drop ordering. Visibility, removal and order are persisted in browser storage using the authenticated user and active organization as the scope; reset restores the complete default layout. If all widgets are hidden or removed, an empty state keeps the layout editor reachable.

The sidebar groups navigation by management, risk assessment, action plans, reports, guidance, company and users, and settings. Its desktop collapse/expand control exposes `aria-expanded` and `aria-controls`; collapsed links retain accessible labels and tooltips. Active states use the existing admin-specific treatment for administrator workspaces and the site blue palette for ordinary workspaces. The shell keeps the existing routes and permission filtering, closes the mobile drawer after navigation, and uses deliberate desktop, tablet and mobile layouts.

Dashboard customization controls use consistent rounded bordered cards, a clear separation between widget identity and actions, visible focus states, status summaries and responsive stacking. Removal is reversible and affects only the current user's dashboard view, so it does not delete business data or dashboard source records.

## FMEA screen

`/fmea` keeps the existing assessment list, history and risk-row surfaces and adds a three-step creation wizard. The selected assessment's main register is a horizontally scrollable enterprise table with process/activity, failure mode, effect, cause, current controls, S/O/D, RPN, risk level and recommended action columns. Its toolbar provides search, risk filtering and numeric sorting; the same surface provides the S/O/D guide, detail inspection, edit, confirmed delete and structured Excel/real Word (`.docx`) exports. The add-row form focuses on failure data, controls and scores; row number and process stage are derived automatically. The score panel keeps the three S/O/D selectors and multiplication separators in one row, with the live RPN preview, calculated risk-level badge and calculate/save action aligned beside them; at narrow widths the field group and action group stack deliberately. The selector labels and guide use the supplied 1–10 reference scale, while risk bands are VERY_LOW 1–50, LOW 51–100, MEDIUM 101–200, HIGH 201–400 and CRITICAL above 400. The following risk-row AI assist uses the same process context to return bounded failure/effect/cause/control suggestions plus advisory S/O/D scores; the score suggestion is displayed after the score panel and requires explicit apply or dismiss confirmation. PDF generation remains a compatibility API path and is intentionally not exposed in the authenticated panel.

`/fmea/:id/report` is the results surface. It uses a metadata header, four executive summary cards, a risk distribution chart, a top-failure-mode list, a proposed-action panel, a permission-gated manual-action form, an action register and a collapsible full-details table. The page exposes back and audit-backed save actions; report data remains horizontally scrollable on narrow screens and no PDF download control is rendered.

1. Process information: project, searchable job/process, department, activity description, suggestions and special conditions.
2. Review and register: optional code and scope and the existing confirmation summary are presented together in the second stage. The registration action is guarded against duplicate submission and keeps the user on this stage when offline or when the API rejects the request.
3. Report and results: after a successful registration, the server-created assessment ID opens `/fmea/:id/report` as the active third stage; the report surface renders the shared stepper at stage 3 and provides a deterministic return to the registered-assessments list.

The FMEA creation stepper labels are localized as «اطلاعات فرآیند»، «مرور و ثبت» and «گزارش و نتایج» (process information, review and register, and report and results). The first two labels map to the existing pre-submit form states; the third maps to the existing report route after the assessment is created, so the report cannot be opened without a real tenant-scoped assessment ID.

The assessment-information panel uses an aligned responsive row for the assessment code and scope controls. The code field's auto-generated hint remains below its own input and no longer changes the vertical position of the scope field.

The job search is an accessible combobox with keyboard navigation, a bounded result list, an explicit clear action and a user-confirmed custom-title option. The activity description has a one/two-sentence limit and a separate AI suggest/improve action that writes a validated result directly into the editable field without rendering a secondary suggestion panel. Process suggestions remain buttons with pressed state; confirmed items are shown separately and are serialized only from the confirmed state. FMEA risk-row AI suggestions remain bounded to six per category, show three items initially for failure mode, effect, cause and recommended control, and expose an independent accessible plus/minus control for the remaining items; accepting a suggestion remains explicit.

## Authentication and registration screens

`/register` opens on a two-option account-type radio group for personal and organization registration. A saved draft may prefill the fields, but it must not hide the selector; later wizard steps expose a visible change-type action. The personal path keeps name parts, email, optional activity area, password and confirmation in the existing form, followed by review and success states. The organization path uses visible manager, company/account and review steps, with all non-secret values preserved through Back/Next. Required errors remain next to the field, password controls expose show/hide state, and submit failure uses safe localized copy. `/login` keeps one credential form for all accounts; after successful authentication it stores the first active organization membership returned by the API and navigates directly to the panel. Authorized company switching remains available from the authenticated shell rather than as a second login page. The support message is a semantic footer of `login-art`, outside the hero content flow, and stretches across the marketing panel so it does not consume hero spacing as a centered content block.

The public login hero title keeps its localized RTL/LTR content while using a compact responsive font scale, tighter line-height and the available hero measure so it remains on one line at the supported desktop validation sizes without clipping or changing the message.

## Company management and switching

The authenticated shell exposes a compact organization selector and a dedicated `/organizations` management surface to every authenticated account. The selector contains only server-returned memberships; changing it persists the selected ID and reloads the shell so all subsequent API calls use the new tenant. The management page shows the current company's subscription state and provides independent company creation, organization details and company entry actions. In a pending or expired subscription state, the page remains reachable for billing/recovery while operational pages present a clear activation path.

## State matrix

| State | Behavior |
|---|---|
| Loading | Catalog/AI controls show a bounded spinner and keep the form usable. |
| Empty | Search and suggestion areas explain how to continue or add an item. |
| Error/unavailable | A non-blocking safe message is shown; catalog suggestions and deterministic description fallback remain available where possible, and the form remains usable. |
| Draft | Local and IndexedDB snapshots restore process fields and selections. |
| Review/success | Only confirmed fields are submitted; successful submission clears the draft. |
| Membership scope | Login persists only a server-returned organization membership; no client-entered role is accepted, and later company switching remains limited to server-returned memberships. |

## Localization and responsive rules

Persian labels and content are RTL; English content is LTR. The grid stacks on narrow screens, the description AI action moves below the textarea, and add-item controls stack to preserve usable touch targets.

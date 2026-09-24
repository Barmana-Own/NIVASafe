# FMEA

Severity, occurrence and detection are integers 1–10. The API calculates `RPN = S × O × D`; clients cannot submit RPN. The supplied reference bands are VERY_LOW 1–50, LOW 51–100, MEDIUM 101–200, HIGH 201–400 and CRITICAL above 400; organization upper thresholds remain configurable, with 101/201/401 as the production defaults. Rows retain controls, recommendations and residual-score fields. The authenticated panel exposes structured Excel (`.xlsx`) and real Word (`.docx`) downloads; the tenant-authorized PDF route remains available only for backward compatibility.

## Main risk register

The selected FMEA assessment presents a complete risk matrix with process/activity, failure mode, failure effect, failure cause, current controls, `S` (severity), `O` (occurrence), `D` (detection), calculated `RPN`, risk level and recommended action. The register supports:

- text search across the process, failure data, controls, risk level and recommended action;
- risk-level filtering and numeric sorting by row, RPN, severity, occurrence or detection;
- client-side pagination for larger result sets while preserving the responsive horizontal table view;
- a collapsible S/O/D scoring guide with criteria for every score from 1 to 10, also shown beside the editable score selectors;
- detail inspection without leaving the assessment;
- server-validated row editing with recalculated RPN/risk level;
- confirmed row deletion with tenant and permission checks;
- Excel (`.xlsx`) and real Word (`.docx`) export. PDF controls are intentionally absent from the panel; the legacy PDF and `.doc` URLs remain accepted by the API for backward compatibility, with `.doc` returning the same valid DOCX package.

The API remains authoritative for RPN, risk thresholds, validation, tenant isolation and mutation permissions. When a new row is added without the legacy row-number or process-stage fields, the API assigns the next sequential row number and derives the process/activity context from the parent assessment. Item edits and deletions are audit-recorded.

When the configured risk AI provider is available, the add-row and review forms request bounded drafts for failure mode, effect, cause, preventive controls, detection controls and recommended action, plus advisory S/O/D scores. The first suggestion is applied only to each empty text field and untouched score group; existing user input is preserved, every value remains editable, and remaining alternatives require explicit selection. Provider failures leave the form usable.

## FMEA report and results

Each assessment exposes a tenant-scoped results page at `/fmea/:id/report`. The report header shows the assessment status, process/job, organization, assessment date, FMEA method and the active evaluation team. Its executive summary includes total failure modes, high-priority risks, corrective actions required and immediate actions, followed by a VERY_LOW/LOW/MEDIUM/HIGH/CRITICAL distribution chart.

The report ranks the top three to five failure modes by action priority and RPN, lists NIVASafe corrective-action suggestions for user review, and allows authorized users to register a manual corrective action with a related FMEA row, priority, owner, status, due date and description. Suggestions are not persisted as actions until the user explicitly registers them. Registered actions can be tracked from the report and linked to the originating FMEA row.

The full FMEA detail table is collapsible and includes failure mode, effect, cause, S/O/D, action priority, RPN and corrective actions. Each row now has separate view and edit controls: view opens an accessible detail dialog, while edit opens the existing server-validated risk-row editor and recalculates RPN/risk level on save. The page supports returning to the assessment and an audit-backed save-report action; it intentionally renders no PDF download control. Registered actions expose the minimum tracking states (new, waiting for action, in progress and completed), while NIVASafe suggestions remain visibly unregistered until the user confirms them. The **Add manual action** button opens the editable form and smoothly scrolls it into view while keeping the title field ready for entry. The tenant-scoped PDF API builder and Excel/DOCX exporters remain available for compatibility and include the executive summary and action-priority column.

The full-details section also provides an explicit **AI-generated FMEA detail suggestions** action. It requests at least five bounded draft risk rows from the tenant-scoped risk provider using the project, process, department, activity and existing-row context. Drafts remain client-side and editable until the user explicitly adds each one to the assessment; provider failure returns safe contextual fallback drafts and never writes rows automatically. The endpoint is rate-limited, permission-checked, audit-recorded and included in AI usage accounting when provider token usage is available.

## Process information

The first FMEA step stores the process context required for an HSE assessment:

- job/process title (required);
- department/unit (optional);
- short activity description (required, maximum 1,200 characters and one or two sentences);
- equipment/machinery, materials and existing controls (optional, up to 20 items per category);
- special working conditions (optional).

The process-information step also accepts up to five optional JPG, PNG or WEBP images, each up to 10 MB. The authenticated server endpoint validates the MIME type, file signature and size before sending each image to the configured image-capable risk provider. Analysis starts automatically after upload; the bounded advisory responses are merged into editable review rows with S/O/D scores, and the user must review them before registration. After FMEA submission, every selected image is stored as a tenant-scoped `FmeaAssessment` attachment for audit and follow-up.

The job field is a keyboard- and touch-friendly searchable combobox backed by `JobCatalog`. Results are scoped to active global entries and entries belonging to the current organization. When no result is suitable, the user can explicitly confirm the entered title; it is saved as an organization-scoped catalog entry and selected for the current assessment. If that save is temporarily unavailable, the title remains usable as an assessment-local fallback and the error is shown without blocking the form. Selecting a catalog job loads its related equipment, material and control suggestions without an automatic AI request. The process-suggestions board shows at most six suggestions per category and provides an explicit **Get AI suggestions** action; after the first response the same control becomes **Get new suggestions** so users can request another bounded set without spending tokens on every field change. The field label, required marker, spacing and control typography use the same shared FMEA field treatment as project and department/unit fields.

When the field is focused, the client loads the active global and organization-scoped `JobCatalog` entries once (up to 200 records) and filters localized titles, alternate-language titles, departments and keywords locally as the user types. This removes the per-keystroke AI request and keeps results responsive; changing the query immediately replaces the visible options without stale responses. The catalog includes common HSE, production, maintenance, logistics and construction roles. If no catalog title matches, the user can still explicitly confirm a custom title. The legacy `mode=job-titles` API remains available for compatibility but is not called by the live job field, so title searching does not consume AI tokens.

The FMEA process-information form includes a user-controlled **FMEA assistant** toggle. It is disabled by default for new assessments and its preference is kept locally in the current browser; turning it on enables the optional automatic autofill without disabling manual entry or the explicit per-field assistants. When a user selects a project and enters a job/process title, the enabled assistant requests `POST /fmea/process-suggestions` with `mode=autofill`. The response may suggest the unit/department, short activity description, special work conditions, equipment, materials and existing controls. Only empty fields or values previously written by the assistant are updated, so a manual edit made while a request is in flight is preserved. All returned values remain editable and are saved only when the user submits the assessment. The server requires a tenant-scoped project for this mode, bounds and validates the structured response, and falls back to catalog/local suggestions when the AI provider is unavailable.

When the assistant is enabled, the Review & register risk-row editor and the registered-assessment add-row form automatically request a draft using the selected project, job/process title and activity context. The first bounded suggestions are placed directly into empty failure-mode, effect, cause, preventive-control, detection-control and recommendation inputs, and the advisory S/O/D values are placed into untouched score selectors; remaining alternatives stay available for explicit selection. Any existing user value or manually changed score is preserved, and all inserted suggestions remain editable before registration.

Catalog titles are used only after the user explicitly selects them; a new title confirmed through **Add new item** is persisted for the current organization and becomes searchable for future assessments. The global catalog includes common production, maintenance, logistics, construction, laboratory and HSE processes in addition to job titles, so process names such as inspection, packaging, maintenance, loading, laboratory testing and risk assessment are available without an AI request. Changing the job clears the previous suggestions and selected items so unrelated process data is not carried into the new assessment. The live title search does not invoke AI; the activity-description, process autofill and risk-row assistants remain bounded to their existing flows. The activity-description assistant is bounded to the same 1,200-character, one/two-sentence field and a valid result is inserted directly into that editable field; API failures remain non-blocking.

If the user chooses **＋ New project** from the FMEA project selector, the current FMEA draft is persisted before opening the project form. Creating the project from that return flow sends the new project ID back to `/fmea`, where it is selected automatically instead of leaving the selector on the create-project placeholder.

Operational FMEA drafts continue to use local storage with an IndexedDB backup and can be synchronized after a temporary offline period.

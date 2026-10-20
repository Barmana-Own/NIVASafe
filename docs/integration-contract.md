# NIVASafe — Task 05 Frontend / Backend Integration Requirements

**Purpose:** hand off the API/data contracts needed before the Task 04 pending navigation items can become functional screens.  
**Boundary:** this document records product requirements from Task 04 and source audit findings. It does not define endpoint names, claim that any API exists, or authorize frontend simulation of success.

## Existing contracts that Task 04 reuses

| Existing capability | Current frontend use | Current source contract |
|---|---|---|
| FMEA / RULA creation, register, report | `/fmea`, `/rula`, `/fmea/:id/report`, `/rula/:id/report` | Existing assessment APIs in `backend/src/modules/assessments.ts` and `backend/src/modules/reports.ts`; navigation uses the current `view=registered` and `view=results` modes. |
| Corrective actions | `/actions` and assessment reports | Existing `/actions` and assessment-linked actions in `backend/src/modules/actions.ts`; Tasks 02–03 handoff lists the contracts and scoping already in use. |
| Knowledge, files, notifications | `/knowledge`, `/files`, `/notifications` | Existing route modules `knowledge.ts`, `files.ts`, and `notifications.ts`. |
| Support requests | `/support` and super-admin inbox in `/admin` | `backend/src/modules/support.ts`: create request with idempotency key; requester-scoped list/detail; SUPER_ADMIN list/detail/review with status and a single response string. `SupportRequest` is in `backend/prisma/schema.prisma`. |

## Missing module contracts

The operations below describe what a frontend needs to call. The route paths, HTTP methods, pagination model, and permission names must be agreed by Task 05 against repository conventions before implementation.

| Domain | Current source status | Minimum API data and operations needed before enabling UI |
|---|---|---|
| Chemical risk assessment | No dedicated page, Prisma model, or backend route found. | Organization-scoped project/process/location; substance identity and SDS metadata/version; hazard category; exposure scenario/routes; quantity, frequency, duration; existing controls; canonical assessment method and version; responsible assessor; status/review date. Create, list/search/filter, detail/edit, and report operations. Any risk class must be returned by the canonical server method with method/version metadata. Do not use FMEA/RULA tables or client-calculated substitute scores. |
| Checklists and audits | `/checklists` is a current placeholder; no dedicated model/routes found. | Templates/versioning, inspection schedule, assigned auditor, draft/executed state, findings/evidence, result/review state, and linked corrective actions. Required create/read/update/execute/review/list operations and attachment authorization. |
| Work permits | No dedicated model/routes found. | Configured permit types; site/location; hazard controls; responsible people; issue/expiry; approval chain; attachments; state/timeline. APIs must distinguish draft, pending approval, active, expired, and closed. No automatic approval or safety certification. |
| Questionnaires | No dedicated model/routes found. | Versioned templates and question types; allowed respondent/distribution scope; draft/submit lifecycle; response summary/export. Contract must define identified vs anonymous collection, and prevent identification data from being returned in anonymous mode. |
| Plans and maps | No dedicated register/version model/routes found; general attachment storage exists. | Project/site, file reference, category, version, metadata, preview/download authorization, and revision history. Reuse secure file storage; no CAD editing API is implied. |
| Incident management | `/incidents` is a current placeholder; no incident model/routes found. | Organization-scoped incident/near-miss report, time/place, severity, authorized witness details, attachments, investigation/findings, review state/timeline, and linked action plans. Define roles/field-level access for personal data and list/detail/create/update/review operations. |
| Workplace exposure measurements | No domain model/routes found. | Workplace/area, factor type, server-approved units/methods, sampling date, equipment/calibration reference, measured values, evidence, and review state. Any regulatory limit and comparison must be delivered with source/version metadata; unknown values must remain explicitly unverified. |
| Exposure guidance / intelligent assistance | No domain model/routes found. | Guidance source/version and permission/quota-aware advisory request/result contract. Return source/method notes and a human-review marker; no diagnosis or autonomous regulatory conclusion. Reuse existing AI permission and quota APIs. |
| Occupational medicine / health surveillance | No domain model/routes found. `/health` is technical system monitoring and must remain separate. | Minimum-necessary, clinician-authorized fitness status and due surveillance dates; scoped reviewer identity; no diagnosis/medical details in general HSE/admin dashboard payloads. Define explicit roles, field-level access, audit, and retention rules before UI work. |
| Industrial ventilation | No domain model/routes found. | Equipment/system inventory, inspection/maintenance records, document references, measured airflow/pressure and observations. Every value must declare units and measured/estimated source; compliance decisions require expert-review status and must not be inferred by the frontend. |

## Support ticket gap

The existing contract supports an initial request plus one administrative response, not an ongoing conversation. The Task 04 request expects ticket detail, reply history, optional attachments, and a support inbox/reply interface. Task 05 must decide whether to extend `SupportRequest` or introduce a related message/attachment model, then define:

- requester-only organization-scoped ticket list/detail;
- SUPER_ADMIN/support inbox list/detail and status transitions;
- append-only replies with author/time and tenant-safe visibility;
- authorized attachment upload/download using the existing storage service;
- retry/idempotency behavior, limits, validation errors, audit events, and pagination.

Current AI-token and Professional-plan requests must continue using the existing support channel; no parallel request channel should be added.

## Shared contract requirements

- Backend tenant scoping and authorization are mandatory for every read and mutation; client-side role-filtering is never a substitute.
- Task 05 must specify role/permission per operation, field visibility, validation, concurrency/version behavior, soft-delete/retention rules, and audit requirements.
- List operations must define search/filter/sort/pagination shape and exact totals/cursors. The frontend must not claim server pagination where the API is only a limited array.
- Mutations must specify success/error envelopes, idempotency/retry behavior where applicable, and upload size/type constraints.
- Detail/report/download links must define authorization and not expose personal or medical data across organizations or roles.
- Only after these contracts exist and are integrated should pending sidebar entries become links to functional forms/registers. Until then they remain visibly pending, and no local fixture may ship as a success path.

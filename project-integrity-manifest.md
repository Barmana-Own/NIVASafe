# NIVASafe Project Integrity Baseline

This lightweight baseline protects the existing product surface while focused cross-cutting changes are applied.

## Protected applications and boundaries

- `frontend/`: React/Vite application, authenticated shell, account flows, assessments, reports, files, knowledge and PWA.
- `backend/`: Fastify API, Prisma persistence, authentication, authorization, queues and provider adapters.
- `shared/domain/`: shared FMEA/RULA/business validation used by browser and API.
- `backend/prisma/` and `database/`: MySQL schema, migrations and provisioning assets.
- `docs/`, `deployment/`, `docker-compose.yml`, `.env.example`: operational and setup contracts.

## Protected user journeys

- Registration and login, password recovery and profile/member management.
- Organization/project/process/activity management.
- FMEA and RULA assessment creation, history and reports.
- FMEA process-information capture with searchable/custom job selection, user-confirmed equipment/material/control suggestions, bounded one/two-sentence activity-description assistance and offline draft recovery.
- FMEA results report with executive risk metrics, distribution/top-risk views, suggested and manual corrective actions, row-linked action tracking, collapsible full details and PDF/export summary.
- RULA process information and posture analysis with editable Group A/Group B observations, score recalculation, posture-photo review and future-ready joint overlay.
- RULA results report with score/risk, neck/upper-arm/trunk contributing factors, persisted corrective actions, manual action entry and explicitly non-definitive dynamic prediction.
- Corrective actions, files, knowledge, AI, chat, notifications and audit.
- Responsive navigation and PWA/offline shell.
- Dashboard KPI/risk/action/recent/quick-action widgets with user-scoped layout customization, visibility, ordering and reversible removal/restore controls.
- Global and organization administrator workspaces with separate navigation styling and centralized user-account controls.
- Administrator-managed invitations for organization administrators and bounded assistants, with server-enforced role boundaries.
- Multi-company workspace creation and switching with independent organization memberships, per-company subscriptions and tenant-scoped operational access.

## Baseline comparison for the current change

- No page, route, API resource, database entity, role, permission or asset was removed.
- Existing pages, routes, assets and API contracts remain available; localization was added as a presentation-layer capability without removing the Persian defaults.
- The phone contract was tightened at shared, server and editable-client boundaries.
- Existing data is preserved; no destructive migration was introduced.
- Provider-reported AI token usage is persisted in an additive accounting table and displayed with tenant-safe administrator aggregates; prompts, responses and credentials are not included in usage reports.
- The new `/admin` route and `/admin/*` API surface are additive; global account controls are restricted to `SUPER_ADMIN`, while `ORG_ADMIN` receives a tenant-scoped administration view backed by the existing `/members` route.
- The `ASSISTANT` role and its enum migration are additive; existing roles, memberships, routes and invitation acceptance behavior remain preserved.
- Autosave was added through reusable form infrastructure and existing protected pages/routes remain intact; password/recovery forms stay intentionally excluded from drafts.
- The FMEA report route, report/save audit endpoint and `CorrectiveAction.fmeaItemId` migration are additive; existing assessment, action, export and role boundaries remain available, and row deletion preserves linked action records by nulling the reference.
- RULA posture analysis is additive: `postureAnalysis` is nullable, validated at the API boundary, preserved in version snapshots and does not remove or invalidate existing scoring inputs.
- RULA report actions are additive: `rulaImpact` is nullable, validated at the action boundary, linked only to a tenant-owned RULA assessment, and does not alter the authoritative stored RULA score.
- Multi-company management is additive: existing organization/member/project/data paths remain present; company creation adds a separate `ORG_ADMIN` membership and localized starter project, while selection is membership-checked and each company's subscription gate is evaluated independently.
- Authenticated shell theming is additive: the existing routes, navigation, content surfaces and permissions remain present; a persisted blue/dark or white/light preference changes only shell presentation and the sidebar logo treatment.

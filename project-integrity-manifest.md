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
- Corrective actions, files, knowledge, AI, chat, notifications and audit.
- Responsive navigation and PWA/offline shell.

## Baseline comparison for the current change

- No page, route, API resource, database entity, role, permission or asset was removed.
- The phone contract was tightened at shared, server and editable-client boundaries.
- Existing data is preserved; no destructive migration was introduced.
- Autosave was added through reusable form infrastructure and existing protected pages/routes remain intact; password/recovery forms stay intentionally excluded from drafts.

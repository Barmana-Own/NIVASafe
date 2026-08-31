# API

Base path: `/api/v1`. Interactive OpenAPI is served at `/docs`. Responses use `{ "data": ... }`; errors use `{ "error": { "code", "message", "requestId" } }`. Protected calls require `Authorization: Bearer <token>` and tenant calls require `x-organization-id`.

Implemented groups: auth, organizations, projects, processes, activities, FMEA, RULA, corrective actions, dashboard, reports, files, knowledge, chat, notifications, audit logs and health. Pagination parameters are `page`, `limit`, and `search` where supported.

## Account, organizations and recovery

- `GET/PATCH /profile` reads and updates the display name, email, phone, job title and interface locale (`fa`/`en`). `POST /profile/change-password`, `POST /auth/forgot-password` and `POST /auth/reset-password` handle secure password changes and recovery.
- Phone fields accepted by registration, profile and member endpoints must be Iranian mobile numbers in canonical local format: exactly 11 ASCII digits matching `^09\d{9}$`. Persian and Arabic-Indic digits and common display separators are normalized before validation; international `+98`/`0098` forms are rejected.
- `GET /members`, `PATCH/DELETE /members/:id` and `POST /invitations` provide member profile editing, role/active-state management and removal. Only `SUPER_ADMIN` can grant the global super-administrator role.
- `GET /organizations` lists all companies for a super administrator and only scoped memberships for other users. `PATCH /organizations/:id/status` requires `SUPER_ADMIN` plus a two-step `confirmation` value (`ACTIVATE` or `DEACTIVATE`) and is audited. Inactive organizations are rejected by the backend with `ORGANIZATION_INACTIVE`.

## Knowledge base

- `GET /knowledge/quota` returns the organization plan, token usage, remaining quota and maximum attachment size.
- `GET/POST/PATCH/DELETE /knowledge` manages organization documents. A document can be `isGlobal`, targeted with `visibleOrganizationIds`, restricted to `visibleUserIds`, hidden with `visibility`, or marked `aiOnly` (which requires `aiReadable=true`).
- `POST /knowledge/:id/attachments` accepts approved image, Word, PDF, spreadsheet and text files; `GET /knowledge/attachments/:id/download` and `DELETE /knowledge/attachments/:id` provide scoped file access and removal.
- Global documents are managed by `SUPER_ADMIN`; organization and user visibility is enforced in the backend for every list, attachment and AI context query.

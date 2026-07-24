# API

Base path: `/api/v1`. Interactive OpenAPI is served at `/docs`. Responses use `{ "data": ... }`; errors use `{ "error": { "code", "message", "requestId" } }`. Protected calls require `Authorization: Bearer <token>` and tenant calls require `x-organization-id`.

Implemented groups: auth, organizations, projects, processes, activities, FMEA, RULA, corrective actions, dashboard, reports, files, knowledge, chat, notifications, audit logs and health. Pagination parameters are `page`, `limit`, and `search` where supported.

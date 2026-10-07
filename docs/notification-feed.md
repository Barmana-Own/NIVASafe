# In-app notification feed

The header opens a non-modal, keyboard-accessible popover instead of navigating immediately. It displays the eight newest notifications, timestamps, safe internal detail links, per-item read controls and a read-all control. The full notification page shows the newest 100 records with an explicit displayed/total count. Unread counts are computed over all records, not the displayed subset. Reading from either surface refreshes the other surface. Header state is remounted when the authenticated user or organization changes.

## API and operational sources

`GET /api/v1/notifications/summary?limit=8` accepts an integer limit from 1 through 100 and returns `items`, `unreadCount` and `total`. Authentication and organization membership use the existing guard. Queries and read mutations are scoped to the authenticated user and organization. The original notification list endpoint remains compatible.

Before returning a summary, the server reconciles bounded operational sources: up to 50 current critical FMEA rows, 50 immediate-action RULA assessments, and 50 incomplete corrective actions due within three days or overdue. Archived assessments and deleted projects are excluded; FMEA deleted assessments are excluded. RULA observations must satisfy the same reviewed-observation rules used by assessment reports. Risk and deadline preferences disable their respective source queries.

Stable tenant/user/event UUIDs and database `skipDuplicates` make reconciliation idempotent, including concurrent requests. Existing read markers and historical notifications are preserved. Risk event identity includes the source and assessment version; due event identity includes the action, due date and due/overdue phase. Reconciliation is request-driven, not a background delivery guarantee. It does not implement email or native browser push delivery. No schema migration or new dependency is required.

Stored notification links are treated as untrusted: only known local notification/action/assessment destinations are permitted. Text uses React's escaped rendering. No production credentials or data were used in UI verification.

## Verification

- Frontend suite: 142 tests passed, including destination allowlisting and menu geometry/intrinsic-height regressions.
- Backend suite: 172 tests passed, including exact counts above 100, scoped read operations, authentication rejection, input limits, preference behavior, stable event identity and exclusion of incomplete RULA observations.
- Frontend production build, backend compilation and frontend/backend TypeScript lint passed. Existing frontend bundle-size warning remains.
- Browser verification of the actual component with a disposable mocked HTTP boundary: desktop 1280×720 and mobile 375×700, no horizontal overflow, dynamic popup growth, per-item/read-all counter synchronization, Escape, empty and error states.
- Live database reconciliation and real production deployment: NOT_RUN; tests mocked the database boundary and no deployment was requested.

Existing language/select positioning changes and user files were preserved. No API, permission boundary or existing notification history was removed.

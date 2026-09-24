# NIVASafe contract UAT checklist

The Word attachment is the acceptance authority. Record actual evidence and Pass/Fail for every scenario. Automated checks completed on 2026-07-19: `lint`, `typecheck`, 10 unit tests, production build and Prisma schema validation all passed.

| Done | Scenario | Steps | Expected result |
|---|---|---|---|
| [ ] | Registration/login | Register, sign in, rotate refresh, log out | Old refresh is revoked and envelopes are valid |
| [ ] | Password recovery | Request reset, use token, sign in with new password | Token is single-use and sessions are revoked |
| [ ] | Profile | Edit identity/locale and change password | Changes persist securely |
| [ ] | Members/roles | Invite, change role, deactivate membership | Backend RBAC and navigation reflect role |
| [ ] | Tenant isolation | Use organization ID without membership | 401/403 with no tenant data |
| [ ] | Organization settings | Edit identity, locale, timezone, thresholds | Ordered thresholds drive FMEA |
| [ ] | Project/process/activity | Create, update and archive all | Records remain organization/project scoped |
| [ ] | FMEA CRUD/history | Create rows; edit, duplicate, archive, inspect history | Server owns RPN/risk; versions persist |
| [ ] | RULA CRUD/history | Submit posture; edit, duplicate, archive, inspect history | Score 1–7, action 1–4, explanation present |
| [ ] | Corrective actions | Create and move through workflow | Status, progress, assignee, due date and audit persist |
| [ ] | Excel/Word | Download report workbooks/documents for FMEA and RULA from the panel | Valid files; cross-tenant download denied; PDF report routes remain API-compatibility only |
| [ ] | Images/video/files | Upload, download, delete; try executable/oversized | Allowed works; invalid type/size rejected |
| [ ] | Knowledge/chat | CRUD knowledge; create and reopen conversation | Scoped documents, messages and citations persist |
| [ ] | AI fallback | Submit fallback with no external key | Organization knowledge provides response |
| [ ] | Provider outage/retry | Submit unconfigured provider then retry | `WAITING_FOR_PROVIDER`; readiness stays healthy |
| [ ] | Notifications | Read one/all and edit preferences | State persists; outbox retries independently |
| [ ] | PWA/offline | Disconnect, save draft, reconnect, sync twice | Shell/draft survive; no duplicate submission |
| [ ] | Audit | Perform mutations and query audit | Actor, org, entity, action and request ID exist |
| [ ] | Docker migration/seed | Build/up, migrate and seed | All seven services are healthy |
| [ ] | Chrome demo | Open localhost and sign in as demo admin | Persian dashboard remains open |

Docker Desktop 29.6.1 was installed per-user on 2026-07-19. Windows reports `RebootPending` after enabling WSL and Virtual Machine Platform; Compose/UAT rows must run after the required restart.

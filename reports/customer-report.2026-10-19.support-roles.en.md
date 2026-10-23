# NIVASafe — Support ticket delivery

| Project | NIVASafe |
|---|---|
| Gregorian / Jalali | 2026-10-19 / 1405-07-27 |
| Release | release-support-roles-20261019-01 |
| Git revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf (existing dirty worktree preserved) |
| Delivery | DEPLOYED |

## Delivered behavior

- Ordinary accounts, including organization administrators, see **Support**: create a ticket, see only their own tickets, and exchange public replies.
- Every active account with the global **SUPER_ADMIN** role sees **Ticket management** at the same Help/support location, including tickets from all organizations.
- A new ticket or customer follow-up notifies system administrators inside the application. Public support replies notify the requester. Ticket notifications open the relevant conversation.
- Assignment, priority, status and staff-only internal notes remain available; internal notes stay hidden from customers.

## Verification and publication

1029 automated tests passed, together with typecheck, lint, builds, API contract and release checks. Real isolated MariaDB/API and Chrome journeys passed at 390px and 1280px. The public site now serves the new backend/frontend; the signed-in system administrator inbox was verified at both widths with no console errors.

## Preservation and limits

Existing accounts, records, uploads, AI models and privacy controls were preserved. No database migration was executed. This release changes support; existing RULA accuracy and image-transfer approval limitations remain unchanged. Notifications are in-app; this delivery does not claim an email or SMS service.

Public normal-user writes were not performed against valuable live data; the full write/reply/relogin flow was proved in genuine isolated staging. Safari/WebKit was not tested.

## Recovery

Backup: C:/ProgramData/NIVASafe/backups/release-support-roles-20261019-01. Code/config rollback was rehearsed safely before the cutover. No owner action is required for this support release.

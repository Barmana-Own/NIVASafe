# Activity Log cards — customer report

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | customer | English | 2026-10-23 | 1405-08-01 | release-activity-log-cards-20261023-01 |

Registered activities in Activity Log now display four cards per desktop row, reducing to three, two or one column on narrower screens. All six original fields, full values and Details controls remain present. Search, event/entity filters, reset, retry and detail expansion keep their existing behavior. No unrelated product section or control changes.

## Quality and deployment

| Check | Result |
|---|---|
| Shared-domain compilation | PASS |
| Frontend typecheck / lint / compilation / production build | PASS |
| Isolated actual-bundle browser checks | PASS — 17 |
| Deployed artifact browser checks | PASS — 3 |
| Scoped security and preservation review | PASS |
| Public index/CSS bytes and unchanged API identity | PASS |
| Unit/backend/dependency audit | NOT_RUN — CSS only; logic and dependencies unchanged |
| Production activity/account mutation | NOT_RUN — synthetic API fixtures only |

Published to the application server. No external blocker or required customer action remains for this scoped presentation change.

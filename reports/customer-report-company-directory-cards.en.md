# Accessible-company cards — customer report

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | Customer | English | 2026-10-23 | 1405-08-01 | release-company-directory-cards-20261023-01 |

The accessible-company directory now displays five cards per desktop row. At narrower widths it reduces to four, three, two or one column. Company names, industry and employee information, subscription and activation statuses, and all existing Enter and administrator activation actions remain present. No other product section, field, text or button was added, removed or changed.

## Quality and deployment

| Check | Result |
|---|---|
| Shared-domain compilation | PASS |
| Frontend typecheck / lint / compilation / production build | PASS |
| Isolated actual-bundle browser checks | PASS — 16 |
| Deployed artifact browser acceptance | PASS — 3 |
| Scoped security and preservation | PASS |
| Public index/CSS bytes and unchanged API identity | PASS |
| Unit/backend/dependency audit | NOT_RUN — CSS-only change; no logic or dependencies changed |
| Real company/account mutation | NOT_RUN — synthetic isolated fixtures only |

Published to the application server. Backend and business data are unchanged. No customer action or external blocker remains for this scoped change.

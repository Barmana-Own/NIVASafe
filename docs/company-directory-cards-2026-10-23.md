# Accessible-company directory cards

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | Engineering | English | 2026-10-23 | 1405-08-01 | release-company-directory-cards-20261023-01 |

The accessible-company directory now displays five cards per desktop row. At narrower widths it reduces to four, three, two or one column. Company names, industry and employee information, subscription and activation statuses, and all existing Enter and administrator activation actions remain present. No other product section, field, text or button was added, removed or changed.

## Implementation and preservation

Only frontend/src/styles.css changes in the 526-file frozen source tree, by appending the scoped CSS supplement. The directory is identified through the existing unique direct-child organization-row-actions element; no JSX, JavaScript, route, API field, persistence, authentication or authorization behavior changes. Desktop uses five fixed grid tracks, including sparse lists. Breakpoints are 560 / 768 / 1024 / 1280 px for 2 / 3 / 4 / 5 columns. Cards retain full wrapping text, both badges and existing actions with minimum 44 px button height. No fixed card height, truncation, content hiding, network resource or new dependency is introduced. Existing color tokens support current themes and RTL/LTR layouts.

## Verification

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

Exact commands/logs and browser cases are stored in reports/evidence/company-directory-cards-20261023-01/. Browser QA uses installed Chrome, the exact current production JavaScript module and all fourteen previous stylesheets with only the CSS supplement appended. Synthetic company data and intercepted API responses isolate all account/action checks from production.

## Deployment and rollback

Only /assets/company-directory-cards-37ce1ddedb10.css and one stylesheet link were published. Module entry /assets/index-DT4v4FlK.js is unchanged. All 836 prior non-index public files and fourteen old stylesheet links remain byte-identical. API release-ai-text-connection-20261023-01 PID 11776, all 366 private backend files, environment and reverse-proxy configuration remain unchanged; no API restart, migration, data mutation or new inference was performed. Restore C:/NIVASafe/.local/company-directory-cards-20261023-01/index.before.html atomically to reverse the presentation; retain immutable assets and business data.

## Scoped delivery gates

01 requirement/repository analysis;02 existing design/component preservation;03 CSS implementation;04–07 existing backend/database/API/auth boundaries preserved;08 independent scoped security review;09 build/type/lint checks;10 responsive actual-page QA;11 immutable frontend publication;12 independent final source/evidence/live-artifact review. This is a bounded presentation maintenance release; no whole-product security or production-data functional certification is claimed.

## Visual-quality correction

The initial half-width action buttons passed 16 functional browser checks, but manual 1440 px screenshot review found an awkward Persian activation-label break. The initial candidate, build/browser evidence and security seal are preserved under .local/company-directory-cards-20261023-01-attempt-01-half-width-actions and reports/evidence/company-directory-cards-20261023-01-attempt-01-half-width-actions. Only the new CSS append was replaced: existing company action buttons now span their card width, retaining readable font size and minimum 44 px height. The corrected source was frozen again and all build and browser checks rerun before publication. No failed test or existing feature was removed to obtain a passing result.

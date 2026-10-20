# NIVASafe — UI/UX Phase Handoff

Gregorian:2026-10-19;Jalali:1405-07-27. Release:release-20261019-safe-r8-uiux-handoff.

## Checkpoint and operating boundary

Safe code was deployed at 2026-10-19T11:29:53.884Z; backend PID11620/SYSTEM. Public https://app.nivasafe.com uses the new hashes in reports/evidence/controlled-release-20261019/public-after.json. Recoverable402-file source checkpoint: C:/NIVASafe/.local/controlled-release-20261019/source-checkpoint. Current source HEAD remains e5bf3f0 with pre-existing dirty edits preserved; do not reset/clean/stash-overwrite. Runtime and static rollback: C:/ProgramData/NIVASafe/backups/release-20261019-safe-r8-uiux-handoff.

Do not broaden this phase into RULA accuracy research or change scoring,models,review,auth,tenant scope,tickets,API routes,storage or database schema. RULA/FMEA GPT-5-Mini only;chat DeepSeek-V4-Flash. Image privacy gates stay closed until documented named-organization approval;the R8 experiment remains test-only.

## Existing visual inventory / موجودی فاز طراحی

| Surface / صفحه | Existing route/owner | Next visual scope / محدوده بصری | Preservation gate |
|---|---|---|---|
| Dashboard / داشبورد | /;App.tsx;styles/dashboard.css | Balanced cards,compact metrics/actions,readable donut legends | Existing widgets/routes and data meanings |
| RULA form / فرم RULA | /rula;features/assessments/AssessmentPages.tsx | Typography,step spacing,side controls,image/review states | RIGHT/LEFT/BOTH,consent,uncertainty,manual review |
| RULA results / نتیجه | /rula/:id/report;AssessmentPages.tsx | Two-column mobile actions,table wrapping,progress layout | Historical scores,original AI/reviewer provenance,PDF parity |
| FMEA form/results | /fmea;/fmea/:id/report;AssessmentPages.tsx | First reproduce17px page overflow at788px;table-level scroll,balanced forms/cards | Process description/required fields,risk calculations,save/export |
| Navigation / ناوبری | layout/AppLayout.tsx;layout/navigation.ts | Collapsed brand/logout,density,mobile drawer,keyboard focus | Keep existing entries and permissions |
| Login/register | features/account/AccountPages.tsx;RegistrationPage.tsx | Logo/nav/controls alignment,mobile font/focus,RTL/LTR | Auth/session/activation and one brand |
| Support/admin | features/support/SupportPage.tsx;/admin | Thread hierarchy,filters,forms,compact admin quota fields | Public/private notes,operator scope,notifications |
| Chat | features/assistant/AssistantPage.tsx | Responsive history/composer and message rhythm only | Proven DeepSeek routing,history,usage,send behavior |
| Shared styles | styles/layout.css;styles/data-layout.css | Tokens,spacing,color/typography,form/table/modal consistency | Warnings,labels,focus semantics and no removed actions |

## Next visual acceptance

Use390/768/1024/1280/1440 and narrow320px where relevant; PersianRTL/EnglishLTR and available themes. Use long realistic synthetic text and dense tables,not empty-page fixtures alone. Equal-width button pairs must remain two-per-row on mobile;do not collapse an entire KPI grid into one narrow row. Verify chart legends next to charts,Persian long-text wrapping,save-button reachability,modal focus and keyboard labels. Stage real API data and public read-only approved sessions separately.

Current public788px FMEA overflow is a P2 task,not a certified responsive pass. Chrome155 covered public anonymous390/1280 and18authenticated staging pages;Safari/WebKit NOT RUN. The public approved session is retained. No redesign was started in this release.

## Rollback

Run as Administrator only for this still-active release:

    C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\controlled-20261019\release.mjs rollback

The script refuses to overwrite a newer backend/frontend/config or changed protected.env. It does not restore DB data. Isolated file reconstruction,old-runtime startup and PM2 previous→new→previous rehearsal passed. Do not weaken ACLs or replace configuration from historic ZIPs.

## خلاصه فارسی

انتشار امن انجام شده و checkpoint طراحی آماده است. بهینه‌سازی آناتومی متوقف است؛تصویر زنده RULA فعال نشده. فقط تغییرات بصری با حفظ منطق و گردش‌های موجود انجام شود. سرریز FMEA در۷۸۸پیکسل،دکمه‌های دوتایی با سهم برابر،راهنمای نمودار،کارت‌ها و متن بلند فارسی در اولویت QA طراحی‌اند. مجوز مستقل انتقال تصویر برای پایلوت همچنان لازم است.

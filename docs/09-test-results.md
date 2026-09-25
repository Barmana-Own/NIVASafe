# Stage 09 — Test Results

| Command/check | Status | Evidence |
|---|---|---|
| `pnpm test` | PASS | 162 tests: 74 frontend, 78 backend and 10 shared-domain |
| `pnpm typecheck` | PASS | All workspaces |
| `pnpm lint` | PASS | All workspaces |
| `pnpm build` | PASS | Production frontend/backend build; existing large-chunk warning |
| `pnpm verify:contract` | PASS | 55 frontend paths matched 105 backend routes |
| `pnpm verify:release` | PASS | 26 checks; 29 Prisma tables detected |
| `pnpm audit --prod --audit-level high` | PASS | No known vulnerabilities |
| AI provider routing/retry regression | PASS | ArvanCloud AI DeepSeek-V4-Flash risk routing, catalog-verified GPT-4o failover, GPT-4o chat routing, transient HTTP/network retry, bounded attempts/timeouts and secret-free provider metadata are covered by 13 backend adapter tests |
| FMEA full-details process/activity column | PASS | Frontend contract coverage verifies that `fmea-report-data-table` renders the parent assessment process name and rejects the former row-level `processStep` description |
| `surface-actions` compact controls | PASS | Frontend CSS contract coverage verifies smaller direct action-button typography/padding and `white-space: nowrap` for the manual-action label |
| FMEA reference risk-band boundaries | PASS | Shared-domain tests cover 1/50/51/100/101/200/201/400/401; frontend contract coverage verifies live score-panel risk badges and VERY_LOW filtering; backend report tests preserve the five-level distribution |
| Production FMEA risk-band migration | PASS | Migration `202609190001_fmea_risk_bands` was applied with the server-supported MariaDB client, recorded in `_prisma_migrations`, and verified with Organization defaults 101/201/401 and the `VERY_LOW` enum value |
| PWA contract and syntax checks | PASS | Manifest install metadata, v13 service-worker cache/update boundaries including private-upload bypass, bounded network fallback and registration/update lifecycle are covered by 3 frontend tests and `node --check frontend/public/sw.js` |
| Public PWA asset smoke | PASS | `sw.js` and `manifest.webmanifest` return HTTP 200 with JavaScript/manifest content types, revalidation headers and the deployed v13/standalone metadata; 192px icon and `/login` return HTTP 200 |
| Production React runtime bundle check | PASS | The production build explicitly overrides Vite's JSX development transform; the active deployed `index-CipggNix.js` contains no `jsxDEV` or `jsx-dev-runtime` references, contains the FMEA report navigation markers, and all public application routes returned HTTP 200 |
| Production TLS and canonical redirects | PASS | Publicly trusted Let's Encrypt certificate covers the application/API aliases; legacy web aliases return 301 to `https://app.nivasafe.com`; API aliases remain on `https://api.nivasafe.com` |
| Production API exposure | PASS | Fresh authorized-server verification shows the `NIVASafe-API` task Running, `pm2-runtime` supervising the API, `127.0.0.1:5044` listening with MySQL healthy, public `/api/v1/health` HTTP 200, and direct port 5044 not reachable. |
| `prisma validate` | PASS | Schema valid; deprecation warning only |
| Clean local migration | NOT_RUN | A clean disposable database was not available for this checkpoint; the additive AI usage SQL was applied and verified against the existing local schema |
| FMEA risk-register contract tests | PASS | Complete matrix columns, search/filter/sort, client pagination, detail/edit/delete controls, per-score 1–10 S/O/D criteria, explicit risk-row AI suggestions, Excel/DOCX panel exports and absence of PDF panel controls are covered; the backend PDF compatibility route remains tested |
| FMEA add-row defaults | PASS | The add-row form no longer renders row-number or process-stage inputs; the create API accepts omitted legacy fields, derives the next row number and uses the parent assessment process context; frontend and backend regression tests pass |
| FMEA AI suggestion visibility | PASS | Each of the four suggestion categories is capped at six bounded suggestions, renders three by default, and exposes an independent accessible plus/minus toggle for the remaining items; explicit acceptance remains unchanged and frontend regression/build/public bundle smoke passed |
| FMEA score panel reference scale and layout | PASS | Add/edit score panels keep S/O/D selectors and multiplication separators in one aligned desktop row with the RPN preview and calculate/save actions; responsive rules stack the groups on narrow screens, and the supplied severity/occurrence/detection 1–10 labels are covered by the frontend regression test |
| FMEA risk-row AI score suggestion | PASS | The risk-row prompt/response includes bounded advisory S/O/D scores and rationale; parser, prompt and frontend contract tests verify 1–10 validation, post-panel display and explicit apply/dismiss behavior |
| Binary report export tests and local smoke | PASS | FMEA and RULA `.xlsx` workbooks parse with ExcelJS; FMEA and RULA `.docx` responses are valid ZIP-based Office Open XML packages with the expected content types and report data; the FMEA PDF builder emits a valid %PDF- document from the structured report sections |
| Runtime smoke export coverage | PASS | The authenticated smoke script now exercises FMEA PDF/XLSX/DOCX and RULA PDF/XLSX/DOCX endpoints |
| FMEA report calculation tests | PASS | Summary counts, risk distribution, action-priority ranking and safe unknown-level fallback are covered |
| FMEA report UI contract tests | PASS | Report route, full collapsible detail table, manual-action flow, localized action states, duplicate-suggestion suppression, guarded action submission, absence of PDF controls and API report/save endpoints are covered |
| FMEA report migration execution | NOT_RUN | A clean disposable database migration was not rerun in this checkpoint; migration SQL and Prisma validation passed |
| FMEA process-information enhancement | PASS | Keyboard-searchable catalog/custom-title selection, tenant-scoped suggestions, explicit multi-select confirmation, one/two-sentence description validation, direct AI description insertion, non-blocking AI errors and removal of the secondary suggestion panel are covered by source contracts and helper tests |
| RULA activity-information validation | PASS | Four backend unit tests cover measured activity context, bounded posture description, optional image reference, invalid ranges/units, optional title fallback and both-side validation; frontend contract coverage checks all required fields, client image type/size validation, preview/remove/replace controls, upload linkage and guarded registration |
| RULA posture-analysis validation | PASS | Backend schema tests cover Group A/B observations, bounds and the explicit AI-confirmation gate; shared-domain tests cover angle-to-score and Group A/B/final-score recalculation; frontend contract coverage checks editable rows, provenance, action-level badges, live summary and image/joint overlay |
| RULA process/posture/report migrations | NOT_RUN | A clean disposable database migration was not rerun in this checkpoint; migrations `202609050003_rula_process_information`, `202609050004_rula_posture_analysis` and `202609060001_rula_corrective_action_impact` were reviewed and Prisma client generation passed |
| RULA report and prediction validation | PASS | Five RULA helper tests plus report-export tests and one frontend contract test cover impact-ranked factor contribution, detection/provenance, suggestion generation, related/manual corrective actions, bounded dynamic prediction, impact validation, report route, explicit prediction wording and corrective-action persistence |
| AI usage accounting and administrator visibility | PASS | Provider-reported input/output/total token normalization, idempotent risk/chat recording, role/organization scoping and admin-panel rendering are covered by backend/frontend tests and authenticated local endpoint smoke checks |
| Registration and login role selection | PASS | Registration type selection remains visible with saved drafts and exposes explicit accessible account-type controls; login has no intermediate role/workspace page, persists the first server-returned organization membership and enters the panel directly, while in-panel company switching remains available |
| Assessment method selection | PASS | `/choose-path` is protected by the authenticated shell; FMEA/RULA cards expose localized descriptions, pressed state, direct entry buttons, double-click continuation, session persistence, responsive focus styling and change-method links. Authenticated browser click-through is NOT_RUN because no local session/database was available during this checkpoint. |
| Assessment path stepper | PASS | The `/choose-path` stepper now renders exactly three steps—assessment type, assessment details and review/confirmation—with assessment type numbered as step 1; the redundant basic-information step is absent from the rendered component and the three-column responsive grid is covered by the frontend contract test. |
| FMEA creation stepper flow | PASS | The FMEA wizard exposes «اطلاعات فرآیند»، «مرور و ثبت» and «گزارش و نتایج» in Persian, with matching English labels; stage 1 uses an explicit non-submit transition guard and stage marker to reveal the existing review/register state, stage 2 alone submits, successful POST navigation opens `/fmea/:id/report` as stage 3, and duplicate/offline/API-failure behavior keeps the draft recoverable. Frontend contract tests, production build, public bundle smoke and v13 stale-client migration verified the flow. |

## اصلاح برچسب مراحل ارزیابی RULA — 2026-09-15

برچسب‌های ویزارد ایجاد ارزیابی RULA بدون تغییر در منطق سه‌مرحله‌ای اصلاح شدند: مرحله دوم «مرور و ثبت و امتیاز دهی» و مرحله سوم «گزارش دهی ارزیابی» است. کلیدهای فارسی و انگلیسی، عنوان مرحله سوم و متن توضیح سه‌مرحله‌ای هم‌زمان به‌روزرسانی شدند و مسیرهای موجود، ثبت ارزیابی و گزارش نهایی حفظ شدند.

| بررسی | نتیجه |
|---|---|
| تست قرارداد frontend | PASS — تست اختصاصی وجود دقیق برچسب‌های مرحله دوم و سوم، عنوان مرحله سوم و متن توضیحی را پوشش می‌دهد |
| تست کامل و build | PASS — 155 تست، typecheck، lint و build موفق؛ هشدار chunk بزرگ قبلی غیرمسدودکننده است |
| انتشار و smoke | PASS — artifactهای frontend روی static root فعال، hashهای محلی/سرور یکسان، مسیرهای `/login` و `/rula` و asset جدید HTTP 200، و labelهای فارسی در bundle عمومی تأیید شدند |

## اصلاح اطلاعات فرآیند RULA — 2026-09-15

فیلد «عنوان ارزیابی» در مرحله اطلاعات فرآیند RULA اختیاری شد و با برچسب اختیاری ثابت، هم‌تراز فیلد «سمت بدن» قرار گرفت. مقدار خالی در backend بدون خطا پذیرفته می‌شود و برای حفظ سازگاری ستون پایگاه داده، عنوان ذخیره‌شده به‌صورت server-side از عنوان شغل یا مقدار امن پیش‌فرض تعیین می‌شود. گزینه «هر دو سمت» نیز در frontend و validation backend اضافه شد؛ مقدارهای راست و چپ قبلی حفظ شدند.

| بررسی | نتیجه |
|---|---|
| تست قرارداد frontend و backend | PASS — تست قرارداد UI برای اختیاری‌بودن عنوان، هم‌ترازی labelها و گزینه «هر دو سمت» و تست schema/helper backend برای عنوان خالی و مقدار `BOTH` موفق شدند |
| تست کامل | PASS — 157 تست شامل 71 frontend، 76 backend و 10 shared-domain؛ typecheck، lint، build، بررسی قرارداد، بررسی release و audit وابستگی موفق شدند |
| migration | NOT_REQUIRED — ستون `title` برای سازگاری رکوردهای موجود باقی ماند و `bodySide` همچنان ستون رشته‌ای است؛ تغییر schema یا migration لازم نبود |
| انتشار و smoke | PASS — release `release-20260915-rula-process-info` با hash یکسان local/سرور، backup قابل rollback، API و MySQL سالم روی پورت `5044`، taskهای Running و مسیرهای عمومی/asset جدید با HTTP 200 تأیید شد |

## آخرین اصلاح مسیر مرحله‌ای FMEA — 2026-09-15

برای رفع گزارش پرش از مرحله اول به مرحله سوم یا ماندن روی پوسته قدیمی، انتقال مرحله اول به دوم با handler صریح، جلوگیری از propagation و submit ناخواسته، markerهای `data-fmea-step` و focus/scroll به بخش «مرور و ثبت» تکمیل شد. ارسال فرم فقط در مرحله دوم مجاز است و مسیر گزارش موجود همچنان پس از دریافت شناسه ارزیابی ایجادشده باز می‌شود. service worker به v13 ارتقا یافت تا کلاینت‌های بازمانده از v12 را یک‌بار به shell جدید منتقل کند.

| بررسی | نتیجه |
|---|---|
| تست رگرسیون مسیر | PASS — 157 تست، شامل تست‌های قرارداد FMEA، RULA و PWA |
| build و بررسی ایستا | PASS — typecheck، lint، build، بررسی قرارداد، بررسی release، audit وابستگی و syntax service worker |
| انتشار | PASS — release `release-20260915-fmea-step2-review` با hashهای artifact محلی/سرور یکسان و backup قابل rollback |
| smoke عمومی | PASS — `/login`، `/fmea`، manifest، service worker، assetهای جدید و health API با HTTP 200؛ API داخلی `127.0.0.1:5044` و taskهای API/Nginx فعال |
| FMEA assessment-information layout | PASS | The assessment code and scope controls use the same responsive grid row with `align-items: start`; the code auto-generation hint remains below the code input, and the frontend contract test plus public CSS smoke verified the deployed rule. |
| Login support footer layout | PASS | The support message remains a semantic `login-approvals login-support-bar` footer outside `login-hero-content`, uses the full available `login-art` width with compact spacing, remains visible in the narrow layout, and passed the frontend contract, production build, public HTTPS asset smoke and browser screenshot check. |
| Login hero title sizing | PASS | The localized hero title uses the reduced responsive scale and wider available measure; browser checks at 1280×900 and 1280×720 measured a single visible line with no clipping, and the deployed CSS asset contains the compact and short-desktop rules. |
| Dashboard widget personalization and sidebar | PASS | Source regression coverage verifies user/organization-scoped widget order, visibility, reversible removal/restoration, empty-state recovery, grouped navigation, nested active-route matching, accessible collapse state and responsive dashboard/sidebar rules. Authenticated browser click-through is NOT_RUN because no local session/database was available during this checkpoint. |
| Registration contact and username security | PASS | Shared and backend tests cover email/phone classification, normalized Persian/Arabic mobile digits, malformed and mismatched contacts, reserved/unsafe display names, strict registration payloads and required organization fields; frontend contract tests cover visible contact-type feedback and phone validation |
| Multi-company workspace management | PASS | Frontend contract coverage verifies authenticated company creation, duplicate-submit protection, membership-checked top-bar/list switching and session selection; backend subscription tests verify independent company states, production payment gating and rejection of local checkout simulation in production. Live multi-company HTTP/database smoke is NOT_RUN because the local API/database is not running at this checkpoint. |
| Personal and organization registration wizard | PASS | Existing wizard was exercised on the rebuilt frontend preview for account-type selection, personal and organization steps, required-field and national-ID errors, complete review summaries, Back/Next preservation, and safe generic submit-failure copy; backend/shared tests cover normalized contacts, name parts, strict payloads, password policy and company-ID validation. The verified frontend/backend artifacts are deployed; successful persistence smoke remains NOT_RUN because no new production account was created during this checkpoint. |

## اصلاح لوگوی سایدبار در تم آبی — 2026-09-15

برای حفظ رنگ اصلی نشان NIVASafe، فیلتر تک‌رنگ قبلی از `side-brand-icon` در تم آبی حذف شد و خود آیکون با یک سطح سفید، padding و border ظریف نمایش داده می‌شود. قواعد تم سفید و اندازه‌گذاری responsive سایدبار بدون تغییر باقی ماندند.

| بررسی | نتیجه |
|---|---|
| تست رگرسیون frontend | PASS — 71 تست frontend، شامل قرارداد انتخاب تم و بررسی وجود سطح سفید و `filter: none` برای تم آبی |
| بررسی محلی | PASS — typecheck، lint، build، contract verification، release verification، Prisma validation، audit وابستگی و syntax service worker |
| تطبیق artifact | PASS — hashهای build و static root برای index=`1C560EBE98CBEFB052271D1286A8FD70789C365EC551703A9B55F18A1D614D6C`، JavaScript=`40BECA4956B539C924F48EBA993EBC32922BD68147CF56F6FDFAAB2E6A7D6873` و CSS=`4B791759868B05A5C3AD51542D4E8C015970EB51F6E474B878409F18CE227B84` یکسان است |
| smoke عمومی | PASS — `/login`، `/fmea`، manifest، service worker، asset لوگو، bundle جدید و `/api/v1/health` از سرور با HTTP 200؛ health شامل MySQL سالم و taskهای API/Nginx در وضعیت Running |

## استایل‌دهی سراسری select و option — 2026-09-15

قواعد مشترک فرم اکنون روی تمام `select`های native اعمال می‌شوند و childهای `option` نیز typography، فاصله داخلی، رنگ سطح و متن، حالت‌های hover/focus، انتخاب‌شده، غیرفعال، placeholder و multi-select را دریافت می‌کنند. برای هر دو تم آبی/تیره و سفید/روشن override خوانا اضافه شد؛ fallback native پنهان در `ProjectSelect` همچنان hidden باقی می‌ماند و منوی سفارشی آن بدون تغییر کار می‌کند.

| بررسی | نتیجه |
|---|---|
| تست رگرسیون frontend | PASS — 71 تست frontend، شامل assertهای option states، multi-select و overrideهای دو تم |
| بررسی محلی | PASS — 157 تست کامل، typecheck، lint، build، بررسی قرارداد، release verification، Prisma validation، audit وابستگی و syntax service worker |
| انتشار | PASS — release `release-20260915-native-select-options` با index=`4D570EED02AC828EFFA72AF1D9CADC37FDF0E7756EB5A87D2F3F67B29A8D145F`، JavaScript=`40BECA4956B539C924F48EBA993EBC32922BD68147CF56F6FDFAAB2E6A7D6873` و CSS=`825CEB685BEFABD400E6E1FA34F32BECCD3376146B198D5C72122BF8C1D06EF1` فعال و backup rollback نگهداری شد |
| smoke عمومی | PASS — هرکدام از `/login`، `/fmea`، `/rula`، manifest، service worker، asset لوگو، bundleهای hash‌شده و `/api/v1/health` با HTTP 200؛ API داخلی 5044، MySQL و taskهای API/Nginx سالم |
## جدول‌های گزارش FMEA و RULA — 2026-09-15

| بررسی | نتیجه | شواهد |
|---|---|---|
| اتصال داده و جدول FMEA | PASS | جدول ثبت ریسک موجود در `/fmea` و جدول جزئیات گزارش در `/fmea/:id/report` از payload واقعی API استفاده می‌کنند و ستون‌های فرآیند/فعالیت، حالت خرابی، اثر، علت، کنترل‌های فعلی، S/O/D، RPN، سطح ریسک، اقدام و عملیات را نمایش می‌دهند. |
| اتصال داده و جدول RULA | PASS | جدول ارزیابی‌های ثبت‌شده در `/rula` و جدول داده‌های گزارش در `/rula/:id/report` از payload واقعی API استفاده می‌کنند و context فعالیت، مشاهدات پوسچر، گروه A/B، زاویه، وضعیت، امتیاز، منبع، اقدامات انتخاب‌شده و عملیات را نمایش می‌دهند. |
| RTL و Responsive | PASS | جدول مشترک با جهت RTL، ستون‌بندی فشرده، hover/striping، کنترل‌های عددی خوانا و horizontal overflow کنترل‌شده در عرض‌های کوچک اضافه شد؛ اطلاعات گزارش، عملیات و stateهای موجود حفظ شدند. |
| رگرسیون و build | PASS | 157 تست (71 frontend، 76 backend، 10 shared-domain)، typecheck، lint، build، بررسی قرارداد API، release verification، Prisma validation و audit وابستگی موفق شدند. |
| smoke انتشار | PASS | release `release-20260915-assessment-report-tables` با تطبیق hashهای local/staged/active روی سرور منتشر شد؛ `/login`، `/fmea`، `/rula`، assetهای PWA، bundleها و `/api/v1/health` با HTTP 200 پاسخ دادند. |

Click-through احراز‌شده روی tenant دارای رکورد برای مشاهده بصری تک‌تک ردیف‌ها در این checkpoint اجرا نشد (NOT_RUN)؛ اتصال کد به API واقعی و مسیر health عمومی بررسی و تأیید شد.

## انتخاب‌گر بازشونده تم — 2026-09-15

انتخاب‌گر `theme-switcher` از حالت نمایش هم‌زمان دو دکمه به کنترل فشرده بازشونده تبدیل شد. در حالت بسته فقط تم فعال دیده می‌شود؛ با کلیک، گزینه تم دیگر در منوی دسترس‌پذیر نمایش داده می‌شود و پس از انتخاب، کلیک بیرون یا Escape بسته می‌شود. مدل دو تم، persistence مرورگر، رنگ‌های پوسته و درمان لوگوی سایدبار بدون تغییر باقی ماندند.

| بررسی | نتیجه |
|---|---|
| تست رگرسیون | PASS — 71 تست frontend و assertهای قرارداد UI برای `aria-expanded`، منوی تم، گزینه فعال/جایگزین و قواعد responsive |
| اعتبارسنجی ساخت | PASS — 157 تست کامل، typecheck، lint، build، بررسی قرارداد، release verification و audit وابستگی |
| artifact | PASS — index=`81C91BE7EA1A2E60138A749438DCD90C7F2AF7FA201D23F3C5F206A99E64E927`، JavaScript=`504B43F7EBDCA7F47A59C415D7E4D8FC83F7729E41149893C6CB5B825884322E`، CSS=`77F63EEBBF5774339F9FC57A7F4B195773592D51281765A34D412EC877A0B0AC` |
| رفتار تعاملی | NOT_RUN — click-through احراز‌شده در مرورگر؛ markerهای رفتار در bundle و smoke عمومی بررسی شدند |

## اصلاح بازگشت طراحی هدر — 2026-09-16

علت اصلی به‌هم‌ریختگی هدر، اعمال `width: 100%` عمومی روی `select` درون flex و فعال‌بودن wrap در دسکتاپ بود؛ در نتیجه selector شرکت کل ردیف را اشغال می‌کرد و کنترل‌های دیگر به ردیف بعد می‌رفتند. عرض selector در هدر محدود و flex آن مشخص شد، دسکتاپ به چیدمان تک‌ردیفه اصلی برگشت و wrap فقط در tablet/mobile فعال ماند.

| بررسی | نتیجه |
|---|---|
| regression frontend | PASS — 71 تست frontend، شامل assertهای layout هدر و selector bounded |
| full suite | PASS — 157 تست، typecheck، lint و build |
| artifact/deployment | PASS — release `release-20260916-header-responsive-repair` با تطبیق hashهای local/staged/active و backup rollback |
| public smoke | PASS — مسیرهای `/login`، `/`، `/fmea`، `/rula`، PWA assets، bundleهای جدید و `/api/v1/health` با HTTP 200 |
| click-through احراز‌شده | NOT_RUN — session tenant production برای ورود و کلیک تعاملی استفاده نشد |
## Responsive انتخاب‌گر تم — 2026-09-15

قرارداد responsive برای `theme-switcher` و header احراز‌شده اضافه شد. در دسکتاپ header تک‌ردیفه باقی می‌ماند؛ در تبلت کنترل‌ها به ردیف کامل و قابل wrap منتقل می‌شوند و فقط در تبلت باریک نشانگر آنلاین کم‌اولویت پنهان می‌شود؛ در موبایل کنترل‌ها بدون overflow افقی wrap می‌شوند، selector شرکت قابلیت کوچک‌شدن دارد و trigger/menu تم حداکثر عرض viewport را رعایت می‌کنند. در عرض‌های کوچک برچسب تم جمع می‌شود و فقط کنترل فشرده با ناحیه لمس مناسب باقی می‌ماند.

| بررسی | وضعیت |
|---|---|
| قرارداد frontend و تست regression | PASS — ۱۵۷ تست کامل، شامل قرارداد responsive تم |
| typecheck، lint و build | PASS — build تولیدی موفق؛ هشدار chunk بزرگ قبلی non-blocking است |
| artifact و smoke عمومی | PASS — hashهای local/staging/active یکسان و مسیرهای عمومی، assetهای PWA، bundleهای جدید و health با HTTP 200 |
| click-through احراز‌شده در هر سه viewport | NOT_RUN — session tenant production استفاده نشد؛ CSS/JS تولیدی، markerها و محدودیت‌های viewport بررسی شدند |

## تجمیع فرم ایجاد پروژه و انتشار — 2026-09-16

| بررسی | نتیجه |
|---|---|
| تست کامل | PASS — ۱۵۸ تست شامل ۷۱ frontend، ۷۷ backend و ۱۰ shared-domain |
| typecheck، lint و build | PASS — هر سه workspace و build تولیدی موفق شدند؛ هشدار اندازه chunk موجود non-blocking است |
| release verification و audit | PASS — ۲۶ بررسی release و audit وابستگی production موفق شدند |
| قرارداد و رفتار ایجاد پروژه | PASS — فهرست پروژه حفظ شد، فیلدهای نام فرایند و عنوان فعالیت اجباری و محل انجام اختیاری هستند، اعتبارسنجی جفتی و ایجاد اتمیک سه رکورد بررسی شد و مسیرهای مستقل فرایند/فعالیت باقی ماندند |
| انتشار و smoke عمومی | PASS — hashهای local/remote تطبیق دارند، backup rollback نگهداری شده، API پورت 5044 و taskهای API/Nginx سالم‌اند و مسیرهای `/login`، `/projects`، `/fmea`، `/rula` و `/api/v1/health` با HTTP 200 پاسخ دادند |
| migration تمیز | NOT_RUN — برای این تغییر migration جدیدی لازم نبود؛ اجرای database کاملاً جداگانه همچنان بررسی نشده است |

## مخفی‌سازی login-art در صفحه‌های حداکثر 900 پیکسل — 2026-09-16

| بررسی | نتیجه |
|---|---|
| رفتار responsive | PASS — در breakpoint `max-width: 900px` پنل `.login-art` واقعاً `display: none` است و grid به یک ستون تمام‌ارتفاع تغییر می‌کند؛ بنابراین پنل مخفی فضای بالای فرم را اشغال نمی‌کند |
| رفتار دسکتاپ | PASS — قواعد layout دسکتاپ و محتوای بازاریابی در عرض‌های بزرگ‌تر از 900 پیکسل حفظ شده‌اند |
| تست و ساخت | PASS — ۱۵۸ تست شامل ۷۱ frontend، ۷۷ backend و ۱۰ shared-domain، به‌همراه typecheck، lint و production build |
| release verification و audit | PASS — ۲۶ بررسی release و audit وابستگی production موفق شدند |
| انتشار و سلامت سرویس | PASS — hashهای local/active تطبیق دارند، backup rollback نگهداری شده، API/Nginx Running، listener پورت 5044 و health دیتابیس سالم است و مسیرهای عمومی با HTTP 200 پاسخ دادند |

## مرکز عمودی کارت ورود در صفحه‌های حداکثر 900 پیکسل — 2026-09-16

| بررسی | نتیجه |
|---|---|
| قرارداد responsive | PASS — در breakpoint `max-width: 900px`، grid ورود یک ردیف تمام‌ارتفاع دارد، `.login-art` از layout حذف می‌شود و `.login-card` با `align-self: center` در محور عمودی مرکز قرار می‌گیرد |
| تست و ساخت | PASS — ۱۵۸ تست شامل ۷۱ frontend، ۷۷ backend و ۱۰ shared-domain، به‌همراه typecheck، lint و production build |
| release verification و audit | PASS — ۲۶ بررسی release و audit وابستگی production بدون آسیب‌پذیری شناخته‌شده با شدت high یا بالاتر |
| انتشار و smoke عمومی | PASS — hashهای local/active تطبیق دارند، rollback backup نگهداری شده، API پورت 5044 با HTTP 200 و MySQL healthy، taskهای API/Nginx Running و مسیرهای عمومی با HTTP 200 پاسخ دادند |

## حذف دکمه حذف از چیدمان داشبورد — 2026-09-17

| بررسی | نتیجه |
|---|---|
| کنترل‌های چیدمان | PASS — دکمه قرمز حذف با rule محدود به `.dashboard-customizer` از نمایش و فضای layout خارج شد؛ کنترل نمایش/مخفی‌کردن و جابه‌جایی باقی ماندند |
| سازگاری | PASS — منطق legacy بازگردانی ویجت‌های حذف‌شده قبلی حفظ شد تا تنظیمات ذخیره‌شده کاربران از بین نرود |
| تست و ساخت | PASS — ۱۵۸ تست شامل ۷۱ frontend، ۷۷ backend و ۱۰ shared-domain، به‌همراه typecheck، lint و production build |
| انتشار و smoke عمومی | PASS — release `release-20260917-dashboard-hide-only` با تطبیق hashهای local/staged/active، backup rollback، سلامت API/MySQL و smoke عمومی HTTPS فعال شد |

## تراز وسط مصرف توکن هوش مصنوعی در پنل مدیریت — 2026-09-17

| بررسی | نتیجه |
|---|---|
| کارت‌های خلاصه مصرف | PASS — برچسب و مقدار هر چهار کارت خلاصه در مرکز افقی قرار گرفتند |
| جدول مصرف کاربران | PASS — سرستون‌ها، نام و ایمیل کاربر و تمام اعداد درخواست/توکن در مرکز افقی و محور عمودی میانی تراز شدند |
| regression و تست | PASS — ۱۵۸ تست شامل ۷۱ frontend، ۷۷ backend و ۱۰ shared-domain، به‌همراه typecheck، lint و production build |
| release verification و audit | PASS — ۲۶ بررسی release و audit وابستگی production موفق شدند |
| انتشار و smoke عمومی | PASS — release `release-20260917-admin-ai-usage-center` با تطبیق hashهای artifact فعال، backup rollback و پاسخ HTTP 200 برای مسیرهای عمومی، PWA و health تأیید شد |
## Checkpoint 2026-09-17 — پایداری hover تم آبی

برای رفع تغییر ناخواسته رنگ کنترل‌های header در تم آبی، قرارداد UI برای hover/focus کنترل‌های ghost، انتخاب‌گر سازمان native و styled، انتخاب‌گر زبان و منوی تم به‌روزرسانی شد. کنترل‌ها در این حالت‌ها سطح تیره/نیمه‌شفاف خود را حفظ می‌کنند و رنگ متن آن‌ها ثابت می‌ماند؛ رفتار انتخاب گزینه‌های منو و تم سفید بدون تغییر باقی مانده است.

اعتبارسنجی انجام‌شده:

- `pnpm test`: PASS — مجموع ۱۵۸ تست (۷۱ frontend، ۷۷ backend و ۱۰ shared-domain)
- `pnpm typecheck`: PASS — هر ۳ package
- `pnpm lint`: PASS — هر ۳ package
- `pnpm build`: PASS — assetهای تولیدی `index-BKRbbPGg.js` و `index-GUAZrjqR.css` ساخته شدند؛ هشدار اندازه chunk اصلی موجود و غیرمسدودکننده است.
- قرارداد frontend شامل selectorهای scoped تم آبی و رنگ متن ثابت است و asset عمومی CSS نیز همان ruleها را ارائه می‌کند.

بررسی click-through با session احراز‌شده اجرا نشد؛ smoke عمومی assetها و مسیرهای اصلی در checkpoint انتشار انجام شد.
## Checkpoint 2026-09-17 — ثبات متن `styled-select-trigger`

rule مشترک `.styled-select-trigger` در تم آبی اصلاح شد تا hover و حالت بازشدن، رنگ متن پایه را به سفید تغییر ندهد. کنترل‌های header همچنان رنگ متن روشن مخصوص سطح تیره خود را حفظ می‌کنند و نمونه‌های فرم از رنگ پایه خوانا استفاده می‌کنند.

اعتبارسنجی نهایی:

- `pnpm test`: PASS — مجموع ۱۵۸ تست (۷۱ frontend، ۷۷ backend و ۱۰ shared-domain)
- `pnpm typecheck`: PASS — هر ۳ package
- `pnpm lint`: PASS — هر ۳ package
- `pnpm build`: PASS — assetهای نهایی `index-CgLY0d0b.js` و `index-CPIPNVy5.css` ساخته شدند؛ هشدار اندازه chunk اصلی موجود و غیرمسدودکننده است.
- `pnpm verify:release`: PASS — ۲۶ بررسی
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای گزارش نشد.
- JSON manifest/state و `git diff --check`: PASS.

asset عمومی CSS rule مشترک و selectorهای header را ارائه می‌کند و smoke عمومی مسیرهای اصلی با HTTP 200 تأیید شد.

## Checkpoint 2026-09-21 — جست‌وجوی درون‌کادر عنوان شغل/فرآیند FMEA

فیلد عنوان شغل/فرآیند اکنون بانک مشاغل را هنگام باز شدن یک‌بار دریافت و عنوان، عنوان زبان دیگر، واحد و کلیدواژه‌ها را در همان مرورگر فیلتر می‌کند. جست‌وجوی زنده دیگر برای هر عبارت درخواست AI نمی‌فرستد؛ عنوان سفارشی همچنان با تأیید صریح کاربر قابل استفاده است و پنل و دکمه بزرگ قبلی حذف شده‌اند.

اعتبارسنجی نهایی:

- `pnpm test`: PASS — مجموع ۱۶۸ تست (۷۴ frontend، ۸۴ backend و ۱۰ shared-domain)
- typecheck frontend/backend: PASS
- Vite production build: PASS — assetهای `index-D22Xa7O8.js` و `index-BFSDs95q.css` ساخته شدند؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- backend release compile: PASS — خروجی compile ایزوله برای انتشار ساخته و مستقر شد؛ نوشتن مستقیم `backend/dist` در workstation به‌علت قفل فایل اجرا نشد.
- API contract: PASS — ۵۷ مسیر frontend با ۱۰۷ route backend تطبیق داده شدند.
- JSON manifest/state و `git diff --check`: PASS.
- dependency/security review: PASS — secret جدیدی در source یا bundle وارد نشده و مرز سازمان/مجوز route حفظ شده است.
- production smoke: PASS — hashهای local/staging/active تطبیق دارند، API و MySQL سالم‌اند، taskهای سرویس Running هستند و `/login`، `/fmea` و `/api/v1/health` با HTTP 200 پاسخ دادند.

بررسی click-through با session احراز‌شده اجرا نشد؛ تست‌های قرارداد، build، hash و smoke عمومی/API انجام شدند.

## Checkpoint 2026-09-21 — پیمایش خودکار پنل‌ها و حرکت Enter بین فیلدها

- `pnpm test`: PASS — مجموع ۱۶۹ تست (۷۵ frontend، ۸۴ backend و ۱۰ shared-domain)
- `pnpm typecheck`: PASS — هر ۳ package
- `pnpm lint`: PASS — هر ۳ package
- `pnpm --filter @nivasafe/web build`: PASS — assetهای `index-fX12iAvE.js` و `index-mbVOILbs.css` ساخته شدند؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- `pnpm verify:release`: PASS — ۲۶ بررسی
- regression contract: PASS — `FormInteractionEnhancer`، selectorهای `data-scroll-target`، dashboard/admin/member panel anchors و فاصله از هدر در assertionهای frontend پوشش داده شدند.
- production smoke: PASS — hashهای local/staging/active تطبیق دارند، API health با MySQL=`up`، taskهای سرویس Running و public HTTPS مسیرهای `/login`، `/fmea`، assetهای hashed و `/api/v1/health` با HTTP 200 تأیید شدند.

رفتار textarea چندخطی و submit فیلد نهایی عمداً حفظ شده است؛ حرکت Enter فقط برای فیلدهای editable دارای فیلد بعدی اعمال می‌شود.

## Checkpoint 2026-09-21 — نام برنامه PWA

- `pnpm --filter @nivasafe/web test --run src/pwa/pwa-contract.test.ts`: PASS — ۳ تست، شامل الزام `name` و `short_name` برابر `NIVASafe`.
- `pnpm verify:release`: PASS — ۲۶ بررسی.
- `pnpm --filter @nivasafe/web build`: PASS — build production موفق شد؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- deployment smoke: PASS — manifest عمومی HTTP 200، `no-cache` و نام برنامه `NIVASafe` را برمی‌گرداند؛ hash local/staging/active برابر است.

## Checkpoint 2026-09-21 — سقف پیشنهادها و انتخاب‌های پنل فرآیند FMEA

- `pnpm test`: PASS — مجموع ۱۷۱ تست (۷۵ frontend، ۸۶ backend و ۱۰ shared-domain)
- `pnpm typecheck`: PASS — هر ۳ package
- `pnpm lint`: PASS — هر ۳ package
- `pnpm build`: PASS — production build موفق شد؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- `pnpm verify:contract`: PASS — ۵۷ مسیر frontend با ۱۰۷ route backend تطبیق داده شدند.
- `pnpm verify:release`: PASS — ۲۶ بررسی.
- `git diff --check`: PASS.
- regression contract: PASS — نمایش حداکثر ۱۰ پیشنهاد، شمارنده و قفل سقف ۵ انتخاب در هر دسته، و اعتبارسنجی server-side برای create/update پوشش داده شدند.
- security review: PASS — سقف‌ها در مرز API اعمال می‌شوند، داده‌های legacy بدون حذف حفظ می‌شوند و هیچ secret یا مسیر جدید بدون احراز هویت اضافه نشده است.
- production smoke: PASS — release `release-20260921-fmea-suggestion-limits` با hashهای local/staging/active، backup rollback، health MySQL، taskهای سرویس Running، markerهای bundle و public HTTPS برای `/`، `/login`، `/fmea`، PWA assets و `/api/v1/health` تأیید شد؛ مسیر پیشنهادها بدون احراز هویت HTTP 401 برگرداند.

## Checkpoint 2026-09-21 — کنترل فشرده تصویر فرآیند FMEA

- `pnpm test`: PASS — مجموع ۱۷۱ تست (۷۵ frontend، ۸۶ backend و ۱۰ shared-domain)
- `pnpm typecheck`: PASS — هر ۳ package
- `pnpm lint`: PASS — هر ۳ package
- `pnpm build`: PASS — production build موفق شد؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- `pnpm verify:contract`: PASS — ۵۷ مسیر frontend با ۱۰۷ route backend تطبیق داده شدند.
- `pnpm verify:release`: PASS — ۲۶ بررسی.
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای گزارش نشد.
- `git diff --check`: PASS.
- regression contract: PASS — input چندتصویری، بررسی خودکار پس از upload، حذف helper `fmeaProcessImageHint`، نبود action دستی بررسی تصویر و CSS dropzone با حداقل ارتفاع ۴۷px پوشش داده شدند.
- security review: PASS — اعتبارسنجی نوع/حجم/تعداد فایل و route محافظت‌شده حفظ شد؛ بدون احراز هویت، endpoint تحلیل تصویر HTTP 401 برگرداند و secret جدیدی وارد source/build نشد.
- production smoke: PASS — release `release-20260921-fmea-process-image-compact` با hashهای local/staging/active، backup rollback، health MySQL، taskهای سرویس Running، bundle markerهای input/analysis و public HTTPS برای `/`، `/login`، `/fmea`، PWA assets و هر دو `/api/v1/health` تأیید شد.

## Checkpoint 2026-09-21 — پس‌زمینه سفید favicon عنوان سایت

- `pnpm test`: PASS — مجموع ۱۷۲ تست (۷۶ frontend، ۸۶ backend و ۱۰ shared-domain)
- `pnpm typecheck`: PASS — هر ۳ package
- `pnpm lint`: PASS — هر ۳ package
- `pnpm build`: PASS — production build موفق شد؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- `pnpm verify:contract`: PASS — ۵۷ مسیر frontend با ۱۰۷ route backend تطبیق داده شدند.
- `pnpm verify:release`: PASS — ۲۶ بررسی.
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای گزارش نشد.
- `git diff --check`: PASS.
- regression contract: PASS — لینک favicon مستقل، SVG خودکفا با مستطیل سفید، service-worker v14 و precache شدن asset جدید پوشش داده شدند.
- deployment integrity: PASS — hashهای local/staging/active برای index، favicon و service worker برابر هستند؛ backup rollback نگهداری شده است.
- public smoke: PASS — `/`، `/login`، `/fmea`، `/favicon-white.svg` با MIME نوع `image/svg+xml`، `/sw.js`، manifest و هر دو health endpoint عمومی HTTP 200 برگرداندند؛ API و MySQL سالم و taskهای API/Nginx Running هستند.

## Checkpoint 2026-09-22 — امتیاز نیروی واردشده در RULA

- `pnpm test`: PASS — مجموع ۱۹۱ تست (۸۲ frontend، ۹۸ backend و ۱۱ shared-domain)
- `pnpm build`: PASS — build تولیدی frontend/backend/shared-domain موفق شد؛ هشدار اندازه bundle غیرمسدودکننده است.
- package typechecks: PASS — typecheck مستقیم shared-domain، backend و frontend موفق شد.
- `pnpm verify:contract`: PASS — ۵۸ مسیر frontend با ۱۰۸ route backend تطبیق داده شدند.
- `pnpm verify:release`: PASS — ۲۶ بررسی.
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای گزارش نشد.
- `git diff --check`: PASS.
- regression: PASS — برای پوسچر خنثی، انتخاب forceهای ۰، ۱، ۲ و ۳ به‌ترتیب امتیاز نهایی ۲، ۳، ۴ و ۵ تولید می‌کند؛ trace نیز سهم muscle-use و force را جداگانه ثبت می‌کند و گزینه‌های رابط کاربری مقدار امتیاز را نمایش می‌دهند.
- deployment: PASS — release `release-20260922-rula-force-score` با hashهای local/staging/active، rollback backup، API/MySQL health، یک listener مورد انتظار روی `127.0.0.1:5044`، taskهای API/Nginx در وضعیت Running و smoke عمومی HTTPS برای مسیرهای برنامه، PWA، bundleها و `/api/v1/health` تأیید شد.

## Checkpoint 2026-09-22 — انتخاب معیار استفاده تکراری از عضله RULA

- `pnpm test`: PASS — مجموع ۱۹۲ تست (۸۲ frontend، ۹۸ backend و ۱۲ shared-domain)
- `pnpm build`: PASS — build تولیدی frontend/backend/shared-domain موفق شد؛ هشدار اندازه bundle غیرمسدودکننده است.
- typecheck مستقیم packageها: PASS — shared-domain، backend و frontend.
- `pnpm verify:contract`: PASS — ۵۸ مسیر frontend با ۱۰۸ route backend تطبیق داده شدند.
- `pnpm verify:release`: PASS — ۲۶ بررسی.
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای گزارش نشد.
- `git diff --check`: PASS.
- regression contract: PASS — کنترل تکرار عضله به‌صورت selector بازشونده دوگزینه‌ای، متن معیارهای ۱/۰، hidden FormData، بازیابی draft و سهم امتیاز در محاسبه نهایی پوشش داده شدند.
- deployment: PASS — release `release-20260922-rula-muscle-score` با hashهای local/staging/active، rollback backup، API/MySQL health، taskهای API/Nginx در وضعیت Running و smoke عمومی HTTPS برای مسیرهای برنامه، PWA، bundleها و `/api/v1/health` تأیید شد.

## Checkpoint 2026-09-25 — نام کاربری و گردش درخواست عضویت سازمان

- `pnpm test`: PASS — مجموع ۲۰۱ تست (۸۶ frontend، ۱۰۳ backend و ۱۲ shared-domain).
- `pnpm typecheck`: PASS — هر ۳ package.
- `pnpm lint`: PASS — هر ۳ package.
- `pnpm build`: PASS — build تولیدی هر ۳ package موفق شد؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- `pnpm verify:contract`: PASS — مسیرهای API frontend و backend تطبیق داده شدند.
- `pnpm verify:release`: PASS — ۲۷ بررسی، شامل migration جدید و username/member-request wiring.
- `pnpm --filter @nivasafe/api prisma:generate`: PASS؛ `prisma validate`: PASS.
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای گزارش نشد.
- `git diff --check`: PASS.
- database migration deployment: NOT_RUN — اجرای migration روی MySQL محلی برای این checkpoint انجام نشد.
- external deployment: NOT_PERFORMED — محدوده این تغییر فقط اجرای local است.

## Checkpoint 2026-09-25 — پاک‌سازی draft هنگام شروع ارزیابی جدید

- targeted frontend tests: PASS — ۸۳ تست شامل helper کلید draft، قرارداد مسیر `/choose-path` و قرارداد autosave.
- frontend typecheck: PASS — `pnpm --filter @nivasafe/web typecheck`.
- `pnpm test`: PASS — مجموع ۲۰۸ تست (۸۹ frontend، ۱۰۷ backend و ۱۲ shared-domain).
- `pnpm typecheck`: PASS — هر ۳ package.
- `pnpm lint`: PASS — هر ۳ package.
- `pnpm build`: PASS — build تولیدی هر ۳ package موفق شد؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- `pnpm verify:contract`: PASS — ۶۵ مسیر frontend با ۱۱۶ route backend منطبق شدند.
- `pnpm verify:release`: PASS — ۲۸ بررسی.
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای یافت نشد.
- `git diff --check` و JSON project state: PASS.
- migration/database changes: NOT_APPLICABLE — فقط منطق client-side draft و مسیر انتخاب ارزیابی تغییر کرده است.
- external deployment: NOT_PERFORMED — محدوده این تغییر فقط source/local است.

## Checkpoint 2026-09-25 — هویت نصب PWA و آیکون NIVASafe

- `pnpm --filter @nivasafe/web exec vitest run src/pwa/pwa-contract.test.ts`: PASS — ۴ تست؛ نام دقیق `NIVASafe`، متادیتای نصب، آیکون‌های PNG maskable، SVG برندشده و service-worker v15 پوشش داده شدند.
- `node --check frontend/public/sw.js`: PASS.
- `pnpm verify:release`: PASS — ۲۸ بررسی، شامل هویت نصب و آیکون برندشده.
- `pnpm build`: PASS — build تولیدی هر ۳ package موفق شد؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- `pnpm test`: PASS — ۲۰۸ تست در domain، backend و frontend.
- `pnpm typecheck`: PASS — هر ۳ package.
- `pnpm lint`: PASS — هر ۳ package.
- `pnpm verify:contract`: PASS — ۶۵ مسیر frontend با ۱۱۶ route backend منطبق شدند.
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای یافت نشد.
- deployment: NOT_PERFORMED — انتشار واقعی یا به‌روزرسانی نصب موجود روی دستگاه کاربر در این checkpoint انجام نشد.

## Checkpoint 2026-09-25 — لاگ فعالیت و دامنه فعالیت کاربران

- `pnpm test`: PASS — مجموع ۲۰۸ تست (۸۹ frontend، ۱۰۷ backend و ۱۲ shared-domain)؛ تست‌های self/organization/global Activity Log نیز موفق شدند.
- `pnpm typecheck`: PASS — هر ۳ package.
- `pnpm lint`: PASS — هر ۳ package.
- `pnpm build`: PASS — build تولیدی هر ۳ package موفق شد؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- `pnpm verify:contract`: PASS — تمام مسیرهای frontend با routeهای backend تطبیق داده شدند.
- `pnpm --filter @nivasafe/api prisma:validate`: PASS؛ `pnpm --filter @nivasafe/api prisma:generate`: PASS.
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای گزارش نشد.
- `git diff --check`: PASS.
- migration deployment: NOT_RUN — اجرای migration جدید روی MySQL محلی در این checkpoint انجام نشد.
- authenticated browser visual smoke: NOT_RUN — نشست مرورگر احراز‌شده در دسترس نبود.
- external deployment: NOT_PERFORMED — محدوده این تغییر فقط اجرای local است.

## Checkpoint 2026-09-25 — تثبیت منوی انتخاب زبان در موبایل

- `pnpm --filter @nivasafe/web exec vitest run src/ui-rules.test.ts`: PASS — ۸۰ تست؛ منوی زبان در موبایل به‌صورت absolute زیر `language-picker` و بدون `position: fixed` پوشش داده شد.
- `pnpm test`: PASS — مجموع ۲۰۹ تست (۹۰ frontend، ۱۰۷ backend و ۱۲ shared-domain).
- `pnpm typecheck`: PASS — هر ۳ package.
- `pnpm lint`: PASS — هر ۳ package.
- `pnpm build`: PASS — build تولیدی هر ۳ package موفق شد؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- `pnpm verify:contract`: PASS — ۶۵ مسیر frontend با ۱۱۶ route backend منطبق شدند.
- `pnpm verify:release`: PASS — ۲۸ بررسی.
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای یافت نشد.
- `git diff --check`: PASS.
- browser visual smoke: NOT_RUN — نشست browser automation محلی در دسترس نبود؛ تست source-contract و build اجرا شدند.
- migration/database changes: NOT_APPLICABLE — فقط جای‌گذاری responsive منوی client-side و تست regression تغییر کرد.
- external deployment: NOT_PERFORMED — محدوده این تغییر فقط source/local است.

## Checkpoint 2026-09-25 — بازطراحی چت‌بات موبایل با سایدبار گفتگوها

- `pnpm --filter @nivasafe/web exec vitest run src/ui-rules.test.ts`: PASS — ۸۱ تست؛ سایدبار کشویی گفتگوها، دکمه بازکردن/بستن، بستن با Escape یا پس‌زمینه، و مخفی‌شدن عنوان صفحه پوشش داده شدند.
- `pnpm test`: PASS — مجموع ۲۱۰ تست (۹۱ frontend، ۱۰۷ backend و ۱۲ shared-domain).
- `pnpm typecheck`: PASS — هر ۳ package.
- `pnpm lint`: PASS — هر ۳ package.
- `pnpm build`: PASS — build تولیدی هر ۳ package موفق شد؛ هشدار اندازه chunk اصلی غیرمسدودکننده است.
- `pnpm verify:contract`: PASS — ۶۵ مسیر frontend با ۱۱۶ route backend تطبیق داده شدند.
- `pnpm verify:release`: PASS — ۲۸ بررسی.
- `pnpm audit --prod --audit-level high`: PASS — آسیب‌پذیری شناخته‌شده‌ای یافت نشد.
- `git diff --check` و parse فایل project state: PASS.
- authenticated browser visual smoke: NOT_RUN — نشست browser automation محلی در دسترس نبود.
- migration/database changes: NOT_APPLICABLE — فقط رفتار و چیدمان responsive سمت client تغییر کرد.
- external deployment: NOT_PERFORMED — محدوده این تغییر فقط source/local است.

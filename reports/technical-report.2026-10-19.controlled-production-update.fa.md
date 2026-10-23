# NIVASafe — شواهد فنی انتشار کنترل‌شده

| مشخصه | مقدار |
|---|---|
| پروژه | NIVASafe |
| تاریخ میلادی | 2026-10-19 |
| تاریخ شمسی | 1405-07-27 |
| انتشار | `release-20261019-safe-r8-uiux-handoff` |
| HEAD منبع | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf؛ working tree موجود حفظ شد |
| زمان UTC | 2026-10-19T11:29:53.884Z |
| نتیجه | کد منتشرشده؛ تصویر زنده RULA غیرفعال |

## ابزارهای واقعاً استفاده‌شده

راهنمای workflow نصب‌شده Debug خوانده شد؛ابزار native افزونه Debug یا Chrome DevTools قابل فراخوانی نبود و استفاده نشد. ابزارهای واقعی PowerShell،Node،pnpm پین‌شده،Prisma/MariaDB،Playwright/Chrome و CUA برای نشست عمومی موردتأیید کارفرما بودند. مدل pose/AI دوم نصب نشد.

## تصمیم و محدوده

کارفرما بهینه‌سازی آناتومیک را متوقف و انتشار کد امن با gateهای بسته در نبود مجوز سازمانی را تأیید کرد. benchmark،فراخوانی تصویر،مدل pose،تغییر آستانه امتیازدهی یا بازطراحی جدید انجام نشد. شکست دقت R8 در گزارش‌های تاریخی باقی است؛ پذیرش این انتشار به معنای پذیرش آناتومی یا تصویر زنده نیست.

## مسیر و هویت واقعی اجرا

Task موجود NIVASafe-API از طریق C:/ProgramData/NIVASafe/run-pm2.cmd و PM2 nivasafe-api اجرا می‌شود. هویت واقعی NT AUTHORITY\SYSTEM و Node22.22.3 است. PID14048 به11620 تغییر کرد؛ entrypoint واقعی `C:\ProgramData\NIVASafe\releases\release-20261019-safe-r8-uiux-handoff\backend\dist\server.js` و cwd همان C:/NIVASafe است. فقط API تعویض شد؛ Nginx و پایگاه داده restart یا پیکربندی مجدد نشدند. Nginx پوشه C:/inetpub/nivasafe/app-com را سرو و /api/ را به127.0.0.1:5044 هدایت می‌کند. health عمومی شناسه جدید و database up دارد.

منبع build در C:/NIVASafe/.local/rula-final-candidate-20261017-053748 است.۴۰۲فایل مرتبط با repository برابرند؛ تفاوت workspace فقط adapter مجاز اجرای build بومی برای pnpm10.13.1 است.۴۸۵مسیر dirty اولیه ثبت شد و reset/stash/حذف نشد. بسته مستقل با pnpm deploy --legacy --prod --offline --ignore-scripts،PrismaClient6.19.3 و اصلاح self-link قدیمی pnpm در خود بسته ساخته شد؛۱۶۶۴۳فایل/۷۸۳link داخلی دارد. marker در backend/release-marker.json است.

## انتساب تغییرات

در این اجرا فقط پیکربندی کاربردی deployment/ecosystem.config.cjs برای مسیر API جدید و APP_VERSION غیرمحرمانه تغییر کرد. مسیر راه‌اندازی و APP_VERSION مربوط به worker غیرفعال نیز در 2026-10-19T12:06:53.218Z با همین بسته و مسیریابی مدل یکسان شد؛worker اجرا نشد و API برای این همسان‌سازی دوباره راه‌اندازی نشد. کد تجاری حفظ شد. شواهد: inactive-worker-boot.json و final-runtime-recheck.json. ai-provider.ts،rula-posture-ai.ts،rula-geometry.ts،rula-measurement.ts،rula-image-normalization.ts،rula-landmark-localization.ts،modules/assessments.ts،modules/reports.ts،modules/support.ts،frontend rulaMeasurement.ts و آزمون‌هایشان کارهای قبلی R6/R7/R8 هستند که به runtime منتقل شدند؛ اصلاح جدید دقت در این انتشار نیستند. هش support از پیش در live برابر بود و حفظ شد. فهرست کامل artifactها در candidate-package.json،manifest پشتیبان backend و deployment-receipt.json است؛۴۰۲فایل در source-checkpoint منجمد شدند.

ابزارهای عملیاتی جدید در scripts/releases/controlled-20261019 و۶آزمون محافظ rollback قرار دارند. گزارش‌ها،metadata وضعیت و inventory طراحی جدیدند. package manifest،lockfile،schema/migration،منطق تجاری،گردش chat یا مسیر ناوبری تغییر نکرد.

## RULA و مدل‌ها

RULA/FMEA فقط ArvanCloud GPT-5-Mini در https://api.arvancloudai.ir/v1 و بدون fallback ارزیابی هستند. نام gpt-5-mini-2025-08-07 از پاسخ واقعی تاریخی R8 است؛ در این انتشار تصویر جدیدی ارسال نشد. درخواست/مدل ثبت‌شده چت DeepSeek-V4-Flash است؛ گفتگوی آزمایشی عمومی با پسوند0c4051fb یک پاسخ و۳۴۸توکن(۲۲۱ورودی/۱۲۷خروجی) دارد. وضعیت خام HTTP و request ID بالادستی جداگانه ثبت نشد؛ شواهد،UI واقعی و رکورد durable ارائه‌دهنده/مدل هستند.

آزمایش landmark در R8 فقط با NODE_ENV=test و RULA_LANDMARK_EXPERIMENT_V2=1 فعال می‌شود؛ production آن را فعال نمی‌کند. هندسه قطعی،EXIF،parsing سخت‌گیرانه،جداسازی سمت‌ها،بازبینی انسانی،provenance و امتیازهای تاریخی حفظ شدند. کلیدهای RULA_IMAGE_PRIVACY_APPROVED_PROVIDER،RULA_IMAGE_VISION_SUPPORTED_PROVIDER و معادل‌های FMEA بسته مانده‌اند. کلید provider،JWT،entitlement،نقش سازمانی یا مقدار.env تغییر نکرد. در دسترس بودن کلید یا پاسخ provider مجوز انتقال عکس سازمان نیست.

## پایگاه داده

بررسی صرفاً خواندنی۳۷مدل و۴۲۲فیلد را تطبیق داد؛ ستون و enum مفقود صفر است. هش schema کاندید و بسته قبلی برابر eb872b071bc7807cf22b01932d1df3ec0fd854ca26da60a478e8347a1915fa33 است. DDL،migration،seed،reset،restore یا کپی uploads انجام نشد. مقایسه تاریخچه پس از نرمال‌سازی LF دو ردیف متفاوت نشان داد؛ تاریخچه بازنویسی نشد و replay پاک migration ادعا نمی‌شود. تغییر schema آینده همچنان rehearsal و بازیابی جداگانه می‌خواهد.

شمار رکوردهای محافظت‌شده پیش/پس:User26،Organization21،Project41،FMEA69،RULA51،RulaVersion81،SupportRequest1،SupportReply1. شواهد شامل شمارها و فهرست عملیات read-only است،نه checksum محتوای تک‌تک ردیف‌ها. گفتگوی آزمایشی،رکوردهای عادی نشست/audit/مصرف و شمارنده عادی سهمیه،تغییرات موردانتظار هستند.

## اعتبارسنجی اجراشده

| فرمان/محیط | نتیجه | شاهد |
|---|---|---|
| pnpm10.13.1 exec turbo typecheck --force،کاندید | exit0 | typecheck.log |
| pnpm exec turbo lint --force | exit0؛lint مبتنی بر TypeScript | lint.log |
| pnpm exec turbo test --force | exit0؛۶۰۹backend+۳۴۹frontend+۱۹domain=۹۷۷ | test.log |
| pnpm exec turbo build --force | ابتدا exit2 با EBUSY action-progress.js؛اجرای ترتیبی مجدد exit0 | build.log/build-retry.log |
| node scripts/check-api-contract.mjs،repository | exit0؛۹۰/۱۵۴ | contract.log |
| node scripts/verify-release.mjs | exit0؛۲۹بررسی | release-check.log |
| pnpm audit --prod --json | exit0؛صفر advisory،۴۷۸وابستگی تولید | audit-prod.json |
| node --test rollback-guard.test.mjs | exit0؛۶از۶ | rollback-guard-tests.log |
| بسته واقعی API/MariaDB/Chrome | exit0؛۵۴بررسی و۱۸صفحه authenticated | staging-smoke.json |
| HTTP و Chrome عمومی۳۹۰/۱۲۸۰ | exit0؛JS/CSS همگی200؛ورود بدون خطای fatal/overflow | public-after.json |
| بازبینی نهایی منبع/امنیت | exit0؛۴۲۱بررسی و صفر تطبیق secret | final-security-integrity.json |

staging هم port53306 و هم datadir دقیق C:/NIVASafe/.local/rula-authenticated-e2e-20261017-01/mariadb/data را بررسی کرد؛JWT،uploads و هویت‌ها جدا هستند. بسته با NODE_ENV=production/AI_ENABLED=false فراخوانی پولی نداشت. gate تصویر503 و بدون ذخیره امتیاز بود؛سازمان اشتباه404،عضو به admin403 و ناشناس401 تأیید شد. BOTH بازبینی‌شده ذخیره،پس از ورود مجدد بازگشایی و PDF واقعی فارسی/انگلیسی تولید شد. FMEA ثبت/ردیف/بازگشایی/PDF پاس شد. تیکت شامل idempotency،پاسخ اپراتور،یادداشت داخلی،وضعیت/اولویت/ارجاع،پاسخ عضو و ورود مجدد پاس شد؛۳reply و۱notification وجود دارد. این امر تحویل ایمیل/push را ثابت نمی‌کند.

شکست‌های harness حفظ شدند: فیلتر deletedAt نامعتبر و سپس نبود activityDescription اجباری در درخواست FMEA اصلاح شد و اجرای نهایی پاس شد. rehearsal اول PM2 نام فایل config نامعتبر داشت؛اجرای restart فایل،تعویض executable را ثابت نکرد. روش نهایی delete/start روی همان manager متصل،چرخه previous→candidate→previous را پاس کرد. اخطار نبود wmic در metrics همان نمونه مانع بررسی PID/HTTP نشد. ACL،Defender و دسترسی.env تضعیف نشد. اخطار chunk بزرگ frontend و output مربوط به Turbo باقی است. root node_modules به‌طور تخریبی تعمیر نشد؛فرمان‌ها در کاندید همسان با pnpm پین‌شده اجرا شدند.

## انتشار و بازگشت عملیاتی

پشتیبان `C:/ProgramData/NIVASafe/backups/release-20261019-safe-r8-uiux-handoff` شامل۱۶۴۲۰فایل backend/۳۷۰۲۰۲۶۳۹بایت و۲۸۸فایل frontend/۷۳۷۵۱۸۱۳بایت است؛بازسازی و هش‌ها تأیید شد. بسته قدیمی یک self-reference تاریخی و بلااستفاده pnpm به incoming اصلی دارد؛ماژول‌های compiled غیرتست آن self-package را import نمی‌کنند. بازگشت روی همین میزبان آزموده شده و قابل‌حمل‌بودن به هر ماشین ادعا نمی‌شود. بسته جدید link خارجی ندارد.

پشتیبان.env و snapshot تنظیمات PM2 همان ACL محدود SYSTEM/Administrators را دارند؛مقدارها در گزارش نیست. هش.env اصلی یکسان ماند. برای rehearsal از pipe جداگانه به علت رفتار global pipe در Windows PM2 استفاده شد؛Task جدید ساخته نشد.

تعویض API در 2026-10-19T11:29:49.130Z تا 2026-10-19T11:29:49.817Z و index در 2026-10-19T11:29:53.519Z انجام شد؛smoke عمومی در 2026-10-19T11:29:53.884Z تمام شد.۱۷فایل static تغییر کرد؛assetهای قدیمی و web.config مدیریت‌شده حفظ شدند. sw.js(v55) هش یکسان دارد. rollback تولید لازم نشد.

فرمان بازگشت با Administrator روی همین سرور:

    C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\controlled-20261019\release.mjs rollback

این ابزار پیش از نوشتن،anchorهای backend/index/config/env را بررسی می‌کند؛فقط کد،پیکربندی سرویس و فایل‌های frontend مربوط را بازمی‌گرداند؛فقط API را اجرا می‌کند و health/hash نسخه قبلی را می‌سنجد. داده‌های DB یا.env جدید/چرخش‌یافته restore نمی‌شوند. وجود نسخه/تنظیم/secret جدید،بازگشت خودکار را متوقف می‌کند.

## هش واقعی artifactها

| Artifact | Before SHA-256 | Deployed SHA-256 |
|---|---|---|
| index.html | e1c893e440f8b769cb2e119c47d7d682bcd9db092c0f4fd581a097b830885ed9 | 39e4cc72b24a145c52f22b2507d96ec5428947056fd8328a3441f9bcbf3c8d28 |
| main JS | 2b4f0c30678c311d30f4e0bdd67ebefb12da8bb6d1a12cc16a82c65b88094a17 | 101a84293ed5db1bc2c8ac7971c85c6d64f91081334376c1931d645bcb04ac08 |
| main CSS | ea10dc070bd448680addbdc99305ca95b91c4f6efb5c2bbf09ae7ca5a468ce86 | 7fa339e553da2ddf99c51de8b4295ccc511695d0e5cd95d7714ec5d382e345b7 |
| ai-provider.js | 8784d5c1124b8e727ed33e73e546da92a0c91243671c89ee521ec67744206fcf | 04fcebb35d6c54b3e83043fecdcb98a1e94eef61fd2c8fa897e5a7c206d407bc |
| rula-posture-ai.js | See prior artifact manifest | cd2390f25466fd311fc21584346e971df7d9c0ca108a227fb88c76628ab7bf21 |
| rula-geometry.js | See prior artifact manifest | a30bc7f82a5863722c91a8caec997da3b15a2184830108f81bea90f61458f212 |
| modules/assessments.js | f5f8cd21b7c03bcdcbc4a1abf90f45d042646b308e47c25496af9f73b1f59abd | 2cf08b22716d0190e2bb6c71cd59f791a79604d43438385f03e61cca0356ac39 |
| modules/support.js | 6b3042e7f384a6fdd8ef5fe76b9b37750251af812220668cb5410881b18cd332 | 6b3042e7f384a6fdd8ef5fe76b9b37750251af812220668cb5410881b18cd332 |
| modules/reports.js | d028136f9a4acba0e337e11c5e983ce1e7b1617f83c88a072837148a22223e9e | d141bcae3ac06092095eb268eb2a1a5e4aa1b55689f9d6369a702af4cbb39b98 |

فایل‌های عمومی اصلی /assets/index-CZ6hxJEG.js و /assets/index-17Z8GZRa.css هستند. خود server.js هش برابر دارد؛هویت با PID،entrypoint،APP_VERSION در health و هش ماژول‌های معنایی جدید ثابت شده است.

## محدودیت عمومی و تحویل

کارفرما بدون انتقال credential به عامل وارد شد و نشست پس از انتشار حفظ شد. فرم RULA شامل عنوان،تصویر و RIGHT/LEFT/BOTH است. FMEA/support/admin/assistant با JS جدید و صفر خطای کنسول باز شدند. عرض عمومی۷۸۸ بود؛scrollWidth صفحه /fmea برابر۸۰۵ و سرریز۱۷پیکسلی،P2 فاز UI/UX است و PASS پاسخ‌گویی کامل اعلام نمی‌شود. ورود عمومی ناشناس و staging authenticated در۳۹۰/۱۲۸۰ آزموده شدند؛Safari/WebKit،خروج عمومی و نوشتن تیکت عمومی با دو نقش اجرا نشد. نشست برای ادامه طراحی حفظ شده است. screenshot کامل authenticated برای جلوگیری از نمایش حساب/history در فایل گزارش ذخیره نشده؛شکست تبدیل buffer نیز شاهد پذیرفته‌شده محسوب نشد. شواهد تصویری پذیرفته‌شده شامل ورود عمومی ناشناس و staging مصنوعی است.

## مراحل و نتیجه

در این انتشار افزایشی،هر۱۲مرحله پیاده‌سازی کامل محصول دوباره اجرا نشد. مرحله‌های۰۱/۰۲ به‌عنوان تحلیل/طراحی جدید NOT_RUN هستند؛از آثار قبلی و تصمیم کارفرما استفاده شد. build frontend/backend،سازگاری read-only schema،contract،auth/security محدود و regression همین انتشار پاس شد. QA کامل مرحله۱۰ به‌دلیل پوشش ناقص دستگاه‌های عمومی و مشکل ثبت‌شده FMEA،BLOCKED است. مرحله۱۱ انتشار فقط کد PASS است. پذیرش کامل محصول در مرحله۱۲ BLOCKED می‌ماند:مجوز حریم خصوصی تصویر موجود نیست و دقت آناتومیک تأیید مستقل ندارد. انتشار کد،آمادگی طراحی و پذیرش کامل محصول وضعیت‌های جدا هستند.

| Milestone | Status | Actual environment | Evidence / limitation |
|---|---|---|---|
| Code deployment | PASS | Public + SYSTEM API | deployment-receipt.json; runtime-after.json; public-after.json |
| Backend/frontend matching candidate | PASS | Immutable package + HTTPS | candidate-package.json; artifact-preparation.json |
| RULA RIGHT/LEFT/BOTH controls | PASS | Actual public form | public-authenticated-ui.json |
| RULA real image inference this release | NOT RUN | Live gates CLOSED | No image transferred; prior R8 inference remains historical |
| RULA save/relogin/reopen/PDF | PASS | Exact production-mode package; isolated MariaDB | staging-smoke.json; staging-rula.fa.pdf; staging-rula.en.pdf |
| RULA anatomical accuracy | NOT ACCEPTED | Prior R8 reference benchmark | No new optimization/benchmark; preliminary results require review |
| RULA pilot privacy authorization | BLOCKED | Production | Documented organizational authorization not established; gates unchanged |
| FMEA create/item/reopen/PDF | PASS | Exact package; isolated MariaDB | staging-smoke.json |
| FMEA public screen | PARTIAL | Authorized public session at 788px | Loads; 17px horizontal overflow remains for UI/UX |
| New FMEA AI inference | NOT RUN | Public | Routing verified in released code/tests; no extra paid request |
| Chat real provider + persisted response | PASS | Authorized public synthetic conversation | public-record-check.json: ArvanCloud / DeepSeek-V4-Flash / 348 tokens |
| Tickets requester/operator/reply/private note/tenant | PASS | Isolated real MariaDB/API | staging-smoke.json: 3 replies, 1 member notification |
| Tickets/admin public UI | PASS | Authorized public session | public-authenticated-ui.json |
| Public ordinary-member-to-operator ticket writes | NOT RUN | Public | Full two-role write test performed only in staging |
| Public login/session continuity | PASS | Owner-entered approved test session | Session retained across code cutover; no credentials copied |
| Logout/relogin | PASS | Isolated actual HTTP | staging-smoke.json; public logout not executed to retain operator session |
| Anonymous mobile390/desktop1280 | PASS | Actual public Chrome155 | public-after.json; public-after-login-*.png |
| Authenticated mobile390/desktop1280 | PASS | Real staging Chrome155 | 18 screenshots/pages; staging-smoke.json |
| Authenticated public 390/1280 | NOT RUN | IAB session width788 | Public approved session tested at its available viewport788 |
| Safari/WebKit | NOT RUN | No verified runner | No Safari/iOS compatibility claim |
| Tests/typecheck/lint/build | PASS | pnpm10.13.1 isolated candidate | 977 tests; 6 operational guard tests; build retry0 |
| API contract/static release checks | PASS | Current repository | 90 frontend paths /154 routes;29 checks |
| Production dependency audit | PASS | Candidate | audit-prod.json:0 advisories,478 prod dependencies |
| Schema compatibility | PASS | Read-only production metadata | 37 models/422 fields; no missing columns/enum values; no migration |
| Artifact/config backup + rehearsal | PASS | Independent copies + isolated PM2 | artifact-preparation.json; protected-config-backup.json; pm2-operational-rehearsal.json |
| Privacy/auth/source/data preservation | PASS | Actual release + staging negatives | final-security-integrity.json; public-record-check.json |
| UI/UX handoff | READY | Source checkpoint + running release | docs/uiux-handoff.2026-10-19.md |

برای فعال‌سازی تصویر،مجوز مستند انتقال به ArvanCloud برای سازمان پایلوت مشخص لازم است؛سپس پیکربندی محدود رضایت/capability و پذیرش مصنوعی عمومی جداگانه اجرا شود. مشکل entitlement جدیدی ادعا نمی‌شود. طراحی از docs/uiux-handoff.2026-10-19.md و بدون تغییر امتیازدهی،مجوزها،privacy،routing مدل یا گردش تجاری ادامه یابد.

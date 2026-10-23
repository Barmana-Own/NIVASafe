# نیواسیف — شواهد فنی اصلاح FMEA و نشست

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | فنی / فارسی |
| Gregorian | 2026-10-19 |
| Jalali | 1405-07-27 |
| Frontend | release-fmea-report-recovery-20261019-01 |
| Backend | release-fmea-ai-reliability-20261019-01 |
| Repository base | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf + preserved dirty tree |
| Status | DEPLOYED — scoped update |

## پذیرش

| Check | Result | Evidence |
|---|---|---|
| Frontend tests/type/lint/build | PASS | 423 tests / 60 files; validation.frontend.json |
| Backend tests/type/lint/build | PASS | 625 tests / 69 files; validation.backend-domain.json |
| Domain tests/type/lint/build | PASS | 19 tests / 2 files; validation.backend-domain.json |
| Contract / release checks | PASS | 93 paths / 155 routes; 29 checks; ai-reliability/*.log |
| Component browser | PASS | 13 cases; mocked HTTP boundary, explicitly not E2E |
| Real staging UI | PASS | 8 cases, two organizations, fa/en, white/blue, 390/1280; same frontend |
| Two-tab expiry | PASS | Real refresh token, expired stage access token; 1 refresh, 0 protected 401 |
| Final backend real AI / DB / PDF | PASS | 48f272c8-1409-4bf9-914e-1b219ae8770d; 66271 PDF bytes |
| Public browser / AI | PASS / NOT_RUN_PUBLIC_OWNER_SYNTHETIC_ONLY | public-browser.json; ai-reliability/runtime-after.json |
| Native OS install / Safari | NOT_RUN | No installation performed; no WebKit runner |
| Production RULA image acceptance | BLOCKED | Existing privacy/provider gates remain closed; accuracy unvalidated |

## علت‌ها و مرز شواهد

۱. چیدمان: دکمهٔ جداگانهٔ سه‌نقطه، عنوان درشت چندخطی و گسترش پنج به هشت کارت باعث شلوغی بودند. فقط همان کنترل‌ها طبق خواست مالک حذف شدند. متن کامل با کلیک عنوان قابل بازبینی است؛ داده‌ها و گسترش ریسک‌های اصلی حفظ شده‌اند.

۲. نشست: توکن منقضی در چند درخواست هم‌زمان ارسال و سپس تمدید می‌شد؛ 401 دیررس یا دو تب می‌توانستند refresh token چرخیده‌شده را دوباره مصرف کنند. تمدید پیش‌دستانه، یک عملیات مشترک در هر تب، Web Locks هم‌مبدأ و بازخوانی نشست جدید، این الگو را اصلاح کردند. خروج از حساب، تعویض کاربر و سازمان نمی‌توانند نشست قدیمی را بازگردانند یا درخواست قدیمی را در سازمان دیگر تکرار کنند. خواندن exp صرفاً نشانهٔ زمان است؛ احراز هویت سرور حفظ شده. خطای موقت شبکه نشست سالم را پاک نمی‌کند.

۳. نصب وب: preventDefault نمایش بومی مرورگر را متوقف می‌کرد و پیام اطلاع‌رسانی کنسول ایجاد می‌شد. نمایش بومی حفظ و prompt سفارشی فقط با اقدام کاربر فراخوانی می‌شود. آزمون قرارداد رویداد پاس است؛ نصب واقعی سیستم‌عامل انجام نشده. مستندات: [رویداد MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)، [prompt MDN](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent/prompt).

۴. AI تاریخی: درخواست 1380c4c3-ea6f-407e-a34c-e3c9aa7c7617 در 17:34:38Z فقط fallback ثبت کرده و استثنا حذف شده است؛ علت دقیق UNKNOWN است. درخواست بعدی 1531d98b-34bd-47b7-bce7-7ccf884c445d پیش از انتشار با snapshot مجاز موفق بود. بدبودن کلید یا فقدان entitlement از این شواهد نتیجه‌گیری نمی‌شود.

۵. مهلت مشاهده‌شده: درخواست عمومی 74b9cc65-9e5d-4d6a-a944-b1e08d54ff4b پس از 60142.66ms با HTTP 200 برنامه و fallback پایان یافت؛ تنظیم فعال 60000ms بود. وضعیت upstream و استثنا ذخیره نشده بود؛ timing قرینهٔ قوی timeout است، نه اثبات پس‌نگر استثنای گم‌شده. آزمون قرمز ردشدن پاسخ معتبر ۷۰ثانیه‌ای را بازتولید کرد. پروفایل مخصوص FMEA با سقف ۸۵ ثانیه و یک تلاش، هم آزمون پاسخ دیررس و هم توقف قطعی را پاس کرد. JSON و پنج پیشنهاد کوتاه، خروجی را محدود می‌کنند؛ reasoning_effort، مدل جایگزین یا تغییر چت/RULA اضافه نشده. علت امن و زمان برای خطاهای بعدی ثبت می‌شوند؛ خروجی نامعتبر موفق معرفی نمی‌شود و مصرف واقعی آن ثبت می‌شود.

۶. خطای harness: هشت حالت رابط با کاربر AI-disabled سهمیهٔ محلی ۸ درخواست در دقیقه را پر کردند و درخواست نهم پیش از outbound با 429 رد شد؛ خطای Arvan نبود. شواهد صفر تماس حفظ و آزمون نهایی با یک درخواست در پنجرهٔ مستقل اجرا شد؛ محدودیت‌ها کاهش نیافتند.

## فرمان‌ها و اعتبارسنجی

Node 22.22.3 و Corepack pnpm 10.13.1 استفاده شدند. در هر سه package ایزوله frontend/backend/shared-domain، فرمان‌های corepack pnpm run test، typecheck، lint و build اجرا و هر ۱۲ فرمان با خروجی صفر پایان یافتند. verify:contract و verify:release در ریشه با خروجی صفر اجرا شدند. red/green برای ai-provider.test.ts و assessment-action-suggestions.test.ts و آزمون route برای fmea-action-generation-route.test.ts اجرا شد. زمان و فرمان دقیق در JSON و لاگ‌ها ثبت است.

## اصلاحات محیط آزمون

کمبود fixture و config در کپی ایزوله، assertion قدیمی نمایش بیشتر، آدرس PDF صرفاً آزمایشی ناسازگار با scanner، مسیر Windows ESM، سرویس فایل پوشه و HMR در harness اصلاح شدند؛ مهاجرت تولید انجام نشد. PowerShell 7 موجود نبود و همان بررسی‌ها با Windows PowerShell نصب‌شده اجرا شدند. گیت artifact تفاوت شش فایل کامپایل‌شدهٔ .test.js را متوقف کرد؛ این فایل‌های تاریخی بدون تغییر حفظ شدند و وارد گراف اجرایی تولید نیستند. همهٔ ماژول‌های اجرایی با نسخهٔ آزموده‌شده تطابق دارند. پشتیبان‌های موجود بررسی و بدون جایگزینی مجدداً استفاده شدند. لاگ شکست‌های قبلی حفظ شده و PASS نامیده نشده‌اند.

## نسخه، انتشار و بازگشت

هش index: add14c4523c8420ac0c72414dea0dcf331d2536453f5c6eb73d08575620f0cf6. PID backend: 13644؛ مسیر: C:\ProgramData\NIVASafe\releases\release-fmea-ai-reliability-20261019-01\backend\dist\server.js؛ marker: release-fmea-ai-reliability-20261019-01. فقط فایل‌های اجرایی ai-provider.js, assessment-action-suggestions.js, modules/reports.js تغییر کردند. در انتشار backend، frontend و محیط محافظت‌شده تغییر نکردند. تنظیم راه‌اندازی فقط entry و APP_VERSION مربوط به API را تغییر داد؛ worker و هویت سرویس و تنظیمات دیگر حفظ شدند. هش schema: eb872b071bc7807cf22b01932d1df3ec0fd854ca26da60a478e8347a1915fa33 و بدون تغییر است. هیچ migration، بازیابی DB یا تغییر ارزیابی تولید توسط انتشار انجام نشد؛ AI عمومی صرفاً مصرف و audit معمول خود را ثبت می‌کند.

پشتیبان frontend بازسازی ۵۲۷ فایل قبلی با هش و حفظ assetها را پاس کرده است. پشتیبان backend/config: C:/ProgramData/NIVASafe/backups/release-fmea-ai-reliability-20261019-01. ACL اصلی تنظیمات و rollback-state حفظ و هیچ ACL تضعیف نشده است. PM2 ایزوله با named pipe مستقل و پورت 5156، ترتیب واقعی old/new/old و سلامت DB ایزوله را پاس کرد. فرمان backend: C:/Runtime/node/node.exe C:/NIVASafe/scripts/releases/fmea-ai-reliability-20261019-01/release.mjs rollback. فرمان frontend: C:/Runtime/node/node.exe C:/NIVASafe/scripts/releases/fmea-report-recovery-20261019-01/static-release.mjs rollback. گیت‌ها تغییر نامرتبط کد/تنظیم/secret را رد می‌کنند. در بازگشت ترکیبی، ابتدا backend و سپس frontend برگردد؛ دادهٔ کاربران بازگردانی نمی‌شود.

## سرویس بیرونی و امنیت

{"approvedModelsOnly":true,"stagingGenuineAttempts":2,"stagingSuccesses":2,"requestedModels":["GPT-5-Mini"],"effectiveModels":["gpt-5-mini-2025-08-07"],"stagingElapsedMs":[51011,54445],"publicBeforeFinalBackend":{"knownRequestAt1908":"connected; approved Mini snapshot","requestAt194626":"app200/fallback at60142.66ms; upstream status unknown"},"newPublicRequestBudget":1,"newPublicRequestState":"NOT_RUN: automatic review denied private-report transmission; owner selected synthetic-only. Existing genuine synthetic staging tests retained.","zeroBudgetDiagnosticsNotCountedAsProviderHttp":true,"noImageSubmitted":true,"newPublicRequestsExecuted":0,"publicAcceptance":"NOT_RUN_PRIVATE_DATA_RESTRICTED"}. آزمون staging فقط متن مصنوعی داشت. تصویر اشخاص، کلید، JWT، کوکی، prompt کامل یا پاسخ کامل provider ثبت نشد. توقف تشخیصی محلی، خطای HTTP سرویس بیرونی نیست. انتساب مصرف عمومی فقط در حد request ID ثبت‌شدهٔ NIVASafe است؛ دربارهٔ مصرف دیگران در حساب Arvan ادعایی نمی‌شود.

RULA/FMEA با GPT-5-Mini و چت با DeepSeek-V4-Flash باقی مانده‌اند. routing در کد/runtime و آزمون‌ها بررسی شد. کنترل‌های privacy/vision تصویر همچنان بسته‌اند. دقت تاریخی RULA و پذیرش ارگونومی خارج از دامنهٔ این کار است. بررسی امنیتی نهایی، replay نشست قدیمی، تعویض کاربر/سازمان، refresh لغوشده، عملیات محدود تمدید، React امن در برابر متن HTML، مدل/gateway ثابت و لاگ امن را پوشش داد. وابستگی، schema یا کاهش رضایت/مجوز اضافه نشد.

## فایل‌های برنامه

- frontend/src/api/client.ts
- frontend/src/features/assessments/AssessmentPages.tsx
- frontend/src/features/assessments/FmeaSuggestedActionCard.tsx
- frontend/src/pwa/PwaManager.tsx
- frontend/src/styles/assessments.css
- frontend/src/ui-rules.test.ts
- frontend/src/api/client-session.test.ts
- frontend/src/api/sessionRefresh.test.ts
- frontend/src/api/sessionRefresh.ts
- backend/src/ai-provider.test.ts
- backend/src/ai-provider.ts
- backend/src/assessment-action-suggestions.test.ts
- backend/src/assessment-action-suggestions.ts
- backend/src/modules/reports.ts
- backend/src/fmea-action-generation-route.test.ts

## مراحل دامنهٔ اصلاح

| مرحله | نتیجه | دامنه |
|---|---|---|
| 01 | PASS | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 02 | PASS | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 03 | PASS | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 04 | PASS | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 05 | PASS | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 06 | PASS | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 07 | PASS | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 08 | PASS | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 09 | PASS | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 10 | PARTIAL | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 11 | PASS | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |
| 12 | BLOCKED | شواهد کد، آزمون و artifact در جدول اعتبارسنجی؛ شرح متناظر انگلیسی در گزارش فنی انگلیسی |

این PASS محدود به اصلاح FMEA، نشست و انتشار فعلی است. PROJECT_STATUS کل محصول به‌دلیل گیت‌های مستقل RULA/حریم خصوصی همچنان ناقص می‌ماند.

## محدودیت آزمون انتخاب‌شده و نکتهٔ عملیاتی

بازبینی خودکار، تلاش دوباره روی گزارش خصوصی production را به‌دلیل ارسال متن آن به ArvanCloud رد کرد. مالک آزمون فقط با دادهٔ مصنوعی را انتخاب کرد. کلیک ردشده اجرا نشد و مسیر جایگزین یا ارسال غیرمستقیم استفاده نشد. staging مصنوعی واقعی مدل gpt-5-mini-2025-08-07 را برگرداند؛ پذیرش نهایی AI روی گزارش خصوصی عمومی NOT_RUN است، نه شکست provider. پس از انتشار backend، GETهای داشبورد، خلاصه اعلان و سهمیهٔ AI با نشست مجاز همگی 200 و کنسول بدون هشدار/خطای جدید بودند. مهلت‌های read/send در Nginx فعال ۱۲۰ ثانیه و با مهلت سرور ۸۵ و رابط ۹۰ ثانیه سازگارند؛ پروکسی تغییر نکرد. تمرین PM2 ایزوله هشدار telemetry با کد wmic ENOENT داشت؛ جابه‌جایی artifact، سلامت DB و بازگشت عملیاتی پاس شدند. این هشدار به‌عنوان محدودیت پایش میزبان حفظ شده و نتیجهٔ telemetry بی‌نقص معرفی نشده است.

# نیواسیف — شواهد فنی RULA، مسیریابی مدل و خطای 502

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | گزارش فنی |
| Language | فارسی |
| Gregorian / Jalali | 2026-10-18 / 1405-07-26 |
| Generated UTC | 2026-10-18T20:00:41.882Z |
| Revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf |
| Candidate | rula-versioned-tables-candidate-20261018-05 |
| Delivery | NOT DEPLOYED; staging technical E2E verified; accuracy gate FAIL |

## تصمیم انتشار

**SOURCE FIXED / STAGING TECHNICAL E2E PASS / ACCURACY FAIL / NOT DEPLOYED / LIVE VISION NOT ENABLED.** عبور فنی، پذیرش دقت آناتومیک نیست. هیچ سرویس یا PM2 زنده‌ای راه‌اندازی مجدد نشد؛ فایل انتشار، حساب، کلید، آپلود، ساختار یا دادهٔ دیتابیس زنده تغییر نکرد.

## علت‌های تأییدشده و موارد نامعلوم

شکل پاسخ درخواست 502 تاریخی نگهداری نشده است؛ ناسازگاری همان JSON و مسیر خطای آن **UNKNOWN** است و به اعتبار کلید/مجوز بینایی نسبت داده نمی‌شود. یک شکست قابل‌بازتولید در کد قبلی پیدا شد: زاویهٔ ۹۰ درجهٔ پا با امتیاز تکیه‌گاه ۱ به امتیاز ۳ تبدیل می‌شد، درحالی‌که parser حداکثر ۲ می‌پذیرد؛ کل سمت بدن رد می‌شد. نگاشت زاویهٔ مچ نیز می‌توانست از حد مجاز عبور کند. نگاشت پایه اصلاح شده و تأیید انسان برای همهٔ ردیف‌های تصویری الزامی است. اثبات این سازوکار، اثبات شکل پاسخ تاریخی نیست.

فرمول قبلی میانگین بود؛ اکنون جدول‌های A/B/C نسخهٔ [کاربرگ فوریهٔ ۲۰۰۱ دانشگاه کرنل](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf) به‌کار می‌روند. [یادداشت‌های کرنل](https://ergo.human.cornell.edu/ahRULA.html) تفاوت میان نسخه‌های منتشرشده را نیز مطرح می‌کند؛ تأیید مستقل متخصص ادعا نشده است. ورودی‌های ذخیره‌شدهٔ بی‌نسخه در خواندن/ویرایش اطلاعات غیرامتیازی legacy-average-v1 باقی می‌مانند؛ ارزیابی جدید/بازبینی‌شده به‌صورت سروری cornell-worksheet-2001-tables-v1 می‌گیرد. انتخاب روش قدیمی توسط کلاینت برای ارزیابی جدید پذیرفته نمی‌شود. HTTP/DB واقعی حفظ ۲ برای سابقهٔ قدیمی و نتیجهٔ ۱ برای حالت خنثی جدید را نشان داد. بررسی فقط‌خواندنی زنده: ۵۱ ارزیابی، ۴۴ اختلاف با روش جدید، صفر ورودی خارج از محدوده؛ هیچ امتیازی نوشته نشد.

سورس، override و fallback ارائه‌دهندهٔ ارزیابی و CLI قدیمیِ GPT-4.1-Mini را محدود کرد. بیلد فعال هنوز RULA با GPT-4.1-Mini و GPT-4o-mini دارد؛ این اختلاف واقعی انتشار است، اما انتساب ردیف مصرف حساب بدون request ID مربوطه اثبات نمی‌شود. reasoning_effort برای تصویر/خروجی ساختاریافتهٔ آروان حذف باقی مانده است. timeout پیش‌فرض ۶۰ و سقف تنظیمی ۱۲۰ ثانیه است؛ علت تأخیرهای قبلی احراز نشد و در اجراهای جدید تکرار نشد. تکرار خودکار مبهم بسته، تلاش مجدد صریح حفظ شد.

## مدل و شواهد ارائه‌دهنده

درخواست ارزیابی **GPT-5-Mini** و مدل پاسخ **gpt-5-mini-2025-08-07** در api.arvancloudai.ir مسیر /v1/chat/completions بود. GET احرازشدهٔ /v1/models پاسخ 200 داد و GPT-5-Mini و DeepSeek-V4-Flash را فهرست کرد؛ فهرست مدل، اثبات استنتاج نیست. تصویر در staging واقعاً اجرا شد؛ درخواست واقعی تازهٔ DeepSeek یا FMEA AI/تصویر در این نوبت انجام نشد. سورس و آزمون‌ها مسیر دو نوع ارزیابی را قفل کردند و چت DeepSeek باقی ماند.

کلید فقط در حافظه از تنظیمات محافظت‌شده خوانده شد. صرفاً وجود/برابری هدر مجوز ثبت شد، نه کلید یا اثرانگشت آن. اجراها زمان/PID/request ID امن دارند؛ export مصرف آروان در دسترس نبود. نام مدل‌های دیگر در گزارش/CLI قدیمی و بیلد فعال دیده می‌شود، اما انتساب تمام مصرف حساب به نیواسیف یا سایر مصرف‌کنندگان اثبات نشده است. مدل خود Codex مستقل از مسیریابی خروجی سامانه است.

| Run | PID | Image/text calls | Upstream 200 | App 502/429 | Result |
|---|---|---|---|---|---|
| model-locked-r3 | 4360 | 3/1 | 4 | 0/2 | FAIL |
| model-locked-r3-browser-followup | 14416 | 3/0 | 3 | 0/0 | FAIL |
| model-locked-tables-r4-browser | 12072 | 2/2 | 4 | 0/0 | FAIL |
| versioned-r5-final-live-provider | 11752 | 3/0 | 3 | 0/0 | PASS |
| versioned-r5-both-stability | 756 | 2/0 | 2 | 0/0 | PASS |

در مجموع 16 استنتاج جدیدِ محدود در این بازسازی‌های موجه انجام شد (13 درخواست تصویری)، همگی با پاسخ بالادستی 200. تکرار نهایی پس از تغییر واقعی نسخه‌بندی بود؛ اجرای صرفاً پایداری، متن/مرورگر را تکرار نکرد. شواهد اپراتور قبلی ابتدا خوانده شد و در این شمارش نیست. دو 429 اولیه از محدودکنندهٔ ۸ درخواست در دقیقه پس از آزمون‌های منفی بود؛ محدودیت تضعیف نشد. سایر شکست‌های حفظ‌شده مربوط به harness بود: شروع بازبینی پیش از پایان سمت دوم، باز نکردن فرم موبایل، selector قدیمی PDF و فعال نبودن حساب آزمایشیِ تازه‌ساخته.

## کاندیدای نهایی، داده و مرورگر

نسخهٔ واقعی پرداختی: rula-versioned-tables-candidate-20261018-05، PID 11752، هویت SRV9298144857\Administrator. PID تکرار پایداری 756 با هش یکسان مؤلفه‌ها بود. API روی 5153 و MariaDB مجزا روی 53306 با datadir بررسی‌شدهٔ `C:\NIVASafe\.local\rula-authenticated-e2e-20261017-01\mariadb\data` اجرا شد. JWT و آپلود جدا بود؛ schema فقط در DB تازه با db push --skip-generate بدون پرچم اتلاف داده ساخته شد؛ بازپخش مهاجرت تاریخی/مهاجرت زنده نبود. Prisma تولیدشدهٔ 6.19.3 مجدداً استفاده شد.

BOTH واقعی و راست/چپ مستقل مرورگر از مدل پاسخ گرفتند؛ هفت عضو هر سمت و الزام بازبینی حفظ شد. ثبت 201، اتصال تصویر، ویرایش/بازبینی، ورود تازه، GET/گزارش/PDF با 200 انجام شد. مرورگر هر ۱۴ ردیف را با مرجع هندسی ویرایش و همان ارزیابی را پس از ورود در context تازه باز کرد. پسوند رکورد API 1fbb9e1d و مرورگر 006d4b99 است. تأیید برنامه‌ای harness، تأیید متخصص نیست. تکرارهای BOTH نیز واقعاً ذخیره و باز شدند.

دو fixture مصنوعی، شامل آدمک مبهم و تصویر هندسی برچسب‌دار، نمایندهٔ اعتبارسنجی حرفه‌ای نیستند. در نسخهٔ نهایی 14/20 مقایسه در تلرانس مهندسی ±۱۵ درجه بود و بیشترین خطا 90 درجه رسید. زاویهٔ بازو/ساعد چپ می‌تواند نادرست باشد؛ امتیاز کل مشابه این خطا را پنهان می‌کند. **دقت خودکار FAIL است**.

Chrome واقعی 155.0.8059.80 با playwright-core مجزای 1.64.1 و بدون mock شبکه استفاده شد. عرض ۳۹۰/۱۲۸۰، زبان انگلیسی، scrollWidth برابر innerWidth و بدون استثنای صفحه بود. پس از پذیرش پرداختی، تغییر صرفاً خطای تلاش مجددِ فرانت جداگانه بیلد و روی API واقعی با ارائه‌دهندهٔ غیرفعال آزمایش شد: ورود موبایل، بازخوانی/PDF، خطای 503 مجوز، تلاش مجدد صریح و عدم ذخیرهٔ امتیاز، با صفر درخواست مدل گذشت. WebKit/Safari/iOS و فارسی RTL در این نوبت انجام نشدند.

ردهای واقعی staging: بدون احراز 401، سازمان دیگر 401، VIEWER برابر 403، بدون رضایت 403، امضای فایل نامعتبر 415؛ ورودی امتیاز ناممکن 400 پیش از ذخیره. مجوز حریم خصوصی/ارائه‌دهنده دور زده نشد. deduplication همزمانِ پولی به‌صورت مستقل اثبات نشده؛ تکرار خودکار مبهم بسته و آزمون‌های سهمیه/مجوز برقرار است. بازبینی امنیتی شامل مرز مدل، parser، امتیاز، نسخه‌بندی، پاک‌سازی خطا، حریم خصوصی، tenant و retry بود؛ audit کاندیدا صفر مورد داشت. تست‌های support/FMEA/chat گذشتند ولی UAT عمومی آن‌ها و استنتاج واقعی تازهٔ چت/FMEA، NOT_RUN است.

## فرمان‌ها و شکست‌های واقعی

### ابزارهای واقعاً اجراشده

مهارت‌های ورودی Debug، تشخیص و توسعهٔ مبتنی بر آزمون استفاده شدند. ابزار بومی Debug/Chrome DevTools در این نشست قابل فراخوانی نبود و اجرای آن ادعا نمی‌شود. ابزارهای واقعی شامل PowerShell از طریق exec_command، ابزارهای فایل/فرایند و fetch در Node، CLI ماریاDB، Prisma Client، Vitest/TypeScript/Turbo، Chrome نصب‌شده با Playwright Core مجزا، مشاهدهٔ تصویر محلی و مراجعه به سند اولیهٔ وب بودند. ابزار بومی UI UX Designer اجرا نشد. فهرست taskهای دارای نام NIVASafe فقط API و Nginx موجود را نشان داد؛ task تازهٔ AI ساخته نشد. snapshotها و گزارش‌های تاریخی بازنویسی نشدند تا به‌جای پیاده‌سازی جاری قلمداد شوند.

در shell نهایی فقط PATH همان فرایند با C:\Runtime\node آغاز و COREPACK_ENABLE_NETWORK=0 تنظیم شد. فرمان‌های C:\Runtime\node\pnpm.cmd exec turbo build/lint/typecheck/test --force با خروجی و exit code در لاگ‌های pinned-final نگهداری شدند. برای رفع مانع دسترسیِ runner اکنون اقدام Windows از کارفرما لازم نیست.

| Command | Environment / exit / result |
|---|---|
| pnpm --version | Corepack/pinned shim: 10.13.1; global fallback remains 11.25.0 |
| pnpm exec turbo build --force | Isolated candidate; exit 0; all three packages freshly built |
| pnpm exec turbo lint --force | Isolated; exit 0; TypeScript checks, not ESLint |
| pnpm exec turbo typecheck --force | Isolated; exit 0 |
| pnpm exec turbo test --force | Isolated; exit 0; backend 439, frontend 345, domain 19 = 803 tests |
| pnpm verify:contract | Actual source checkout; exit 0; 90 frontend paths / 154 routes |
| pnpm verify:release | Actual source; exit 0; 29 static checks, not deployment proof |
| pnpm audit --prod --json | Isolated candidate; exit 0; zero advisories at all severities |
| node run-candidate-e2e.mjs (final 05) | Operator staging; exit 0; real provider, API, MariaDB and Chrome |
| node run-candidate-e2e.mjs (two-repeat stability) | Operator staging; exit 0; bounded real BOTH repetitions |
| node finish-readonly-browser.mjs | Operator staging; exit 0; provider disabled, real API/DB/browser recovery |
| pnpm build (earlier actual root) | Exit 2: missing root backend @prisma/client/vitest/type dependencies; no destructive dependency repair |
| pnpm verify:contract / verify:release (earlier isolated wrapper) | Exit 1: scripts absent from old isolated copy; actual source scripts subsequently passed |

کش Turbo در مسیر ignored مجزا گاهی بدون لحاظ تغییرات استفاده شد؛ آن خروجی‌ها اثبات نهایی محسوب نشدند و اجراهای --force انجام شد. Corepack برابر 10.13.1 ولی shim فرزند اولیه 11.25.0 بود؛ در اجرای نهایی فقط PATH همان فرایند با C:\Runtime\node شروع شد تا والد و فرزند پین‌شده باشند. تنظیم سراسری عوض نشد. Node staging همان C:\Runtime\node\node.exe نسخهٔ 22.22.3 است. یک اجرای قبلی cold-transform بیش از ۵ ثانیه طول کشید و درخواست ناتمام وارد mock بعدی شد؛ تبدیل اولیه به collection منتقل و پاک‌سازی timer/global تقویت شد؛ اجرای تازه بعدی بدون retry گذشت.

EPERM به هویت محدود/مسیر محافظت‌شده مربوط بود؛ قفل فایل/Defender اثبات نشد. مسیر اپراتور مجاز، بررسی مجزا را اجرا کرد. ACL، Defender، فایروال یا node_modules زنده تغییر نکرد. کمبود وابستگی ریشه مسئله‌ای جداست. هشدار قدیمی chunk بزرگ‌تر از ۵۰۰ کیلوبایت باقی است.

## وضعیت فعال و بازیابی

PID زنده 14048، NT AUTHORITY\SYSTEM، مسیر C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js است. task موجود NIVASafe-API فایل run-pm2.cmd را اجرا می‌کند؛ نام برنامه PM2 برابر nivasafe-api است. Nginx موجود و ریشهٔ static برابر C:\inetpub\nivasafe\app-com احراز شدند. task ممتاز تازه یا impersonation ساخته نشد.

هش provider فعال 8784D5C1124B8E727ED33E73E546DA92A0C91243671C89EE521EC67744206FCF و کاندیدا DF7ABDED9E4DFEF13D20EF1F1466E771F18F6ABC35F2CA0AB690BE8D3CEE6A07 متفاوت است. server.js به‌تنهایی هش یکسان دارد و نشان‌دهندهٔ تازگی انتشار نیست. JS عمومی همچنان 2B4F0C30678C311D30F4E0BDD67EBEFB12DA8BB6D1A12CC16A82C65B88094A17 و CSS برابر EA10DC070BD448680ADDBDC99305CA95B91C4F6EFB5C2BBF09AE7CA5A468CE86 است. health عمومی/لوکال و login/asset عمومی 200 بودند. پذیرش تصویر عمومی با حساب مجاز انجام نشد.

بازیابی در `C:\NIVASafe\.local\rula-model-contract-20261018-113940\backend-code-recovery` است. ۱۱۷ فایل کامپایل فعال و ۱۷ فایل بستهٔ domain جداگانه کپی/بازسازی و با هش برابر تأیید شدند. تنظیم محافظت‌شده به مسیر باز کپی نشد. این آزمایش فایل است، نه cutover/rollback عملیاتی PM2. schema جدید لازم نیست؛ مهاجرت زنده، بازنویسی history یا restore دیتابیس انجام نشد.

انتشار در دروازهٔ دقت متوقف است. تأیید تصویر زنده احراز نشده؛ RULA_IMAGE_PRIVACY_APPROVED_PROVIDER و RULA_IMAGE_VISION_SUPPORTED_PROVIDER در منابع محافظت‌شدهٔ بررسی‌شده وجود نداشتند. کد/static منتشر و قابلیت زنده فعال نشد؛ انتشار محدود code-only نیز اجرا/پذیرفته نشده است. پیش از فعال‌سازی، پذیرش متخصص و مجوز حریم خصوصی سازمان لازم است؛ احراز موفق آروان جای این دو را نمی‌گیرد.

## فایل‌های سورس تغییرکرده

این‌ها تغییرات محدود در یک worktree ازقبل بسیار تغییریافته‌اند؛ تمام diff هر فایل به این نوبت منتسب نیست. revision همان e5bf3f050bd6e127e13918c8d3eefcd3f8376acf است؛ commit/reset/clean انجام نشد. checkpoint در `C:\NIVASafe\.local\rula-model-contract-20261018-113940\before` است. برای قسمت‌هایی که snapshot اولیه نداشتند، انتساب تغییر قدیمی قطعی نیست.

- `C:\NIVASafe\backend\src\ai-provider.ts`
- `C:\NIVASafe\backend\src\ai-provider.test.ts`
- `C:\NIVASafe\backend\src\assessment-routing-policy.test.ts`
- `C:\NIVASafe\backend\src\rula-posture-ai.ts`
- `C:\NIVASafe\backend\src\rula-posture-ai.test.ts`
- `C:\NIVASafe\backend\src\image-analysis-diagnostics.ts`
- `C:\NIVASafe\backend\src\image-analysis-diagnostics.test.ts`
- `C:\NIVASafe\backend\src\modules\assessments.ts`
- `C:\NIVASafe\backend\src\modules\reports.ts`
- `C:\NIVASafe\backend\src\rula-three-stage.test.ts`
- `C:\NIVASafe\backend\src\fmea-detail-generation.test.ts`
- `C:\NIVASafe\backend\src\rula-registered-member.test.ts`
- `C:\NIVASafe\backend\src\rula-report.ts`
- `C:\NIVASafe\backend\src\rula-report.test.ts`
- `C:\NIVASafe\backend\src\rula-multi-image.test.ts`
- `C:\NIVASafe\shared\domain\src\index.ts`
- `C:\NIVASafe\shared\domain\src\index.test.ts`
- `C:\NIVASafe\shared\domain\src\rula-tables.ts`
- `C:\NIVASafe\shared\domain\src\rula-reference.test.ts`
- `C:\NIVASafe\frontend\src\features\assessments\AssessmentPages.tsx`
- `C:\NIVASafe\frontend\src\features\assessments\RulaEvaluationRowDialog.tsx`
- `C:\NIVASafe\frontend\src\features\assessments\assessmentAiFailure.ts`
- `C:\NIVASafe\frontend\src\features\assessments\assessmentAiFailure.test.ts`
- `C:\NIVASafe\scripts\probe-efficient-vision-model.mjs`

route/sidebar، ساختار دیتابیس یا پیاده‌سازی support حذف/اضافه نشد. یک build ناموفق ریشه خروجی‌های build worktree را تغییر داد، اما artifact فعال و بستهٔ domain مجزای آن بازنویسی نشد. Playwright فقط در .local/rula-browser-tools نصب شد؛ manifest/lock ریشه ارتقا نیافت.

## مراحل و تحویل

مراحل ۰۱ تا ۰۷ از محصول/معماری موجود استفاده کردند؛ تغییرات به RULA/مسیریابی/امتیاز محدود و schema، قرارداد و احراز حفظ شد. بازبینی امنیتی مرحلهٔ ۰۸ و اعتبارسنجی اجرایی ۰۹ در این محدوده گذشت. در ۱۰ مسیر فنی می‌گذرد ولی دقت رد است. انتشار ۱۱ اجرا نشده و پذیرش کلی ۱۲ صادر نمی‌شود؛ پروژه/وظیفه کامل نیست. مانع قدیمی Windows/مرورگر تکرار نمی‌شود: دسترسی مجاز و مرورگر واقعی کار کردند.

فهرست شواهد: candidate-manifest.json، acceptance-matrix.md، JSON/JSONL اجراها، لاگ‌های pinned-final، authenticated-model-catalog.json، live-schema-readonly.json، public-and-artifact-check.json، manifest بازیابی و تصاویر واقعی در `C:\NIVASafe\reports\evidence\rula-model-contract-2026-10-18`.

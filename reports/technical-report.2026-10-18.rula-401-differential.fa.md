# شواهد فنی تشخیص 401 و آزمون نهایی RULA

| مورد | مقدار |
|---|---|
| پروژه | NIVASafe |
| نوع گزارش | شواهد فنی |
| زبان | فارسی |
| تاریخ شمسی | ۱۴۰۵/۰۷/۲۶ |
| تاریخ میلادی | ۲۰۲۶-۱۰-۱۸ |
| مخزن | `C:\NIVASafe` |
| شاخه / HEAD | `main` / `e5bf3f050bd6e127e13918c8d3eefcd3f8376acf` |
| شناسه نامزد | `rula-401-differential-candidate-20261018-01` |
| نتیجه انتشار | منتشر نشد؛ API آزمایشی گذر کرد، آزمون مرورگر و پذیرش زنده مسدود است |

## نتیجه اصلی

برای HTTP 401 تاریخی **علت قطعی نداریم**. جزئیات پاسخ provider، شناسه upstream، PID/build و هم‌ارزی تنظیمات و credential اجرای قدیمی ثبت نشده بود. در نامزد نهایی فعلی، درخواست مستقیم متن، درخواست مستقیم تصویر و مسیر احراز هویت‌شده RULA با تنظیم credential فعلی موفق شدند. این شواهد احتمال entitlement را به‌تنهایی رد یا اثبات نمی‌کند و درباره اجرای قدیمی نتیجه قطعی نمی‌دهد.

تغییر سازگاری `reasoning_effort` برای ArvanCloud که پیش‌تر برای رفع HTTP 400 ثبت شده بود، در نامزد ساخته‌شده حاضر است و آزمون‌های متمرکز آن گذشت. این تغییر علت 401 قدیمی را اثبات نمی‌کند و در این نوبت هیچ فایل کد یا تنظیمات محصول تغییر نکرد.

## هویت نامزد و محیط

- backend نامزد: `C:\NIVASafe\.local\rula-final-candidate-20261017-053748\backend\dist\server.js`.
- شناسه: `rula-401-differential-candidate-20261018-01`.
- API آزمایشی: `http://127.0.0.1:5153/api/v1`؛ MariaDB آزمایشی روی `127.0.0.1:53306`؛ پوشه بارگذاری مجزای زیر `.local`.
- اجرای candidate با هویت `NT AUTHORITY\SYSTEM` از طریق Task Scheduler موقت انجام شد؛ PID مشاهده‌شده API برابر 4588 و health response دارای marker نامزد و وضعیت DB up بود.
- منبع فعلی `backend/src/ai-provider.ts`، `backend/src/modules/assessments.ts` و `backend/src/image-analysis-diagnostics.ts` با source داخل candidate برابر بود. hashها: `ai-provider.ts` برابر `C1CE98323108C7D0E9BC2233D11C9DCC338C58CCB2592227F9C63F784E88F5CC`؛ `assessments.ts` برابر `19BE11CC90497BDB22B6AADBBCBFD615DB6D10F46AE70B2AB6D3382B662A370D`؛ `image-analysis-diagnostics.ts` برابر `AD902DABBC964DC8A9E45BFCED8E1C5AA680AF7D041A55DB9C2C79821FD2F0CB`.
- خروجی build: `dist/server.js` با SHA-256 برابر `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0` و `dist/ai-provider.js` با SHA-256 برابر `30630A5F6BD2292F15F7E1883DE9FFA902855872F07129FF921BD56B699F6CF0`.
- دیتابیس آزمایشی disposable بود. schema با `prisma db push --skip-generate` فقط روی همان DB ایجاد شد؛ این کار clean migration replay را اثبات نمی‌کند. مسیر زنده استفاده نشد.
- فایل تصویر ساختگی ۲۳٬۰۶۳ بایت و SHA-256 `6167D8AB5B3C784AE6F4202357318C4BBF0A0C845DDA4A801978912233A4F2EA` داشت؛ تصویر شخصی استفاده نشد.
- تنظیمات provider از runtime محافظت‌شده به حافظه بارگذاری شد. فقط host/path، مدل، نتیجه بولی تطابق credential و شناسه‌های درخواست نگهداری شدند؛ هیچ کلید، fingerprint، مقدار Authorization، cookie یا بایت تصویر در گزارش ثبت نشده است.
- در زمان بررسی ۴۳۸ مورد در وضعیت Git از پیش وجود داشت. در این نوبت source/config tracked ویرایش نشد؛ reset، clean، stash، migration یا عملیات روی داده زنده اجرا نشد.

## شواهد درخواست‌های تفاضلی

| مسیر | runtime/candidate | درخواست و مدل | مشاهده امن تنظیمات | نتیجه |
|---|---|---|---|---|
| متن مستقیم | candidate بالا، فرایند staging با SYSTEM | `POST https://api.arvancloudai.ir/v1/chat/completions`؛ درخواست `GPT-5-Mini`، مدل برگشتی `gpt-5-mini-2025-08-07` | header احراز هویت حاضر بود؛ observer تطابق با credential بارگذاری‌شده را ثبت کرد؛ مقدار محرمانه ثبت نشد | HTTP 200، پاسخ غیرخالی؛ شناسه `1fbc2466da35cc6364e1fcde9a9fc0d7` در اجرای موفق BOTH |
| adapter تصویر مستقیم | همان candidate و فرایند SYSTEM | همان host/path/model؛ PNG ساختگی به‌شکل data URI؛ `reasoning_effort` برای Arvan vision حذف شد | همان credential/config؛ تصویر خام ذخیره نشد | HTTP 200؛ parser هفت بخش بدن را شناخت؛ شناسه مستقیم `06a6ae23c040c7dd3e845fecf7efe1b3` |
| مسیر RULA احراز هویت‌شده | همان candidate، عضو آزمایشی با consent و quota | `POST /api/v1/rula/posture-image-analysis` با upload واقعی از API برنامه | کنترل‌های احراز هویت، tenant، رضایت، quota، امضا و MIME فعال ماندند | اجرای staging برای RIGHT، LEFT و BOTH هرکدام HTTP 200 داشت؛ شناسه upstream اجرای BOTH: `289a268f74e2cda07362ec640f5da369` |

از context اجرای SYSTEM، DNS، TCP 443، اعتبار گواهی و TLS 1.3 موفق بودند و proxy تنظیم‌شده‌ای مشاهده نشد. header پاسخ provider، ArvanCloud را معرفی کرد. از آنجا که header/body اجرای قدیمی ذخیره نشده، منشأ همان 401 (gateway در برابر proxy/CDN) را نمی‌توان با قطعیت تعیین کرد.

گزارش قبلی فقط شناسه داخلی درخواست برنامه `278fd697-c746-4f18-b205-a4d4449cce15` را برای 401 تاریخی داشت؛ upstream ID، کد/متن امن خطای provider و هویت runtime قدیمی در دسترس نیست. بنابراین credential drift، تغییر endpoint/process، رد موقت provider یا تفاوت درخواست از هم تفکیک‌پذیر نیستند.

## جریان احراز هویت‌شده و ماندگاری RULA

دو اجرای جدا از همان build و با DBهای disposable انجام شد:

1. **RIGHT و LEFT**: `C:\NIVASafe\.local\rula-401-differential-20261018\evidence-e2e-final-candidate\authenticated-rula-e2e.json`. کاربر عادی آزمایشی `HSE_SPECIALIST` داشت. RIGHT با HTTP 200 و مدل `gpt-5-mini-2025-08-07` تحلیل شد، ذخیره HTTP 201، ورود تازه HTTP 200، reload HTTP 200، report JSON HTTP 200 و PDF HTTP 200؛ امتیاز ذخیره‌شده ۴، نسخه ۳ و یک تصویر بود. LEFT نیز همین مسیر را گذراند؛ امتیاز ۵، نسخه ۳ و یک تصویر. وضعیت کل آن فایل FAIL است چون درخواست BOTH بعدی در API با HTTP 502 و `RULA_IMAGE_AI_INVALID_RESPONSE` برگشت (request ID `a41a4fcd-f7d2-461b-9b82-3c1c19e02dce`) هرچند provider HTTP 200 داده بود.
2. **BOTH**: `C:\NIVASafe\.local\rula-401-differential-20261018-both\evidence-e2e-final-candidate\authenticated-rula-e2e.json`. تحلیل BOTH با HTTP 200 دو شیء مستقل LEFT و RIGHT داشت؛ برای هر سمت ۷ ردیف body part، ۵ مورد detected و ۲ مورد نیازمند بازبینی بود. ذخیره 201، آپلود تصویر 201، link 200، ذخیره بازبینی 200، ورود تازه 200، reload 200، report JSON 200 و PDF 200 با حجم ۵۷٬۰۳۳ بایت. امتیاز ذخیره‌شده ۴، نسخه ۳، یک تصویر، بازبینی کامل و چهار ردیف اولیه نیازمند بازبینی بود. یک usage record با ۲٬۳۲۱ توکن از سقف آزمایشی ۱٬۰۰۰٬۰۰۰ ثبت شد.

مقدار `IN_PROGRESS` در رکورد ماندگاری، وضعیت lifecycle ارزیابی است؛ assertionهای تکمیل بازبینی، reload، report و PDF گذشتند. harness داده ردیف‌های بازبینی‌لازم را به‌عنوان تأیید کاربر از API آزمایشی ارسال کرد؛ این بررسی مستقل انسانی نیست. ارزیابی متخصص ارگونومی انجام نشد و دقت بالینی/ارگونومیک تأیید نشده است.

آزمون‌های منفی API نامزد موفق بودند: بدون احراز هویت 401، دسترسی tenant دیگر 401، نقش Viewer برابر 403، consent ناقص 403 با `RULA_IMAGE_CONSENT_REQUIRED` و امضای تصویر نامعتبر 415 با `RULA_IMAGE_SIGNATURE_INVALID`. inference موفق mock نبود. مجموعه کامل خطای provider/timeout/retry و آزمون browser session اثبات نشد.

## خطای متناوب ساختار پاسخ

در اجرای اولیه، provider برای BOTH پاسخ HTTP 200 داد ولی برنامه HTTP 502 با `RULA_IMAGE_AI_INVALID_RESPONSE` برگرداند. اجرای جداگانه BOTH با همان candidate و config موفق شد. محتوای خام مدل عمداً نگهداری نشد؛ بنابراین شکل نامعتبر، شاخه parser و این‌که منبع آن نوسان مدل است یا نقص parser مشخص نیست. این ریسک قابلیت اطمینان باقی مانده و نباید رفع‌شده اعلام شود.

## شواهد لازم برای تعیین علت 401 تاریخی

منبع مسدودکننده، context تنظیمات محافظت‌شده و لاگ همان instance قدیمی backend است، نه نبود نتیجه از فهرست مدل‌ها. اپراتوری که به آن فرایند دسترسی دارد باید رکورد امنی شامل هویت فرایند و PID، build marker بارشده، شناسه غیرمحرمانه منبع config، host/route provider و مدل نرمال‌شده، دو نتیجه بولی «header احراز هویت حاضر بود» و «credential با config بارشده تطابق داشت»، ویژگی‌های schema درخواست، status upstream، کد/type/شرح کوتاه و امن خطا، header شناسایی server و request/correlation ID ارائه کند. کلید، fingerprint، مقدار authorization، prompt، تصویر یا متن کامل پاسخ لازم نیست. درخواست vision موفق candidate فعلی هیچ شاهدی برای نیاز به تغییر entitlement در ArvanCloud نمی‌دهد؛ چنین تغییری نباید درخواست شود مگر این‌که خطای امن اجرای قدیمی صریحاً آن را نشان دهد.

## مرورگر و runtime عمومی

- آزمون browser احراز هویت‌شده candidate: **NOT RUN**. Playwright نصب نبود. تلاش در هویت تعاملی پیش از آغاز API/browser به‌علت عدم دسترسی به `C:\NIVASafe\.env` شکست خورد (`process.loadEnvFile` خطای `ENOENT` داد). خواندن فایل یا چاپ محتوای آن انجام نشد؛ بررسی ACL نیز Access denied بود.
- زمان‌بندی runner با SYSTEM در `New-ScheduledTaskAction` با Access denied متوقف شد؛ task ثبت نشد. screenshot/trace احراز هویت‌شده یا تست موبایل ۳۹۰px وجود ندارد.
- WebKit/Safari واقعی یا iOS اجرا نشد.
- `https://app.nivasafe.com/api/v1/health` در این نشست تأیید نشد: درخواست HTTPS پیش از دریافت پاسخ با `System.Net.Http.HttpRequestException` شکست خورد. API محلی زنده `http://127.0.0.1:5044/api/v1/health` HTTP 200، version `0.1.0` و DB up داد. PID 14048 روی پورت 5044 است؛ مسیر executable و start time از این نشست قابل دسترسی نبودند.
- فایل‌های وب‌استاتیک محلی در `C:\inetpub\nivasafe\app-com`: index SHA-256 `E1C893E440F8B769CB2E119C47D7D682BCD9DB092C0F4FD581A097B830885ED9`؛ JS `2B4F0C30678C311D30F4E0BDD67EBEFB12DA8BB6D1A12CC16A82C65B88094A17`؛ CSS `EA10DC070BD448680ADDBDC99305CA95B91C4F6EFB5C2BBF09AE7CA5A468CE86`. این نوبت هیچ assetی تغییر نکرد؛ hash محلی ثابت نمی‌کند hostname عمومی همین محتوا را سرو می‌کند.
- مانع browser، ACL فایل `C:\NIVASafe\.env` و منع ایجاد Task Scheduler task برای هویت تعاملی `srv9298144857\codexsandboxoffline` است. اقدام لازم، فراهم‌کردن مسیر SYSTEM محدود برای runner با تنظیمات staging-only است؛ دسترسی گسترده به فایل production env لازم نیست.
- ابزار تخصصی Debug در ابزارهای قابل‌فراخوانی این نشست موجود نبود؛ تشخیص‌ها با PowerShell، Node/Vitest، Prisma، HTTP محلی، ابزارهای فرایند/شبکه و Task Scheduler انجام شدند.

## اعتبارسنجی و نتایج

| فرمان | پوشه کاری | نتیجه |
|---|---|---|
| `pnpm --version` | `C:\NIVASafe` | Exit 0؛ نسخه 11.25.0. مخزن pnpm 10.13.1 را pin می‌کند؛ این نسخه سراسری مبنای ادعای full-workspace pass نبود. |
| `C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --configLoader runner --maxWorkers=2 src/ai-provider.test.ts src/rula-posture-ai.test.ts src/rula-multi-image.test.ts` | backend candidate | Exit 0؛ ۳ فایل، ۶۰ تست گذشت. |
| `C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --configLoader runner --maxWorkers=2 src/rula-posture.test.ts src/rula-three-stage.test.ts src/rula-process.test.ts src/rula-ai-retry.test.ts` | backend candidate | Exit 0؛ ۴ فایل، ۲۵ تست گذشت. |
| `C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --configLoader runner src/features/assessments/rulaAiRequest.test.ts src/features/assessments/rulaImageReviewFlow.test.ts src/features/assessments/rulaPostureReview.test.ts src/features/assessments/rulaVisionImage.test.ts` | `C:\NIVASafe\frontend` | Exit 0؛ ۴ فایل، ۲۹ تست گذشت. |
| `C:\Runtime\node\node.exe scripts\check-api-contract.mjs` | `C:\NIVASafe` | Exit 0؛ ۹۰ مسیر frontend با ۱۵۴ route backend تطبیق داشت. |
| `C:\Runtime\node\node.exe scripts\verify-release.mjs` | `C:\NIVASafe` | Exit 0؛ ۲۹ بررسی گذشت. |
| `pnpm -C backend exec prisma generate --schema prisma/schema.prisma` | candidate workspace | Exit 0 در سابقه build همین candidate؛ Prisma Client 6.19.3 تولید شد. |
| `pnpm -C backend build` | candidate workspace | Exit 0 در سابقه build همین candidate؛ hashهای بالا ثبت شدند. |
| `New-ScheduledTaskAction ...` برای runner مرورگر | Windows session جاری | پیش از ثبت task با Access denied شکست خورد. |

handoff قبلی برای همین candidate عدد ۴۱۱ تست backend و ۳۳۹ frontend، typecheck/build، contract و release validation را گزارش کرده بود. این اعداد شواهد قبلی‌اند، نه اجرای کامل مجدد در همین گزارش. این نوبت lint کامل/typecheck کامل/full suite/audit دوباره اجرا نشد. invocation دقیق runner احراز هویت‌شده در JSON شواهد ذخیره نشده؛ فایل‌های نتیجه و آزمون‌های API در مسیرهای بالا موجودند.

## فایل‌ها و تغییرات

- در این نوبت هیچ source، backend config، تنظیم production، schema دیتابیس یا artifact انتشار تغییر نکرد.
- تغییرهای targeted از قبل در candidate حاضر بودند: `backend/src/ai-provider.ts`، `backend/src/ai-provider.test.ts`، `backend/src/image-analysis-diagnostics.ts`، `backend/src/image-analysis-diagnostics.test.ts`. adapter برای Arvan vision فیلد پشتیبانی‌نشده `reasoning_effort` را حذف می‌کند و regression testهای متمرکز گذشتند. این‌ها تغییرهای قبلی working tree هستند، نه ویرایش این نوبت.
- dependency جدیدی اضافه نشد. migration روی DB زنده اجرا نشد.
- schema محیط آزمایشی با `prisma db push --skip-generate` ساخته شد. replay تمیز migration chain اثبات نشد. نگرانی تاریخی duplicate column/checksum drift برای migration زنده حل نشده؛ بر اساس schema آزمایشی، برای candidate کد حاضر migration لازم نبود.

## انتشار و بازگشت

**منتشر نشد.** تأییدهای حریم خصوصی/vision محیط production همچنان بسته‌اند. backend یا frontend زنده تغییر نکرد، هیچ سرویسی restart نشد، به DB/داده/upload زنده دست زده نشد و backup/rollback rehearsal برای انتشار این نوبت انجام نشد. نشست فعلی قادر به اثبات executable/config فعال یا ساخت snapshot بازگشت تأییدشده نیست. صرف موفقیت staging مجوز کپی candidate به سایت زنده نیست.

### پیش‌نیازهای بیرونی

1. مدیر سرور باید مسیر محدود اجرای browser runner با config آزمایشی فراهم کند؛ یا هویت staging محافظت‌شده‌ای بدهد که نیازی به دسترسی گسترده به `.env` نداشته باشد.
2. برای هر پذیرش تصویری production، سازمان باید مجوز حریم خصوصی مستند برای ارسال تصاویر وضعیت بدنی به ArvanCloud بدهد و gate را از مسیر عملیاتی مصوب تنظیم کند.
3. اپراتور انتشار دارای دسترسی به هویت/config سرویس backend باید artifact زنده را تعیین و پیش از انتشار snapshot بازگشت کد/config را بسازد و صحت آن را بیازماید.

## ماتریس نهایی

| مرحله | وضعیت | شاهد |
|---|---|---|
| نامزد دقیق backend اجراشده | PASS | marker `rula-401-differential-candidate-20261018-01`؛ candidate `dist/server.js`؛ hash و PID بالا. |
| parity تنظیمات/provider staging | PASS برای فرایند فعلی؛ UNKNOWN برای اجرای 401 قبلی | تطابق بولی credential روی درخواست‌های فعلی ثبت شد؛ snapshot فرایند قدیمی موجود نیست. |
| درخواست مستقیم متن | PASS | ArvanCloud HTTP 200؛ مدل برگشتی `gpt-5-mini-2025-08-07`. |
| درخواست مستقیم تصویر | PASS | ArvanCloud HTTP 200 با تصویر ساختگی؛ هفت مشاهده body part. |
| route احراز هویت‌شده RULA | PASS در staging | inferenceهای RIGHT/LEFT/BOTH با HTTP 200؛ فایل‌های شواهد فوق. |
| علت 401 قبلی | BLOCKED / UNKNOWN | body و upstream ID قدیمی و parity هویت/config موجود نیست؛ 401 فعلی تکرار نشد. |
| inferenceهای RIGHT / LEFT / BOTH | PASS در staging | RIGHT/LEFT در اجرای نخست؛ BOTH در اجرای مستقل همان candidate. |
| score mapping / human review | PARTIAL | ذخیره score و ردیف‌های review-لازم بررسی شدند؛ بازبینی مستقل واجد صلاحیت انجام نشد. |
| ذخیره DB / ورود و GET تازه / report | PASS در staging | MariaDB disposable؛ JSON و PDF با HTTP 200؛ PDF برابر 57,033 بایت. |
| کنترل‌های auth/privacy/file منفی | PASS در staging | پاسخ‌های 401/403/415 طبق بالا. |
| browser E2E احراز هویت‌شده | BLOCKED / NOT RUN | ACL فایل config و Task Scheduler دسترسی ندادند؛ screenshot موجود نیست. |
| backup / rollback rehearsal | NOT RUN | انتشار نشد؛ snapshot انتشار زنده در این نوبت بررسی نشد. |
| backend منتشرشده | NOT DEPLOYED | هیچ تغییر سرویس/config/data زنده انجام نشد. |
| تأیید production vision/privacy | BLOCKED | gateها عامدانه بسته‌اند؛ approval/config مستند در دسترس نیست. |
| health عمومی و RULA زنده احراز هویت‌شده | NOT RUN | درخواست HTTPS عمومی قبل از پاسخ شکست خورد؛ جریان حساب production آزمایش نشد. |
| regression smoke UI/support | NOT RUN | مرورگر candidate یا UI زنده آزمایش نشد؛ کدی تغییر نکرد. |


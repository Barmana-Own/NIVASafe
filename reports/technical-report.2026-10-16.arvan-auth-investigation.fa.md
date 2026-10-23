# گزارش فنی — ریشه‌یابی 401 درگاه ArvanCloud و RULA

| مورد | مقدار |
|---|---|
| پروژه | NIVASafe |
| نوع گزارش | گزارش فنی |
| زبان | فارسی |
| تاریخ شمسی | ۱۴۰۵/۰۷/۲۴ |
| تاریخ میلادی | ۲۰۲۶/۱۰/۱۶ |
| شاخه / HEAD | `main` / `e5bf3f050bd6e127e13918c8d3eefcd3f8376acf` |
| وضعیت تحویل | احراز درگاه ناپایدار؛ RULA و ماندگاری نتیجه مسدود |

## نتیجهٔ ریشه‌یابی

**علت قطعی 401 تاریخی قابل تعیین نیست.** اعتبارنامهٔ موجود در `C:\NIVASafe\.env` قابل‌خواندن توسط فرایند برنامه است و مقدار آن از خروجی حذف شد. همان منبع در این نوبت برای دو درخواست موفق پاسخ گرفت، اما درخواست بعدی `GET /models` با HTTP 401 رد شد. بنابراین وجود کلید تأیید شد، ولی اعتبار پایدار، مجوز endpoint/model و پایداری ارائه‌دهنده هنوز تأیید نشده است. پاسخ 401 اخیر بدون body، `WWW-Authenticate` یا شناسهٔ درخواست ثبت شد؛ عمداً درخواست ردشده تکرار نشد.

گزارش تاریخی `reports/final-debug-rula-tickets.md` یک درخواست staging با شناسهٔ `b8e12c19-f17b-4c7a-9cdd-875209157873` را ثبت می‌کند: ارائه‌دهنده 401 و API برنامه 503 `RULA_IMAGE_AI_UNAVAILABLE` برگرداند؛ نتیجه‌ای ذخیره نشد. اطلاعات کافی برای تطبیق آن درخواست با credential مؤثر و مدل واقعی زمان اجرا موجود نیست.

## محیط جاری

| مورد | شواهد |
|---|---|
| مدیر فرایند | PM2 runtime از مسیر `C:\ProgramData\NIVASafe\run-pm2.cmd` |
| API | PID 832، Node.js v22.22.3، وضعیت PM2 برابر online، شروع `2026-10-15T11:47:45Z` |
| فایل اجراشده | `C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js` |
| مسیر کاری | `C:\NIVASafe`; نسخهٔ منتشرشده فایل `.env` مسیر کاری را بارگذاری می‌کند |
| پراکسی / پورت | Nginx روی 80/443؛ API روی `127.0.0.1:5044`; سلامت محلی HTTP 200 |
| ارائه‌دهنده / پایه | ArvanCloud؛ `https://api.arvancloudai.ir/v1` |
| منبع کلید | فایل محافظت‌شدهٔ `C:\NIVASafe\.env`; کلید در محیط ذخیره‌شدهٔ PM2 نبود، اما کد سرور آن را از فایل مسیر کاری بارگذاری می‌کند |
| تأیید تصویر RULA | `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` و `RULA_IMAGE_VISION_SUPPORTED_PROVIDER` در محیط PM2 خالی هستند؛ مسیر API فعلی باید fail-closed بماند |

## اختلاف منبع و نسخهٔ اجراشده

نسخهٔ منتشرشدهٔ ۱۵ اکتبر در `backend/dist/ai-provider.js` از `RulaImageFailoverProvider` استفاده می‌کند: مدل اصلی `GPT-4.1-Mini` و مدل جایگزین `GPT-4o-mini`. مقدار `AI_RISK_MODEL=GPT-5-Mini` موجود در PM2/`.env` این مسیر تصویری را تغییر نمی‌دهد. در مقابل، منبع فعلی `backend/src/ai-provider.ts`، `getRulaPostureImageAIProvider()` را به provider ارزیابی پیکربندی‌شده می‌سپارد و مدل ثابت ارزیابی `GPT-5-Mini` است. این منبع در این نوبت build یا deploy نشد.

## آزمون‌های provider

| آزمون | نتیجهٔ واقعی |
|---|---|
| `GET https://api.arvancloudai.ir/v1/models` با کلید محافظت‌شده | دو درخواست پیشین در این نوبت HTTP 200 دادند؛ پاسخ موفق شامل 90 مدل و شناسه‌های دقیق `GPT-5-Mini`، `GPT-4.1-Mini`، `GPT-4o-mini` و `DeepSeek-V4-Flash` بود. پس از اصلاح اسکریپت تشخیصی، یک درخواست دیگر HTTP 401 گرفت. |
| `POST /v1/chat/completions`, مدل `GPT-5-Mini`, درخواست متنی کوتاه | HTTP 200؛ مدل گزارش‌شده `GPT-5-Mini`؛ خروجی آزمون برابر `PASS`؛ مصرف گزارش‌شده 24 ورودی + 19 خروجی = 43 توکن. |
| تصویر مصنوعی با adapter نسخهٔ اجراشده، مدل `GPT-4.1-Mini` | یک درخواست. adapter پاسخ را بازگرداند، اما parser با `RULA_IMAGE_AI_INVALID_RESPONSE` رد کرد. status دقیق HTTP، مدل گزارش‌شده در همان پاسخ و علت جزئی parser ذخیره نشد. درخواست دوباره ارسال نشد. |
| نتیجهٔ تاریخی مستقل | فایل محلی `C:\NIVASafe\backups\rula-three-stage-live-evidence.json` مورخ 9 اکتبر، پاسخ مصنوعی Arvan با مدل گزارش‌شده `gpt-5-mini-2025-08-07` را ثبت کرده است. پاسخ ذخیره‌شده با parser نسخهٔ جاری parse شد: سمت RIGHT، شش بخش مشاهده‌شده، یک بخش نیازمند بازبینی و هشت landmark. این شاهد تاریخی است، نه تأیید نسخهٔ جاری یا ماندگاری برنامه. |

درخواست‌های مدل و متن موفق از کد یک‌بارهٔ Node استفاده کردند؛ secret در خروجی نبود. درخواست تصویر از `getAIProvider("arvancloud", "risk", "GPT-4.1-Mini")` و prompt/parser build منتشرشده استفاده کرد و فقط تصویر مصنوعی `frontend/test-fixtures/rula-ai-synthetic.png` را ارسال کرد. این آزمون مستقیم adapter بود و از API کاربر عبور نکرد.

## خطای ابزار تشخیصی و اصلاح

اسکریپت `.phase03-final-validation-20261016/scripts/check-vision-models.mjs` قبلاً کلید را فقط از PM2 dump یا `process.env` می‌گرفت، درحالی‌که PM2 کلید را نگه نمی‌دارد و shell نیز آن را export نکرده است؛ اسکریپت فایل محافظت‌شدهٔ `.env` را بارگذاری نمی‌کرد و می‌توانست درخواست `Bearer undefined` بسازد. اسکریپت اصلاح شد تا فایل `.env` را فقط در حافظه بارگذاری کند، در نبود کلید درخواست نسازد و فقط status و شناسهٔ مدل‌های ازپیش‌تعریف‌شده را چاپ کند. `node --check` با exit 0 گذشت. اجرای مجدد اسکریپت با `credentialPresent:true` HTTP 401 گرفت؛ بنابراین نقص اسکریپت می‌تواند بعضی 401های تشخیصی را توضیح دهد، اما 401 فعلی را توضیح نمی‌دهد.

## وضعیت RULA و پایگاه داده

- زنجیرهٔ HTTP تصویر تا پاسخ provider در probe مستقیم اجرا شد؛ خروجی RULA معتبر از آزمون جاری به‌دست نیامد.
- دروازه‌های حریم خصوصی/قابلیت تصویر روی سرویس زنده خالی‌اند؛ API کاربر باید درخواست تحلیل واقعی را پیش از provider متوقف کند. هیچ gate، authorization، quota یا consent تغییری نکرد.
- staging مستقل قابل استفاده نبود: فایل‌های `.phase03-final-validation-20261016/.env` و `backend/.env` و فایل اعتبارنامهٔ test account موجود نبودند. فقط شناسه‌های staging باقی مانده‌اند. پایگاه فعال در این نوبت خوانده یا نوشته نشد.
- ذخیره، بازگشایی، اصلاح دستی و نمایش گزارش RULA برای نتیجهٔ provider: **NOT RUN**. هیچ نتیجه‌ای ساخته یا جعل نشد.

## تغییرات، اعتبارسنجی و انتشار

فایل تغییرکردهٔ غیرگزارشی فقط `.phase03-final-validation-20261016/scripts/check-vision-models.mjs` است. فایل‌های چهارگانهٔ گزارش همین بررسی افزوده شدند. کد برنامه، `.env`، PM2، سرویس‌ها، Nginx، database، migration و دادهٔ کاربران تغییر نکردند. API restart یا deployment انجام نشد.

| دستور / بررسی | نتیجه |
|---|---|
| `node --check .phase03-final-validation-20261016/scripts/check-vision-models.mjs` | PASS، exit 0 |
| `GET http://127.0.0.1:5044/api/v1/health` | PASS، HTTP 200 |
| کاتالوگ ArvanCloud | PARTIAL: HTTP 200 سپس HTTP 401 در درخواست بعدی |
| GPT-5-Mini متن | PASS در آزمون یک‌بارهٔ provider؛ end-to-end برنامه نبود |
| RULA تصویر جاری | FAIL در parse؛ خروجی منطبق با schema نبود |
| پایگاه آزمایشی، user auth، ذخیره/بازگشایی/گزارش | NOT RUN؛ staging و اعتبارنامهٔ test account حاضر نبود |
| build/test/lint/typecheck کامل | NOT RUN؛ منبع برنامه تغییر نکرد و این بررسی محدود به خطای provider بود |
| service restart / deployment / migration | NOT RUN |

## نیاز خارجی و ادامهٔ امن

مالک حساب ArvanCloud باید از لاگ/پشتیبانی ارائه‌دهنده دلیل 401 را برای درخواست‌های `/v1/models` و `/v1/chat/completions` بررسی کند و تأیید کند کلید برای endpoint و مدل‌های تصویری موردنظر مجوز دارد. اگر ارائه‌دهنده key rotation یا entitlement اصلاح می‌خواهد، فقط در secret store محافظت‌شدهٔ سرور انجام شود. برای آزمون end-to-end باید staging DB و حساب عادی آزمایشی مجزا فراهم باشد. دروازه‌های تصویر فقط پس از تأیید حریم خصوصی و تکرار موفق آزمون دقیق تصویر/JSON در staging قابل تغییرند؛ این تغییر در این نوبت انجام نشد.

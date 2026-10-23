# گزارش فنی — بررسی درگاه ArvanCloud و مسیر تصویر RULA

| مورد | مقدار |
|---|---|
| پروژه | NIVASafe |
| نوع گزارش | فنی |
| زبان | فارسی |
| تاریخ شمسی | ۲۵ مهر ۱۴۰۵ |
| تاریخ میلادی | ۱۷ اکتبر ۲۰۲۶ |
| مخزن | `C:\NIVASafe` |
| شاخه / HEAD | `main` / `e5bf3f050bd6e127e13918c8d3eefcd3f8376acf` |
| وضعیت | اصلاح آداپتر در source تأیید شد؛ منتشر نشده؛ پذیرش کامل RULA مسدود است |

## جمع‌بندی فنی

بک‌اند فعال در Scheduled Task با نام `NIVASafe-API` و هویت `SYSTEM` اجرا می‌شود؛ PM2 فرایند API با PID `14048` را از `C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js` اجرا می‌کند. Node فعال نسخه `v22.22.3`، میزبان API برابر `127.0.0.1:5044` و درگاه `https://api.arvancloudai.ir/v1` است. Health محلی HTTP 200 و پایگاه‌داده up بود. Windows WinHTTP و متغیرهای پراکسی Node بدون پراکسی بودند.

اعتبارنامه در `.env` محافظت‌شده توسط فرایند سرویس بارگذاری شده است؛ مقدار یا طول آن ثبت نشد. آداپتر فعال از `Authorization: Bearer` استفاده می‌کند. از هویت واقعی سرویس، DNS، TCP/443 و TLS 1.3 موفق بودند. `GET /v1/models` با HTTP 200 و شناسه `256a01685555c42803455537a1e6f769`، ۹۰ شناسه مدل برگرداند؛ مدل‌های دقیق فعال `GPT-5-Mini` و `DeepSeek-V4-Flash` در فهرست بودند. یک درخواست متنی `GPT-5-Mini` به `/v1/chat/completions` با HTTP 200، شناسه `596d29f1304466279c7827552c2ea38c` و ۳۰ توکن پاسخ پذیرفته‌شده داد.

HTTP 401 تاریخی با اعتبارنامه فعلی بازتولید نشد. اعتبارنامه و دسترسی فعلی معتبرند، اما علت دقیق پاسخ تاریخی بدون متن امن پاسخ آن زمان، snapshot اعتبارنامه یا گزارش ArvanCloud قابل اثبات نیست. timeout قبلی نیز بازتولید نشد؛ درخواست متنی فعلی حدود ۷٫۶ ثانیه طول کشید و شواهد DNS/TCP/TLS نشان‌دهنده مسدودبودن شبکه ویندوز نیستند. منشأ دقیق timeout قبلی نامشخص باقی می‌ماند.

## علت خطای تصویر و اصلاح

نسخه فعال و source اولیه، برای GPT-5 و خروجی ساختاریافته پارامتر `reasoning_effort: "low"` می‌فرستاد. درگاه برای یکی از درخواست‌های تصویر HTTP 400 با توضیح تعارض `reasoning_effort` و تنظیم داخلی `***.effort` برگرداند؛ شناسه پاسخ `80f4229da023dbad3489c29dbe6b22df` بود. این خطا دیگر 401 احراز هویت نبود.

در `backend/src/ai-provider.ts` تولید گزینه‌ها پارامتری شد تا فقط آداپتر ArvanCloud بتواند `reasoning_effort` را حذف کند. آداپتر GapGPT همچنان رفتار قبلی را دارد. آزمون متناظر در `backend/src/ai-provider.test.ts` نبود این پارامتر، مدل و سقف ۳۰۰۰ توکن، JSON mode و انتقال تصویر را کنترل می‌کند.

نسخه اصلاح‌شده در کپی ایزوله با همان هویت `SYSTEM`، Node فعال، پیکربندی PM2 و اعتبارنامه محافظت‌شده اجرا شد. آداپتر واقعی source، تصویر PNG مصنوعی stick-figure را به همان مسیر `/v1/chat/completions` فرستاد. پاسخ HTTP 200 با شناسه `39d8e2dad3c1c44ee13a893e5f5a69ca` و مدل برگشتی `gpt-5-mini-2025-08-07` دریافت شد. پاسخ با parser RULA نسخه ایزوله معتبر بود: یک سمت، هفت عضو بدن، پنج زاویه، یک ردیف نیازمند بازبینی انسانی و هشت landmark. مقدار خروجی خام یا تصویر در شواهد ذخیره نشده است. خروجی‌های پاک‌سازی‌شده در `.local/rula-arvan-runtime-probe-20261017.json`، `.local/rula-arvan-synthetic-vision-20261017.json` و `.local/rula-arvan-adapter-live-test-20261017.json` هستند.

دو مشاهده تشخیصی دیگر نیز ثبت شد: سقف ۱۲۰۰ توکن در یک درخواست آزمایشی کوتاه پاسخ قابل‌پارسی نداد؛ درخواست ۳۰۰۰ توکنی با `reasoning_effort` پاسخ JSON داد اما از parser نگذشت. با حذف پارامتر متعارض، آداپتر اصلاح‌شده با سقف ۳۰۰۰ پاسخ قابل‌پارسی داد.

## مسیر برنامه و محدودیت‌های ایمنی

پروفایل فعال در `deployment/ecosystem.config.cjs`، `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` و `RULA_IMAGE_VISION_SUPPORTED_PROVIDER` را خالی نگه می‌دارد. بنابراین مسیر API واقعی پیش از ارسال تصویر fail-closed است. هیچ گیت رضایت، سیاست دسترسی، کلید، تنظیم سرویس یا رکورد پایگاه‌داده تغییر نکرد. فراخوانی تصویری فقط با fixture مصنوعی و مستقیماً از آداپتر ایزوله انجام شد؛ مسیر احراز هویت‌شده HTTP اجرا نشد.

داده staging قابل‌استفاده، پایگاه‌داده جداگانه و حساب کاربر عادی در کپی ایزوله موجود نبود. بنابراین ذخیره نتیجه، بازخوانی پس از reload، گزارش، مجوزهای tenant و رد نقش‌های غیرمجاز اجرا نشدند. درخواست گفت‌وگوی واقعی DeepSeek نیز اجرا نشد؛ فقط حضور شناسه آن در catalog تأیید شد.

## فایل‌ها و اعتبارسنجی

| فایل | تغییر |
|---|---|
| `backend/src/ai-provider.ts` | حذف `reasoning_effort` فقط برای درخواست‌های ArvanCloud GPT-5 ساختاریافته |
| `backend/src/ai-provider.test.ts` | افزودن assertion برای عدم ارسال پارامتر متعارض و حفظ payload تصویر |

هر دو فایل پیش از این اجرا تغییرات قبلی داشتند؛ فقط تغییر محدود بالا به آن‌ها افزوده شد و تغییرات قبلی حفظ شدند.

اعتبارسنجی روی کپی ایزوله `C:\NIVASafe\.local\rula-root-cause-20261017\backend` انجام شد:

| دستور | نتیجه |
|---|---|
| `C:\Runtime\node\node.exe node_modules\vitest\vitest.mjs run src/ai-provider.test.ts src/rula-posture-ai.test.ts src/rula-ai-retry.test.ts --configLoader runner --maxWorkers=2` | Exit 0؛ ۳ فایل، ۵۵ آزمون موفق |
| `C:\Runtime\node\node.exe node_modules\typescript\bin\tsc --noEmit -p tsconfig.json` | Exit 0 |
| `C:\Runtime\node\node.exe node_modules\typescript\bin\tsc -p tsconfig.json` | Exit 0 |
| `git diff --check -- backend/src/ai-provider.ts backend/src/ai-provider.test.ts` | Exit 0؛ فقط هشدار line-ending موجود |
| `GET http://127.0.0.1:5044/api/v1/health` | HTTP 200؛ پایگاه‌داده up؛ PID فعال تغییر نکرد |

کل مجموعه root، pnpm lint یا suite کامل این اجرا نشد. هیچ migration، seed، smoke یا عملیات نوشتن پایگاه‌داده اجرا نشد.

## انتشار، افزونه و اقدام بعدی

اصلاح source به build فعال کپی نشد و سرویس restart نشد. فرایند فعال با PID `14048` و زمان شروع `2026-10-16T22:28:44.251Z` همان بود. سه Scheduled Task موقت پس از تست حذف شدند؛ سه فایل JSON شواهد در `.local` فقط metadata پاک‌سازی‌شده دارند. ابزارهای callable خود افزونه Debug در این نشست موجود نبودند؛ از ابزارهای shell، Node، PowerShell و مهارت‌های محلی Debug استفاده شد.

برای پذیرش کامل، یک staging ایزوله با پایگاه‌داده جدا، سازمان و کاربر عادی لازم است. فقط در همان staging، پس از مجوز صریح آزمون تصویر مصنوعی، گیت‌های خصوصی RULA برای ArvanCloud تنظیم شوند؛ سپس endpoint احراز‌شده، ذخیره، بازخوانی و گزارش آزمون شود. تا آن زمان انتشار backend انجام نشود.

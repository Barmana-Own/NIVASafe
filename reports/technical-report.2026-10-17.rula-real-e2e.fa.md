# گزارش فنی جریان احراز‌شده RULA

| مشخصه | مقدار |
|---|---|
| پروژه | NIVASafe |
| تاریخ شمسی | ۲۵ مهر ۱۴۰۵ |
| تاریخ میلادی | 2026-10-17 |
| وضعیت | staging موفق؛ انتشار زنده انجام نشد |

## پیاده‌سازی و علت‌ها

کاندیدای محدود، انتخاب‌گر RULA را از failover قدیمی به provider تنظیم‌شده ArvanCloud و مدل `GPT-5-Mini` تغییر می‌دهد. درخواست GPT-5 به ArvanCloud `reasoning_effort` نمی‌فرستد و از `max_completion_tokens` و `response_format: json_object` استفاده می‌کند. gateway در تست واقعی `gpt-5-mini-2025-08-07` را برگرداند. متن خام 400 قبلی نگهداری نشده است؛ متن دقیق خطا گزارش نمی‌شود. timeout تصویر از ۴۵ به حداکثر ۶۰ ثانیه افزایش یافت. GET جزئیات RULA نیز `postureReviewComplete` را محاسبه می‌کند تا وضعیت بازبینی پس از reload باقی بماند.

مقایسه candidate با release فعال فقط دو فایل source متفاوت داشت: `backend/src/ai-provider.ts` و `backend/src/modules/assessments.ts`. فایل‌های runtime کاندیدا ساخته شدند، اما deploy نشدند. خروجی `modules/support.js` به‌علت تفاوت خروجی transpile با وجود source یکسان، از محدوده انتشار کنار گذاشته شد.

## شواهد و محدودیت‌ها

- اجرای کامل source در staging از API احراز‌شده عضو عادی به provider واقعی و MariaDB جداگانه رسید؛ چهار درخواست تصویری نهایی HTTP 200 بودند.
- RIGHT/LEFT/BOTH هرکدام ذخیره شدند؛ کاربر بعد از ورود مجدد جزئیات را خواند؛ گزارش JSON و PDF برای هر سه موجود بود. هر امتیاز ۴ و وضعیت `IN_PROGRESS` بود. `postureReviewComplete=true` پس از مرحله بازبینی ذخیره شد.
- تست‌های منفی: 401 بدون احراز هویت، 401 tenant دیگر، 403 Viewer، 403 نبود consent، و 415 امضای نامعتبر.
- scoreها پیشنهاد AI هستند؛ بازبینی این تست، اعتبارسنجی تخصصی ارگونومی نیست.
- جریان مرورگر واقعی، رابط UI، Safari و اجرای API E2E روی خود candidate انجام نشد.

## runtime و انتشار

Scheduled Task `NIVASafe-API` با principal برابر SYSTEM، PM2 را برای backend اجرا می‌کند. process فعال از release `release-20261015-project-source-update`، PID 14048، نسخه API `0.1.0`، و bind محلی 5044 بود. Health محلی و عمومی HTTP 200 بود. پیکربندی runtime دو دروازه `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` و `RULA_IMAGE_VISION_SUPPORTED_PROVIDER` را خالی دارد؛ هیچ‌یک تغییر نکرد.

از زمینه runtime فعال، DNS، TCP پورت 443 و TLS 1.3 موفق بودند. catalog واقعی ArvanCloud با HTTP 200 و ۹۰ مدل، GPT-5-Mini را فهرست کرد؛ درخواست متنی مستقیم HTTP 200 و پاسخ `gpt-5-mini-2025-08-07` داشت. probe مستقیم تصویر مصنوعی HTTP 200 و هفت فیلد بدنی گزارش کرد. این probeها مسیر authenticated RULA، دروازه consent یا ذخیره‌سازی را جایگزین نمی‌کنند. مدل چت `DeepSeek-V4-Flash` در catalog نبود؛ تنظیم چت تغییر نکرد و چت تست نشد.

ساخت TypeScript کاندیدا با exit code 0 انجام شد. اجرای E2E دقیق candidate به‌دلیل نبود Prisma client قابل اجرا نبود. تلاش پیشین برای `prisma generate` در مسیر dependency junction شده به release فعال EPERM داد؛ بررسی خودکار retry یا دور زدن آن را مسدود کرد. build، فایل‌های production، service و DB زنده تغییر نکردند. چون deploy انجام نشد، backup/rollback زنده ایجاد یا تمرین نشد.

SHA-256 فایل‌های runtime: active `dist/ai-provider.js`=`8784D5C1124B8E727ED33E73E546DA92A0C91243671C89EE521EC67744206FCF` و candidate=`15832B4CB5932E6EB0A9C0E84E7BB309C46FE7854286B31A2C2FC4098E5E667B`; active `dist/modules/assessments.js`=`F5F8CD21B7C03BCDCBC4A1ABF90F45D042646B308E47C25496AF9F73B1F59ABD` و candidate=`58F17A84B7896D25E01EDE71C6F15E33D183CE45E1EE8F4474C52945AF3EB131`. کاندیدا منتشر نشده است؛ hashهای candidate صرفاً شناسه artifact staging هستند.

محدودیت دیگر: catalog واقعی gateway مدل ریسک GPT-5-Mini را داشت ولی `DeepSeek-V4-Flash` را نداشت. تنظیم مدل چت در این کار تغییر نکرد و چت واقعی تست نشد.

شواهد: `reports/evidence/rula-real-e2e-20261017/authenticated-rula-e2e-summary.json`؛ جزئیات تست‌ها در [گزارش انگلیسی](RULA-REAL-E2E-AND-RELEASE.en.md) آمده است.


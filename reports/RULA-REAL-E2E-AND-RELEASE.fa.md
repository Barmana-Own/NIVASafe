# گزارش جریان واقعی تحلیل تصویر RULA و وضعیت انتشار

| مشخصه | مقدار |
|---|---|
| پروژه | NIVASafe |
| تاریخ شمسی | ۲۵ مهر ۱۴۰۵ |
| تاریخ میلادی | 2026-10-17 |
| نتیجه | **تست سرتاسری در staging موفق؛ انتشار زنده انجام نشد** |

## خلاصه

جریان واقعی RULA با کاربر عادی احراز‌شده، تصویر مصنوعیِ بدون هویت، سرویس واقعی ArvanCloud و پایگاه MariaDB جداگانه در staging با موفقیت اجرا شد. تحلیل‌های RIGHT، LEFT و BOTH دریافت، دستی بازبینی، ذخیره، در نشست تازه دوباره بارگذاری و به گزارش JSON و PDF تبدیل شدند. این نتیجه، **تأیید محیط زنده نیست**: نسخه فعال هنوز انتشار قبلی است و مجوزهای پردازش تصویر در تنظیمات runtime خالی و fail-closed هستند.

## علت‌ها و اصلاح‌های تأییدشده

- مسیر قدیمی RULA در build فعال از failover مدل‌های قدیمی استفاده می‌کند و همان تنظیم مدل عمومی را مستقیم به تحلیل تصویر نمی‌رساند. نام مدل محیط به‌تنهایی مدل مؤثر RULA را تضمین نمی‌کند.
- در کاندیدای محدود، انتخاب‌گر RULA به ArvanCloud تنظیم‌شده و `GPT-5-Mini` وصل شده است؛ برای تصاویر fallback یا تلاش مجدد خودکار به مدل دیگری انجام نمی‌شود.
- در checkpoint قبلی، HTTP 400 به پارامتر `reasoning_effort` نسبت داده شد؛ بدنه خام آن خطا در شواهد موجود نیست و این نسبت در این اجرا مستقلاً بازتولید نشد. کاندیدا این پارامتر را حذف و `max_completion_tokens` و JSON mode را ارسال می‌کند؛ چهار درخواست تصویر احراز‌شده در staging با این قالب HTTP 200 شدند و gateway مدل `gpt-5-mini-2025-08-07` را برگرداند.
- یک درخواست پیشین در timeout چهل‌وپنج‌ثانیه‌ای در ۴۵٬۰۱۱ میلی‌ثانیه متوقف شده بود. timeout درخواست تصویر در کاندیدا به ۶۰ ثانیه محدود افزایش یافته است.
- پاسخ GET جزئیات RULA اکنون `postureReviewComplete` را برمی‌گرداند تا وضعیت بازبینی پس از بارگذاری مجدد از دست نرود.

فایل‌های source در کاندیدا: `backend/src/ai-provider.ts` و `backend/src/modules/assessments.ts`. تست‌های موجود در worktree شامل `backend/src/ai-provider.test.ts` و `backend/src/rula-registered-member.test.ts` هستند. این worktree تغییرات پیشین زیادی دارد؛ فقط تفاوت دو فایل candidate با release فعال به‌عنوان محدوده کاندیدا تأیید شد.

## شواهد staging

| مورد | نتیجه واقعی |
|---|---|
| احراز هویت و نقش | ورود عضو عادی سازمان موفق؛ JWT، عضویت و مجوز سرور حفظ شدند |
| gateway/model | ArvanCloud؛ درخواست `GPT-5-Mini`؛ پاسخ واقعی `gpt-5-mini-2025-08-07`؛ چهار درخواست تصویری در اجرای نهایی، همگی HTTP 200 |
| تصویر | PNG مصنوعی ۲۳٬۰۶۳ بایتی؛ consent موجود؛ هر درخواست تصویر به gateway ارسال شد |
| تحلیل RIGHT / LEFT / BOTH | پاسخ ساختاریافته؛ در هر سمت ۷ فیلد ناحیه بدنی، ۵ مورد تشخیص‌داده‌شده و ۲ مورد نیازمند بازبینی انسانی؛ BOTH خروجی LEFT و RIGHT را جدا نگه داشت |
| امتیاز و ذخیره | امتیاز هر سه ارزیابی ۴؛ رکوردها در MariaDB جداگانه ذخیره شدند؛ هرکدام یک پیوست تصویر، نسخه ۳ و وضعیت بازبینی‌شده داشتند |
| بازخوانی و گزارش | نشست تازه و بارگذاری مجدد موفق؛ گزارش JSON موجود؛ PDF هر سه ارزیابی HTTP 200 |
| کنترل‌های منفی | بدون ورود 401؛ tenant دیگر 401؛ نقش Viewer برابر 403؛ نبود رضایت تصویر 403؛ امضای فایل نامعتبر 415 |

امتیازها خروجی پیشنهادی AI هستند و اعتبارسنجی حرفه‌ای ارگونومی یا تأیید متخصص محسوب نمی‌شوند. ردیف‌های مبهم همچنان برای بازبینی انسانی علامت‌گذاری شدند. وضعیت ارزیابی‌ها پس از ذخیره `IN_PROGRESS` باقی ماند؛ هیچ ارزیابی به‌صورت خودکار نهایی یا تأییدشده نشد.

یک fixture مصنوعی در انتخاب‌های RIGHT/LEFT/BOTH استفاده شد؛ تفکیک چند عکس متفاوت در یک ارزیابی تست نشد. اجرای browser/UI و Safari، تصویر بیش‌ازحد بزرگ، duplicate submit و خطای واقعی provider پس از تغییر timeout هم در این pass اجرا نشدند.

شواهد خلاصه و پاک‌سازی‌شده: [authenticated-rula-e2e-summary.json](evidence/rula-real-e2e-20261017/authenticated-rula-e2e-summary.json). شواهد تفصیلی اجرای staging در `C:\NIVASafe\.local\rula-authenticated-e2e-20261017-01\evidence\authenticated-rula-e2e.json` نگهداری شده است؛ شناسه‌ها و اطلاعات ورود در این گزارش درج نشده‌اند.

## وضعیت نسخه زنده

- سرویس فعال: Scheduled Task `NIVASafe-API` با اجرای PM2؛ backend با Node.js از `C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js` اجرا می‌شود. health محلی و عمومی HTTP 200 و نسخه API برابر `0.1.0` بود.
- از همان زمینه runtime، DNS، TCP/443 و TLS 1.3 موفق بودند؛ catalog واقعی ArvanCloud با HTTP 200 شامل ۹۰ مدل بود و `GPT-5-Mini` را داشت. درخواست متنی مستقیم HTTP 200 و مدل `gpt-5-mini-2025-08-07` داد. probe مستقیم تصویر مصنوعی نیز HTTP 200 و ۷ فیلد بدنی برگرداند؛ این probeها جریان کاربر احراز‌شده، دروازه رضایت یا ذخیره‌سازی RULA نبودند.
- مدل چت `DeepSeek-V4-Flash` در catalog فعلی gateway یافت نشد. تنظیم چت تغییر نکرد و آزمون واقعی چت انجام نشد.
- کاندیدا فقط دو فایل source را نسبت به release فعال تغییر می‌دهد: `backend/src/ai-provider.ts` و `backend/src/modules/assessments.ts`. فایل‌های JS کاندیدا ساخته شدند اما منتشر نشدند.
- در تنظیمات runtime، `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` و `RULA_IMAGE_VISION_SUPPORTED_PROVIDER` خالی‌اند. این دروازه‌ها عمداً تغییر نکردند. آزمایش مستقیم provider با HTTP 200، جایگزین مجوزهای برنامه یا جریان کاربر احراز‌شده نیست.
- آزمون API کاندیدای دقیق اجرا نشد: Prisma client تولیدشده در کاندیدا وجود نداشت. تلاش قبلی برای تولید، به‌دلیل junction وابستگی‌ها به مسیر release فعال با EPERM روی فایل engine برخورد کرد؛ بررسی خودکار ادامه یا دور زدن آن مسیر را نپذیرفت. از مسیر جایگزین برای دست‌کاری وابستگی زنده استفاده نشد.
- در تست تفصیلی staging، سه رکورد `persist-reload-report-*` مقدار `IN_PROGRESS` دارند چون این مقدار lifecycle ارزیابی است؛ فیلدهای مستقل `databaseRowPersisted`, `reportJsonLoaded` و PDF 200 تأیید شده‌اند. هویت Windows فرایند staging در evidence ذخیره نشده؛ تطابق هویت staging با سرویس زنده تأیید نشده است.
- هیچ فایل release زنده، سرویس، متغیر runtime یا پایگاه داده تولید تغییر نکرد؛ migration اجرا نشد. چون انتشار انجام نشد، backup/rollback جدید production ساخته یا تمرین نشد.

## اعتبارسنجی

- تست‌های متمرکز backend: ۷۹ از ۷۹ موفق در ۵ فایل؛ exit code 0؛ جزئیات در `C:\NIVASafe\.local\rula-authenticated-e2e-20261017-01\validation-timeout-fix\focused-validation.log`.
- لاگ suite متمرکز، خط فرمان اجرا را ثبت نکرده است؛ تعداد تست‌ها، فایل‌ها و exit code از خروجی ذخیره‌شده خوانده شد.
- تست‌های یک‌باره adapter کاندیدا: ۲ موفق و ۴۱ مورد خارج از فیلتر؛ exit code 0. harness موقت پس از اجرا پاک شد؛ تست‌های regression ماندگار در `backend/src/ai-provider.test.ts` هستند.
- build محدود TypeScript برای release candidate: exit code 0؛ فایل لاگ `C:\NIVASafe\.local\release-candidate-rula-20261017\backend\validation-final-build.log`.
- تلاش نخست build بدون دسترسی elevation، exit code 2 داد چون dependency لینک‌شده قابل resolve نبود؛ اجرای بعدی بدون تغییر dependency و با خروجی فقط در `.local` exit code 0 داد.
- API E2E خود کاندیدا: اجرا نشد؛ browser UI و Safari: اجرا نشدند.
- ابزار callable واقعی پلاگین Debug در این نشست موجود نبود؛ گردش تشخیص و TDD از skillهای محلی استفاده کرد.

## اقدام لازم برای انتشار

۱. تأیید صریح سیاست/رضایت برای پردازش تصویر مصنوعی RULA در ArvanCloud و تنظیم مجاز کلیدهای `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` و `RULA_IMAGE_VISION_SUPPORTED_PROVIDER` روی `arvancloud` در runtime تست. ۲. اجرای کاندیدا در staging کاملاً جدا با Prisma client تولیدشده از schema همان کاندیدا، بدون junction به `ProgramData`. پس از آن، آزمون API کاندیدا و پذیرش زنده باید پیش از انتشار انجام شود.


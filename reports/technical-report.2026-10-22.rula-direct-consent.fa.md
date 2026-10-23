# تحویل فنی رضایت مستقیم پردازش تصویر NIVASafe

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Technical |
| Language | فارسی |
| Gregorian | 2026-10-22 |
| Jalali | 1405-07-30 |
| Release | release-rula-direct-consent-20261022-01 |
| Base Git revision | 7f633f0ed1ef7c73a7c370e62b7efdfc2308fbc1 |
| Delivery | SAFE CODE DEPLOYED; PUBLIC IMAGE ACTIVATION BLOCKED |

## محدوده و مبنا

React/Vite، بک‌اند ماژولار Fastify، Prisma/MySQL، فضای فایل خصوصی و انتشار PM2/IIS حفظ شدند. مخزن کاری از قبل تغییرات نامرتبط و ثبت‌نشده داشت. نسخهٔ جداگانه بر پایهٔ بک‌اند منتشرشدهٔ۲۱ و فرانت‌اند۲۲ ساخته شد؛ تغییرات نامرتبط FMEA/R8/استایل منتشر نشدند. بازبینی مبنای Git بالا ثبت شده است؛ این کار ادعای Push یا تمیزبودن کل مخزن ندارد.

## پیاده‌سازی

- نسخهٔ رضایت تصویر image-processing-account-2026-10-22-v2 است. قوانین عمومی مستقل و با نسخهٔ nivasafe-terms-2026-10-19-v1 باقی ماندند. ثبت‌نام ACCEPTED/DECLINED و تنظیمات ACCEPTED/WITHDRAWN ثبت می‌کنند. قفل تراکنش سطر کاربر و زمان افزایشی، تغییرات را مرتب می‌کنند. نسخه/ارائه‌دهنده/هدف و رسید جاری بررسی می‌شوند.
- تنظیمات حریم خصوصیِ حساب فعال پس از تغییر دسترسی سازمان هم قابل دسترس است و دسترسی به دادهٔ سازمان ایجاد نمی‌کند. هویت، نقش، سازمان، اشتراک و سهمیهٔ هوش مصنوعی معتبر باقی ماندند.
- مجوز صاحب تصویر با حساب احرازشده، عضویت فعال هم‌سازمانی، گیرندهٔ مجاز، اعتبار۱تا۹۰روز، رویداد لغو تغییرناپذیر و رسید اولیهٔ رضایت صاحب تصویر در AuditLog ثبت می‌شود. پذیرش دوباره، مجوز قدیمی را زنده نمی‌کند. احراز هویت زیستی ادعا نشده است.
- هر ارسال، از جمله تکرار پاسخ ساختاری نامعتبر، هویت/مجوز/سهمیه/رضایت/صاحب تصویر/وضعیت پلتفرم را دوباره بررسی می‌کند. پس از Audit اجباریِ ارسال، بررسی تازه پیش از HTTP انجام می‌شود. Hook داخلی اجباری و Redirect ممنوع است. نشانی ثابت با Bearer آزموده‌شده و مدل درخواستی GPT-5-Mini استفاده می‌شود؛ کلید فقط در بک‌اند است. مهلت پیش‌فرض شبکه۶۰ثانیه و یک تلاش انتقال است؛ پاسخ ساختاری نامعتبر حداکثر یک تلاش دیگر با بررسی مجدد دارد.
- محدودیت۱۰مگابایت، MIME، امضا و نرمال‌سازی حفظ شدند. پاسخ مدل سخت‌گیرانه اعتبارسنجی می‌شود. AIAnalysisRequest موجود، نتیجهٔ RULA_POSTURE_IMAGE را پیش از موفقیت با کاربر/سازمان دقیق، هش تصویر، مدل/زمان و ارجاع رسید ذخیره می‌کند؛ خود عکس و متن کامل Prompt ذخیرهٔ متادیتای نتیجه نیستند. خطای ذخیره ایمن و غیرقابل تکرار خودکار است؛ شکست Audit تکمیلی، نتیجهٔ پرداخت‌شدهٔ ذخیره‌شده را حذف نمی‌کند. Audit اجباریِ پیش از ارسال همچنان بسته می‌ماند.
- نوع نتیجهٔ خصوصی در ایجاد/فهرست/دریافت/تلاش مجدد AI عمومی و کار جعلی صف مجاز نیست. پیش‌نویس، پیوست، دانلود خصوصی، PDF و بازبینی انسانی حفظ شدند. تغییر Schema یا Migration در Production لازم نشد.
- صف تصویر به متن شغل/فعالیت وابسته نیست و با تغییر مرحله قطع نمی‌شود. صاحب تصویر و کاربر/سازمان در هویت Context/Cache حضور دارند. رابط رضایت و مجوز فارسی/انگلیسی و ریسپانسیو است؛ CSS عمومی فعال با افزونهٔ محدود جداگانه حفظ شد.

## مسیرها

[قرارداد API](../docs/rula-direct-consent-2026-10-22/06-api-contract.md) مسیرها را مشخص می‌کند: /register، /profile#image-processing-consent، /rula، /api/v1/profile/image-processing-consent، /api/v1/profile/posture-image-authorizations، /api/v1/rula/image-analysis-policy، POST/GET /api/v1/rula/posture-image-analysis و /api/v1/reports/rula/:id.pdf. Handler تحلیل پیاده و آزموده شده است؛ انتقال عمومی واقعی با پیش‌نیاز تأییدنشدهٔ ارائه‌دهنده بسته است.

## راستی‌آزمایی اجراشده

| بررسی | نتیجه |
|---|---|
| تست‌های سرور | PASS — 715؛ صفر شکست و صفر ردشده |
| تست‌های فرانت‌اند | PASS — 471؛ صفر شکست و صفر ردشده |
| Typecheck/Lint/Build | PASS — هر دو برنامه |
| ماتریس HTTP و دیتابیس با بازپخش مصنوعی | PASS — ۲۷ بررسی، ۹۶ درخواست، ۴ تحلیل بازپخش و ۳ PDF |
| درخواست واقعی BOTH با تصویر مصنوعی | PASS — یک درخواست تازه، حدود ۲۳ ثانیه، ذخیره/بازیابی نتیجه و PDF با ۵۰٬۴۹۱ بایت |
| بررسی مرورگر | PASS — ۳ مورد شروع خودکار، ۸ مورد رضایت در محیط جدا و ۶ مورد دارایی‌های منتشرشده |
| بازبینی امنیتی محدود به تغییر | PASS پس از رفع Redirect؛ ایراد مادیِ حل‌نشدهٔ ناشی از تغییر شناسایی نشد |
| بسته، بازگشت old/new/old و انتشار عمومی کد | PASS — ۶ مسیر HTML، ۲۱ دارایی ثابت و مرزهای401 API |
| ارسال عمومی عکس واقعی کاربران | BLOCKED — شرایط واقعی پردازش درگاه احراز نشده است |
| دقت آناتومیک مستقل | NOT_VERIFIED — نتیجهٔ مقدماتی و بازبینی انسانی حفظ شده‌اند |
| اسکن جدید کل وابستگی‌ها / نفوذ بیرونی | NOT_RUN — نسخهٔ وابستگی‌ها ثابت؛ بازبینی محدود بوده است |

فرمان‌ها و کد خروج دقیق در [stage09-validation.json](evidence/rula-direct-consent-20261022-01/stage09-validation.json) است. تست واحد دیتابیس غیرقابل دسترس و HTTP بدون Mock را مسدود می‌کند؛ تست یکپارچه از چهار Schema مخصوص همین کار روی53306 استفاده کرد. تعداد کاربر/نشست/سازمان/عضویت فعال و رزرو سهمیهٔ این Fixtureها صفر است. پردازش دیتابیس آزمایشیِ همین کار متوقف و سلامت دیتابیس Production برقرار است.

شاهد تازهٔ API واقعی در [result.json](evidence/rula-direct-consent-20261022-01/stage09-live-3f5d08935159/result.json) است: مدل مؤثر مجاز gpt-5-mini-2025-08-07، یک درخواست/حدود ۲۳ ثانیه، شش بررسی، BOTH اعتبارسنجی‌شده و PDF با ۵۰٬۴۹۱ بایت. مصرف تجمعی۵از۶ شامل چهار درخواست قبلی است. شواهد واقعی قبلی RIGHT/LEFT/BOTH حفظ شده‌اند؛ ماتریس جدید۲۷بررسی/۹۶درخواست صریحاً REPLAY است. وضعیت بازبینی انسانی حفظ و تأیید نهاییِ نتیجهٔ بازبینی‌نشده رد می‌شود.

## خطاها، اصلاح و امنیت

بازبینی مستقل یک ریسک Medium در Redirect پیش‌فرضِ گیرنده پیدا کرد؛ با redirect:error و تست رفع شد.۲۵فایل بررسی و ایراد مادیِ حل‌نشدهٔ ناشی از تغییر شناسایی نشد. وابستگی‌ها تغییر نکردند؛ اسکن جدید کل وابستگی‌ها و نفوذ بیرونی NOT_RUN هستند.

Mock اولیهٔ تست مجوز، اتصال اصلی Prisma در core.audit را نگه داشته بود؛ درج مصنوعی به‌علت نبود کاربر مصنوعی با P2003 رد شد. درج موفقی مشاهده نشد. Mock صریح، جایگزینی دیتابیس غیرقابل دسترس، فهرست مجاز DSN آزمایشی، مسدودسازی HTTP بدون Mock و محدودکردن کشف تست به سورس از تکرار جلوگیری می‌کنند؛ [رویداد](evidence/rula-direct-consent-20261022-01/stage04-test-isolation-incident.json). شواهد شکست‌های دیگر حفظ شدند: زمینهٔ ناقص تست در کاندیدای Frozen، Escape خروجی CLI، نام ناقص Fixture، دقت اعشاری هندسه در JSON و Import ناموجود dotenv در Harness. Fixture/Harness اصلاح شدند و Assert محصول تضعیف نشد.

## انتشار، بازگشت و حفظ پروژه

نسخهٔ API برابرrelease-rula-direct-consent-20261022-01 و PID 2524 است؛ Index فرانت‌اند7fb9bd8731715243e0f3c688d1b725d361797285524eb6720930c6bda2994277 و فایل اصلی index-DSt9SKZk.js است. هش CSS عمومی ab6f25e515e4d805b7274cf069f70810f67053612071fe370448ccb6df80f7d0 ثابت است؛ افزونهٔ محدود3ff846b13ecd90e9ef49f65211f7a5f60b14c8a02d2287f5f21d8638a65031ca فقط Selectorهای مجاز رضایت/صاحب تصویر را اضافه می‌کند.۲۱دارایی منتشرشده با بایت HTTPS منطبق‌اند. دارایی‌های قبلی حفظ شدند؛ مسیر/سورس/Schema/نقش حذف نشده است.۱۵ماژول اجرایی تغییر کردند؛ فایل‌های تست کامپایل‌شده و سورس تست در مسیر خصوصی و خارج از Graph اجرای Production حفظ و Runner ایزوله نیز کپی شد.

بازگشت واقعی بستهٔ old/new/old با دیتابیس جدا و AI خاموش موفق بود. نسخهٔ قبلی تغییر نکرده است. تنظیمات/Index و وضعیت Manager بازگشت در C:/ProgramData/NIVASafe/backups/release-rula-direct-consent-20261022-01 با ACL محدود SYSTEM/Administrators نگهداری می‌شوند. .env Production بایت‌به‌بایت ثابت، مجوز حریم خصوصی ارائه‌دهنده خالی و قابلیت Vision تأییدشده باقی است. وضعیت PM2 ذخیره شد. تست‌ها دادهٔ واقعی کاربر/عکس/ارزیابی را ارسال، مهاجرت یا بازنویسی نکردند.

بازیابی: تنظیمات Ecosystem و Index پشتیبان اتمی بازگردند؛ فقط nivasafe-api با تنظیمات اصلیِ حفاظت‌شده راه‌اندازی و سلامت نسخهٔ قبلی و هش‌ها بررسی شوند. حذف دارایی‌های ثابت لازم نیست. محیط بازگشت چاپ نشود و تا احراز شرایط واقعی، Flag ارائه‌دهنده فعال نشود.

## فایل‌های تغییرکرده

| File | Change |
|---|---|
| `backend/src/ai-analysis-types.ts` | ADDED |
| `backend/src/ai-provider.test.ts` | MODIFIED |
| `backend/src/ai-provider.ts` | MODIFIED |
| `backend/src/ai-request-routing.test.ts` | MODIFIED |
| `backend/src/assessment-routing-policy.test.ts` | MODIFIED |
| `backend/src/auth-guard.ts` | MODIFIED |
| `backend/src/image-processing-consent.test.ts` | MODIFIED |
| `backend/src/image-processing-consent.ts` | MODIFIED |
| `backend/src/modules/ai.ts` | MODIFIED |
| `backend/src/modules/assessments.ts` | MODIFIED |
| `backend/src/modules/auth.ts` | MODIFIED |
| `backend/src/modules/image-processing-consent.ts` | MODIFIED |
| `backend/src/modules/posture-image-authorizations.ts` | ADDED |
| `backend/src/posture-image-authorizations.test.ts` | ADDED |
| `backend/src/posture-image-authorizations.ts` | ADDED |
| `backend/src/registration-security.test.ts` | MODIFIED |
| `backend/src/rula-image-consent.ts` | MODIFIED |
| `backend/src/rula-image-result-repository.test.ts` | ADDED |
| `backend/src/rula-image-result-repository.ts` | ADDED |
| `backend/src/rula-image-results.test.ts` | ADDED |
| `backend/src/rula-image-results.ts` | ADDED |
| `backend/src/rula-posture-image-request.test.ts` | MODIFIED |
| `backend/src/rula-posture-image-request.ts` | MODIFIED |
| `backend/src/rula-registered-member.test.ts` | MODIFIED |
| `backend/src/rula-three-stage.test.ts` | MODIFIED |
| `backend/src/worker-image-result.test.ts` | ADDED |
| `backend/src/worker.ts` | MODIFIED |
| `frontend/src/features/account/ImageProcessingConsent.test.tsx` | MODIFIED |
| `frontend/src/features/account/ImageProcessingConsent.tsx` | MODIFIED |
| `frontend/src/features/account/imageProcessingPolicy.ts` | MODIFIED |
| `frontend/src/features/account/posture-image-authorizations.css` | ADDED |
| `frontend/src/features/account/postureImageAuthorization.ts` | ADDED |
| `frontend/src/features/account/PostureImageAuthorizations.test.tsx` | ADDED |
| `frontend/src/features/account/PostureImageAuthorizations.tsx` | ADDED |
| `frontend/src/features/assessments/AssessmentPages.tsx` | MODIFIED |
| `frontend/src/features/assessments/rulaAnalysisQueue.ts` | MODIFIED |
| `frontend/src/features/assessments/rulaAutomaticContext.test.ts` | MODIFIED |
| `frontend/src/features/assessments/rulaImageAnalysisPolicy.test.ts` | MODIFIED |
| `frontend/src/features/assessments/rulaImageAnalysisPolicy.ts` | MODIFIED |
| `frontend/src/features/assessments/RulaImageConsentDialog.test.tsx` | MODIFIED |
| `frontend/src/features/assessments/RulaImageSubjectSelector.test.tsx` | ADDED |
| `frontend/src/features/assessments/RulaImageSubjectSelector.tsx` | ADDED |
| `frontend/src/styles/account-consent.css` | MODIFIED |

تغییرات دیگر: فقط اسکریپت تست backend/package.json، فایل backend/vitest.config.ts، سه فایل backend/test/database-isolation.ts و database-isolation.test.ts و setup.ts، و فقط مسیر API/نسخه در deployment/ecosystem.config.cjs. مستندات ویژگی/شرایط، شواهد انتشار، گزارش‌ها و State نیز اضافه شده‌اند. هش دقیق سورس آزموده‌شده در [final-source-inventory.json](evidence/rula-direct-consent-20261022-01/final-source-inventory.json) است. نسخهٔ وابستگی‌ها، پژوهش FMEA/Parser و Schema حفظ شدند.

## مراحل و مانع واقعی

| مرحله | وضعیت |
|---|---|
| 01 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 02 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 03 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 04 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 05 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 06 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 07 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 08 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 09 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 10 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 11 | PASS در محدودهٔ پیاده‌سازی/راستی‌آزمایی؛ مرحلهٔ ۱۱ انتشار کد ایمن است |
| 12 | بازبینی کد/بسته/دارایی منتشرشده PASS؛ فعال‌سازی عمومی به پیش‌نیاز واقعی بیرونی BLOCKED است |

فعال‌سازی کامل عمومی Production برابر BLOCKED است و PASS نیست. [مدارک لازم](../docs/legal/rula-provider-required-evidence.2026-10-22.md)، قرارداد/طرف واقعی و شرایط نگهداری/حذف/آموزش/گیرنده/محل و سیاست نگهداری/پشتیبان NIVASafe را مشخص می‌کند. امضای مدیریتی برای هر کاربر/سازمان اضافه نشده است. کد فعلی با دروازهٔ بسته ایمن منتشر می‌شود؛ فعال‌سازی به شرایط واقعی، اطلاع‌رسانی دقیق/رضایت جاری و بررسی کنترل‌شده نیاز دارد. دقت آناتومیک مستقل تأیید نشده است.

## هماهنگی مستندات و الگوی تنظیمات

README به قرارداد جاری رضایت حساب و شواهد فعال‌سازی ارجاع می‌دهد. تغییر `.env.example` فقط توضیح تفاوت مجوز پردازش پلتفرم و قابلیت فنی Vision است؛ کلید یا مقدار تأیید وارد نشده است. راهنمای منسوخِ تأیید هنگام آپلود با مدل حساب جاری جایگزین و متن کامل قبلی در `docs/history/` حفظ شد.

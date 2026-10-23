# گردش تصویر RULA و انتشار کنترل‌شدهٔ کد — گزارش فنی

| پروژه | NIVASafe |
|---|---|
| Gregorian | 2026-10-19 |
| Jalali | 1405-07-27 |
| Release | release-rula-image-autoflow-20261019-01-r2 |
| Revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf (dirty tree preserved) |
| Status | DEPLOYED CODE ONLY / LIVE IMAGE DISABLED |

## یافته و اصلاح

خطاهای واقعی سایت در17:08:49 و17:08:53 پیش از ArvanCloud رخ داده‌اند: RULA_IMAGE_AI_UNAVAILABLE و privacy-approval-missing. هر دو تنظیم مؤثر تصویر RULA خالی بودند. این شواهد، خرابی کلید، HTTP401 یا فقدان entitlement را ثابت نمی‌کنند. کنترل‌های ارائه‌دهنده از قبل سراسری بودند؛ endpoint محافظت‌شده و preflight تایپ‌شده، وضعیت را بدون فهرست سازمانی روشن می‌کنند.

چک‌باکس بزرگ و بنر سراسری عمداً با رضایت در اقدام آگاهانهٔ انتخاب/ارسال و پنجرهٔ بازبینی کنار هر تصویر جایگزین شدند. رضایت ابتدا false است و از ثبت‌نام/نشست/پیش‌نویس بازسازی نمی‌شود. همان کامپوننت امتیازدهی/بازبینی منتقل شد؛ فیلدهای پنهان force/muscleUse مقدار فرم را هنگام بسته‌بودن حفظ می‌کنند. Escape/Tab پنجرهٔ داخلی، پنجرهٔ والد را نمی‌بندد. دادهٔ فعلی/تاریخی، منشأ اندازه‌گیری و بازبینی سمت‌های نامطمئن حفظ شدند.

یک timeout۶۰ثانیه‌ای و دو پاسخِ پایان‌یافته با محدودیت طول دیده شد. آزمون RED نشان داد سقف تک‌سمت۳۰۰۰/BOTH۵۰۰۰ بود؛ r2 سقف موجود۸۰۰۰ را با رزرو سهمیه درخواست می‌کند. فقط Staging از timeout پشتیبانی‌شدهٔ۱۲۰ثانیه استفاده کرد. مدل، reasoning_effort و قواعد امتیازدهی عوض نشدند. یک پاسخ ظاهراً کاملِ r2 نیز با IMAGE_ANALYSIS_INTERNAL_ERROR رد شد؛ علت دقیق UNKNOWN است. پس از آن RIGHT واقعی و BOTH مستقل مرورگری با ذخیره/PDF روی r2 پاس شدند. این شواهد یک مسیر واقعاً قابل اجرا را نشان می‌دهند، نه رفع قطعی همهٔ خطاهای متناوب.

## ماتریس پذیرش

| وضعیت | نتیجه | شواهد |
|---|---|---|
| کد/رابط/سیاست پلتفرم | PASS | آزمون‌های محدود به تغییر؛ بدون تنظیم سازمان‌به‌سازمان |
| گردش واقعی کاربر عادی روی r2 | PASS | RIGHT سازمان B؛ BOTH مستقل مرورگری سازمان A،۱۴ ویرایش دستی، ذخیره/ورود مجدد/گزارش/PDF |
| تمام سمت‌ها در هر دو سازمان روی r2 | PARTIAL | سقف درخواست مصرف شد؛ تک‌سمت‌های r1 شواهد تکمیلی‌اند |
| BOTH دستی/ذخیره/مرورگر دو سازمان روی r2 | PASS | API/MariaDB واقعی،fa۳۹۰/en۱۲۸۰، منع دسترسی تصویر/سازمان و بازگشت نسخه |
| تأیید دقت آناتومیک | تأیید نشده | یک تصویر مصنوعی دوشخصی؛ ادعای benchmark مستقل وجود ندارد |
| انتشار واقعی کد | DEPLOYED | PID/هش/شناسه و تطابق فایل/سلامت عمومی |
| قابلیت تصویر زنده | BLOCKED | کنترل‌ها بسته؛ مجوز واقعی پلتفرم تأیید نشده |

## فایل‌ها و پردازهٔ دقیق نسخه

- بک‌اند: C:\ProgramData\NIVASafe\releases\release-rula-image-autoflow-20261019-01-r2\backend\dist\server.js؛ PID2840؛ هویت NT AUTHORITY\SYSTEM. زنجیرهٔ اجرا: تسک Windows به نام NIVASafe-API، سپس run-pm2.cmd و PM2 با نام nivasafe-api.
- هش ماژول ارزیابی: 5babe27e22bf6b4c19816863a76752270da7f972570e35b732b0688d2667c604؛ هش ورودی: e7a26489e1dd96e1c7e9d8c25715c2691e4e6ba590347f088c37961b10be5cb0. فقط یک فایل از۱۳۲ فایل کامپایل‌شده عوض شد؛ wrapper ورودی عمداً همان هش قبلی را دارد.
- ریشهٔ وب: C:/inetpub/nivasafe/app-com؛ هش index: 9eecdbd112300ab9b02ea0c907644f1477ec6dda9bceab7fc7dd2ee9707c7d8b؛ فایل‌های ورودی جدید: /assets/index-ByY3fVok.js، /assets/index-DZYeO3D8.css. برابری بایت فایل عمومی و سلامت نسخه/DB تأیید شد.
- هش schema: eb872b071bc7807cf22b01932d1df3ec0fd854ca26da60a478e8347a1915fa33؛ نسخهٔ مستقر و candidate یکسان‌اند و۱۲۴ ستون تولید فقط‌خواندنی بررسی شدند. در MariaDB جداگانهٔ۵۳۳۰۶، dump صرفاً schema در DB خالی بازیابی و برابری ستون/نوع/nullability تأیید شد؛ این کار بازپخش پاک تاریخچهٔ migration نیست.
- datadir آزمایشی: 53306	C:/NIVASafe/.local/rula-authenticated-e2e-20261017-01/mariadb/data/. DB، uploads و JWT جدا بودند؛ DB تولید یا عکس کاربر/کارگر در آزمون استفاده نشد.

## فایل‌های برنامه که تغییر کردند

- frontend/src/components/useModalFocus.ts
- frontend/src/features/assessments/AssessmentPages.tsx
- frontend/src/i18n.tsx
- frontend/src/styles/assessments.css
- backend/src/modules/assessments.ts
- backend/src/rula-registered-member.test.ts
- frontend/src/features/assessments/rulaImageAnalysisPolicy.ts
- frontend/src/features/assessments/rulaImageAnalysisPolicy.test.ts
- frontend/src/features/assessments/RulaImageReviewDialog.tsx

سند docs/rula-image-platform-access.md، ابزارهای انتشار در scripts/releases/rula-image-autoflow-20261019-01، وضعیت پروژه، manifest انتشار، manifest حفظ قابلیت‌ها و گزارش‌ها نیز افزوده/به‌روز شدند. وابستگی، schema، migration تاریخی، جدول امتیازدهی، مدل AI، منطق FMEA یا پیاده‌سازی پشتیبانی/چت تغییر نکرد. آزمایشِ منتشرنشدهٔ allowlist سازمانی مطابق تصمیم جدید مالک کنار گذاشته شد؛ آزمون تاریخی حذف نشد.

## درخواست‌های واقعی ارائه‌دهنده

مسیر: https://api.arvancloudai.ir/v1/chat/completions. مدل درخواستی در همهٔ موارد GPT-5-Mini است؛ reasoning_effort وجود ندارد و fallback مدل/ارائه‌دهنده اجرا نشد. snapshot فقط در صورت واقعاً گزارش‌شدن و تأیید ثبت شده است. منشأ مصرف سایر مدل‌ها در حساب ArvanCloud UNKNOWN است، زیرا export مبتنی بر request ارائه نشد. مدل جلسهٔ Codex با مدل درخواست‌های برنامه متفاوت است.

| تلاش | نسخه | نوع | HTTP بالادست | مدل تأییدشده | پایان | ms | شناسهٔ امن |
|---|---|---|---|---|---|---|---|
| 1 | r1 | تصویر | 200 | gpt-5-mini-2025-08-07 | stop | 19242 | 13ed0f8631930de9bf4d3c251f6b7210 |
| 2 | r1 | تصویر | 200 | gpt-5-mini-2025-08-07 | stop | 43760 | b8c4f44dc9e36faeb22ea3446c1b8989 |
| 3 | r1 | تصویر | TIMEOUT | تأیید نشده | — | — | — |
| 4 | r1 | تصویر | 200 | gpt-5-mini-2025-08-07 | stop | 45442 | 6bc5d066dae3c25f1a125434c3ca170d |
| 5 | r1 | تصویر | 200 | gpt-5-mini-2025-08-07 | stop | 20684 | b5214b6c9ecba97cd818fc31ab50eedc |
| 6 | r1 | تصویر | 200 | تأیید نشده | length | 96329 | e44c7925ed3001f00659da634d475136 |
| 7 | r1 | تصویر | 200 | تأیید نشده | length | 113683 | edea61047abb280bc6942788304aa059 |
| 8 | r2 | تصویر | 200 | تأیید نشده | stop | 102084 | 9c03f976301cf19425c397bba76b45ba |
| 9 | r2 | تصویر | 200 | gpt-5-mini-2025-08-07 | stop | 14072 | 08ac3690bc808cf21dc9f58fe570ef54 |
| 10 | r2 | تصویر | 200 | gpt-5-mini-2025-08-07 | stop | 55185 | 777dbd43379b2ff53054870e058c19f7 |
| 11 | r2 | تصویر | 200 | gpt-5-mini-2025-08-07 | stop | 35962 | 82b287c5969458cd0df7b356c5dc904a |
| 12 | r2 | متن | 200 | gpt-5-mini-2025-08-07 | stop | 25084 | 52aee9f272736a89b9a5aabe55717daa |

تلاش‌های۱–۷ شواهد تکمیلی r1 هستند. تلاش۸ پاسخ ردشدهٔ r2 با stop و طول۴۲۸۴ است؛ مدل تأیید نشد و علت رد داخلی UNKNOWN مانده است. تلاش۹، RIGHT پذیرفته‌شدهٔ r2 در سازمان B است. تلاش‌های۱۰/۱۱، درخواست‌های مستقل RIGHT/LEFT مرورگر برای BOTH هستند؛۱۲، پیشنهاد متنی گزارش است. دقیقاً۱۲ تلاش واقعی، شامل شکست‌ها، ثبت شد؛ توقف محلی بودجه به‌عنوان HTTP429/503 بالادست معرفی نشده است.

فیلد حدسی calls[].side در final-both-browser.json برای multipart قابل اتکا نیست و هر دو را RIGHT نوشته است؛ کلیدهای واقعی پاسخ به‌ترتیب RIGHT و LEFT بودند و مقادیر ذخیره‌شدهٔ هر سمت جداگانه کنترل شدند. توضیح در evidence-notes.json ثبت و شواهد اولیه دست‌نخورده حفظ شده‌اند.

## اعتبارسنجی اجراشده

| بسته | فرمان | Exit |
|---|---|---|
| backend | corepack pnpm run test | 0 |
| backend | corepack pnpm run typecheck | 0 |
| backend | corepack pnpm run lint | 0 |
| backend | corepack pnpm run build | 0 |
| frontend | corepack pnpm run test | 0 |
| frontend | corepack pnpm run typecheck | 0 |
| frontend | corepack pnpm run lint | 0 |
| frontend | corepack pnpm run build | 0 |
| shared/domain | corepack pnpm run test | 0 |
| shared/domain | corepack pnpm run typecheck | 0 |
| shared/domain | corepack pnpm run lint | 0 |
| shared/domain | corepack pnpm run build | 0 |

۶۱۹ آزمون بک‌اند/۶۸ فایل،۴۰۳ آزمون فرانت‌اند/۵۸ فایل،۱۹ آزمون domain/۲ فایل؛ جمع۱۰۴۱ آزمون برنامه. شش آزمون مستقل node:test برای rollback نیز پاس شدند. pnpm نسخهٔ۱۰.۱۳.۱ استفاده شد؛ آزمون‌های متمرکز دوباره به جمع اضافه نشده‌اند. قرارداد۹۱ مسیر فرانت‌اند/۱۵۵ مسیر بک‌اند و۲۹ کنترل انتشار exit0 دارند. هشدار قبلی اندازهٔ chunk در Vite وجود داشت؛ build موفق بود. ورودی‌های فرانت‌اند/domain و index در بازسازی صرفاً بک‌اندِ r2 عوض نشدند؛ نتایج قبلی مربوط به همان ورودی‌های ثابت‌اند.

فرمان‌های ناموفق حفظ شدند: EPERM کش Corepack در اجرای محدود، سپس اجرای مجاز روی host؛ مسیر ESM اولیه در Windows؛ selector مبهم پروژهٔ آزمایشی؛ timeout اولیهٔ artifact قدیمی، سپس استفاده از کپی بازسازی‌شدهٔ تأییدشده و کنترل شناسهٔ واقعی health؛ و آزمون‌های RED سیاست/سقف خروجی پیش از اصلاح. خطاهای واقعی provider/E2E در staging-acceptance*.json و staging-failures.json باقی مانده‌اند و PASS معرفی نشده‌اند. برای حل آن‌ها reset/migration تولید یا تغییر ACL اجرا نشد.

## انتشار و بازیابی

پشتیبان: C:/ProgramData/NIVASafe/backups/release-rula-image-autoflow-20261019-01؛ بک‌اند۱۶۶۴۳ فایل/۷۸۳ لینک و فرانت‌اند۴۹۵ فایل. بازسازی و مقایسهٔ محتوا/هش تأیید شد؛ ACL اصلی تنظیمات محرمانه حفظ شد. تمرین تعویض و بازگشت static، مدیر PM2 مستقل با pipe جداگانه، و اجرای واقعی ترتیب قبلی/candidate/قبلی/candidate با داده‌های جدید RULA در DB جداگانه پاس شدند.

فرمان بازگشت، فقط در صورت مطابقت نسخهٔ فعال با anchorهای این انتشار:

```powershell
C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\rula-image-autoflow-20261019-01\release.mjs rollback
```

ابزار، تغییر نامرتبطِ بعدی در بک‌اند/فرانت‌اند/config/env را رد می‌کند؛ فقط کد، index و bootstrap config را بازمی‌گرداند و DB/uploads جدید را حفظ می‌کند. بازگشت زنده یا restore دیتابیس تولید اجرا نشد. انتشار با حالت صریح deploy-code-only انجام شد: کنترل‌های رابط/DB/rollback در حالت مجوز بسته اجباری‌اند و تنظیمات تصویر تولید حفظ می‌شوند؛ gate جداگانهٔ انتشار کامل vision برآورده نشده است. فقط API بازراه‌اندازی شد؛ worker، تنظیمات محرمانه و داده‌های کاربران حفظ شدند.

## امنیت، حفظ پروژه و پذیرش باقی‌مانده

GET سیاست به JWT/عضویت فعال، سازمان، اجازهٔ ایجاد، اشتراک و دسترسی/سهمیهٔ AI نیاز دارد و private/no-store است. POST همچنان رضایت، MIME/signature/size، رزرو سهمیه، محدودیت مدل/ارائه‌دهنده و بازبینی اجباری سرور را اعمال می‌کند. آزمون‌های منفی واقعی۴۰۱/۴۰۳/۴۱۵ و تست‌های درخواست دست‌کاری‌شدهٔ تأیید، حفظ شدند. عکس واقعی کارگر، پاسخ کامل ارائه‌دهنده، کلید، bearer، cookie، اطلاعات شناسایی حساب، مقصد خارجی تازه یا مدل pose دوم ثبت/منتشر نشد. وابستگی اضافه نشد؛ ممیزی کامل advisory وابستگی‌ها و penetration برای این تغییر محدود اجرا نشد.

بررسی عمومی فقط‌خواندنی: اطلاعیهٔ پردازش/ارائه‌دهنده/بازبینی در RULA۳۹۰ و۱۲۸۰؛ حذف checkbox/banner قبلی؛ دسترسی به نمای کلی، فهرست FMEA، دستیار، مدیریت و صندوق تیکت. خطای کنسول۰، بدون سرریز و بازگرداندن viewport. نوشتن کاربر عادی در سایت اصلی، تحلیل تصویر زنده و تولید PDF در تولید NOT_RUN هستند، زیرا مجوز ارسال تصویر برقرار نشده است. completion پولی تازهٔ FMEA/چت و Safari/WebKit نیز NOT_RUN هستند.

باقی‌مانده: تأیید قراردادی/حریم خصوصی واقعیِ پلتفرم؛ تنظیم یک‌بارهٔ gate مؤثر PM2 پس از تأیید، چون env خالی پردازه بر .env تقدم دارد؛ تکمیل RIGHT/LEFT/BOTH روی r2 در هر دو سازمان و آزمون پایداریِ محدود؛ پیگیری پاسخ‌های UNKNOWN با شناسهٔ امن در صورت تکرار. دقت آناتومیک و تأیید ارگونومی مستقل وجود ندارد و بهینه‌سازی آن متوقف است. HTTP موفق یا اصلاح دستیِ تصویر مصنوعی، اعتبار بالینی ایجاد نمی‌کند.

وضعیت هر دوازده مرحله در final-acceptance.json ثبت است: برای این انتشار محدود کد، gateها پاس شده‌اند؛ پذیرش گستردهٔ vision همچنان PARTIAL/BLOCKED است. ادعای تکمیل کل محصول وجود ندارد.

## جمع‌بندی اجرایی

کد منتشر شده است؛ فعال‌سازی عمومی تصویر انجام نشده است. مالک باید مجوز قراردادی/حریم خصوصیِ سطح پلتفرم را مستند کند؛ سپس تنظیمات مؤثر PM2 یک‌بار و بدون allowlist سازمانی فعال شوند. پیش از آن، ماتریس کامل دو سازمان و پایداری با بودجهٔ تازه تکمیل شود. خطاهای UNKNOWN با شناسه‌های امن جدول قابل پیگیری‌اند. حساب‌ها/تصاویر تولید دست‌کاری نشدند؛ تغییر schema یا migration اجرا نشد.

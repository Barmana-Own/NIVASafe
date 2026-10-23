# گزارش فنی اجرای نهایی RULA — NIVASafe

| فیلد | مقدار |
|---|---|
| پروژه | NIVASafe |
| تاریخ شمسی | ۱۴۰۵-۰۷-۲۶ |
| تاریخ میلادی | ۲۰۲۶-۱۰-۱۸ |
| محیط | source در C:\NIVASafe؛ کاندید ایزوله؛ بدون انتشار زنده |
| وضعیت | BLOCKED؛ درخواست تصویری نهایی HTTP 401 گرفت |

## محدوده و حفظ پروژه

شاخه/مخزن فعال C:\NIVASafe بررسی شد. شمار وضعیت Git در ابتدای این مرحله ۴۳۲ مورد بود؛ این وضعیت شامل تغییرات قبلی گسترده است. هیچ reset، clean، stash، migration زنده یا جایگزینی مخزن انجام نشد. کدهای تشخیصی provider فقط خطاهای allowlist شده را نگه می‌دارند؛ بدنه پاسخ، پیام provider، کلید و تصویر ذخیره نمی‌شوند. آزمون‌های تکراری یکسانی که در این نوبت اضافه شده بودند حذف و آزمون‌ها دوباره اجرا شدند.

Debug plugin ابزار callable در نشست نداشت. از PowerShell، Node.js، Vitest، TypeScript، Vite، Prisma و درخواست‌های HTTP محلی استفاده شد.

## محیط‌ها

| جزء | مسیر/شناسه | نتیجه |
|---|---|---|
| Source | C:\NIVASafe | حفظ شد؛ تغییرات قبلی پاک نشد |
| کاندید ایزوله | C:\NIVASafe\.local\rula-final-candidate-20261017-053748 | build و آزمون |
| API staging | 127.0.0.1:5153 | health HTTP 200 هنگام آزمون |
| UI staging | 127.0.0.1:5175 | ورود و درخواست رابط انجام شد؛ bundle served provenance به‌طور مستقل ثبت نشد |
| MariaDB staging | 127.0.0.1:53306، پایگاه nivasafe_rula_final_20261017 | جدا از پایگاه فعال |
| API فعال | 127.0.0.1:5044 | health HTTP 200؛ هویت باینری فعال به‌دلیل دسترسی محدود تأیید نشد |
| مدیر سرویس/هویت Windows برای API فعال | تأیید نشد | metadata فرایند و مسیر release در ProgramData قابل‌دسترسی نبود؛ توضیح PM2/task در گزارش قبلی به‌عنوان مدرک فعلی پذیرفته نشد |
| تنظیمات محافظت‌شده | backend/.env و مسیرهای runtime محافظت‌شده | خواندن از هویت جاری با EPERM/Access denied رد شد؛ محتوا نمایش داده یا تغییر داده نشد |
| وب‌سایت عمومی | https://app.nivasafe.com | TLS از این میزبان با خطای Schannel تأیید نشد؛ انتشار انجام نشد |

فرایندهای API و MariaDB staging خاتمه داده شدند. هنگام توقف proxy محلی، خطای ENOENT برای C:\NIVASafe\.local\frontend\dist\index.html ثبت شد؛ ازاین‌رو آزمون مرورگر کامل برای bundle دقیق کاندید PASS محسوب نمی‌شود. این خطا خارج از سایت زنده بود.

## RULA و provider

کاندید از endpoint زیر استفاده می‌کند:

- Provider: ArvanCloud
- Endpoint: https://api.arvancloudai.ir/v1/chat/completions
- مدل درخواستی ارزیابی/تصویر: GPT-5-Mini
- طرح درخواست حفظ‌شده: Authorization از نوع Bearer در adapter، عدم ارسال reasoning_effort برای تصویر، max_completion_tokens، JSON mode و timeout محدود.

یک عضو عادی سازمانی با نشست واقعی staging، رضایت ثبت‌شده در رابط و فایل synthetic PNG به حجم ۲۳٬۰۶۳ بایت مسیر POST /api/v1/rula/posture-image-analysis را اجرا کرد. audit شناسه 278fd697-c746-4f18-b205-a4d4449cce15 را ثبت کرد و upstreamStatus برابر 401 بود. درخواست متنی جداگانه برای پیشنهاد شرح وظیفه با شناسه ebb3f06a-9e19-467c-b977-d24cd292f273 موفق شد؛ status برابر 200 و provider برابر ArvanCloud بود. credential در runtime موجود است، اما موفقیت متن اثبات مجوز تصویر نیست.

متن بدنه خطای provider و request ID سمت provider در اجرای تصویر حفظ نشده بود. کد خطای provider هم خالی است. به‌دلیل نبود دسترسی به تنظیمات محافظت‌شده، catalog احراز هویت‌شده مدل‌ها نیز بررسی نشد. در نتیجه علت دقیق بین رد اعتبارنامه برای مسیر تصویری، مجوز مدل/vision یا سیاست حساب unresolved می‌ماند. در source تغییر تشخیصی محدود اضافه شده تا در اجرای آینده فقط کدهای خطای allowlist شده و request ID با قالب معتبر ثبت شوند. process اجرای واقعی درخواست قبل از build تشخیصی راه‌اندازی شده بود؛ نسخه کاندید پس از آن build شد اما به‌دلیل دسترسی محدود تنظیمات دوباره راه‌اندازی نشد.

از درخواست تصویر نتیجه‌ای parse نشد. فقط BOTH فراخوانی شد؛ RIGHT و LEFT برای پرهیز از تکرار درخواست ردشده اجرا نشدند. هیچ امتیاز، بازبینی، save، reload یا report در این کاندید ثبت نشد. شمار RulaAssessment و RulaVersion در staging هر دو صفر بود. خطای موجود به score یا رکورد ساختگی تبدیل نشد.

گزارش ۱۷ اکتبر، درخواست‌های موفق RIGHT/LEFT/BOTH و persistence را برای checkout و candidate دیگری مستند می‌کند. آن evidence تاریخی است و به این کاندید یا سایت زنده قابل تعمیم نیست.

## Prisma و دیتابیس

MariaDB جداگانه روی پورت 53306 برای staging استفاده شد؛ schema فقط با prisma db push --skip-generate در همین دیتابیس دورریختنی bootstrap شد. این روش replay پاک تاریخچه migration نیست. prisma validate برای schema کاندید موفق شد (exit 0) و هشدار deprecation برای package.json#prisma داشت. تطبیق schema پایگاه زنده به‌دلیل نبود دسترسی به تنظیمات محافظت‌شده انجام نشد. schema زنده تغییر نکرد. اختلاف تاریخی duplicate globalRole و سه checksum تغییرکرده، دست‌نخورده ماند. بازیابی backup از dump تولیدی انجام یا تأیید نشد، چون dump امن/قابل دسترس نبود و این مرحله هیچ تغییر زنده‌ای انجام نداد.

تغییر تشخیصی provider هیچ فایل Prisma schema یا migration را تغییر نداد. سازگاری کل مسیر persistence کاندید RULA با دیتابیس فعال تأییدنشده است، چون schema فعال قابل‌خواندن نبود.

## آزمون‌ها و فرمان‌ها

تمام Vitest/TypeScript/Vite binaries از dependency tree کاندید با Node v22.22.3 اجرا شدند. پروژه pnpm@10.13.1 را pin می‌کند اما فرمان pnpm موجود نسخه 11.25.0 بود؛ نصب یا اجرای pnpm انجام نشد.

| فرمان دقیق/بررسی | نتیجه |
|---|---|
| CWD candidate backend؛ C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --reporter=dot | ۶۰ فایل، ۴۱۱ تست موفق، exit 0 |
| CWD candidate frontend؛ C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --reporter=dot | ۵۱ فایل، ۳۳۹ تست موفق، exit 0 |
| CWD candidate backend؛ C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run src/ai-provider.test.ts src/image-analysis-diagnostics.test.ts --reporter=dot | ۲ فایل، ۵۰ تست موفق، exit 0 |
| CWD candidate backend؛ C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -p tsconfig.json --noEmit | exit 0 |
| CWD candidate backend؛ C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -p tsconfig.json | exit 0 |
| CWD candidate frontend؛ C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -b --noEmit | exit 0 |
| CWD candidate frontend؛ C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -b | exit 0 |
| CWD candidate frontend؛ C:\Runtime\node\node.exe .\node_modules\vite\bin\vite.js build --configLoader runner | exit 0؛ chunk اصلی 554.01 kB و هشدار حد 500 kB |
| CWD candidate backend؛ Prisma validate --schema .\prisma\schema.prisma با URL آزمایشی بدون اتصال | exit 0؛ هشدار deprecated package.json#prisma |
| CWD candidate backend؛ C:\Runtime\node\node.exe .\node_modules\prisma\build\index.js generate --schema .\prisma\schema.prisma | تولید Prisma Client نسخه 6.19.3 در dependency tree کاندید؛ exit 0 |
| Vitest backend، typecheck و build پس از Prisma generate | ۶۰ فایل / ۴۱۱ تست؛ typecheck و build همگی exit 0 |
| lint سطح package در backend و frontend | هر دو script همان فرمان TypeScript noEmit ثبت‌شده در بالا هستند و موفق شدند؛ orchestration ریشه Turbo/pnpm اجرا نشد |
| C:\Runtime\node\node.exe .\scripts\check-api-contract.mjs | ۹۰ API path و ۱۵۴ backend route، exit 0 |
| C:\Runtime\node\node.exe .\scripts\verify-release.mjs | ۲۹ بررسی موفق، exit 0 |
| pnpm --version | 11.25.0، exit 0؛ ناسازگار با pin 10.13.1 |

لاگ‌ها در reports/evidence/rula-final-candidate-20261018 ذخیره شده‌اند. این تست‌ها build و قرارداد کد را تأیید می‌کنند، نه موفقیت provider، ذخیره RULA یا استقرار زنده.

## فایل‌ها و artifactهای کاندید

تغییرات مربوط به تشخیص امن خطا و آزمون‌های آن در این فایل‌ها هستند:

- backend/src/ai-provider.ts
- backend/src/ai-provider.test.ts
- backend/src/image-analysis-diagnostics.ts
- backend/src/image-analysis-diagnostics.test.ts

دو تست تکراری یکسان از فایل‌های test حذف شدند. این چهار فایل در baseline از قبل modified بودند؛ attribution فقط به بلوک تشخیصی و regression coverage این مرحله محدود است. هیچ schema، migration، config زنده، UI، API contract، chat model یا support feature تغییر نکرد.

| artifact | SHA-256 کاندید | SHA-256 فایل فعلی سرویس‌شده |
|---|---|---|
| Frontend index.html | 9821696BFA822DE6D710414C9CEF45E1B4925451FBA28134048993911CEDD9F4 | E1C893E440F8B769CB2E119C47D7D682BCD9DB092C0F4FD581A097B830885ED9 |
| Frontend JS | F6BB690167D9F4C00DC27190AFF820AC905728A4FDCD8CCEE7F5BD3BF356ECBA | 2B4F0C30678C311D30F4E0BDD67EBEFB12DA8BB6D1A12CC16A82C65B88094A17 |
| Frontend CSS | 7FA339E553DA2DDF99C51DE8B4295CCC511695D0E5CD95D7714EC5D382E345B7 | EA10DC070BD448680ADDBDC99305CA95B91C4F6EFB5C2BBF09AE7CA5A468CE86 |
| backend ai-provider.js کاندید | 30630A5F6BD2292F15F7E1883DE9FFA902855872F07129FF921BD56B699F6CF0 | هش باینری فعال تأیید نشد؛ مسیر ProgramData دسترسی را رد کرد |

backend/dist کاندید پس از تولید Prisma Client در ۲۰۲۶-۱۰-۱۸ ساعت ۰۱:۳۳:۵۵ -۰۷:۰۰ دوباره build شد. مسیر فایل‌های کاندید frontend/dist/index.html، assets/index-BzxJh6jI.js و assets/index-17Z8GZRa.css است. فایل‌های سرویس‌شده /index.html، /assets/index-C58TrXm0.js و /assets/index-BR-uyfeR.css در C:\inetpub\nivasafe\app-com هستند. اندازه و هش‌های کامل در acceptance-evidence.json نیز ثبت شده‌اند.

## انتشار و rollback

انتشار backend یا frontend انجام نشد؛ سرویس زنده restart نشد؛ migration زنده اجرا نشد؛ approvalهای privacy/vision تغییر نکرد. Backup/rollback تولیدی ایجاد یا آزمایش نشد. به‌دلیل upstream 401، عدم دسترسی به runtime configuration و ناممکن بودن اثبات هویت باینری فعال، انتشار RULA ایمن نیست. Live RULA gate همچنان تأییدنشده است.

## دامنه رگرسیون UI و پشتیبانی

در این کار هیچ source مربوط به UI، navigation، تیکت پشتیبانی، FMEA، مدل chat یا schema دیتابیس تغییر نکرد. تست کامل frontend، build فرانت‌اند، بررسی API contract و release verifier موفق شدند. رفت‌وبرگشت تیکت با حساب‌های احراز‌شده، Safari/WebKit و smoke زنده UI/پشتیبانی در این مرحله RULA تکرار نشدند. شواهد قبلی UI و support تاریخی هستند و در این مرحله دوباره تأیید نشده‌اند.

## اقدام مسدودکننده

مدیر حساب ArvanCloud باید vision/multimodal entitlement مدل GPT-5-Mini را برای credential فعلی staging روی gateway بالا تأیید یا فعال کند. کلید نباید ارسال شود؛ پس از تغییر entitlement، یک درخواست synthetic تصویر باید با build تشخیصی جدید تکرار شود. مالک سیاست حریم خصوصی باید ارسال تصویر به provider را برای محیط زنده جداگانه تأیید کند. پس از HTTP 200 تصویر، لازم است RIGHT/LEFT/BOTH، parser، بازبینی انسانی، save، fresh reload و گزارش روی همین candidate اجرا شوند، سپس rollback و artifact فعال پیش از deploy احراز شوند.

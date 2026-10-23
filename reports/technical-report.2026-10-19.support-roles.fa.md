# NIVASafe — شواهد فنی انتشار نقش‌ها و گفت‌وگوی پشتیبانی

| مشخصه | مقدار |
|---|---|
| پروژه | NIVASafe |
| میلادی / شمسی | 2026-10-19 / 1405-07-27 |
| انتشار | release-support-roles-20261019-01 |
| وضعیت | DEPLOYED |

## علت‌های تأییدشده و اصلاح

مسیر پشتیبانی همیشه صفحهٔ ثبت درخواست را نشان می‌داد و صندوق مدیر در زبانهٔ پنل مدیریت قرار داشت. backend علاوه بر نقش سراسری مدیر ارشد، allowlist اختیاری کاربر/سازمان یا وضعیت مدیر محافظت‌شده را لازم می‌دانست و صندوق را به سازمان انتخاب‌شده محدود می‌کرد. پیام کاربر نیز برای مدیران اعلان نمی‌ساخت. این رفتار با سیاست صریح مالک دربارهٔ نقش سراسری حساب سازگار نبود.

اکنون نقش فعال سراسری از DB توسط auth-guard موجود خوانده می‌شود؛ نقش سازمان یا ادعای JWT/browser مجوز صندوق نمی‌دهد. تمام مدیران ارشد فعال به صندوق سراسری دسترسی دارند. مسیر کاربر همچنان به سازمان و صاحب درخواست محدود است. تنظیمات allowlist موجود تغییر نکردند؛ مجوز پشتیبانی دیگر به آن‌ها وابسته نیست. تخصیص تیکت فقط به مدیر ارشد فعال ممکن است. اعلان‌ها در همان transaction ثبت تیکت/پاسخ ساخته می‌شوند؛ idempotency و rate limit حفظ شده‌اند. مدیر صرفاً اعلان‌های متعلق به خودش را در همهٔ سازمان‌ها می‌بیند؛ کاربر عادی همچنان به user+tenant محدود است.

مرورگر ایراد دیگری را اثبات کرد: notificationLink، لینک /support?ticket=<UUID> را رد می‌کرد. آزمون قرمز آن را نشان داد؛ اکنون فقط همین query با UUID معتبر پذیرفته می‌شود و لینک خارجی، encoded، query اضافه و مسیر خراب رد می‌شوند. گفت‌وگوی باز، دکمهٔ به‌روزرسانی و refresh هنگام focus با cleanup دارد؛ سرویس polling جدید اضافه نشد.

## فایل‌های دقیق برنامه و آزمون

- frontend/src/features/notifications/notificationModel.test.ts — MODIFIED
- frontend/src/features/notifications/notificationModel.ts — MODIFIED
- frontend/src/features/support/SupportPage.tsx — MODIFIED
- frontend/src/features/support/supportWorkspace.test.tsx — ADDED
- frontend/src/i18n.tsx — MODIFIED
- frontend/src/layout/AppLayout.tsx — MODIFIED
- frontend/src/layout/navigation.test.ts — MODIFIED
- frontend/src/layout/navigation.ts — MODIFIED
- backend/src/modules/notifications.ts — MODIFIED
- backend/src/modules/support.ts — MODIFIED
- backend/src/notifications.test.ts — MODIFIED
- backend/src/support-expired-subscription.test.ts — MODIFIED
- backend/src/support.test.ts — MODIFIED

در backend منتشرشده فقط dist/modules/support.js و dist/modules/notifications.js تغییر کرده‌اند؛ ۱۳۰ فایل compiled دیگر با نسخهٔ قبلی یکسان‌اند. frontend ساخت تازه و کامل دارد و اصلاحات قبلی UI حفظ شده‌اند. dependency، schema، migration، CSS، مسیرهای موجود، مدل‌های AI و privacy gates تغییری نکرده‌اند. ecosystem.config.cjs فقط entrypoint و APP_VERSION مربوط به API را تغییر می‌دهد؛ تنظیم worker غیرفعال حفظ شده است. ابزار انتشار پایدار در scripts/releases/support-roles-20261019-01 شامل prepare.mjs، backup-protected-config.ps1 و release.mjs است.

## اعتبارسنجی اجراشده

| بررسی | نتیجه | شاهد |
|---|---|---|
| backend | PASS؛ ۶۱۵ آزمون / ۶۸ فایل | backend-test.log |
| frontend نهایی | PASS؛ ۳۹۵ آزمون / ۵۶ فایل | frontend-final-test.log |
| domain | PASS؛ ۱۹ آزمون / ۲ فایل | shared-domain-test.log |
| typecheck/lint/build با pnpm 10.13.1 | PASS؛ exit 0 برای هر بسته | validation.json و frontend-final-validation.json |
| قرارداد API | PASS؛ ۹۱ مسیر frontend / ۱۵۴ route | api-contract.log |
| بررسی انتشار | PASS؛ ۲۹ بررسی | release-check.log |
| API/DB/ورود/rollback واقعی | PASS؛ ۶۵ بررسی | api-acceptance.json |
| Chrome 155.0.8059.80 | PASS؛ هر دو نقش در ۳۹۰ و ۱۲۸۰؛ ۶ ورودی نتیجه | browser-acceptance.json و تصاویر staging-support |
| مرورگر عمومی واردشدهٔ مدیر | PASS؛ دسکتاپ/موبایل؛ بدون خطای console | public-browser.json |
| سایت عمومی، asset، health و عدم دسترسی بی‌هویت | PASS؛ ۱۴ بررسی | deployment.json |
| Safari/WebKit | NOT_RUN؛ runner موجود نیست | final-acceptance.json |
| ثبت/پاسخ کاربر عادی در production | NOT_RUN؛ برای حفظ داده‌های مشتری؛ مسیر واقعی در staging تأیید شد | final-acceptance.json |

جمع آزمون‌های خودکار مستقل ۱۰۲۹ است؛ آزمون‌های متمرکز ۳۴تایی backend و نقش/navigation زیرمجموعه‌اند و دوباره جمع نشده‌اند. فرمان‌های test، typecheck، lint و build با C:/Runtime/node/corepack.cmd pnpm run در کپی candidate هر سه بسته اجرا شدند. آزمون Node --test برای rollback-guard نیز موفق شد.

## ایزولاسیون و امنیت

DB یک‌بارمصرف nivasafe_support_45516c94d38a روی 127.0.0.1:53306 با بررسی datadir واقعی استفاده شد. schema-only dump از DB مصنوعی ایزولهٔ موجود restore شد؛ ستون/نوع/nullability و خالی‌بودن جداول اصلی تأیید شد. این روش replay سالم migrationهای تاریخی یا restore backup production معرفی نمی‌شود. API روی 5153 و frontend روی 15144، uploads مجزا و JWT secret تصادفی مستقل داشتند. رمزها در حافظه ساخته شدند؛ secret production وارد staging نشد و هیچ فراخوانی provider انجام نشد.

ردهای واقعی 401/403/404، جداسازی صاحب درخواست در همان سازمان و سازمان دیگر، پنهان‌ماندن یادداشت داخلی، جعل author/organization، متن بیش‌ازحد، مسئول نامعتبر، تعارض timestamp، dedup پاسخ هم‌زمان، جداسازی گیرندهٔ اعلان، تنزل نقش و کاربر غیرفعال بررسی شدند. پاسخ/اعلان دوباره ذخیره نشد؛ پس از خروج/ورود و GET تازه، پیام‌ها باقی ماندند. مدیر بدون انتخاب سازمان نیز صندوق را می‌بیند و با سازمان خودش می‌تواند تیکت سازمان دیگر را مدیریت کند.

بازبینی امنیت محدوده: متن escape‌شدهٔ React، نبود HTML ناامن، schema سخت‌گیر، UUID لینک، نقش تازهٔ DB، عدم اعتماد به مجوز سمت client، یادداشت داخلی، transaction اعلان‌ها، pagination/rate limit و idempotency حفظ شدند. نقص امنیتی مهم جدیدی یافت نشد. شواهد حفظ سایر sourceها در scope-security-integrity.json ثبت شده است.

## شکست‌های اولیه و رفع

- اجرای نخست backend به‌علت fixture/config موجود اما کپی‌نشده شکست خورد؛ فایل‌های امن موجود به کپی ایزوله افزوده و ۶۱۵ آزمون موفق شد.
- sandbox برای cache ابزار Corepack و dependency مرورگر EPERM داد؛ اجرای معمول و مجاز میزبان بدون تغییر ACL، هویت یا Task موفق شد.
- لینک اعلان در مرورگر شکست خورد؛ آزمون قرمز، اصلاح سخت‌گیرانه و اجرای کامل نهایی frontend/مرورگر ثبت شد.
- یک راه‌اندازی API ایزوله هم‌زمان با آماده‌سازی artifact timeout شد؛ علت دقیق UNKNOWN است و به production نسبت داده نشد. همان backend ثابت در اجرای بعدی با diagnostic فقط‌شکل موفق شد؛ شاهد شکست حفظ شده است.
- هشدار قبلی اندازهٔ chunk Vite باقی است؛ build با exit 0 تمام شد.

## انتشار و بازیابی عملیاتی

Scheduled Task واقعی NIVASafe-API با SYSTEM، run-pm2.cmd و PM2 process nivasafe-api تأیید شد. PID قبلی 11620 و جدید 8352 است؛ هویت جدید نیز SYSTEM و یک listener روی 127.0.0.1:5044 تأیید شد. ریشهٔ static همان C:/inetpub/nivasafe/app-com است.

- backend: C:\ProgramData\NIVASafe\releases\release-support-roles-20261019-01\backend\dist\server.js
- هش entrypoint: e7a26489e1dd96e1c7e9d8c25715c2691e4e6ba590347f088c37961b10be5cb0؛ wrapper عمداً تغییر نکرده است و هش دو ماژول زیر تغییر واقعی را اثبات می‌کند.
- modules/support: 50e38b851b6fc85d5399d8244312477c0cf8ccb52e0d2a0f5622733d655f59a2
- modules/notifications: 9251779a93c9b63ce0e4e3a76a038b06af7440526bf7ec76a9ae680cd64a5b1d
- هش index عمومی: 0c75e6beb0837170d6e6bdf258d536a6ed9ab89fcd571373096b5947f2295164
- /assets/index-CN_8Devi.js: bffb9a9714871210dc4dd26ac9e402fb9aefe221f5bcc762816c01f257498af9
- /assets/index-BuPzz-_U.css: a5206c91f121042aaf073efe446126b7d2adc418f62a9ada29e55a09ceb5295d
- backup: C:/ProgramData/NIVASafe/backups/release-support-roles-20261019-01؛ ۱۶۶۴۳ فایل backend و ۷۸۳ لینک داخلی به‌همراه 463 فایل frontend بازسازی و از نظر hash تأیید شدند. config/env در مسیر محافظت‌شده با ACL اصلی SYSTEM/Administrators نگهداری شدند و ACL snapshot پس از نوشتن دوباره بررسی شد. secret در evidence ثبت نشده است.
- تمرین‌ها: جابه‌جایی old/new/old در frontend؛ PM2 جدا با IPC/پورت مستقل؛ اجرای API واقعی old/new/old/new روی همان DB یک‌بارمصرف با حفظ پیام‌ها. rollback production لازم نشد و اجرا نشد.

فرمان rollback در context مجاز میزبان/مدیر، با توقف در صورت انتشار یا تغییر تنظیمات نامرتبط بعدی:

```powershell
C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\support-roles-20261019-01\release.mjs rollback
```

این فرمان فقط code/config/index و فراخوانی API قبلی را برمی‌گرداند؛ DB یا uploads جدید را بازنویسی نمی‌کند و assetهای نسخه‌ها حفظ می‌شوند. hash تنظیمات محرمانه و privacy gates ثابت ماند. شمار حساب، سازمان، تیکت، پاسخ و اعلان کم نشد. schema با نسخهٔ فعال قبلی یکسان بود و migration اجرا نشد.

## گیت‌های همین تغییر

| مرحله | عنوان | وضعیت |
|---|---|---|
| 01 | تحلیل محدوده | PASS |
| 02 | معماری UI نقش‌ها | PASS |
| 03 | frontend | PASS |
| 04 | backend | PASS |
| 05 | پایگاه داده | PASS |
| 06 | یکپارچه‌سازی API | PASS |
| 07 | احراز هویت و مجوز | PASS |
| 08 | امنیت | PASS |
| 09 | آزمون خودکار | PASS |
| 10 | QA مرورگر | PASS |
| 11 | انتشار | PASS |
| 12 | بازبینی نهایی | PASS |

تمام مراحل مربوط به همین انتشار پشتیبانی PASS و کد DEPLOYED است. این نتیجه تأیید تازهٔ دقت/تصویر RULA یا ارسال ایمیل/پیامک نیست. اقدام باقی‌مانده‌ای از مالک برای این بخش وجود ندارد. مسیر شواهد کامل: C:/NIVASafe/reports/evidence/support-roles-20261019-01.

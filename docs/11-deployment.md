# استقرار نسخه فعلی NIVASafe

| مورد | مقدار |
|---|---|
| تاریخ میلادی | 2026-09-14 |
| تاریخ شمسی | 1405-06-23 |
| نشانی اصلی | https://app.nivasafe.com/login |
| میزبان | Windows Server با نشانی 5.159.49.221 |
| وضعیت استقرار | PASS — نسخه فعلی روی سرور فعال و API عمومی سالم است |

## روش اجرا

معماری استقرار فعال سرور مجاز حفظ شده و نسخه فعلی پس از بازیابی upstream روی آن فعال است:

- API با Node.js 22 و PM2 از مسیر `C:\NIVASafe\backend\dist\server.js` اجرا می‌شود؛ `cwd` ریشه `C:\NIVASafe` است تا environment تولیدی ریشه بارگذاری شود و task راه‌انداز `NIVASafe-API` اسکریپت `run-pm2.cmd` را با `pm2-runtime` به‌صورت foreground اجرا می‌کند تا supervisor با چرخه عمر Scheduled Task باقی بماند.
- فایل‌های استاتیک frontend در `C:\inetpub\nivasafe\app-com` قرار گرفتند.
- Nginx از task `NIVASafe-Nginx` اجرا می‌شود و HTTPS، SPA fallback و proxy مسیر `/api/` را مدیریت می‌کند.
- API روی `127.0.0.1:5044` و frontend از طریق دامنه عمومی ارائه می‌شود.
- متغیر `HOST=127.0.0.1` در محیط PM2 اعمال شده و قانون ورودی عمومی TCP روی پورت `5044` غیرفعال است؛ دسترسی API فقط از مسیر proxy داخلی Nginx انجام می‌شود.
- گواهی Let's Encrypt با win-acme مدیریت می‌شود؛ renewal روزانه فایل‌های PEM مخصوص Nginx را صادر، اعتبارسنجی و Nginx را reload می‌کند.
- نشانی‌های قدیمی HTTP/HTTPS شامل دامنه‌های `nivasafe.com` و `nivasafe.ir` به `https://app.nivasafe.com` و نشانی API قدیمی به `https://api.nivasafe.com` redirect می‌شوند.
- کلاینت frontend در build production در صورت مشاهده نشانی توسعه محلی، از proxy هم‌مبدأ `/api/v1` استفاده می‌کند تا درخواست‌های مرورگر به `localhost:5044` ارسال نشوند.

## تغییرات استقرار

- source و build فعلی frontend/backend جایگزین شد.
- تنظیمات `APP_URL` روی `https://app.nivasafe.com` قرار گرفت.
- provider ارزیابی ریسک در نسخه فعال روی ArvanCloud AI با مدل اصلی `DeepSeek-V4-Flash` و fallback `GPT-4o` و provider چت با مدل `GPT-4o` تنظیم شد؛ timeout و retry محدود از environment قابل کنترل هستند.
- کلیدهای سرویس فقط در environment سرور نگهداری شدند و در source، build یا مستندات قرار نگرفتند.
- migrationهای Prisma با موفقیت deploy شدند و Prisma Client مطابق schema فعلی regenerate شد.
- migration `202609040001_add_assistant_role` پس از اصلاح خطای اولیه escape در SQL با موفقیت deploy شد؛ وضعیت production با `prisma migrate status` به‌روز گزارش شد.
- ثبت‌نام جدید به‌صورت server-side یک فضای کاری اولیه، عضویت `ORG_ADMIN` و پروژه `DEFAULT` آماده تست FMEA/RULA می‌سازد؛ خواندن فهرست پروژه‌ها برای سازمان‌های قدیمی نیز همین پروژه را به‌صورت idempotent و tenant-scoped backfill می‌کند و starter soft-deleted را دوباره فعال می‌کند. حذف پروژه پیش‌فرض در API محافظت شده است. این رفتار از schema موجود استفاده می‌کند و migration جدیدی لازم ندارد.
- نقش سازمانی محدود `ASSISTANT` به‌صورت additive به enumهای `RolePermission`، `OrganizationMember` و `Invitation` اضافه شد؛ مدیران از مسیر دعوت امن اعضا می‌توانند دستیار یا مدیر سازمان اضافه کنند و دعوت `SUPER_ADMIN` فقط برای مدیر کل مجاز است.
- اتصال production به MariaDB با یک حساب اختصاصی application محدود به database و secret تصادفی اصلاح شد؛ مقدار `DATABASE_URL` فقط در environment سرور نگهداری می‌شود و در source یا گزارش ثبت نشده است.
- محدودیت ورود production به‌صورت کنترل‌شده روی `LOGIN_RATE_LIMIT_MAX=60` در بازه ۱۵ دقیقه تنظیم شد؛ این کنترل برای جلوگیری از brute-force حذف نشده است.
- در محیط توسعه، محدودیت اختصاصی مسیر ورود اعمال نمی‌شود تا تایمر قفل‌کننده نمایش داده نشود؛ محدودیت سراسری یک‌دقیقه‌ای API همچنان فعال است.
- در ورود اولیه و جابه‌جایی بین routeهای frontend، یک loader مرکزی و برندشده با متن محلی، انیمیشن محدود و پشتیبانی از `prefers-reduced-motion` به build اضافه و روی static root مستقر شد.
- قبل از جایگزینی، backup قابل rollback از source، build استاتیک و environment قبلی در مسیر `C:\ProgramData\NIVASafe\backups` نگهداری شد؛ برای آخرین به‌روزرسانی frontend نیز backup استاتیک `before-entry-loader-20260905-145043` ایجاد شد.
- تغییر فعلی شامل گزارش نتایج FMEA، اطلاعات فرآیند، تحلیل پوسچر و گزارش نتایج/اقدامات اصلاحی RULA، migrationهای `202609050001_fmea_process_information`، `202609050002_fmea_report_actions`، `202609050003_rula_process_information`، `202609050004_rula_posture_analysis` و `202609060001_rula_corrective_action_impact` و build جدید است و در تاریخ 2026-09-10 روی production deploy شد؛ smoke سلامت API، frontend عمومی و PM2 پس از انتشار موفق بود.
- قابلیت مصرف توکن AI شامل migration افزایشی `202609090001_ai_usage`، ثبت شمارنده‌های گزارش‌شده provider و endpoint مدیریتی تفکیک‌شده بر اساس کاربر/سازمان است؛ migrationهای pending شامل این migration روی production با موفقیت اعمال و Prisma Client مطابق schema فعلی regenerate شد.
- آخرین انتشار در backup `C:\ProgramData\NIVASafe\backups\pre-deploy-20260910-111242` نگهداری شد؛ static root فعال و خروجی backend جدید پیش از restart سرویس بررسی شدند.
- در انتشار 2026-09-12، کنترل‌های صریح Hide/Show برای ویجت‌های چیدمان داشبورد به build frontend اضافه و روی static root فعال شد؛ source مربوط نیز با backup قابل rollback `C:\ProgramData\NIVASafe\backups\dashboard-layout-20260912-0142` نگهداری شد. API با PM2 و MySQL همچنان سالم باقی ماند.
- در انتشار بهینه‌سازی دستیار در 2026-09-12، زمینه پایگاه دانش چت به حداکثر ۳ سند منتشرشده و ۹۰۰ نویسه از هر سند محدود شد، سقف خروجی پیش‌فرض چت روی ۹۰۰ توکن قرار گرفت و سقف ارزیابی ریسک ۱۶۰۰ توکن باقی ماند؛ رابط کاربری نیز تا رسیدن پاسخ، ارسال تکراری و درخواست هم‌زمان را مسدود می‌کند و پاسخ برگشتی را بلافاصله نمایش می‌دهد. backup قابل rollback این انتشار در `C:\ProgramData\NIVASafe\backups\assistant-speed-20260912-030910` نگهداری شد؛ hash خروجی backend و frontend با build محلی تطبیق داده شد، API با PM2 بازنشانی و online شد و worker به‌دلیل غیرفعال بودن Redis در PM2 نگه‌داری نشد تا خطای restart loop ایجاد نکند.
- در انتشار امنیت و canonical redirect در 2026-09-12، پیکربندی فعال Nginx با TLS 1.2/1.3، HSTS، headerهای امنیتی، مسیر ACME و redirect همه aliasهای قدیمی به دامنه نهایی اعمال شد. گواهی جدید Let's Encrypt با SANهای `.com` و `.ir` نصب شد و renewal روزانه win-acme به اسکریپت reload امن Nginx متصل شد. پیکربندی قبل از تغییر در backup سرور نگهداری شد.
- در انتشار PWA در 2026-09-12، manifest با metadata نصب standalone برای desktop/mobile، آیکون PNG maskable و shortcutها، service worker نسخه `v9`، fallback آفلاین و چرخه update کنترل‌شده روی static root قرار گرفت. `sw.js` و `manifest.webmanifest` در پیکربندی فعال Nginx با `Cache-Control` بدون cache طولانی‌مدت، نوع MIME صحیح و headerهای امنیتی ارائه می‌شوند؛ worker هنگام registration، بازگشت صفحه، visible شدن و reconnect بروزرسانی را بررسی می‌کند و تا انتخاب کاربر برای release جدید فعال نمی‌شود. cache navigation پارامترهای query را نگه نمی‌دارد و مسیر فایل‌های private/upload را cache نمی‌کند. قبل از جایگزینی static root، backup قابل rollback در `C:\ProgramData\NIVASafe\backups\pwa-v9-20260912-164858` نگهداری و hash فایل‌های اصلی قبل و بعد از انتشار تطبیق داده شد.
- در انتشار frontend مورخ 2026-09-13، stepper ایجاد ارزیابی FMEA همچنان سه مرحله دارد و برچسب‌های آن به «اطلاعات فرآیند»، «مرور و ثبت» و «گزارش و نتایج» تغییر کرد. release `release-20260913-235408-fmea-stepper-labels` در `C:\inetpub\nivasafe\app-com` فعال شد؛ hashهای index/JavaScript/CSS به‌ترتیب `7E96F4D007CD1E34CA1273F434FC5182A39315E26417040632292516F7BE47AB`، `7ED6D3A4E68A60DA3F71A0F91201B5A0F0F9C12BAD95AC4CAA805E52143438AD` و `ABEED5078951C036121520DB3F4CDB9DBF068DBD59E3C9952B295558BEDFCE3A` با build محلی تطبیق داده شدند و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260913-235408-fmea-stepper-labels` نگهداری شد. `/fmea`، `/choose-path`، `/login`، PWA assets و `/api/v1/health` با HTTP 200 پاسخ دادند؛ API روی `127.0.0.1:5044` و taskهای `NIVASafe-API`/`NIVASafe-Nginx` فعال باقی ماندند.
- در انتشار frontend مورخ 2026-09-14، باگ پرش مرحله دوم ایجاد FMEA به مرحله اول رفع شد. مرحله اول اکنون به مرور و ثبت می‌رود، ثبت تکراری از ابتدای عملیات درخواست قفل است، خطای API/حالت آفلاین draft را در مرحله دوم نگه می‌دارد و ثبت موفق با شناسه واقعی ارزیابی به `/fmea/:id/report` به‌عنوان مرحله سوم گزارش و نتایج منتقل می‌شود. release `release-20260914-124500-fmea-step3-submit-guard` در `C:\inetpub\nivasafe\app-com` فعال شد؛ hashهای build محلی index/JavaScript/CSS به‌ترتیب `43EDC676EC6788C35DA265111AB2D6FB6B26D43CA1753C19F302547BE805F3D0`، `D9963F1F6EA823060CF9D28CE7BF0C4FB03557D07168619B8F67647473811D5F` و `DC70AE9F5CC087400B9051BD25602B5452372D982242E2E174F9AFC6B788067F` با static root فعال تطبیق داده شدند و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260914-124500-fmea-step3-submit-guard` نگهداری شد. مسیرهای عمومی `/login`، `/fmea`، `/choose-path`، PWA assets و `/api/v1/health` با HTTP 200 پاسخ دادند؛ API روی `127.0.0.1:5044` و taskهای `NIVASafe-API`/`NIVASafe-Nginx` فعال باقی ماندند و bundle فعال شامل markerهای گزارش و navigation به `/fmea/` است.
- در انتشار امنیت ثبت‌نام در 2026-09-12، اعتبارسنجی ایمیل/تلفن و تشخیص نوع ورودی در دامنه مشترک و API هم‌راستا شد؛ API payloadهای ناشناخته و اطلاعات ناقص سازمانی را رد می‌کند، شماره‌های موبایل فقط پس از نرمال‌سازی و تطبیق فرمت محلی پذیرفته می‌شوند و نام‌های رزروشده/ناامن رد می‌شوند. build frontend/backend جدید پس از تست‌های متمرکز آماده انتشار شد.
- در تکمیل جریان ثبت‌نام در 2026-09-12، ساختار wizard موجود حفظ شد و مسیرهای شخصی و سازمانی با فیلدهای نام/نام خانوادگی، مراحل مسئول و شرکت، بازبینی کامل، اعتبارسنجی شناسه ملی، کنترل رمز عبور، نگهداری draft غیرحساس و پیام خطای عمومی فارسی/انگلیسی تکمیل شدند؛ artifact frontend فعال و hash backend با build محلی تطبیق داده شد.
- در انتشار آخرین گزارش نتایج RULA، build محلی شامل عوامل مؤثر مرتب‌شده، اقدامات اصلاحی قابل انتخاب/افزودن دستی و پیش‌بینی غیرقطعی پویا روی static root فعال شد؛ artifactهای frontend/backend hash-verified هستند و migration جدیدی لازم نبود.
- در بازیابی سرویس در 2026-09-12، علت 502 به پایان یافتن فرایند API پس از خروج task قدیمی محدود شد. task `NIVASafe-API` با `pm2-runtime` اصلاح و با backup `C:\ProgramData\NIVASafe\backups\api-recovery-20260912-235007` نگهداری شد؛ task پس از قطع session مدیریتی نیز Running، listener روی `127.0.0.1:5044` و health داخلی و عمومی HTTP 200 تأیید شد.
- در انتشار frontend فعلی، static root با backup `C:\ProgramData\NIVASafe\backups\release-20260912-235552` نگهداری و با build محلی تطبیق داده شد؛ service worker نسخه `v10` برای invalidation cache نسخه قبلی منتشر شد.
- در انتشار اصلاح خطای صفحه سفید در 2026-09-13، علت اصلی تبدیل JSX به `jsxDEV` در build production به‌دلیل `NODE_ENV=development` موجود در env توسعه بود. پیکربندی Vite با override صریح `esbuild.jsxDev` اصلاح شد، service worker به `v11` ارتقا یافت، bundle جدید بدون `jsxDEV` ساخته و در static root مستقر شد؛ backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260913-001708` نگهداری شد و hash فایل‌های اصلی تطبیق داده شد. پیام CSP مربوط به `content.js` افزونه مرورگر است و از کد سامانه نیست.
- در انتشار بازیابی پروژه پیش‌فرض در 2026-09-13، backend و shared-domain با build محلی hash-verified و با backup `C:\ProgramData\NIVASafe\backups\release-20260913-100335` روی سرور فعال شدند. بررسی production شامل 14 سازمان بود؛ 5 پروژه پیش‌فرضِ حذف‌شده/مفقود ایجاد و 14 پروژه `DEFAULT` فعال و organization-scoped شد. سرویس `NIVASafe-API` همچنان با `pm2-runtime` روی task ویندوزی اجرا می‌شود و health داخلی پورت 5044 و health عمومی HTTP 200 است.
- در انتشار رفع اختلال کلاینت در 2026-09-13، service worker به نسخه `v12` ارتقا یافت و یک مهاجرت یک‌باره اضافه شد که worker جدید را بلافاصله فعال می‌کند، cacheهای قدیمی را کنار می‌گذارد و پنجره‌های باز را یک‌بار به shell جدید منتقل می‌کند؛ این کار مسیرهای قدیمی که ممکن بود به `localhost:5044` اشاره کنند از مرورگر مشتری خارج می‌کند. bundle جدید بدون `jsxDEV` و بدون پیام خطای وابسته به پورت تولید شد و با backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260913-045715-pwa-v12` مستقر شد؛ API همچنان روی `127.0.0.1:5044` listener و health داخلی HTTP 200 دارد.
- در انتشار رابط ورود در 2026-09-13، محتوای قدیمی `login-approvals` با یک نوار حمایت معنایی و واکنش‌گرا جایگزین شد که متن فارسی/انگلیسی پشتیبانی و تصویر کوچک پارک علم و فناوری قزوین را نمایش می‌دهد؛ این نوار در صفحه‌های باریک نیز حفظ شد. assetهای `index-DREPb7gi.js`، `index-Cnt7SIZL.css` و تصویر لوگو hash-verified هستند و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260913-161252-login-support-bar-mobile` نگهداری شد؛ مسیر `/login` و تصویر لوگو با HTTPS و HTTP 200 بررسی شدند.
- در انتشار نهایی رابط ورود در 2026-09-13، پنل برند محلی‌سازی‌شده داخل محتوای برند toolbar قرار گرفت و صفحه میانی «نقش و فضای کاری را انتخاب کنید» از جریان ورود حذف شد؛ پس از احراز هویت موفق، اولین عضویت سازمانی برگشتی از API ذخیره و کاربر مستقیماً به پنل هدایت می‌شود و جابه‌جایی شرکت داخل پنل حفظ شده است. assetهای `index-Ddng2625.js`، `index-Px_WuxR-.css`، `sw.js` و تصویر لوگو با hashهای index=`1ACDA7ACD747C47837A9F4FB9773905D659957940FD8A74F981E72AA640E4FAB`، JS=`23DD0F44395324A1E78883D8CEFFFBAED781A9E5B7457E537173379248F1314B`، CSS=`AAA9EC8E211E0F9E57C0AC5BCB9983951344B0E2D79F66E06C46EA8118AB861D` و logo=`E6B3D2270403590BC315DEB46C2E7DEFD8507ACC0B9D50972CF68B213A6534C3` تطبیق داده شدند؛ backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260913-230704-login-direct-entry` نگهداری شد و `/login`، `/`، `/fmea`، health API و assetهای PWA با HTTPS و HTTP 200 بررسی شدند.
- در انتشار اصلاح مسیر ارزیابی در 2026-09-13، مرحله نمایشی «اطلاعات پایه» از stepper مسیر `/choose-path` حذف شد و انتخاب نوع ارزیابی به مرحله ۱ از ۳ تبدیل شد؛ مراحل اطلاعات ارزیابی و مرور/تأیید و تمام کارت‌ها و مسیرهای FMEA/RULA حفظ شدند. assetهای `index-Iocjmkwv.js` و `index-BWQsRG26.css` با hashهای index=`EE41B17FFCDC495D537F05472913971D05FA95C574D5126281F9D2FCF5559D06`، JS=`EEA47D02EB13EB63E2564279D1CCF725A51DAB9CA6F12E074633F88786B18E13` و CSS=`ABEED5078951C036121520DB3F4CDB9DBF068DBD59E3C9952B295558BEDFCE3A` روی static root فعال شدند؛ backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260913-234200-path-stepper-3` نگهداری شد و `/choose-path`، `/login`، PWA assetها و health API با HTTPS و HTTP 200 بررسی شدند.
- در انتشار frontend مورخ 2026-09-14، چیدمان مرحله «اطلاعات ارزیابی» در ویزارد FMEA اصلاح شد تا کنترل‌های «کد ارزیابی» و «دامنه» در یک ردیف و تراز عمودی مشترک قرار بگیرند؛ راهنمای تولید خودکار کد همچنان زیر ورودی خودش باقی می‌ماند. release `release-20260914-001044-fmea-assessment-info-align` در `C:\inetpub\nivasafe\app-com` فعال شد؛ hashهای index/JavaScript/CSS به‌ترتیب `3D40B030DDB696BF86444710952C8B9E20B6765125E8CE2212F26ADFB9908926`، `7ED6D3A4E68A60DA3F71A0F91201B5A0F0F9C12BAD95AC4CAA805E52143438AD` و `4BB1BF15E3CBB5FD5F40DF222E53C7E617E95BC50BCE204339D8703B81F45989` با build محلی تطبیق داده شدند و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260914-001044-fmea-assessment-info-align` نگهداری شد. `/fmea`، `/choose-path`، `/login`، PWA assets و `/api/v1/health` با HTTP 200 پاسخ دادند؛ API روی `127.0.0.1:5044` و taskهای `NIVASafe-API`/`NIVASafe-Nginx` فعال باقی ماندند.
- در انتشار frontend مورخ 2026-09-14، نوار حمایت صفحه ورود به عنصر معنایی `footer` منتقل شد و از جریان `login-hero-content` خارج ماند؛ نوار اکنون با فاصله فشرده، عرض کامل بخش محتوایی `login-art` و قواعد responsive روی دسکتاپ و صفحه باریک نمایش داده می‌شود. release `release-20260914-113649-login-support-footer-semantic` در `C:\inetpub\nivasafe\app-com` فعال شد؛ hashهای index/JavaScript/CSS به‌ترتیب `A10A8EA05B582D2C84F643C3451A0F815073A1934B51CFAC34294F8AE5220AE3`، `0082DB2D41F4AE6A00B2EB86BE4336195E30E8A118EE59915DACCB4DBE92AA7D` و `2832F264D0E5AC504109AA8A4A1D96DA264DB38A681977B7DBA35944100A20C3` با build محلی تطبیق داده شدند و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260914-113649-login-support-footer-semantic` نگهداری شد. `/login`، `/fmea`، `/choose-path`، `/sw.js`، manifest، asset لوگو و `/api/v1/health` با HTTP 200 پاسخ دادند؛ API روی `127.0.0.1:5044` و taskهای `NIVASafe-API`/`NIVASafe-Nginx` فعال باقی ماندند.
- در انتشار تم‌های پوسته احراز‌شده مورخ 2026-09-14، release `release-20260914-130901-shell-themes` در `C:\inetpub\nivasafe\app-com` فعال شد. انتخاب‌گر محلی‌سازی‌شده و قابل‌دسترس دقیقاً دو گزینه «آبی / تیره» و «سفید / روشن» دارد، انتخاب را در `localStorage` نگه می‌دارد و بدون reload پوسته را تغییر می‌دهد؛ لوگوی سایدبار در تم آبی/تیره سفید و در تم سفید/روشن با رنگ آبی اصلی نمایش داده می‌شود. hashهای build محلی و static root برای index=`89117ADC3C065C5A4689805D4038FD7F8792F88151EE7C73BDDFE6C7395FB8B9`، JavaScript=`7D1D69444B19A7EFB5DABAE4019D49237C7E29DC66312CBC70222D824B41A872` و CSS=`3A33EE9B7FE7D74C1B6C2A9A6D68B5BEE6BACB958B3508E5BEF5F8A6EB1DDC99` یکسان است؛ backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260914-130901-shell-themes` نگهداری شد. taskهای `NIVASafe-API` و `NIVASafe-Nginx` Running هستند و `/login`، `/` و `/api/v1/health` با HTTP 200 پاسخ دادند.
- در انتشار تکمیلی frontend مورخ 2026-09-14، کنترل‌های دانلود PDF از سطوح فهرست و گزارش ارزیابی‌های FMEA و RULA حذف شدند؛ خروجی‌های Excel و Word باقی ماندند و مسیرهای PDF سمت API فقط برای سازگاری عقب‌رو حفظ شدند. release نهایی `release-20260914-133023-panel-no-pdf` در `C:\inetpub\nivasafe\app-com` فعال است و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260914-133023-panel-no-pdf` نگهداری می‌شود. hashهای static root برای index=`A670AD1E33F40FC35A536D216F77F6987A0B4B06653E7A96BB700EE4A08DC72`، JavaScript=`D8070D0A0D6429C8340F67AC0DA9FF036E885DC719113D55519AEFFD18F4BBE9` و CSS=`3A33EE9B7FE7D74C1B6C2A9A6D68B5BEE6BACB958B3508E5BEF5F8A6EB1DDC99` با build محلی تطبیق داده شدند؛ bundle فاقد کنترل‌های PDF پنل است، taskهای `NIVASafe-API` و `NIVASafe-Nginx` Running هستند و `/login`، `/`، `/api/v1/health`، manifest و service worker با HTTP 200 پاسخ دادند.

## حساب‌های تست

- مدیر سامانه: `admin@app.nivasafe.com` با نقش `SUPER_ADMIN`.
- حساب شخصی: `test.personal.20260903@nivasafe.com` با فضای کاری شخصی.
- حساب سازمانی: `test.organization.20260903@nivasafe.com` با فضای کاری سازمانی و نقش `ORG_ADMIN`.

رمزهای این حساب‌ها فقط به درخواست‌کننده مجاز تحویل شدند و در source یا مستندات ذخیره نشده‌اند. فضای کاری حساب‌های جدید در محیط production با وضعیت `PENDING_PAYMENT` ساخته شده است؛ این رفتار مطابق سیاست پرداخت فعلی است.

## شواهد اعتبارسنجی

| بررسی | نتیجه |
|---|---|
| API health | PASS — HTTP 200، وضعیت healthy، MySQL up پس از اصلاح credential اتصال برنامه |
| Prisma migrations | PASS |
| Prisma Client generation | PASS |
| Nginx configuration test | PASS |
| hash فایل‌های frontend/backend | PASS |
| تست زنده provider ارزیابی ریسک | PASS — ArvanCloud AI |
| تست زنده provider چت | PASS — ArvanCloud AI |
| وضعیت provider در دستیار | PASS — API محافظت‌شده provider فعال و provider پیکربندی‌شده برای نقش چت را اعلام می‌کند؛ رابط کاربری وضعیت را نمایش می‌دهد |
| ورود مدیر و دو حساب تست | PASS — هر سه login با HTTP 200 |
| نشانی HTTPS عمومی | PASS — `https://app.nivasafe.com/login` با HTTP 200 |
| PWA manifest و service worker | PASS — `manifest.webmanifest` با `application/manifest+json` و `Cache-Control: no-cache`، `sw.js` با `application/javascript` و `no-cache, no-store`, آیکون 192px و login با HTTP 200؛ محتوای عمومی نسخه v12، مهاجرت یک‌باره کلاینت‌های قدیمی و metadata standalone تطبیق داده شد |
| نوار حمایت صفحه ورود | PASS — محتوای قدیمی `login-approvals` از UI حذف و نوار حمایت محلی‌سازی‌شده با تصویر کوچک پارک علم و فناوری قزوین جایگزین شد؛ asset لوگو با HTTP 200 و hash تطبیق‌داده‌شده ارائه می‌شود |
| اندازه عنوان صفحه ورود | PASS — عنوان localized صفحه ورود با مقیاس responsive کوچک‌تر، line-height فشرده‌تر و عرض محتوایی کامل‌تر در release-20260914-120218-login-hero-title-compact مستقر شد؛ بررسی مرورگر در 1280×900 و 1280×720 یک خط بدون clipping/overflow را تأیید کرد و backup نگهداری شد |
| انتخاب تم پوسته احراز‌شده | PASS — انتخاب‌گر دقیقاً دو گزینه آبی/تیره و سفید/روشن را نشان می‌دهد، مقدار معتبر را محلی ذخیره می‌کند، تغییر بدون reload اعمال می‌شود و لوگوی سایدبار بین نسخه سفید و آبی جابه‌جا می‌شود؛ این رفتار در release نهایی `release-20260914-133023-panel-no-pdf` با static root تطبیق داده شد، taskهای API/Nginx Running و مسیرهای login، root و health عمومی HTTP 200 هستند |
| حذف دانلود PDF از پنل ارزیابی | PASS — کنترل‌های دانلود PDF از فهرست‌ها و گزارش‌های FMEA/RULA حذف شده‌اند، خروجی Excel/Word فعال است، مسیرهای PDF API برای سازگاری باقی مانده‌اند و bundle فعال و public smoke این وضعیت را تأیید می‌کنند |
| خطای runtime bundle تولیدی | PASS — Vite صریحاً از تولید JSX توسعه‌ای جلوگیری می‌کند؛ bundle فعال `index-BI9D53fu.js` بدون `jsxDEV`/`jsx-dev-runtime`، شامل markerهای navigation گزارش FMEA، بدون پیام خطای قدیمی وابسته به پورت 5044، بدون کلید stepper «اطلاعات پایه» و بدون متن صفحه انتخاب نقش/فضای کاری است و مسیرهای عمومی login/projects/fmea/rula/assistant/admin با HTTP 200 پاسخ می‌دهند |
| مسیر ورود عمومی در انتشار قبلی | PASS — خطای 502 رفع شد؛ health عمومی HTTP 200 و درخواست credential نامعتبر HTTP 401 برمی‌گرداند |
| اتصال frontend به backend عمومی | PASS — bundle فعال از `/api/v1` هم‌مبدأ استفاده می‌کند؛ `/api/v1/health`، `/fmea`، `/rula` و `/assistant` با HTTP 200 بررسی شدند |
| ورود مستقیم به پنل و برند toolbar | PASS — فرم ورود و API contract تست شدند؛ پس از login موفق، اولین عضویت سازمانی برگشتی بدون نمایش صفحه انتخاب نقش/فضای کاری در `saveSession` قرار می‌گیرد و navigation مستقیم به پنل انجام می‌شود؛ ساختار toolbar نیز پنل برند محلی‌سازی‌شده را به‌عنوان تنها محتوای برند نمایش می‌دهد |
| پروژه پیش‌فرض ثبت‌نام | PASS — مسیر ثبت‌نام پروژه localized با کد `DEFAULT` را اتمیک ایجاد می‌کند؛ repair production پنج مورد مفقود را ایجاد کرد، 14 پروژه فعال باقی ماندند، starter soft-deleted دوباره فعال می‌شود و حذف آن در API محافظت شده است |
| نام‌گذاری گفتگوی هوش مصنوعی | PASS — مسیر /assistant حفظ شد و متن پنل در فارسی «گفتگو با هوش مصنوعی» و در انگلیسی Chat with AI است؛ asset فعال روی HTTPS بررسی شد |
| محدودیت ورود | PASS — ۱۱ درخواست نامعتبر متوالی بدون 429 زودهنگام پاسخ 401 گرفتند؛ سقف ۶۰ درخواست در ۱۵ دقیقه فعال است |
| چیدمان گزینه‌های پایگاه دانش | PASS — asset فعال شامل کارت‌های گزینه هم‌ارتفاع، کنترل‌های select با ارتفاع یکسان و stacking ریسپانسیو است؛ `/knowledge` با HTTP 200 بررسی شد |
| پالت رنگ پنل‌ها | PASS — اکشن‌های اصلی و accentهای غیرمعنایی پنل‌های احراز‌شده از آبی‌های موجود سایت استفاده می‌کنند و رنگ‌های معنایی موفقیت و هشدار حفظ شده‌اند |
| تمایز پنل ادمین | PASS — shell مدیر کل و مدیر سازمان از پنل کاربر عادی جداست و با کلاس‌های role-specific و هدر مدیریتی متمایز نمایش داده می‌شود |
| افزودن مدیر و دستیار | PASS — نقش `ASSISTANT`، فهرست نقش‌های دعوت و محدودیت server-side برای دعوت مدیر کل در build و تست‌های قرارداد بررسی شد |
| loader ورود صفحه | PASS — loader مرکزی NIVASafe در render اولیه و جابه‌جایی `/login` به `/register` به‌صورت بصری بررسی شد؛ build جدید با hash مستقل روی HTTPS فعال است |
| بهینه‌سازی سرعت دستیار | PASS — محدودسازی زمینه و خروجی در backend، جلوگیری از ارسال تکراری در frontend، تطبیق hash استقرار و online بودن API پس از restart بررسی شد |
| امنیت ثبت‌نام | PASS — اعتبارسنجی تماس، تشخیص خودکار email/phone، جلوگیری از شماره نامعتبر و سیاست نام کاربری در تست‌های shared/backend/frontend بررسی و build فعال روی سرور hash-verified شد |
| وضعیت عمومی در checkpoint ثبت‌نام | PASS — artifact frontend فعال، hash backend تطبیق داده شد، health داخلی و عمومی HTTP 200 و درخواست ورودی نامعتبر بدون 502 بررسی شدند |

استقرار واقعی Docker Compose روی این میزبان انجام نشد؛ سرویس‌های فعال سرور از روش taskهای Windows استفاده می‌کنند.

## وضعیت انتشار جریان ثبت‌نام

اعتبارسنجی و build جریان ثبت‌نام روی working tree با موفقیت انجام شد و هر دو مسیر در frontend preview بازسازی‌شده بررسی شدند. artifact frontend و backend روی سرور با hash محلی تطبیق داده شدند، API با MySQL healthy روی پورت داخلی `5044` زیر نظارت پایدار `pm2-runtime` قرار گرفت و health عمومی HTTP 200 است. ثبت موفق end-to-end با حساب جدید در این checkpoint اجرا نشد؛ تست‌های shared/backend/frontend و smoke خطاهای ورودی همچنان PASS هستند.

## انتشار اصلاح فرم افزودن ردیف خطر FMEA

در انتشار `release-20260914-135929-fmea-risk-row-defaults`، ورودی‌های دستی «شماره ردیف» و «مرحله فرآیند» از فرم افزودن ردیف خطر حذف شدند. API این دو فیلد legacy را در درخواست ایجاد اختیاری نگه می‌دارد تا کلاینت‌های قدیمی سازگار بمانند، اما در صورت حذف آن‌ها شماره ترتیبی بعدی و زمینه فرآیند/فعالیت ارزیابی والد را به‌صورت server-side تعیین می‌کند؛ فیلدهای موجود برای ویرایش و نمایش ردیف‌های قبلی حفظ شده‌اند و migration لازم نیست.

این انتشار روی static root `C:\inetpub\nivasafe\app-com` و backend `C:\NIVASafe\backend\dist` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260914-135929-fmea-risk-row-defaults` نگهداری شد. hashهای index/JavaScript/CSS به‌ترتیب `7204EC6B34302A0F814EF4F95213D7BBB5220A7573EAD059FEF516FCD60B6CB1`، `231D855AEF5246771F66BE219A41674D5A482626330925975A5D33B079634A86` و `3A33EE9B7FE7D74C1B6C2A9A6D68B5BEE6BACB958B3508E5BEF5F8A6EB1DDC99` و hashهای backend مربوط به API/فرایند `9666611A6835168CADFF437A1F67D103A1B3F63EFBA98071DCEABC555D43C3DE` و `09BFB38B18ADA275C7B023C9F79E5CF6B246E8C7980746A6C93C4F5CB9A1F2D4` با build محلی تطبیق داده شدند. API روی `127.0.0.1:5044` با MySQL healthy، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و مسیرهای عمومی `/login`، `/`، `/manifest.webmanifest`، `/sw.js` و `/api/v1/health` با HTTPS و HTTP 200 بررسی شدند.

## انتشار نمایش کنترل‌شده پیشنهادهای هوشمند FMEA

در انتشار frontend-only `release-20260914-141754-fmea-ai-suggestions-3`، هر یک از دسته‌های «خطر/حالت خرابی»، «اثر»، «علت» و «پیشنهاد کنترلی» همچنان حداکثر شش پیشنهاد bounded دارد، اما فقط سه پیشنهاد نخست را در حالت اولیه نمایش می‌دهد. برای هر دسته دکمه مستقل و دسترس‌پذیر `+`/`−` جهت نمایش یا مخفی‌کردن پیشنهادهای باقی‌مانده اضافه شد و انتخاب پیشنهاد همچنان با تأیید صریح کاربر انجام می‌شود. هیچ API، schema یا migrationی در این انتشار تغییر نکرد.

این انتشار روی static root `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260914-141754-fmea-ai-suggestions-3` نگهداری شد. hashهای index/JavaScript/CSS به‌ترتیب `DF8746278EDCD2FDF9436F8184BD293637E2A529F67705E0EF8C4E1CA4434334`، `48072EB9EF3C5A26531DFBEF5B65D7DBEC27D51269116023DCBE9EBD8EDD6D82` و `F5BF4E440678F1FE9E857CC3C0576CAEAA56F11D30BCFCE8E458C6C288C371AE` با build محلی تطبیق داده شدند. API روی `127.0.0.1:5044` و MySQL healthy باقی ماندند، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running بودند و smoke عمومی HTTPS برای login، root، health، manifest، service worker و assetهای فعال با HTTP 200 انجام شد.

## انتشار هم‌ترازی پنل امتیازدهی FMEA

در انتشار frontend-only `release-20260914-145010-fmea-score-panel-reference`، پنل امتیازدهی افزودن و ویرایش ردیف FMEA به دو گروه مشخص تقسیم شد: selectors و جداکننده‌های ضرب S/O/D در یک ردیف، و پیش‌نمایش زنده RPN به‌همراه دکمه محاسبه/ثبت یا ذخیره در ردیف کناری. در عرض‌های باریک، این گروه‌ها و سپس کنترل‌های امتیازدهی به‌صورت واکنش‌گرا زیر هم قرار می‌گیرند. برچسب‌ها و توضیحات تمام امتیازهای ۱ تا ۱۰ شدت اثر، احتمال وقوع و احتمال کشف مطابق فایل مرجع ارائه‌شده اصلاح شدند و محاسبه RPN بدون تغییر باقی ماند. هیچ API، schema یا migrationی در این انتشار تغییر نکرد.

این انتشار روی static root `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260914-145010-fmea-score-panel-reference` نگهداری شد. hashهای index/JavaScript/CSS به‌ترتیب `1B9EADED7A2E95C1CE8FC803FC4E5EE5ADE470EA66B5F537EDA546CF7F929C26`، `47A937C5D41A8EBDFAD45136F12CAADF6E054B8FD0B732B32C8D0F4184CA71C9` و `3A71C55A9287DB992E4FE52BF053BC658E4AFDB7AA2045A7038F16A41E3F1C3F` با build محلی و static root تطبیق داده شدند. API روی `127.0.0.1:5044` با MySQL healthy، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و مسیرهای عمومی `/login`، `/`، `/fmea`، `/choose-path`، manifest، service worker و `/api/v1/health` با HTTPS و HTTP 200 بررسی شدند.

## انتشار اتصال پیشنهاد هوشمند امتیازهای FMEA

در انتشار `release-20260915-fmea-score-ai`، فرم افزودن و ویرایش ردیف FMEA به همان زمینه فرایند، خطر، اثر، علت و کنترل‌ها متصل شد و پاسخ `risk-row` علاوه بر پیشنهادهای متنی، امتیازهای مشورتی Severity/Occurrence/Detection را در بازه ۱ تا ۱۰ و همراه با توضیح برمی‌گرداند. پیشنهاد امتیاز بلافاصله بعد از `.score-panel` نمایش داده می‌شود و تا زمانی که کاربر صریحاً «اعمال» یا «نادیده گرفتن» را انتخاب نکند، هیچ مقداری در ارزیابی ثبت نمی‌شود. اعمال پیشنهاد فقط کنترل‌های امتیازدهی فرم را به‌روزرسانی می‌کند و RPN به‌صورت زنده دوباره محاسبه می‌شود؛ مسیر ذخیره‌سازی و منطق server-authoritative ارزیابی بدون تغییر باقی مانده است.

این انتشار روی static root `C:\inetpub\nivasafe\app-com` و backend `C:\NIVASafe\backend\dist` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260915-fmea-score-ai` نگهداری شد. hashهای index/JavaScript/CSS به‌ترتیب `AEE41A5B91A8127536B700ED5FC381EB571163AE9364D1AD7E25389C7CFEA311`، `AB10B77B69341AA00F319109253B9078D732EC334DBF973FE5691F0E5FE87B57` و `930B10B6F18588E3E4664B4DD7E1CF1918A70AAAC1BC75FDCA42F675E7A38748` و hashهای backend مربوط به `fmea-process.js` و `assessments.js` به‌ترتیب `ECF0E63BD50A35219BEB6EC0C2C09AC7A1BC1843F10839A1A649F61007A34B77` و `DF081BCFDCA3D4A8E175694A4DB2C6F66CE31F2EA03580F867A5437797C59F9E` با build محلی و فایل‌های فعال سرور تطبیق داده شدند. هیچ migration یا تغییر schema لازم نبود؛ API روی `127.0.0.1:5044` و MySQL healthy، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و smoke عمومی HTTPS برای login، FMEA، manifest، service worker و health با HTTP 200 تأیید شد.

## انتشار اصلاح مرز مرحله دوم و مهاجرت پوسته FMEA

در انتشار frontend-only `release-20260915-fmea-step2-review`، مسیر ایجاد FMEA از نظر مرز مراحل صریح شد: مرحله اول فقط با کنترل غیرارسالی و handler مستقل به مرحله «مرور و ثبت» می‌رود، از propagation و submit ناخواسته جلوگیری می‌شود، فرم و fieldsetهای مرحله‌ای marker قابل بررسی دارند و پس از انتقال، بخش مرور در viewport و focus کاربر قرار می‌گیرد. handler ارسال فرم فقط در مرحله دوم فعال است؛ بنابراین مرحله «گزارش و نتایج» فقط پس از ثبت موفق و دریافت شناسه واقعی ارزیابی در مسیر موجود `/fmea/:id/report` نمایش داده می‌شود و مرحله مرور حذف یا دور زده نمی‌شود.

برای کاربرانی که shell قبلی را در service worker v12 نگه داشته بودند، نسخه service worker به v13 ارتقا یافت و migration یک‌باره، پنجره‌های باز را به assetهای جدید منتقل می‌کند. این انتشار روی static root `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260915-fmea-step2-review` نگهداری شد. hashهای فعال index/JavaScript/CSS/service worker به‌ترتیب `14650163ECCF4E24799FC5C238BDE8783258F63AA8C816D737B7704C0F1F8507`، `568C3024F21C488A788EDC10836FAC23B1490D08EEBCC5D8EE7D6EB3024852F8`، `930B10B6F18588E3E4664B4DD7E1CF1918A70AAAC1BC75FDCA42F675E7A38748` و `5E0ED536D3F0FC67C477803D653F6C9955514078E307CBB59559336F998B4ADD` با staging و فایل‌های فعال سرور تطبیق داده شدند. API روی `127.0.0.1:5044` و MySQL healthy، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و smoke عمومی HTTPS برای `/login`، `/fmea`، manifest، service worker، asset جدید و health با HTTP 200 تأیید شد.

## انتشار اصلاح اطلاعات فرآیند RULA — 2026-09-15

در release `release-20260915-rula-process-info`، فیلد عنوان ارزیابی در فرم اطلاعات فرآیند RULA اختیاری شد و با استفاده از `field-label-line` در همان تراز عمودی فیلد سمت بدن قرار گرفت. انتخاب سمت بدن اکنون راست، چپ و «هر دو سمت» را شامل می‌شود و payload/draft و schema سمت backend نیز همین مقدار را می‌پذیرند. برای اینکه ستون اجباری `title` و رکوردهای قدیمی تغییر نکنند، backend هنگام حذف عنوان، عنوان شغل یا `RULA assessment` را به‌صورت server-side ذخیره می‌کند. هیچ migration یا تغییر schema لازم نبود.

artifactهای frontend روی static root `C:\inetpub\nivasafe\app-com` و backend روی `C:\NIVASafe\backend\dist` مستقر شدند و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260915-rula-process-info` نگهداری شد. hashهای index/JavaScript/CSS به‌ترتیب `6804D693FFB9DD0E2CC2B8816899EE031DBD430049CB9ADB032AA4E37CD5F95E`، `40BECA4956B539C924F48EBA993EBC32922BD68147CF56F6FDFAAB2E6A7D6873` و `930B10B6F18588E3E4664B4DD7E1CF1918A70AAAC1BC75FDCA42F675E7A38748` با فایل‌های فعال سرور تطبیق داده شدند؛ hashهای backend `rula-process.js` و `modules/assessments.js` به‌ترتیب `5387A07D2C8DCD4B71399919CAC7765CE529492661764F3477303A73A2D459D6` و `38A637F928CF9AD197E7A41EBDA28B048B23C99D879BC2AAAEDC1501A172EA2D` هستند. پس از restart task `NIVASafe-API`، health داخلی HTTP 200 با MySQL up، taskهای API/Nginx Running و smoke عمومی HTTPS برای `/login`، `/rula`، manifest، service worker، asset جدید و health تأیید شد.

## انتشار اصلاح برچسب مراحل ایجاد ارزیابی RULA — 2026-09-15

در انتشار frontend-only `release-20260915-rula-stepper-labels`، برچسب مرحله دوم و سوم و متن توضیحی ویزارد RULA اصلاح شد. مرحله دوم اکنون «مرور و ثبت و امتیاز دهی» و مرحله سوم «گزارش دهی ارزیابی» نمایش می‌دهد؛ منطق ثبت، امتیازدهی، مسیر گزارش و API بدون تغییر باقی مانده‌اند و migration یا تغییر schema لازم نبود.

نسخه روی static root `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260915-rula-stepper-labels` نگهداری شد. hashهای فعال index/JavaScript/CSS service worker به‌ترتیب `AA37532A10B3DF6FFC3154173500682855DE6559887078985626757105CFFFFD`، `544D742A9E86024989323784B62F88F4844B6D4A8477C1DAB635A7409369AEBA`، `930B10B6F18588E3E4664B4DD7E1CF1918A70AAAC1BC75FDCA42F675E7A38748` و `5E0ED536D3F0FC67C477803D653F6C9955514078E307CBB59559336F998B4ADD` با artifactهای local، staging و static root تطبیق داده شدند. API روی `127.0.0.1:5044` و MySQL healthy، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و smoke عمومی HTTPS برای `/login`، `/rula`، manifest، service worker، bundle جدید و health با HTTP 200 تأیید شد؛ bundle عمومی هر دو عبارت فارسی جدید را شامل می‌شود.

## انتشار اصلاح لوگوی سایدبار در تم آبی — 2026-09-15

در انتشار frontend-only `release-20260915-blue-theme-logo`، فیلتر `grayscale/brightness/invert` از `.app[data-theme="blue"] .side-brand-icon` حذف شد و سطح سفید، border ظریف و `filter: none` برای نگهداری رنگ‌های اصلی لوگو اعمال شد. تم سفید/روشن، رفتار پوسته، اندازه‌گذاری collapse و API بدون تغییر باقی ماندند و migration یا restart سرویس لازم نبود.

نسخه روی static root `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260915-blue-theme-logo` نگهداری شد. hashهای index/JavaScript/CSS به‌ترتیب `1C560EBE98CBEFB052271D1286A8FD70789C365EC551703A9B55F18A1D614D6C`، `40BECA4956B539C924F48EBA993EBC32922BD68147CF56F6FDFAAB2E6A7D6873` و `4B791759868B05A5C3AD51542D4E8C015970EB51F6E474B878409F18CE227B84` با artifactهای local، staging و static root تطبیق داده شدند. health داخلی API روی `127.0.0.1:5044` HTTP 200 با MySQL سالم بود، taskهای `NIVASafe-API` و `NIVASafe-Nginx` Running ماندند و smoke عمومی HTTPS برای `/login`، `/fmea`، manifest، service worker، asset لوگو، bundle جدید و `/api/v1/health` با HTTP 200 تأیید شد؛ CSS فعال فاقد فیلتر قدیمی است.

## انتشار استایل native select و option — 2026-09-15

در انتشار frontend-only `release-20260915-native-select-options`، قواعد مشترک `select` و `option` برای تمام کنترل‌های native سایت اضافه شد. گزینه‌ها اکنون از typography و spacing مشترک، رنگ سطح/متن هماهنگ با Design System و حالت‌های hover/focus، checked، disabled، placeholder و multi-select استفاده می‌کنند؛ overrideهای تم آبی/تیره و سفید/روشن نیز برای خوانایی منوی گزینه‌ها اعمال شده‌اند. رفتار native و دسترسی کنترل‌ها حفظ شد و fallback مخفی `ProjectSelect` دست‌نخورده باقی ماند. هیچ API، schema، migration یا restart سرویس لازم نبود.

artifact روی `C:\inetpub\nivasafe\app-com` فعال و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260915-native-select-options` نگهداری شد. hashهای local/staging/active برای index، JavaScript و CSS به‌ترتیب `4D570EED02AC828EFFA72AF1D9CADC37FDF0E7756EB5A87D2F3F67B29A8D145F`، `40BECA4956B539C924F48EBA993EBC32922BD68147CF56F6FDFAAB2E6A7D6873` و `825CEB685BEFABD400E6E1FA34F32BECCD3376146B198D5C72122BF8C1D06EF1` تطبیق داده شدند. API داخلی `127.0.0.1:5044` و MySQL healthy، taskهای API/Nginx در وضعیت Running و smoke عمومی HTTPS برای `/login`، `/fmea`، `/rula`، manifest، service worker، asset لوگو، assetهای hash‌شده و `/api/v1/health` همگی HTTP 200 بودند.
## انتشار جدول‌های گزارش FMEA و RULA — 2026-09-15

انتشار frontend-only `release-20260915-assessment-report-tables` روی `C:\inetpub\nivasafe\app-com` فعال شد. backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260915-assessment-report-tables` نگهداری شد. hashهای SHA-256 محلی، staging و active برای `index.html`، bundle JavaScript و stylesheet به‌ترتیب `B3F6D416C8EA6AD1FC3887D24A3BB3253DC9E5A055C2C402126C4DCC4F882D5C`، `2E64FE5816AFE546A6F81EFFBA3A64826C27BAE34CE0F38BA9298F08185418D1` و `195834F7974430F16EE13DB7334420D8762E7A25CFDC1FE255B133EF256706BF` تطبیق داده شدند.

این انتشار فقط frontend را تغییر داد؛ migration، API، schema یا restart لازم نبود. `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running باقی ماندند، API داخلی `127.0.0.1:5044` با MySQL healthy است و smoke عمومی HTTPS برای `/login`، `/fmea`، `/rula`، assetهای PWA، bundleهای hash‌شده و `/api/v1/health` با HTTP 200 موفق شد.

## انتشار انتخاب‌گر بازشونده تم — 2026-09-15

در release frontend-only `release-20260915-theme-switcher`، کنترل `theme-switcher` به‌صورت یک دکمه تم فعال و یک منوی گزینه جایگزین منتشر شد. هیچ API، schema، migration یا restart سرویس لازم نبود. backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260915-theme-switcher` نگهداری شد و artifact در `C:\inetpub\nivasafe\app-com` فعال است.

hashهای local/staging/active برای index، JavaScript و CSS به‌ترتیب `81C91BE7EA1A2E60138A749438DCD90C7F2AF7FA201D23F3C5F206A99E64E927`، `504B43F7EBDCA7F47A59C415D7E4D8FC83F7729E41149893C6CB5B825884322E` و `77F63EEBBF5774339F9FC57A7F4B195773592D51281765A34D412EC877A0B0AC` تطبیق داده شدند. API روی `127.0.0.1:5044` و MySQL healthy، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و smoke عمومی HTTPS برای مسیرهای برنامه، PWA، assetهای hash‌شده و health با HTTP 200 موفق بود.
## انتشار responsive انتخاب‌گر تم — 2026-09-15

در انتشار frontend-only `release-20260915-theme-switcher-responsive`، قواعد responsive برای `theme-switcher` و کنترل‌های header احراز‌شده منتشر شد. desktop layout تک‌ردیفه باقی می‌ماند؛ tablet کنترل‌ها را به ردیف wrap‌شده منتقل می‌کند؛ mobile کنترل‌ها را در عرض viewport نگه می‌دارد، selector شرکت را shrink می‌کند و menu تم را viewport-bounded نگه می‌دارد. هیچ API، schema، migration یا restart سرویس لازم نبود.

نسخه روی `C:\inetpub\nivasafe\app-com` فعال و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260915-theme-switcher-responsive` نگهداری شد. hashهای local/staging/active برای `index.html`، JavaScript و CSS به‌ترتیب `8EAA2E9ACBF86432078BA165D034630E384A97C2DE5AFA86FBD7C0E71B2BCDEC`، `504B43F7EBDCA7F47A59C415D7E4D8FC83F7729E41149893C6CB5B825884322E` و `142FE66741978EAC4763CBC1E68FBC0041CB6EB5AFDEBB201046FECED0161654` تطبیق داده شدند. API داخلی `127.0.0.1:5044` و MySQL سالم، taskهای API/Nginx در وضعیت Running و smoke عمومی HTTPS برای `/login`، `/fmea`، `/rula`، assetهای PWA، bundleهای hash‌شده و `/api/v1/health` با HTTP 200 موفق بود.
## انتشار نهایی اصلاح responsive انتخاب‌گر تم — 2026-09-15

پس از بازبینی نهایی کنترل‌های header، انتشار frontend-only `release-20260915-theme-switcher-responsive-v2` روی `C:\inetpub\nivasafe\app-com` فعال شد. این نسخه wrap کنترل‌ها در tablet/mobile، کوچک‌شدن selector شرکت، trigger فشرده تم و محدودیت عرض menu را شامل می‌شود؛ API، schema، migration و سرویس backend بدون تغییر باقی ماندند.

backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260915-theme-switcher-responsive-v2` نگهداری شد. hashهای local/staging/active برای `index.html`، JavaScript و CSS به‌ترتیب `264588CE6206CEECC673DED9DB63633D979D85B2BB6E31CDE4E3B958D73091F2`، `504B43F7EBDCA7F47A59C415D7E4D8FC83F7729E41149893C6CB5B825884322E` و `B05880913CE2B3D4C879E46AC8EEF03439C5E3449DD1D33ED2550515EBB413AA` تطبیق داده شدند. API داخلی `127.0.0.1:5044` و MySQL سالم، taskهای API/Nginx در وضعیت Running و smoke عمومی HTTPS برای مسیرهای برنامه، assetهای PWA، bundleهای جدید و `/api/v1/health` با HTTP 200 موفق بود.
## انتشار اصلاح طراحی هدر — 2026-09-16

پس از مشاهده به‌هم‌ریختگی هدر، ریشه مشکل در تعامل `select { width: 100% }` عمومی با flex header و wrap دسکتاپ شناسایی شد. در انتشار frontend-only `release-20260916-header-responsive-repair` عرض selector شرکت به `clamp(180px, 18vw, 260px)` محدود و چیدمان دسکتاپ به تک‌ردیفه اصلی بازگردانده شد؛ wrap فقط برای tablet/mobile باقی ماند تا دکمه‌ها و selector از viewport خارج نشوند. منوی بازشونده تم، دو مقدار تم، persistence، رنگ‌ها، API، schema، migration و سرویس backend بدون تغییر باقی ماندند.

artifact جدید روی `C:\inetpub\nivasafe\app-com` فعال و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260916-header-responsive-repair` نگهداری شد. hashهای local/staged/active برای `index.html`، JavaScript و CSS به‌ترتیب `07C6F311D06E51D1830F2933CB19C52435EE09EC8CFD8CAC7F06630CFCE55CFB`، `504B43F7EBDCA7F47A59C415D7E4D8FC83F7729E41149893C6CB5B825884322E` و `17FEA521118E3C19D88D8312EEE2EEAB4AC958C40E7E5F4954056818107C3687` تطبیق داده شدند. API داخلی `127.0.0.1:5044` پاسخ health با HTTP 200 داد، MySQL سالم و taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running باقی ماندند؛ smoke عمومی HTTPS برای مسیرهای برنامه، PWA assets، bundleهای جدید و health موفق شد.

## انتشار کنترل‌های آیکونی چیدمان داشبورد — 2026-09-16

در انتشار frontend-only `release-20260916-dashboard-icons`، متن دکمه‌های مخفی‌کردن و حذف از کنترل‌های چیدمان داشبورد حذف شد و آیکون‌های دارای `aria-label` و `title` جایگزین شدند؛ نام ویجت‌ها، جابه‌جایی، بازگردانی، ذخیره‌سازی تنظیمات و رفتار responsive حفظ شدند. هیچ API، schema، migration یا restart سرویس لازم نبود.

نسخه روی `C:\inetpub\nivasafe\app-com` فعال و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260916-dashboard-icons` نگهداری شد. hashهای local/staged/active برای `index.html`، JavaScript و CSS به‌ترتیب `77102B9CB54CF6E2F7E47FB7FA800149DAAC270A116A49C5B6BB79FAA264A2A3`، `4EEB889B9557F78D57820051329609F12A7ADDC4CE52F2B903279C67ADED68F1` و `90F82B3C055F7030A8E88100EF47AAFA428D8BAE4AECDC90C7F3075FB6999E4D` تطبیق داده شدند. API داخلی `127.0.0.1:5044`، taskهای `NIVASafe-API` و `NIVASafe-Nginx` و صفحه عمومی ورود پس از انتشار بررسی شدند.

## انتشار مخفی‌سازی پنل بازاریابی ورود در صفحه‌های باریک — 2026-09-16

در انتشار frontend-only `release-20260916-login-art-hide-900`، در breakpoint حداکثر `900px` عنصر `.login-art` با `display: none` از layout حذف شد و grid ورود به یک ستون تمام‌ارتفاع تغییر کرد تا پنل مخفی هیچ ردیف یا فضای اضافی اشغال نکند. چیدمان دسکتاپ و محتوای موجود صفحه ورود بدون تغییر باقی ماند؛ backend، API، schema، migration و سرویس‌ها نیاز به تغییر یا restart نداشتند.

نسخه روی `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260916-login-art-hide-900` و نسخه قبلی در sibling path نگهداری شدند. hashهای local/active برای `index.html`، JavaScript و CSS به‌ترتیب `081AB7EDA0CEECF3BC49DF780D2BEC5DB231C73AF788F281D6F411AA6357236E`، `B66AC00F20885840E0FE507D848F80448342A03E19D0A960616A36669C55FD31` و `4B6AE2D2B7C22D9F79C4593CEE9D482D49A03E9F2E784FEFAA7D7CD2DDA973FD` تطبیق داده شدند. rule مخفی‌سازی در CSS فعال تأیید شد، taskهای `NIVASafe-API` و `NIVASafe-Nginx` Running، API روی `127.0.0.1:5044` با MySQL healthy و مسیرهای عمومی `/login`، `/projects`، `/fmea`، `/rula` و `/api/v1/health` با HTTP 200 پاسخ دادند.

## انتشار فرم تجمیعی ایجاد پروژه — 2026-09-16

در انتشار `release-20260916-project-create-bootstrap-144149`، صفحه `/projects` فقط نقطه ورود ایجاد پروژه و فهرست پروژه‌های موجود را نگه می‌دارد و فرم ایجاد پروژه فیلدهای اجباری «نام فرایند» و «عنوان فعالیت» و فیلد اختیاری «محل انجام» را ارائه می‌کند. API در `backend/dist/modules/projects.js` جفت‌شدن ورودی‌ها را سمت server اعتبارسنجی می‌کند و پروژه، فرایند و فعالیت اولیه را در یک transaction ایجاد می‌کند؛ مسیرها و داده‌های مستقل فرایند/فعالیت حذف نشده‌اند. برای این تغییر migration لازم نبود.

artifact روی `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260916-project-create-bootstrap-144149` نگهداری شد. hashهای فعال با build محلی تطبیق داده شدند: `index.html`=`88ACDEC7B706A26B51B59A9B7C54813D503D8C6092049A6CE5547CEDA70E34CA`، JavaScript=`B66AC00F20885840E0FE507D848F80448342A03E19D0A960616A36669C55FD31`، CSS=`CF91AC9B5E2CD8FE5366DC1484D8E4D8004B454ADD126ACE62A4C5F144D98986` و `modules/projects.js`=`595627F00F37904D97B8C676E5E405FE3BE8A6DA5CA3D019A083635DA1745686`. سرویس‌های `NIVASafe-API` و `NIVASafe-Nginx` Running، پورت داخلی `127.0.0.1:5044` listening و smoke عمومی `/login`، `/projects`، `/fmea`، `/rula` و `/api/v1/health` با HTTP 200 تأیید شدند.

## انتشار حذف دکمه حذف چیدمان داشبورد — 2026-09-17

در انتشار frontend-only `release-20260917-dashboard-hide-only`، دکمه حذف ویجت از رابط چیدمان داشبورد پنهان شد تا هیچ فضای اضافی اشغال نکند و کنترل نمایش/مخفی‌کردن تنها روش تغییر visibility باقی بماند. منطق بازگردانی تنظیمات legacy، ترتیب ویجت‌ها و reset حفظ شدند؛ API، schema، migration و سرویس backend بدون تغییر ماندند و restart لازم نبود.

نسخه روی `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260917-dashboard-hide-only` و نسخه قبلی در sibling path نگهداری شدند. hashهای local/staged/active برای `index.html`، JavaScript و CSS به‌ترتیب `91FCFE57079C3BF222225285638677E805C94C35BDBB166ABCEF74F678552D9A`، `69D698181723347B6E63D3E060DB19267418D0A2592F4A78DCBF2920ED124FEF` و `E67A93B4B8233D18CF0BDAD7C8C8633FC0ADD14A3D24CF913A0339CBE86EEACE` تطبیق داده شدند. rule حذف کنترل در CSS فعال تأیید شد، API داخلی `127.0.0.1:5044` و MySQL healthy، taskهای `NIVASafe-API` و `NIVASafe-Nginx` Running و smoke عمومی HTTPS برای `/login`، `/projects`، `/fmea`، `/rula`، PWA assets و `/api/v1/health` با HTTP 200 موفق بود.

## انتشار مرکز عمودی کارت ورود در صفحه‌های حداکثر 900 پیکسل — 2026-09-16

در انتشار frontend-only `release-20260916-login-card-center-900`، breakpoint حداکثر `900px` حفظ شد: `.login-art` از layout حذف می‌شود و grid ورود یک ردیف تمام‌ارتفاع دارد؛ کارت ورود اکنون با `align-self: center` در محور عمودی مرکز قرار می‌گیرد و در ارتفاع‌های محدود همچنان با `max-height` قابل اسکرول باقی می‌ماند. layout دسکتاپ و backend، API، schema، migration و سرویس‌ها بدون تغییر باقی ماندند و restart لازم نبود.

نسخه روی `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260916-login-card-center-900` و نسخه قبلی در sibling path نگهداری شدند. hashهای local/active برای `index.html`، JavaScript و CSS به‌ترتیب `AB32C51A2626ABF807289E7F93DE0BCA7E92DEF3558318279EEDBD1A7CBE36D6`، `B66AC00F20885840E0FE507D848F80448342A03E19D0A960616A36669C55FD31` و `9CE2B0D74A0C004EF8754E4D32E66B5DB29E428C5900AC37623592732197B0BE` تطبیق داده شدند. rule مخفی‌سازی و center کارت در CSS فعال تأیید شد، taskهای `NIVASafe-API` و `NIVASafe-Nginx` Running، API داخلی روی `127.0.0.1:5044` با HTTP 200 و MySQL healthy و مسیرهای عمومی `/login`، `/projects`، `/fmea`، `/rula` و `/api/v1/health` با HTTP 200 پاسخ دادند.

## انتشار تراز وسط مصرف توکن هوش مصنوعی در پنل مدیریت — 2026-09-17

در انتشار frontend-only `release-20260917-admin-ai-usage-center`، کارت‌های خلاصه مصرف و جدول مصرف توکن کاربران در پنل مدیریت اصلاح شدند: همه برچسب‌ها، نام/ایمیل کاربر و مقادیر عددی در مرکز افقی و محور عمودی میانی قرار گرفتند. هیچ API، schema، migration یا backend task تغییر نکرد و restart سرویس لازم نبود.

نسخه روی `C:\inetpub\nivasafe\app-com` فعال و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260917-admin-ai-usage-center` نگهداری شد. hashهای local/staged/active برای `index.html`، JavaScript و CSS به‌ترتیب `CE94149ABF0DB2279EE9A163F1BBA9C141E63D89C5AAE0BDD31776D05DEEC7FB`، `69D698181723347B6E63D3E060DB19267418D0A2592F4A78DCBF2920ED124FEF` و `487C7DE9F1A5AC3AEF92B0BF1F009B34EEF2E589838DB0EBFCB484D4AF23786F` با artifactهای build و asset عمومی فعال تطبیق داده شدند. CSS فعال markerهای تراز وسط را دارد و smoke عمومی `/login`، `/projects`، `/fmea`، `/rula`، `/sw.js`، `/manifest.webmanifest` و `/api/v1/health` با HTTP 200 پاسخ دادند؛ rollback artifactها حفظ شدند.
## انتشار پایداری hover تم آبی — 2026-09-17

انتشار frontend-only `release-20260917-blue-hover-stability` روی `C:\inetpub\nivasafe\app-com` فعال شد. این نسخه ruleهای scoped تم آبی را برای کنترل‌های header اعمال می‌کند تا در hover/focus پس‌زمینه سفید نشود و رنگ متن ثابت بماند. API، schema، migration و سرویس backend تغییر نکردند و restart لازم نبود.

| artifact | SHA-256 |
|---|---|
| `index.html` | `ACDB733614C77DD42BCA555CCED19AF87ACC7AC63D4D5DAD64FEB3F9243CB761` |
| `assets/index-BKRbbPGg.js` | `69D698181723347B6E63D3E060DB19267418D0A2592F4A78DCBF2920ED124FEF` |
| `assets/index-GUAZrjqR.css` | `FC4AF91657D8AD48F78E743FE0ADC119A40613D4032A87FB805CF3FD0095E87F` |
| `sw.js` | `5E0ED536D3F0FC67C477803D653F6C9955514078E307CBB59559336F998B4ADD` |

backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260917-blue-hover-stability` و نسخه قبلی live در sibling path حفظ شدند. hashهای local، staging، active و public یکسان‌اند؛ taskهای `NIVASafe-API` و `NIVASafe-Nginx` Running، پورت ۵۰۴۴ listening و health با MySQL سالم باقی ماند. smoke عمومی HTTPS برای `/login`، `/projects`، `/fmea`، `/rula`، `/sw.js`، `/manifest.webmanifest` و `/api/v1/health` با HTTP 200 موفق شد.
## انتشار ثبات متن styled-select در تم آبی — 2026-09-17

پس از تأیید کاربر، انتشار frontend-only `release-20260917-styled-select-hover-stability` روی `C:\inetpub\nivasafe\app-com` فعال شد. rule مشترک `.styled-select-trigger` در تم آبی اکنون در hover و open شدن رنگ متن پایه را حفظ می‌کند؛ کنترل‌های header نیز همچنان با سطح تیره/نیمه‌شفاف و رنگ متن روشن خوانا باقی می‌مانند. API، schema، migration و سرویس backend تغییر نکردند و restart لازم نبود.

| artifact | SHA-256 |
|---|---|
| `index.html` | `6F8E54D952C0DE028C4CD5D376FB53412F381C5519AF0ECBED60FA58A20E5ADB` |
| `assets/index-CgLY0d0b.js` | `69D698181723347B6E63D3E060DB19267418D0A2592F4A78DCBF2920ED124FEF` |
| `assets/index-CPIPNVy5.css` | `A4B76C3BA3EBC43193A3D5359B3C0E87337BB5E69400675987C42BF04105548A` |
| `sw.js` | `5E0ED536D3F0FC67C477803D653F6C9955514078E307CBB59559336F998B4ADD` |

backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260917-styled-select-hover-stability` و نسخه قبلی live در sibling path حفظ شدند. hashهای local، staging، active و public یکسان‌اند؛ taskهای `NIVASafe-API` و `NIVASafe-Nginx` Running، پورت ۵۰۴۴ listening و health با MySQL سالم باقی ماند. smoke عمومی HTTPS برای `/login`، `/projects`، `/fmea`، `/rula`، `/sw.js`، `/manifest.webmanifest` و `/api/v1/health` با HTTP 200 موفق شد.

## انتشار نهایی ناوبری مرحله‌ای FMEA — 2026-09-19

پس از تأیید کاربر، release `release-20260919-fmea-wizard-navigation` روی سرور Windows مجاز فعال شد. build کامل working tree شامل ناوبری «مرحله قبل» از مرحله ۳ گزارش و نتایج به مرحله ۲ مرور و ثبت و از مرحله ۲ به مرحله ۱ اطلاعات فرآیند، همراه با تمام اصلاحات قبلی، روی static root و API فعال شد. frontend در `C:\inetpub\nivasafe\app-com`، backend در `C:\NIVASafe\backend\dist` و shared domain در `C:\NIVASafe\shared\domain\dist` به‌روزرسانی شدند.

| artifact | SHA-256 |
|---|---|
| `index.html` | `9E8A64736C395352A988B0A018901BD16D1DCF2D58E454C6B038557ED018A3FB` |
| `assets/index-BlE6-hhC.js` | `FC4A43DA8B0B8B40A9FDCE3D23D225E2366711A8ACEEB74E1A3036C5F96A66E7` |
| `assets/index-B_d4Doaw.css` | `32322440C3676B291DCC3CFD285058173E48A6D282CF2287293944C649062FB0` |
| `backend/dist/server.js` | `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0` |
| `backend/dist/modules/assessments.js` | `38A637F928CF9AD197E7A41EDBA28B048B23C99D879BC2AAAEDC1501A172EA2D` |
| `shared/domain/dist/index.js` | `67E427015BA6FFEA8F336E82351ABCA2C83A7B95338B3119737E0DF6919CED98` |

rollback در `C:\ProgramData\NIVASafe\backups\release-20260919-fmea-wizard-navigation` نگهداری شد و شامل frontend/backend/domain فعال، schema و migrationهای Prisma و dump دیتابیس `database\nivasafe-2026-09-19T10-09-57-230Z.sql` است. inventory دیتابیس با MariaDB بررسی شد و هر ۱۷ migration موجود در working tree از قبل با وضعیت موفق در `_prisma_migrations` ثبت شده بود؛ بنابراین migration جدیدی برای این release لازم نبود. PM2 API پس از reload روی `127.0.0.1:5044` online است و health با MySQL up پاسخ می‌دهد. smoke نهایی HTTPS برای `/`، `/login`، `/projects`، `/fmea`، `/rula`، `/actions`، `/manifest.webmanifest`، `/sw.js` و `/api/v1/health` همگی HTTP 200 بود.

## انتشار جایگزینی ArvanCloud AI — 2026-09-19

در release `release-20260919-arvancloud-ai` اتصال legacy هوش مصنوعی با provider سازگار با OpenAI در ArvanCloud جایگزین شد. کلید API فقط در environment سرور نگهداری می‌شود و در repository، build frontend یا پاسخ‌های API قرار نگرفته است. متغیرهای قدیمی `GAPGPT_API_KEY` و `GAPGPT_BASE_URL` از environment فعال حذف شدند و `ARVAN_BASE_URL` روی `https://api.arvancloudai.ir/v1` تنظیم شد.

مدل ریسک روی `DeepSeek-V4-Flash`، مدل گفت‌وگو روی `GPT-4o` و fallback ریسک نیز روی `GPT-4o` تنظیم شده است. فهرست مدل‌های provider با HTTP 200 دریافت شد و smoke مستقیم درخواست ریسک DeepSeek و گفت‌وگوی GPT-4o هر دو پاسخ غیرخالی با HTTP 200 برگرداندند. مسیر health API با MySQL سالم HTTP 200 است و PM2 پس از reload روی `127.0.0.1:5044` online باقی مانده است.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `76D58C9D1D7727E15418C2892E2ED0CB5359B07AD299B2908F4B21F8C187779A` |
| `frontend/dist/assets/index-CipggNix.js` | `912067028E219DDEE5940F86B66944DD0F4FF4A8F559E3388A4CCDD4DCB2E397` |
| `frontend/dist/assets/index-B_d4Doaw.css` | `32322440C3676B291DCC3CFD285058173E48A6D282CF2287293944C649062FB0` |
| `backend/dist/ai-provider.js` | `7EEF73EDC0BBFD62AEA7046C8B352A534435F2CAE70C88C858F4118D2076DCBD` |
| `backend/dist/modules/ai.js` | `6AADBE9A397CD3B60EDD64F463DE8331E7424C65B848EF9C1D4560C6CEF635BA` |
| `shared/domain/dist/index.js` | `67E427015BA6FFEA8F336E82351ABCA2C83A7B95338B3119737E0DF6919CED98` |

نسخه روی `C:\inetpub\nivasafe\app-com` و backend/shared domain روی `C:\NIVASafe` منتشر شد. rollback در `C:\ProgramData\NIVASafe\backups\release-20260919-arvancloud-ai` حفظ شده و شامل environment قبلی و artifactهای قابل بازگشت است. تست‌های ۱۶۱گانه، typecheck، lint، build، audit و `verify:release` با موفقیت اجرا شدند؛ smoke عمومی HTTPS و health نیز HTTP 200 تأیید شد.

## انتشار نمایش نام فرایند در جدول جزئیات کامل FMEA — 2026-09-19

در release `release-20260919-fmea-process-name-only` ستون «فرآیند / فعالیت» در جدول `fmea-report-data-table` اصلاح شد. این ستون اکنون فقط نام فرایند اصلی ارزیابی را از `report.assessment.processName` نمایش می‌دهد و دیگر `processStep`/توضیحات فعالیت هر ردیف را نشان نمی‌دهد. سایر ستون‌های جزئیات، عملیات، پیشنهادهای کنترلی و داده‌های گزارش بدون تغییر باقی ماندند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `C03ECBF4AFFE48343F05DFB1F77C3BA57B2736195E4E02833E7EF2A14DBE03B8` |
| `frontend/dist/assets/index-2DvZo5Tu.js` | `56B897B692696135FA75491815C0DF7AADF9F24F7B0F958DF83D5B1A8656732E` |
| `frontend/dist/assets/index-B_d4Doaw.css` | `32322440C3676B291DCC3CFD285058173E48A6D282CF2287293944C649062FB0` |

نسخه frontend روی `C:\inetpub\nivasafe\app-com` منتشر شد و rollback در `C:\ProgramData\NIVASafe\backups\release-20260919-fmea-process-name-only` نگهداری شد. backend، API، schema، migration و environment هوش مصنوعی تغییر نکردند و restart سرویس لازم نبود. `pnpm test` با ۱۶۲ تست، typecheck، lint، build و `verify:release` موفق شدند؛ smoke عمومی `/login`، `/fmea`، bundleهای جدید و `/api/v1/health` همگی HTTP 200 بودند.

## انتشار کوچک‌سازی دکمه‌های surface-actions — 2026-09-19

در release `release-20260919-surface-actions-compact` دکمه‌های مستقیم داخل `.surface-actions` کوچک‌تر شدند: اندازه متن و padding کاهش یافت، ارتفاع کنترل محدود شد و `white-space: nowrap` از شکستن متن «افزودن اقدام دستی» جلوگیری می‌کند. رفتار و دسترسی دکمه‌ها، سایر بخش‌های گزارش و backend بدون تغییر باقی ماندند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `A2191EA78F9229808B51F52C6DAF5647F07DC33C0A80F6658DD9D4CD89E4C922` |
| `frontend/dist/assets/index-BsNU_mQW.js` | `56B897B692696135FA75491815C0DF7AADF9F24F7B0F958DF83D5B1A8656732E` |
| `frontend/dist/assets/index-CkpEKXur.css` | `D927A8E01BD9DF62F49ADE03DEDAA29D0DE1E977E00C0429031C1BACB462AA17` |

نسخه frontend روی `C:\inetpub\nivasafe\app-com` منتشر شد و rollback در `C:\ProgramData\NIVASafe\backups\release-20260919-surface-actions-compact` نگهداری شد. backend، API، schema، migration و environment هوش مصنوعی تغییر نکردند و restart لازم نبود. تست‌های ۱۶۲گانه، typecheck، lint، build و `verify:release` موفق شدند؛ smoke عمومی `/login`، `/fmea`، bundleهای جدید و `/api/v1/health` همگی HTTP 200 بودند.

## انتشار باندهای ریسک FMEA مطابق مرجع — 2026-09-19

در release `release-20260919-fmea-risk-bands` طبقه‌بندی RPN در کل مسیر FMEA یکسان شد: خیلی کم `1–50`، کم `51–100`، متوسط `101–200`، بالا `201–400` و بحرانی `بیش از 400`. پنل `score-panel` در افزودن و ویرایش ردیف، علاوه بر RPN، badge سطح ریسک را به‌صورت زنده نشان می‌دهد. API همچنان مرجع نهایی محاسبه است، گزارش و فیلترها مقدار `VERY_LOW` را به‌عنوان سطح مستقل حفظ می‌کنند و خروجی‌های گزارش نیز این سطح را جداگانه نمایش می‌دهند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `3A5B14E650A0D673FE1E2A057A9117D67ACB46819D044CB1D06527C7F960BCAB` |
| `frontend/dist/assets/index-O4_69G3C.js` | `C3A1DC320CABD99D499490F1FFEBAEA0F4B3D5398F130031AD5EE9F55766AC4F` |
| `frontend/dist/assets/index-BmafRbyh.css` | `F61B124BA70122D67CB374C85CB57BDC5451B07192D4197F69FF57987E445077` |
| `backend/dist/fmea-report.js` | `B7BFD79A8AE5F955F624F58F3FB9E545D86F2837712B2F85B2D19590E8F750D1` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |
| `migration.sql` | `C93A07CD2079EC12FAE2751BFFE87D49732C6CC549601C4ACCA3547C5E87140B` |

سرویس API پیش از migration متوقف شد، migration با client پشتیبانی‌شده MariaDB روی production اعمال و در `_prisma_migrations` ثبت شد، سپس frontend/backend/shared-domain فعال و task `NIVASafe-API` دوباره اجرا شد. مقادیر پیش‌فرض سازمان `101/201/401`، enum شامل `VERY_LOW` و hashهای فعال بررسی شدند؛ taskهای API/Nginx در وضعیت Running، health داخلی HTTP 200 و smoke عمومی `/login`، `/fmea` و `/api/v1/health` همگی HTTP 200 بودند. rollback کامل و dump پایگاه‌داده در `C:\ProgramData\NIVASafe\backups\release-20260919-fmea-risk-bands` نگهداری شد. آزمون استاندارد Prisma به‌دلیل ناسازگاری `auth_gssapi_client` در engine اجرا نشد، اما همان SQL با client MariaDB سرور اعمال و verification شد؛ این تفاوت در مستندات ثبت شده است.

## انتشار آخرین نسخه working tree و تثبیت فرایند API — 2026-09-20

در release `release-20260920-latest-v3` آخرین build تأییدشده working tree شامل frontend، backend و shared-domain روی سرور مجاز منتشر شد. نسخه قدیمی که توسط یک process مستقل و خارج از PM2 پورت API را اشغال کرده بود متوقف و با process فعلی `pm2-runtime` تحت task `NIVASafe-API` جایگزین شد.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `3A5B14E650A0D673FE1E2A057A9117D67ACB46819D044CB1D06527C7F960BCAB` |
| `frontend/dist/assets/index-O4_69G3C.js` | `C3A1DC320CABD99D499490F1FFEBAEA0F4B3D5398F130031AD5EE9F55766AC4F` |
| `frontend/dist/assets/index-BmafRbyh.css` | `F61B124BA70122D67CB374C85CB57BDC5451B07192D4197F69FF57987E445077` |
| `backend/dist/server.js` | `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0` |
| `backend/dist/app.js` | `C21461F2B29AE1605DBC6F2729D568F90812C054F861FEA3F89E7021B987B88A` |
| `backend/dist/modules/dashboard.js` | `DF740D77B27F792DE385E0680C1E8957D15E2537F690E41A1874B4E925B91D49` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |

هیچ migration جدیدی لازم نبود؛ schema موجود و migration `202609190001_fmea_risk_bands` حفظ شدند و Prisma Client روی سرور regenerate شد. rollback در `C:\ProgramData\NIVASafe\backups\release-20260920-latest-v3` نگهداری شد. تنها یک listener تحت PM2 روی `127.0.0.1:5044` فعال است، health داخلی `healthy/up` و public HTTPS smoke برای `/login`، `/fmea`، `/rula` و `/api/v1/health` همگی HTTP 200 هستند؛ taskهای `NIVASafe-API` و `NIVASafe-Nginx` نیز Running هستند.

## انتشار مسیریابی مدل‌های هوش مصنوعی — 2026-09-20

در release `release-20260920-ai-model-routing` environment فقط روی سرور به‌روزرسانی شد: گفت‌وگوی مسیر `/assistant` اکنون از `DeepSeek-V4-Flash` استفاده می‌کند و درخواست‌های ارزیابی و سایر تحلیل‌های ریسک از `GPT-5-Mini` استفاده می‌کنند؛ fallback ریسک نیز روی `GPT-5-Mini` باقی مانده است. کلید ArvanCloud در environment سرور باقی ماند و در repository، frontend یا خروجی smoke نمایش داده نشد.

قبل از تغییر، فایل environment در `C:\ProgramData\NIVASafe\backups\release-20260920-ai-model-routing\.env` backup شد. API زیر task `NIVASafe-API` restart شد، process قدیمی‌ای که پورت `5044` را اشغال کرده بود متوقف شد و پس از تثبیت، فقط یک listener تحت PM2 روی `127.0.0.1:5044` باقی ماند. health داخلی با MySQL `healthy/up`، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و smoke واقعی از کد API برای هر دو مسیر با پاسخ غیرخالی و modelهای `gpt-5-mini-2025-08-07` و `DeepSeek-V4-Flash` موفق شد.

## انتشار تحلیل تصویر فرآیند FMEA — 2026-09-20

در release `release-20260920-fmea-process-image-ai` فیلد اختیاری تصویر به مرحله «اطلاعات فرآیند» FMEA اضافه شد. تصویرهای JPG/PNG/WEBP تا ۱۰ مگابایت پس از بررسی نوع و امضای فایل به مسیر احراز هویت‌شده `/api/v1/fmea/process-image-analysis` ارسال می‌شوند؛ provider ریسک ArvanCloud پیام چندوجهی را با مدل `GPT-5-Mini` پردازش می‌کند و حداکثر شش ردیف خطر پیشنهادی را به‌صورت پیش‌نویس برمی‌گرداند. کاربر باید هر ردیف را صریحاً به «مرور و ثبت» اضافه و بررسی کند؛ خروجی AI خودکار در ارزیابی ذخیره نمی‌شود. پس از ثبت ارزیابی، تصویر انتخاب‌شده از مسیر tenant-scoped فایل‌ها با `entityType=FmeaAssessment` ذخیره می‌شود.

هیچ migration یا تغییر schema لازم نبود. قبل از جایگزینی، backup کامل frontend/backend/shared-domain در `C:\ProgramData\NIVASafe\backups\release-20260920-fmea-process-image-ai` نگهداری شد. artifactهای جدید ابتدا در staging سرور کپی، سپس frontend فعال و backend/shared-domain جایگزین شدند؛ تنها task `NIVASafe-API` restart شد و `NIVASafe-Nginx` بدون توقف باقی ماند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `9DA4FF47A8C5277CA9A9082FEE29B8F73049F4C4B144F3BA547E2BBF12DEDC13` |
| `frontend/dist/assets/index-BPAhfsoe.js` | `C0302F0E84C7C3A7BCD8D3A54E97965BC0119ED4BAF7CF4EBD9DF931B46947AE` |
| `frontend/dist/assets/index-B4ABWy7O.css` | `181E4E577DC8EFD3212CD0F2609440BE6AFDEF3F44B04B651AA4374CD01C58F7` |
| `backend/dist/modules/assessments.js` | `E6321DB3D0F62EC3623C2B950F098C2F30CA0BA6255DE80C519FC23BBCAC319E` |
| `backend/dist/modules/files.js` | `378D3B7FFCC25B7C8E4B3AE90CAEC79F8AA3F3C9C772B89012523CD15E4481E0` |
| `backend/dist/ai-provider.js` | `25744FFDD4B38269A4600F256948C641056256EDEA07EDFF114DE84CAFE92FB9` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |

health داخلی API با MySQL `healthy/up` و taskهای API/Nginx در وضعیت Running تأیید شد. smoke عمومی HTTPS برای `/login`، `/fmea`، `/rula`، manifest، service worker و `/api/v1/health` با HTTP 200 موفق بود؛ bundle عمومی شامل UI آپلود تصویر و مسیر تحلیل FMEA بود. smoke مستقیم provider چندوجهی با تصویر PNG کوچک نیز با HTTP 200 و مدل برگشتی `gpt-5-mini-2025-08-07` موفق شد.

## انتشار گزینه ایجاد پروژه در انتخاب‌گر پروژه FMEA — 2026-09-20

در release `release-20260920-fmea-project-selector` در مرحله «اطلاعات فرآیند» FMEA، گزینه محلی‌سازی‌شده «پروژه جدید» به انتخاب‌گر پروژه اضافه شد. انتخاب این گزینه کاربر را به `/projects` می‌برد؛ گزینه‌های پروژه موجود، مقدار اجباری پروژه و رفتار ثبت ارزیابی بدون تغییر باقی ماندند. این انتشار فقط frontend بود و هیچ تغییر API، schema، migration یا restart سرویس لازم نداشت.

نسخه روی `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260920-fmea-project-selector` نگهداری شد. hashهای local/staging/active برای `index.html`، JavaScript و CSS به‌ترتیب `58BDF80EAEC5DC996523862361D3AD58F225C54F7A750479BF6956331A556D11`، `47774E8105CC4FA147113BFB60A5D855A33A3C3477101FC9E86D1C27E463AF48` و `181E4E577DC8EFD3212CD0F2609440BE6AFDEF3F44B04B651AA4374CD01C58F7` تطبیق داده شدند. bundle فعال markerهای `__create_project__` و `/projects` را دارد؛ health داخلی HTTP 200، تنها listener پورت `127.0.0.1:5044` و taskهای `NIVASafe-API`/`NIVASafe-Nginx` در وضعیت Running تأیید شدند. smoke عمومی HTTPS برای `/login`، `/projects`، `/fmea`، manifest، service worker، bundle جدید و `/api/v1/health` همگی HTTP 200 بود.

## انتشار همسان‌سازی عنوان شغل/فرآیند و پیشنهاد عنوان با هوش مصنوعی — 2026-09-20

در release `release-20260920-fmea-job-title-ai`، عنوان «عنوان شغل / فرآیند» در مرحله «اطلاعات فرآیند» FMEA با همان label، فونت، فاصله و کنترل ورودی استفاده‌شده برای پروژه و واحد/بخش همسان شد. کنار ورودی یک اقدام صریح برای «پیشنهاد عنوان‌های بیشتر با هوش مصنوعی» اضافه شد؛ درخواست به مسیر احراز هویت‌شده `/api/v1/fmea/process-suggestions` با `mode=job-titles` ارسال می‌شود، خروجی حداکثر هشت عنوان کوتاه و یکتا را برمی‌گرداند و هر پیشنهاد فقط پس از انتخاب کاربر وارد فرم می‌شود. عنوان‌های قبلی کاربر و عنوان‌های catalog در prompt کنار گذاشته می‌شوند و هیچ عنوانی به‌صورت خودکار ثبت نمی‌شود.

برای این تغییر migration یا تغییر schema لازم نبود. artifactهای frontend، backend و shared-domain ابتدا در `C:\ProgramData\NIVASafe\staging\release-20260920-fmea-job-title-ai` قرار گرفتند و قبل از جایگزینی نسخه فعال در `C:\inetpub\nivasafe\app-com`، backup کامل در `C:\ProgramData\NIVASafe\backups\release-20260920-fmea-job-title-ai` نگهداری شد. پس از جایگزینی backend، task `NIVASafe-API` restart شد؛ `NIVASafe-Nginx` بدون تغییر باقی ماند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `3AE2D967702C5F86450D8B5DA36860B5D53827DB6D75773261991A3416C7A9C6` |
| `frontend/dist/assets/index-CnQ7Rh3I.js` | `E9D0C72991AD4F1FDD63A52C3D3EF6786FC436FFAC4EDFEEC011173AE00BF17C` |
| `frontend/dist/assets/index-CSdTbSOS.css` | `DB1FD75F41629301CF4B98FCF6F8B95A5B33177B3A73A3BE95F0FB27B4C932C7` |
| `backend/dist/modules/assessments.js` | `4B1D95D8396CEBCFE46E25A35E332E68B2F418F167A0570F2CC14766F460667D` |
| `backend/dist/fmea-process.js` | `BE198CE67F1C0996DF52606C38F44EFE4FC55E68363F5A1B1B7D661E64C3F909` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |

local/staging/active hashها برای artifactهای جدید تطبیق داده شدند. markerهای `job-titles` و `fmea-job-ai-suggestions` در bundle فعال frontend و markerهای route/prompt در backend تأیید شدند. health داخلی API با HTTP 200، تنها listener روی `127.0.0.1:5044`، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و smoke عمومی HTTPS برای `/login`، `/projects`، `/fmea`، `/rula`، manifest، service worker و `/api/v1/health` با HTTP 200 تأیید شدند. تست‌های 165گانه، typecheck، lint، build، contract verification و release verification نیز PASS هستند.

## انتشار دستیار تکمیل خودکار اطلاعات فرآیند FMEA — 2026-09-20

در release `release-20260920-fmea-filling-assistant`، پس از انتخاب پروژه و واردکردن عنوان شغل/فرآیند، دستیار FMEA به‌صورت اختیاری واحد/بخش، شرح کوتاه فعالیت، شرایط خاص کار و پیشنهادهای فرآیند را از مسیر احراز هویت‌شده `/api/v1/fmea/process-suggestions` با `mode=autofill` دریافت می‌کند. همه مقادیر در فرم قابل ویرایش هستند؛ ویرایش دستی کاربر بر پاسخ دیرهنگام هوش مصنوعی اولویت دارد. گزینه «دستیار FMEA» در همان فرم امکان روشن/خاموش‌کردن قابلیت را دارد و ترجیح آن به‌صورت محلی در مرورگر ذخیره می‌شود. خروجی سرور محدود و پاک‌سازی می‌شود و در صورت در دسترس نبودن provider، مقدارهای زمینه/کاتالوگ به‌عنوان fallback ارائه می‌شوند.

این تغییر به migration یا تغییر schema نیاز نداشت. artifactها ابتدا در `C:\ProgramData\NIVASafe\staging\release-20260920-fmea-filling-assistant` قرار گرفتند و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260920-fmea-filling-assistant` نگهداری شد. frontend در `C:\inetpub\nivasafe\app-com` فعال شد؛ task `NIVASafe-API` برای بارگذاری route و parser جدید restart شد و `NIVASafe-Nginx` بدون توقف باقی ماند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `419F93E6A8919D20B255F01A411C2FDC96810CB2785D18558EF6283983D9218E` |
| `frontend/dist/assets/index-CcH-NXf4.js` | `2D55A82A765E3FC6D63B2FD22D72A0A0C305AB420356381913FB206AA14A01DD` |
| `frontend/dist/assets/index-DJ1xbTAu.css` | `B71978626D1629F858299E7D0C41EC8BA6131FF30B6A10EEB43C6AD2D19C0CBB` |
| `backend/dist/modules/assessments.js` | `B7B7078BD4EEFB9F28789CA2370E421EC69C613CFD242D96C61C45C664F346F8` |
| `backend/dist/fmea-process.js` | `FFD98DD327C5166A7E8EB1EECC66BB723E6F268898FBB3C7A53A93B09A9C91B4` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۶ مورد (به‌ترتیب ۷۴، ۸۲ و ۱۰) PASS شدند و typecheck، lint، production build، API contract verification و ۲۶ بررسی release نیز موفق بودند. hashهای local/staging/active تطبیق داده شدند؛ markerهای `fmea-assistant-toggle` و `fmea-autofill-banner` در bundle فعال frontend و markerهای route/prompt/parser در backend تأیید شدند. health داخلی با MySQL در وضعیت `healthy/up`، تنها listener روی `127.0.0.1:5044`، taskهای API/Nginx در وضعیت Running و smoke عمومی HTTPS برای application routes، PWA assets، bundleهای جدید و `/api/v1/health` با HTTP 200 تأیید شد.

## انتشار پیمایش فرم اقدام دستی گزارش FMEA — 2026-09-20

در release `release-20260920-fmea-action-form-scroll`، دکمه «افزودن اقدام دستی» در گزارش FMEA فرم ثبت اقدام موجود را باز می‌کند، صفحه را با فاصله مناسب از هدر ثابت به فرم اسکرول می‌دهد و ورودی عنوان اقدام را برای شروع سریع آماده می‌کند. این رفتار برای انتخاب «استفاده از پیشنهاد» نیز مشترک است، به تنظیم reduced-motion مرورگر احترام می‌گذارد و منطق ثبت، API و فیلدهای فرم بدون تغییر باقی مانده‌اند.

این انتشار فقط frontend بود و migration، schema یا restart سرویس لازم نداشت. نسخه جدید در `C:\inetpub\nivasafe\app-com` فعال شد و backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260920-fmea-action-form-scroll` نگهداری شد.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `A5466E289CA46A4CC11AA5AF06758956C74C8F2F018BDEB58C95FDCB31428B97` |
| `frontend/dist/assets/index-koHPEyTL.js` | `1559A7524DFF02C4664DAF04C31BAA89AF4A4B1568C2F57B0B19C901DEA67414` |
| `frontend/dist/assets/index-BTaBi0Mh.css` | `4107ECC4D047880211A5CBFFA96830912EF4DAF41A6B5DF5B61C6A1CF25A8FEC` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۶ مورد (به‌ترتیب ۷۴، ۸۲ و ۱۰) PASS شدند؛ typecheck، lint و production build نیز موفق بودند. hashهای local/staging/active تطبیق داده شدند، markerهای پیمایش فرم و CSS فاصله از هدر در bundle فعال تأیید شدند، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running باقی ماندند و smoke عمومی HTTPS برای `/`، `/fmea`، assetهای جدید و `/api/v1/health` با HTTP 200 تأیید شد.

## انتشار جزئیات کامل FMEA، عملیات مشاهده/ویرایش و پیش‌نویس هوش مصنوعی — 2026-09-20

در release `release-20260920-fmea-report-details-ai`، جدول «جزئیات کامل FMEA» در ستون عملیات دو کنترل مستقل دارد: مشاهده جزئیات کامل ردیف در یک dialog دسترس‌پذیر و ویرایش همان ردیف با استفاده از API موجود و کنترل مجوز tenant. بخش جدید «جزئیات پیشنهادی هوش مصنوعی» با زمینه ارزیابی، پروژه، عنوان شغل/فرآیند و ردیف‌های فعلی درخواست تولید می‌کند؛ پاسخ سرور حداقل پنج و حداکثر هشت پیش‌نویس محدودشده را برمی‌گرداند. پیش‌نویس‌ها قبل از ثبت قابل ویرایش هستند و فقط با انتخاب صریح کاربر به ارزیابی اضافه می‌شوند. در نبود provider یا پاسخ معتبر، پنج پیشنهاد deterministic و غیرحساس تولید می‌شود؛ پیشنهادها به‌صورت خودکار در پایگاه‌داده ثبت نمی‌شوند و مصرف AI و رویداد audit ثبت می‌شود.

این انتشار migration یا تغییر schema نداشت. frontend، backend و shared-domain ابتدا در `C:\ProgramData\NIVASafe\staging\release-20260920-fmea-report-details-ai` کپی شدند و backup کامل نسخه فعال در `C:\ProgramData\NIVASafe\backups\release-20260920-fmea-report-details-ai` نگهداری شد. پس از جایگزینی artifactها، task `NIVASafe-API` با ابزار task خود سرور restart شد؛ `NIVASafe-Nginx` متوقف نشد. API با MySQL سالم روی `127.0.0.1:5044` و هر دو task در وضعیت Running تأیید شدند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `6A3C2ADCB05D077E7A9E0DC8B909340FD7530A53CC9350163D65F6F33F6022CD` |
| `frontend/dist/assets/index-BvVIWq41.js` | `6B154AB4AC02309DF0302ABCEA1F5C3EB04AB9E8FB66DD93DCBAFBB31F2315CA` |
| `frontend/dist/assets/index-BvHPhVdf.css` | `52AE0E4C93B16D38EE43371B0340FEC9692D490ADE113DF7B042D6F1023190BA` |
| `backend/dist/server.js` | `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0` |
| `backend/dist/modules/reports.js` | `00905830A0D0165F2CFDF763FA2074F68CEA9AC396D22B2922AE5A8BF55F6643` |
| `backend/dist/fmea-report.js` | `793B9B48F438A6072FE2A7CB02374276BC292D9B89AD889EB8CC7B13E36E8D58` |
| `backend/dist/ai-usage.js` | `102A42722207220D43FD8E2E7439984926E5BA3618EEFB2C2B7E3D9EF6C07207` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۸ مورد (به‌ترتیب ۷۴، ۸۴ و ۱۰) PASS شدند؛ typecheck، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend و release verification با ۲۶ بررسی نیز موفق بودند. markerهای مشاهده/ویرایش و `report/detail-suggestions` در bundle فعال، markerهای route/prompt و `FMEA_REPORT_DETAIL_SUGGESTIONS` در backend، hashهای local/active و backup rollback تأیید شدند. smoke عمومی HTTPS برای ریشه سامانه و `/api/v1/health` با HTTP 200 و بدنه health شامل MySQL=`up` موفق شد.

## انتشار اصلاح دسترس‌پذیری dialog و bundle گزارش FMEA — 2026-09-21

در release `release-20260921-fmea-report-details-ai-a11y`، برچسب دسترس‌پذیر dialog ویرایش جزئیات FMEA اصلاح شد تا کنترل‌های کمکی صفحه‌خوان به عنوان قابل مشاهده dialog ارجاع ندهند. قابلیت مشاهده/ویرایش ردیف‌ها و پنل تولید حداقل پنج پیش‌نویس قابل ویرایش هوش مصنوعی بدون تغییر حفظ شدند.

این انتشار فقط frontend بود؛ migration، schema و restart API لازم نبود. قبل از جایگزینی، backup جدید در `C:\\ProgramData\\NIVASafe\\backups\\release-20260921-fmea-report-details-ai-a11y` نگهداری شد و نسخه frontend در `C:\\inetpub\\nivasafe\\app-com` فعال شد. taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running باقی ماندند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `F03E80DB145A790634ACC803D7C6DFC07273C2556BBD61C123B38768D6809EBD` |
| `frontend/dist/assets/index-QSbBEUPF.js` | `82BB7F6685D575507F9201F53174EA8D82746DBD4526547CBE43DDE11F8A2F58` |
| `frontend/dist/assets/index-BvHPhVdf.css` | `52AE0E4C93B16D38EE43371B0340FEC9692D490ADE113DF7B042D6F1023190BA` |

hash‌های local/active تطبیق داده شدند و smoke عمومی HTTPS برای ریشه سامانه و `/api/v1/health` با HTTP 200 موفق شد؛ health داخلی نیز MySQL=`up` را گزارش کرد.

## انتشار جست‌وجوی درون‌کادر عنوان شغل/فرآیند FMEA — 2026-09-21

در release `release-20260921-fmea-inline-job-search`، فیلد «عنوان شغل / فرآیند» به یک combobox یکپارچه تبدیل شد. نتایج بانک مشاغل، پیشنهادهای محدودشده هوش مصنوعی و گزینه عنوان سفارشی داخل همان dropdown باز فیلد نمایش داده می‌شوند؛ پنل بزرگ و دکمه جداگانه پیشنهاد عنوان حذف شد. عنوان‌های AI پس از دریافت پاسخ معتبر، با بررسی نرمال‌سازی و تکراری‌بودن در `JobCatalog` با `organizationId` سازمان ذخیره می‌شوند تا در جست‌وجوهای بعدی همان سازمان قابل استفاده باشند. انتخاب صریح کاربر همچنان برای استفاده از عنوان در ارزیابی لازم است و پاسخ‌های AI بدون انتخاب به ارزیابی متصل نمی‌شوند.

این انتشار از جدول و route موجود `JobCatalog` استفاده می‌کند و migration یا تغییر schema ندارد. قبل از جایگزینی، frontend، backend و shared-domain در `C:\ProgramData\NIVASafe\staging\release-20260921-fmea-inline-job-search` قرار گرفتند و backup نسخه فعال در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-inline-job-search` نگهداری شد. frontend در `C:\inetpub\nivasafe\app-com` فعال شد و task `NIVASafe-API` پس از انتشار restart شد؛ `NIVASafe-Nginx` متوقف نشد.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `411D66BE338246E8228FD44C78A5C97BF3559D70787674AC3B3AADC3E78A90F4` |
| `frontend/dist/assets/index-D22Xa7O8.js` | `E18864FAEAE514808A08312CAD3485E608BB01C296F413698A3A4C621990A15A` |
| `frontend/dist/assets/index-BFSDs95q.css` | `86DEA00A93678F1759D33B2A66B023674BFE1773F22E859AD02AC07674CDC448` |
| `backend/dist/modules/assessments.js` | `F7416C798C2B33DC1B944C0B6AD4142CDCB0E29A82B90C4D3161816E77EE0FBE` |
| `backend/dist/fmea-process.js` | `18446E9B64A8628DED3294145085C02794A4DF12082B7F482FA81476FAD3DB43` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۸ مورد (به‌ترتیب ۷۴، ۸۴ و ۱۰) PASS شدند. typecheck هر دو بخش، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend و بررسی `git diff --check` موفق بودند؛ backend برای release در خروجی build ایزوله compile شد. تطبیق hashهای local/staging/active، markerهای حذف پنل قدیمی و persistence عنوان AI تأیید شد. API داخلی با MySQL=`up`، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و smoke عمومی HTTPS برای `/login`، `/fmea` و `/api/v1/health` با HTTP 200 تأیید شد.

## انتشار پیمایش خودکار پنل‌ها و حرکت Enter بین فیلدها — 2026-09-21

در release `release-20260921-form-navigation-scroll`، رفتار مشترک فرم‌ها اضافه شد: Enter از هر input قابل‌ویرایش به کنترل visible بعدی همان form می‌رود و در آخرین فیلد submit عادی حفظ می‌شود. triggerهای مشخص‌شده برای پنل‌های درون‌صفحه‌ای، از جمله تنظیم چیدمان داشبورد، ویرایش کاربر در پنل مدیریت و ویرایش عضو سازمان، پس از بازشدن به فرم اسکرول می‌شوند و اولین input را آماده می‌کنند. رفتار قبلی اسکرول فرم اقدام دستی FMEA بدون تغییر باقی ماند. کنترل‌های hidden/disabled، textareaهای چندخطی و dialogهای ثابت از مسیر عمومی کنار گذاشته شدند.

این انتشار فقط frontend بود؛ migration، schema، API و restart سرویس لازم نبود. artifactها ابتدا در `C:\ProgramData\NIVASafe\staging\release-20260921-form-navigation-scroll` قرار گرفتند، backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260921-form-navigation-scroll` نگهداری شد و frontend در `C:\inetpub\nivasafe\app-com` فعال شد. taskهای `NIVASafe-API` و `NIVASafe-Nginx` بدون توقف Running باقی ماندند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `8413348BFA7A96D0BFF022B30DEA6E1D0F421DDA75006F72B0B71109C5A44704` |
| `frontend/dist/assets/index-fX12iAvE.js` | `2DDBC9079F30A1A55249DC0E260EAC4276C0F5749BAA78BD1F49498A04AA1503` |
| `frontend/dist/assets/index-mbVOILbs.css` | `111066C2B08A7864C9D807C719A9209F7EAA5A68642339F6F04B271BCD1D9A15` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد (به‌ترتیب ۷۵، ۸۴ و ۱۰) PASS شدند؛ typecheck، lint، production build و `verify:release` با ۲۶ بررسی موفق بودند. hashهای local/staging/active تطبیق داده شدند، API health با MySQL=`up` پاسخ داد و smoke عمومی HTTPS برای `/login`، `/fmea`، assetهای جدید و `/api/v1/health` همگی HTTP 200 بودند.

## انتشار نام برنامه PWA — 2026-09-21

در release `release-20260921-pwa-app-name`، مقدار `name` در manifest نصب‌شونده به `NIVASafe` تغییر کرد؛ `short_name` نیز `NIVASafe` باقی ماند و متن توضیحی فقط در فیلد مستقل `description` حفظ شد. این تغییر فقط frontend/manifest بود و هیچ API، schema، migration یا restart سرویس لازم نداشت.

artifact در `C:\ProgramData\NIVASafe\staging\release-20260921-pwa-app-name` قرار گرفت، نسخه قبلی manifest در `C:\ProgramData\NIVASafe\backups\release-20260921-pwa-app-name` نگهداری شد و فایل جدید در `C:\inetpub\nivasafe\app-com\manifest.webmanifest` فعال شد.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/manifest.webmanifest` | `FC69578CBB95E7F22D5EE4EFC07BD6E3218590BCD0FDF751727565A5D1CBAC32` |

تست قرارداد PWA، `verify:release` با ۲۶ بررسی و production build موفق شدند. hashهای local/staging/active manifest یکسان هستند و smoke عمومی `manifest.webmanifest` با HTTP 200، `Cache-Control: no-cache` و مقادیر `name` و `short_name` برابر `NIVASafe` تأیید شد.

## رفع خطای 404 مسیر پیشنهاد جزئیات FMEA و پایداری AI — 2026-09-21

در release `release-20260921-fmea-404-ai-runtime`، علت خطای 404 در بخش «پیشنهاد جزئیات FMEA با هوش مصنوعی» مشخص شد: یک فرایند قدیمی و خارج از PM2، پورت `127.0.0.1:5044` را در اختیار داشت و اجازه نمی‌داد نسخه API دارای route جدید پاسخ دهد. پس از تهیه backup کامل، artifactهای frontend، backend و shared-domain نسخه اعتبارسنجی‌شده در staging قرار گرفتند، فرایند orphan با بررسی command line متوقف شد، task `NIVASafe-API` با PM2 دوباره راه‌اندازی شد و `NIVASafe-Nginx` متوقف نشد.

در backend، مسیر `POST /api/v1/fmea/:id/report/detail-suggestions` در صورت خطای provider، timeout یا پاسخ نامعتبر، پیشنهادهای deterministic آماده‌شده را حفظ می‌کند و با وضعیت fallback پاسخ قابل استفاده می‌دهد؛ بنابراین در دسترس نبودن سرویس خارجی، صفحه را به خطای ناموفق تبدیل نمی‌کند. تنظیمات provider فعال شامل `ARVAN_BASE_URL`، مدل گفت‌وگو `DeepSeek-V4-Flash` و مدل ارزیابی `GPT-5-Mini` باقی ماندند؛ مقدار secret در گزارش ثبت نشده است.

backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-404-ai-runtime` نگهداری شد. بررسی پس از انتشار نشان داد health داخلی و عمومی HTTP 200 هستند، مسیر FMEA بدون احراز هویت HTTP 401 (و نه 404) برمی‌گرداند، فقط یک فرایند API روی پورت 5044 فعال است و artifact frontend فعال با نسخه منتشرشده تطبیق دارد.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `CB0EA74642E050B61F851B9D85C331B794AC04260E9E5389818443A2A9C2D892` |
| `frontend/dist/assets/index-D2QHjPX4.js` | `7892D6D02833ADFE3D2D31616D1A5B7AE17BAC0394B9D6D4568E2A8FDB20A2F6` |
| `frontend/dist/assets/index-mbVOILbs.css` | `111066C2B08A7864C9D807C719A9209F7EAA5A68642339F6F04B271BCD1D9A15` |
| `backend/dist/modules/reports.js` | `59CEB7C6AE0F75F38446CFA9ACD1E8D1E577F0EDEC889C7A9F1A9D19D0138C40` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |

## تولید خودکار جزئیات FMEA و تراز عملیات جدول — 2026-09-21

در release `release-20260921-fmea-auto-details-actions`، پنل «پیشنهاد جزئیات FMEA با هوش مصنوعی» پس از بازشدن گزارش به‌صورت خودکار درخواست می‌دهد و پنج پیش‌نویس جزئیات را برای زمینه پروژه و فرایند نمایش می‌دهد؛ دیگر دکمه‌ای برای ساخت دستی پنج مورد وجود ندارد. کنترل پنل اکنون «افزودن فرایند جدید» است و با هر کلیک یک ردیف پیش‌نویس قابل ویرایش با زمینه همان فرایند به فهرست اضافه می‌کند. ثبت هر ردیف همچنان با انتخاب صریح کاربر و دکمه «افزودن به ارزیابی» انجام می‌شود.

در جدول جزئیات کامل FMEA، سلول عملیات و container آیکون‌های مشاهده و ویرایش به‌صورت صریح `text-align: center`، `width: 100%` و `margin-inline: auto` دریافت کردند تا در RTL به خط کناری نچسبند و در اندازه‌های کوچک نیز داخل ستون باقی بمانند. این انتشار فقط frontend بود؛ migration، schema و restart API لازم نبود. backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-auto-details-actions` نگهداری شد و frontend جدید در `C:\inetpub\nivasafe\app-com` فعال شد.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `9B9AA2E17DCF8DC4C05607905BC7D46EE0B26E6F9BD0876F4FCA91BFC4FA5A0E` |
| `frontend/dist/assets/index-thQF97yR.js` | `668099AD3B31A36A8A2FCF9E59501A90F2416D7C1E323C0447E485031C7E6A0E` |
| `frontend/dist/assets/index-BpkH9_h7.css` | `D1E0DB77144250181E12360D631B6BB942C836AB5BC7ABBB7578E020E757D100` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد (به‌ترتیب ۷۵، ۸۴ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend، و release verification با ۲۶ بررسی موفق بودند. در bundle فعال عبارت جدید «Add new process» و marker عملیات جدول تأیید شد و عبارت قدیمی ساخت دستی جزئیات در bundle مرجع index وجود ندارد. smoke عمومی HTTPS برای `/fmea` و `/api/v1/health` با HTTP 200 موفق شد.

## حذف بنر خاموش دستیار در ویرایش FMEA — 2026-09-21

در release `release-20260921-fmea-edit-autofill-banner`، بنر `fmea-autofill-banner disabled` از مرحله «اطلاعات فرآیند» حذف شد. در حالت ویرایش ارزیابی FMEA یا زمانی که دستیار خاموش است، این بنر دیگر render نمی‌شود و فضای اضافی ایجاد نمی‌کند؛ کنترل اصلی وضعیت دستیار همچنان در ردیف `page-header` باقی می‌ماند.

این انتشار فقط frontend بود؛ migration، schema و restart API لازم نبود. نسخه فعال پیش از جایگزینی در backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-edit-autofill-banner` نگهداری شد و frontend جدید در `C:\inetpub\nivasafe\app-com` فعال شد.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `0B23D008306864A3646771637E16FA0EB09CF6DA3CA770BB8D7306F0F2759CC5` |
| `frontend/dist/assets/index-DsDDEAYI.js` | `9E6F31EBED07BE465D877C24190CEEB1116FA1E4133F06B1459865AC8D1B1513` |
| `frontend/dist/assets/index-CFpNAE4i.css` | `A075590BADC5D60205F84613FDE10F2DFD348287F4A4F2334F25DD21D7FBD59B` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد (به‌ترتیب ۷۵، ۸۴ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend، و release verification با ۲۶ بررسی موفق بودند. markerهای حذف کلاس، ترجمه و CSS بنر خاموش در bundle فعال وجود ندارند. smoke عمومی HTTPS برای `/fmea` و `/api/v1/health` با HTTP 200 موفق شد.

## انتقال تصویر فرآیند کنار واحد/بخش — 2026-09-21

در release `release-20260921-fmea-process-image-field`، ورودی «تصویر فرآیند یا محیط کار» در شبکه فرم اطلاعات فرآیند کنار ورودی «واحد / بخش» قرار گرفت. قاب انتخاب تصویر، عنوان اختیاری، فونت، حاشیه، ارتفاع و حالت focus آن با کنترل‌های متنی فرم هماهنگ شد و در اندازه‌های کوچک به چیدمان تک‌ستونه برمی‌گردد؛ قابلیت preview، حذف تصویر و تحلیل هوش مصنوعی حفظ شده است.

این انتشار فقط frontend بود؛ migration، schema و restart API لازم نبود. نسخه فعال پیش از جایگزینی در backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-process-image-field` نگهداری شد و frontend جدید در `C:\inetpub\nivasafe\app-com` فعال شد.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `40C787CC787C184B074D8C312BCAC585ED64B61A057D1594AC0BB6B972695505` |
| `frontend/dist/assets/index-DbTZU38m.js` | `9E6F31EBED07BE465D877C24190CEEB1116FA1E4133F06B1459865AC8D1B1513` |
| `frontend/dist/assets/index-qZypX6yL.css` | `0ECCF618DC928C22D9D6B50CE5D41EFF61DF16908BDCD79DF242111F56C950F8` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد (به‌ترتیب ۷۵، ۸۴ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend، و release verification با ۲۶ بررسی موفق بودند. markerهای فیلد تصویر، جایگذاری کنار واحد/بخش، استایل ورودی فشرده و reset موبایل در bundle فعال تأیید شدند. تطبیق hashهای local/active و smoke عمومی HTTPS برای `/fmea` و `/api/v1/health` با HTTP 200 موفق شد.

## انتشار انتقال دستیار FMEA به ردیف page-header — 2026-09-21

در release `release-20260921-fmea-assistant-page-header`، کنترل «دستیار FMEA» از نوار جداگانه بالای عنوان حذف و داخل ردیف `page-header` در کنار عملیات صفحه قرار گرفت. کنترل جدید یک `<button>` واقعی با `aria-pressed` است، وضعیت روشن/خاموش را حفظ می‌کند، متن وضعیت را نمایش می‌دهد و برای hover و focus-visible استایل مستقل و قابل مشاهده دارد.

این انتشار فقط frontend بود؛ migration، schema و restart API لازم نبود. نسخه قبلی قبل از جایگزینی در backup قابل rollback در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-assistant-page-header` نگهداری شد و frontend جدید در `C:\inetpub\nivasafe\app-com` فعال شد.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `E5AE7C497CF3E55199FEB2BEF950FAB72B671C2CEB726D58263EB613EA4D0D6D` |
| `frontend/dist/assets/index-2rpnQftS.js` | `86D2951CD16349B942D2E3551563FEF43F277D57FE8681897AA3CB83D9F82FC6` |
| `frontend/dist/assets/index-BEBzZZ36.css` | `BB4547F4813A788150507E0BF0D8FA7E156FC3B7D7228253A626992BF7D7AB3C` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد (به‌ترتیب ۷۵، ۸۴ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend، و release verification با ۲۶ بررسی موفق بودند. تطبیق hashهای local/active، وجود marker دکمه دستیار و حذف marker نوار قدیمی تأیید شد. smoke عمومی HTTPS برای `/fmea` و `/api/v1/health` با HTTP 200 موفق شد.

## انتشار آپلود چندتصویری و بررسی خودکار تصویر فرآیند FMEA — 2026-09-21

در release `release-20260921-fmea-process-image-multi-auto`، ورودی «تصویر فرآیند یا محیط کار» اکنون تا پنج تصویر JPG/PNG/WEBP را با محدودیت ۱۰ مگابایت برای هر فایل می‌پذیرد و تصاویر انتخاب‌شده را به‌صورت گالری نمایش می‌دهد. پس از بارگذاری، بررسی هوش مصنوعی بدون دکمه یا پنل جداگانه و به‌صورت خودکار برای هر تصویر انجام می‌شود؛ خروجی‌های معتبر در فهرست ردیف‌های مرور و ثبت به‌عنوان پیش‌نویس قابل ویرایش قرار می‌گیرند. هنگام ثبت ارزیابی، همه تصاویر به‌صورت tenant-scoped در مسیر فایل‌های موجود ذخیره می‌شوند و کنترل‌های اعتبارسنجی نوع، اندازه، تعداد و حذف انتخاب‌ها حفظ شده‌اند.

این انتشار migration یا تغییر schema نداشت و route تحلیل تصویر موجود مجدداً استفاده شد. artifactها ابتدا در `C:\ProgramData\NIVASafe\staging\release-20260921-fmea-process-image-multi-auto` قرار گرفتند و backup کامل frontend/backend/shared-domain در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-process-image-multi-auto` نگهداری شد. پس از تأیید hashهای staging، frontend، backend و shared-domain فعال شدند؛ فرایند قدیمی مستقیم Node که پورت `127.0.0.1:5044` را در اختیار داشت با بررسی command line متوقف شد، task `NIVASafe-API` با PM2 دوباره اجرا شد و `NIVASafe-Nginx` بدون توقف باقی ماند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `09CD99B2615B29191F4D1D188EE061B5DE519268F2989868CF8032836893DD9D` |
| `frontend/dist/assets/index-uLGykaaY.js` | `8C286F85DE03BBBC68807587CEBCFA1309BE7C8DC580165FDE79CCBB9CEA9C5E` |
| `frontend/dist/assets/index-BNuActwP.css` | `54F981D97B99A5B1B6351BCC46ACF9BACB3A4CD46260E56BF522CA15D6E8E498` |
| `backend/dist/fmea-process.js` | `9E900ED40D682E83150CBFFC17E70F7CA69F5C55374DB07E8466F0FC0AC610D2` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد (به‌ترتیب ۷۵، ۸۴ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend، و release verification با ۲۶ بررسی موفق بودند. health داخلی با MySQL=`up`، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و فقط یک listener روی `127.0.0.1:5044` تأیید شد. smoke عمومی HTTPS برای `/`، `/login`، `/projects`، `/fmea`، `/api/v1/health`، manifest، service worker و assetهای hash‌شده همگی HTTP 200 بود.

## مخفی‌سازی افزودن ردیف خطر در مرحله اطلاعات فرآیند FMEA — 2026-09-21

در release `release-20260921-fmea-hide-risk-step1`، کارت مستقل «افزودن ردیف خطر» فقط زمانی render می‌شود که `wizardStep === 2` باشد. بنابراین در مرحله ۱ «اطلاعات فرآیند» فرم ریسک و فضای آن نمایش داده نمی‌شود و در مرحله ۲ «مرور و ثبت» جریان موجود افزودن/ویرایش ردیف حفظ شده است. این تغییر فقط frontend بود و API، schema، migration و قراردادهای داده تغییر نکردند.

artifact در `C:\ProgramData\NIVASafe\staging\release-20260921-fmea-hide-risk-step1` قرار گرفت و rollback backup کامل در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-hide-risk-step1` نگهداری شد. پس از فعال‌سازی frontend، workerهای Nginx برای پاک‌سازی shell استاتیک قدیمی restart شدند؛ API و Nginx taskها Running و API با MySQL سالم باقی ماندند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `E839F185D287E1CF93F72EA2C277121FB67AC35B1BE793C6888A9F21E8C15402` |
| `frontend/dist/assets/index--6eIs0DM.js` | `871033BB96F060C6ADDD92D38C9825EEAE5165901C77DF862DB0455BC71FCE00` |
| `frontend/dist/assets/index-BNuActwP.css` | `54F981D97B99A5B1B6351BCC46ACF9BACB3A4CD46260E56BF522CA15D6E8E498` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend و release verification با ۲۶ بررسی موفق بودند. smoke عمومی HTTPS برای `/`، `/login`، `/projects`، `/fmea`، `/api/v1/health`، manifest، service worker و assetهای hash‌شده با HTTP 200 موفق شد و POST بدون احراز هویت به `/api/v1/fmea/process-image-analysis` با HTTP 401 پاسخ داد.

## دکمه ارزیابی‌های ثبت‌شده و جداسازی مرحله اول FMEA — 2026-09-21

در release `release-20260921-fmea-registered-assessments-button`، دکمه «ارزیابی‌های ثبت‌شده» به ردیف `page-header` صفحه FMEA اضافه شد. این دکمه یک کنترل قابل‌دسترس با `aria-controls` و `aria-expanded` است و در همان مسیر `/fmea`، بخش ارزیابی‌های ثبت‌شده را در صورت نیاز نمایش داده و با پیمایش نرم به آن منتقل می‌کند. در مرحله ۱ «اطلاعات فرآیند»، بخش ارزیابی‌های ثبت‌شده به‌صورت پیش‌فرض render نمی‌شود و فضای صفحه را اشغال نمی‌کند؛ مرحله ۲ و مراحل بعدی همچنان این بخش را نمایش می‌دهند.

این انتشار فقط frontend بود و API، schema، migration، احراز هویت، مجوزها و داده‌های موجود تغییر نکردند. artifact در `C:\ProgramData\NIVASafe\staging\release-20260921-fmea-registered-assessments-button` قرار گرفت و rollback backup کامل در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-registered-assessments-button` نگهداری شد. پس از فعال‌سازی، workerهای Nginx برای پاک‌سازی shell استاتیک قدیمی restart شدند؛ taskهای API و Nginx Running و API با MySQL سالم باقی ماندند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `9A8BC2795AD71227B386A58B1B70089F57EBA5456FDB26119F42CDF85A687A7C` |
| `frontend/dist/assets/index-lqieEiGI.js` | `B02766091CFE5490BED034C013ABF38661F2C6E9A66DDD3F265A7B79CDDB639E` |
| `frontend/dist/assets/index-Cgacyjgm.css` | `FFC8799F97BD22218DA85D3F2405EF2965F52C0F6307ED07F21EC856143CA0DA` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend و release verification با ۲۶ بررسی موفق بودند. bundle فعال markerهای دکمه و مقصد `fmea-registered-button` و `fmea-registered-assessments` را دارد. smoke عمومی HTTPS برای `/`، `/login`، `/projects`، `/fmea`، manifest، service worker و `/api/v1/health` با HTTP 200 موفق شد.

## انتشار بانک سریع عنوان شغل/فرآیند FMEA — 2026-09-21

در release `release-20260921-fmea-job-catalog-search`، فیلد «عنوان شغل / فرآیند» هنگام بازشدن یک‌بار بانک `JobCatalog` را با سقف ۲۰۰ عنوان از API دریافت می‌کند و بعد از آن جست‌وجو در مرورگر روی عنوان فارسی، عنوان انگلیسی، واحد و کلیدواژه انجام می‌شود. بنابراین با تغییر عبارت جست‌وجو، گزینه‌ها بدون درخواست‌های زنجیره‌ای یا فراخوانی هوش مصنوعی به‌روز می‌شوند و حالت عنوان سفارشی همچنان برای عبارت‌های خارج از بانک باقی است. درخواست زنده‌ی عنوان شغل به حالت AI حذف شد؛ مسیر قدیمی `mode=job-titles` فقط برای سازگاری فراخوان‌های صریح دیگر حفظ شده است.

برای پوشش بهتر مشاغل و فعالیت‌های صنعتی، ۳۴ عنوان عمومی جدید به بانک اضافه شد؛ دو index ترکیبی سازمان/فعال برای عنوان فارسی و انگلیسی نیز با migration `202609210002_expand_fmea_job_catalog` اضافه شدند. migration به‌دلیل ناسازگاری Prisma engine با plugin احراز هویت MariaDB، با client پشتیبانی‌شده MariaDB روی production اعمال و در `_prisma_migrations` با یک مرحله موفق ثبت شد. تعداد عناوین عمومی فعال پس از migration برابر ۳۸ و هر دو index در `JobCatalog` تأیید شد.

artifactها ابتدا در `C:\ProgramData\NIVASafe\staging\release-20260921-fmea-job-catalog-search` قرار گرفتند و backup کامل frontend/backend، schema و migrationهای قبلی در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-job-catalog-search` نگهداری شد. پس از توقف کنترل‌شده‌ی processهای API دارای مسیر `C:\NIVASafe\backend\dist\server.js`، migration اعمال شد، frontend و backend فعال شدند و task `NIVASafe-API` دوباره اجرا شد؛ `NIVASafe-Nginx` بدون توقف Running باقی ماند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `E9F5D0C82C739C3389E803252681BA7079C974D626FBC8D59F2F6008259A6450` |
| `frontend/dist/assets/index-B42cN-0T.js` | `4665F281B4DF532C7FEB54DEA3A998ED749F3B14108A9623F1E3B4C7BFFDC610` |
| `frontend/dist/assets/index-B-Dvni9k.css` | `2FD6F5F308EB8CC7BCC968A6327D23500729BFBE57ACB9194B008AC80F54B924` |
| `backend/dist/modules/assessments.js` | `3D5E8193CEDD047F39DFC33AC39052076AB81EF5EC57F0E306D094BB4422D14E` |
| `backend/prisma/migrations/202609210002_expand_fmea_job_catalog/migration.sql` | `C6971138F843AA0A40A5B9AAE570383E9593C391587437A45390BED4068FD0EA` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد (به‌ترتیب ۷۵، ۸۴ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend، `verify:release` با ۲۶ بررسی و `git diff --check` موفق بودند. hashهای local/staging/active برای index، JavaScript، CSS، `assessments.js` و migration یکسان است. health داخلی با MySQL=`up`، taskهای API/Nginx در وضعیت Running و تنها یک listener روی `127.0.0.1:5044` تأیید شد. smoke عمومی HTTPS برای `/`، `/login`، `/projects`، `/fmea`، manifest، service worker، bundleهای جدید و `/api/v1/health` با HTTP 200 موفق شد؛ مسیر محافظت‌شده `/api/v1/fmea/job-catalog` بدون احراز هویت HTTP 401 مورد انتظار برگرداند.

## درج مستقیم اصلاح شرح فعالیت با AI و حذف پنل پیشنهاد شغل — 2026-09-21

در release `release-20260921-fmea-description-direct-input`، دکمه «اصلاح متن با AI» پس از دریافت پاسخ معتبر یک/دو جمله‌ای، متن را مستقیماً داخل textarea «شرح کوتاه فعالیت» قرار می‌دهد و فوکوس را به همان ورودی برمی‌گرداند. پنل ثانویه «پیشنهاد متن» و کلاس قدیمی `fmea-job-ai-actions` از frontend حذف شدند؛ جست‌وجوی عنوان شغل/فرآیند همچنان فقط از بانک `JobCatalog` و فیلتر محلی استفاده می‌کند و مسیر سازگاری backend برای فراخوان‌های صریح حذف نشد.

این انتشار فقط frontend بود؛ API، schema، migration، احراز هویت، مجوزها و داده‌های موجود تغییر نکردند. artifact در `C:\ProgramData\NIVASafe\staging\release-20260921-fmea-description-direct-input` قرار گرفت و backup نسخه فعال در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-description-direct-input` نگهداری شد. frontend در `C:\inetpub\nivasafe\app-com` فعال شد و سرویس API بدون restart باقی ماند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `BDF9D550A43F38486FB1097B4EA59DF0F01B6A76FC0FF8FAC84C8E464B860D7A` |
| `frontend/dist/assets/index-58G_KOU2.js` | `BBB5397FEDD542EEB1863DBF249988E462C48F7DC83A955AA82C688DCAA56A6A` |
| `frontend/dist/assets/index-Cf9WCG1v.css` | `1C4B3467D9D54F69C21025515217F464C5F0E55AE9B464E0F8367085C22C4A4A` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد (به‌ترتیب ۷۵، ۸۴ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend، `verify:release` با ۲۶ بررسی و `git diff --check` موفق بودند. hashهای local/staging/active برای frontend تطبیق دارند. API health با MySQL=`up`، taskهای API/Nginx در وضعیت Running و public HTTPS smoke برای `/`، `/login`، `/fmea`، manifest، service worker و `/api/v1/health` با HTTP 200 تأیید شد؛ bundle عمومی فاقد `fmea-description-suggestion` و `fmea-job-ai-actions` است.

## خودکارسازی کد و دامنه در مرحله مرور و ثبت FMEA — 2026-09-21

در release `release-20260921-fmea-review-auto-metadata`، فیلدهای قابل‌مشاهده «کد ارزیابی» و «دامنه» از مرحله دوم FMEA حذف شدند. کد ارزیابی برای ارزیابی جدید یک‌بار تولید و برای draft و ویرایش قبلی بازیابی می‌شود؛ دامنه نیز از نام پروژه و عنوان شغل/فرآیند ساخته می‌شود و مقدار ذخیره‌شده قبلی حفظ می‌گردد. دو ورودی hidden با نام‌های قبلی در فرم باقی مانده‌اند تا `FormData`، autosave و قرارداد API بدون تغییر کار کنند.

این انتشار فقط frontend بود؛ API، schema، migration، احراز هویت، مجوزها و داده‌ها تغییر نکردند. artifact در `C:\ProgramData\NIVASafe\staging\release-20260921-fmea-review-auto-metadata` قرار گرفت و backup نسخه قبلی در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-review-auto-metadata\app-com` نگهداری شد. frontend در `C:\inetpub\nivasafe\app-com` فعال شد و سرویس API بدون restart باقی ماند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `736ED922DB5171B7872915C965AA36E19F6515A29BDEEDA36232BDD625CE1034` |
| `frontend/dist/assets/index-DTqGlgGc.js` | `9DFC24F86461A3A4A2845DAF8D184ABA6CCF12CCA38917A498FBDAF8EED7D673` |
| `frontend/dist/assets/index-Cf9WCG1v.css` | `1C4B3467D9D54F69C21025515217F464C5F0E55AE9B464E0F8367085C22C4A4A` |

تست‌های frontend/backend/shared-domain در مجموع ۱۶۹ مورد PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API، `verify:release` و `git diff --check` موفق بودند. hashهای local/staging/active تطبیق دارند، bundle عمومی marker `data-fmea-auto-metadata` را دارد، backup قبلی موجود است و smoke عمومی HTTPS برای `/`، `/login`، `/fmea`، manifest، service worker و `/api/v1/health` با HTTP 200 موفق شد.

## خودکارسازی پنج ردیف جزئیات کامل FMEA — 2026-09-21

در release `release-20260921-fmea-report-autocreate`، مسیر `POST /api/v1/fmea/:id/report/detail-suggestions` برای جدول جزئیات کامل FMEA پارامتر معتبر `autoCreate` را می‌پذیرد. وقتی جدول خالی است و کاربر مجوز `assessments.update` دارد، frontend این حالت را درخواست می‌کند؛ backend پنج پیشنهاد محدودشده بر اساس پروژه/فرآیند را به پنج `FmeaItem` واقعی تبدیل می‌کند و جدول عادی گزارش پس از reload آن‌ها را نمایش می‌دهد. اگر جدول قبلاً ردیف داشته باشد یا کاربر فقط خواندنی باشد، ایجاد خودکار انجام نمی‌شود.

ساخت ردیف‌ها در transaction انجام می‌شود و شمارش مجدد ردیف‌های موجود داخل transaction از ایجاد تکراری در درخواست‌های هم‌زمان جلوگیری می‌کند. متن‌ها قبل از persistence محدود و پاک‌سازی می‌شوند؛ S/O/D، RPN و سطح ریسک در server محاسبه می‌شوند و آستانه‌های ریسک سازمان همان منبع محاسبه هستند. این تغییر migration جدیدی ندارد و از schema موجود `FmeaItem` استفاده می‌کند؛ tenant scope، permission و audit موجود حفظ شده‌اند. کنترل‌های مشاهده، ویرایش، افزودن فرایند و مسیرهای قبلی گزارش نیز باقی مانده‌اند.

artifactها در `C:\ProgramData\NIVASafe\staging\release-20260921-fmea-report-autocreate` قرار گرفتند و rollback در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-report-autocreate` نگهداری شد. frontend در `C:\inetpub\nivasafe\app-com` فعال است و artifactهای backend در `C:\NIVASafe\backend\dist` و shared domain در `C:\NIVASafe\shared\domain\dist` با restart کنترل‌شده‌ی task API منتشر شدند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `C5A9E8A32C33BE974742A574BE79E9F1D201320820CBF840AA2393910CD6871C` |
| `frontend/dist/assets/index-D8yDSEDO.js` | `5E1FA2CCCB0EB344C2C9094389111AA67A6CE56F9BBF6946B8FC8B69FE733099` |
| `frontend/dist/assets/index-Cf9WCG1v.css` | `1C4B3467D9D54F69C21025515217F464C5F0E55AE9B464E0F8367085C22C4A4A` |
| `backend/dist/modules/reports.js` | `EC53B43916AB96E664FF50ED29412A348B0C35057811E0D8D0A000AC956E9B01` |
| `backend/dist/fmea-report.js` | `B768AB4985EA25CCDEF13BA215E2ACA45473AC5E3616BCF5EA021C639F2DF09A` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |

تست‌های frontend/backend/shared-domain در مجموع ۱۷۰ مورد (به‌ترتیب ۷۵، ۸۵ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend، `verify:release` با ۲۶ بررسی و `git diff --check` موفق بودند. health داخلی با MySQL=`up`، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و markerهای auto-create/seed-helper تأیید شد. smoke عمومی HTTPS برای `/`، `/login`، `/fmea`، manifest، service worker، bundleهای hash‌شده و `/api/v1/health` با HTTP 200 موفق شد.

## محدودیت تعداد پیشنهادهای فرآیند FMEA — 2026-09-21

در release `release-20260921-fmea-suggestion-limits`، هر دسته از پنل `fmea-suggestion-board` حداکثر ۱۰ پیشنهاد نرمال‌شده از بانک داده و هوش مصنوعی نمایش می‌دهد. تعداد انتخاب‌ها و مواردی که کاربر به‌صورت دستی اضافه می‌کند برای هر دسته به ۵ مورد محدود شده است؛ پس از رسیدن به سقف، گزینه‌های جدید و ورودی افزودن دستی غیرفعال می‌شوند و امکان حذف انتخاب‌های قبلی باقی می‌ماند.

این محدودیت علاوه بر frontend در backend نیز اعمال شده است. درخواست‌های جدید دارای بیش از ۵ مقدار در هر دسته با خطای اعتبارسنجی رد می‌شوند؛ مقادیر قدیمی بیش از سقف برای حفظ داده بدون تغییر قابل ویرایش و کاهش هستند، اما افزودن مقدار جدید تا رسیدن به سقف مجاز نیست. خروجی prompt و parser هوش مصنوعی، catalog سازمانی و global نیز به ۱۰ پیشنهاد در هر دسته محدود شده‌اند. migration یا تغییر schema لازم نبود.

artifactها در `C:\ProgramData\NIVASafe\staging\release-20260921-fmea-suggestion-limits` قرار گرفتند و backup rollback در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-suggestion-limits` نگهداری شد. frontend در `C:\inetpub\nivasafe\app-com` و backend/shared-domain در مسیرهای production فعال شدند؛ task `NIVASafe-API` با restart کنترل‌شده اجرا شد و `NIVASafe-Nginx` بدون توقف Running باقی ماند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `BDE46D1DCC6D041FE451EC5770F27709C2ECB1317DC5165B4B8600649AE1E9D6` |
| `frontend/dist/assets/index-D0Dj9KNF.js` | `54B01CE6AEEE16355F0A58593441233B2452C5A7D675E1CAAD45EBCBD8B88317` |
| `frontend/dist/assets/index-Nxw1C25r.css` | `FE1209EE26CC03F0AA52B2BE0D1126B9D0DB1AA2D4CB967AF4061A5626ABA44A` |
| `backend/dist/modules/assessments.js` | `8DED83ED9CCC61E5AB296D89B328869BA226014D6727077B2C418D31C76E2BBD` |
| `backend/dist/fmea-process.js` | `7674358FB8BB1FD5F6EA7E2CE76DBDF168C9385682FCC930FCB18090BA17A611` |
| `shared/domain/dist/index.js` | `71204FD452A2A6CE48BBA94025A371EF06839CD18C7555AC0D52B742AB7B87AD` |

تست‌های frontend/backend/shared-domain در مجموع ۱۷۱ مورد (به‌ترتیب ۷۵، ۸۶ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend، `verify:release` با ۲۶ بررسی و `git diff --check` موفق بودند. hashهای local/staging/active برای index، JavaScript، CSS، `assessments.js`، `fmea-process.js` و shared-domain تطبیق دارند. bundle عمومی markerهای `suggestionSelectionLimit` و `suggestionSelectionReached` را دارد، API health با MySQL=`up` پاسخ داد، taskهای API/Nginx Running هستند، مسیر پیشنهادها بدون احراز هویت HTTP 401 مورد انتظار برگرداند و smoke عمومی HTTPS برای `/`، `/login`، `/fmea`، manifest، service worker، bundle جدید و `/api/v1/health` با HTTP 200 موفق شد.

## کنترل فشرده تصویر فرآیند FMEA — 2026-09-21

در release `release-20260921-fmea-process-image-compact`، کنترل «تصویر فرآیند یا محیط کار» به ارتفاع و چگالی ورودی‌های همان بخش نزدیک شد. متن توضیحی اختیاری از بالای کنترل حذف شد و هیچ دکمه دستی برای «بررسی تصویر با هوش مصنوعی» در رابط کاربری وجود ندارد؛ با این حال، مسیر آپلود چندتصویری و بررسی خودکار احراز‌شده پس از انتخاب تصویر حفظ شده است و خروجی آن همچنان به‌صورت ردیف‌های خطر قابل ویرایش وارد فرم می‌شود.

artifact frontend در `C:\ProgramData\NIVASafe\staging\release-20260921-fmea-process-image-compact` قرار گرفت و نسخه قبلی در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-process-image-compact\app-com` نگهداری شد. فقط static frontend فعال شد؛ API و schema/migration تغییر نکردند و taskهای `NIVASafe-API` و `NIVASafe-Nginx` بدون توقف Running باقی ماندند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `298834CF5B608FBE92CB8CD0AFCE6C67D0A1AD3ECF1C9E5C5CEAA5058B8A7864` |
| `frontend/dist/assets/index-BZQE3LKB.js` | `A4DD4FAF0D63170474F08EC8061C2776BBDF2747021DB1792931219D909A171C` |
| `frontend/dist/assets/index-BDPXSPKb.css` | `C753D1B9D28EA54E8BB28EBE46E2D325CABD4672D2B38F908C3CA18314C2154F` |

تست‌های frontend/backend/shared-domain در مجموع ۱۷۱ مورد (به‌ترتیب ۷۵، ۸۶ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API، `verify:release` با ۲۶ بررسی، audit وابستگی و `git diff --check` موفق بودند. bundle فعال شامل input و endpoint بررسی خودکار تصویر است و کلید/متن helper حذف‌شده را ندارد. health داخلی و عمومی HTTP 200 بود؛ مسیر محافظت‌شده تحلیل تصویر بدون احراز هویت HTTP 401 مورد انتظار برگرداند و smoke عمومی HTTPS برای `/`، `/login`، `/fmea`، manifest، service worker، assetهای hash‌شده و هر دو health endpoint با HTTP 200 موفق شد.

## پس‌زمینه سفید لوگوی عنوان سایت — 2026-09-21

در release `release-20260921-favicon-white-background`، favicon مورد استفاده در عنوان تب مرورگر از مسیر `/favicon-white.svg` به یک SVG مستقل تبدیل شد که همان نشان NIVASafe را روی پس‌زمینه سفید با گوشه‌های گرد قرار می‌دهد. تصویر PNG لوگو داخل SVG به‌صورت data URI قرار گرفته است تا favicon بدون وابستگی به درخواست دوم یا مسیر نسبی، در مرورگر و cache سرویس‌ورکر قابل نمایش باشد. service worker به v14 ارتقا یافت و asset جدید را در shell خود cache می‌کند تا پنجره‌های باز نسخه v13 نیز مهاجرت شوند.

این انتشار فقط frontend بود؛ API، schema، migration، احراز هویت، مجوزها و داده‌های موجود تغییر نکردند. artifact frontend در `C:\ProgramData\NIVASafe\staging\release-20260921-favicon-white-background\app-com` قرار گرفت، نسخه قبلی در `C:\ProgramData\NIVASafe\backups\release-20260921-favicon-white-background\app-com` نگهداری شد و نسخه جدید در `C:\inetpub\nivasafe\app-com` فعال شد. taskهای `NIVASafe-API` و `NIVASafe-Nginx` Running باقی ماندند و API بدون restart لازم سالم ماند.

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `8BFF9E397AA1205D70EC5698012EF0DA693B770769A6EB5DA0F7EADB16A02606` |
| `frontend/dist/favicon-white.svg` | `43F4C271395F92D8C946B08311E1FAB4C0AB95A5BFCE6C663EE74783A02E7D3A` |
| `frontend/dist/sw.js` | `D626A88FA1A8778C9DF8100946A75FBFD55BC2971E013FB1D0AE9FD4B97B3242` |
| `frontend/dist/assets/index-BZQE3LKB.js` | `A4DD4FAF0D63170474F08EC8061C2776BBDF2747021DB1792931219D909A171C` |
| `frontend/dist/assets/index-BDPXSPKb.css` | `C753D1B9D28EA54E8BB28EBE46E2D325CABD4672D2B38F908C3CA18314C2154F` |

تست‌های frontend/backend/shared-domain در مجموع ۱۷۲ مورد (به‌ترتیب ۷۶، ۸۶ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend، `verify:release` با ۲۶ بررسی، audit وابستگی و `git diff --check` موفق بودند. قرارداد PWA شامل تست favicon سفید و service-worker v14 است. hashهای local/staging/active برای index، favicon و service worker تطبیق دارند. smoke عمومی برای `/`، `/login`، `/fmea`، `/favicon-white.svg`، `/sw.js`، manifest و هر دو `/api/v1/health` با HTTP 200 موفق شد؛ favicon با MIME نوع `image/svg+xml` تحویل شد و backup rollback وجود دارد.

## انتشار چیدمان بدون اسکرول دستیار و بانک فرایند — 2026-09-22

در release `release-20260922-assistant-responsive`، صفحه گفت‌وگو با هوش مصنوعی در ارتفاع viewport محصور و پنل فهرست گفت‌وگوها و تاریخچه پیام‌ها به‌صورت داخلی قابل پیمایش شد تا shell اصلی صفحه در اندازه‌های مختلف اسکرول عمودی ناخواسته نداشته باشد. هویت دستیار در پاسخ پایه و دستور سیستم به‌صورت صریح «دستیار هوشمند سامانه NIVASafe برای مدیریت ایمنی و بهداشت حرفه‌ای» تنظیم شد. migration `202609220001_expand_fmea_process_catalog` نیز روی production اعمال شد و ۳۰ عنوان فرایند عمومی برای جست‌وجوی سریع بانک FMEA اضافه کرد.

قبل از جایگزینی، static root، backend/dist و shared/domain/dist در backup قابل rollback زیر نگهداری شدند:

`C:\ProgramData\NIVASafe\backups\release-20260922-assistant-responsive`

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `965EFE0433452469BE1125C41AAA281A5AA70D794F93A9D714EA661BCE171AD0` |
| `frontend/dist/assets/index-WUGLyfrp.js` | `14F23D03F6AD6E77BDDADD70AA59BDB537B111C661F14B4E6316A2365090882D` |
| `frontend/dist/assets/index-BTQLLPIT.css` | `2EA8E0AF351F699D7A0FD7D6CEC69F8D5A8301C5821AB8F52A1B5ADE84E0D273` |
| `backend/dist/server.js` | `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0` |
| `backend/dist/ai-provider.js` | `F2943DB8DBD326775CF6DFFBEF894384C0C09E54DA7AAF62F5B55FF3DBB692CC` |

تست‌های frontend/backend/shared-domain در مجموع ۱۷۶ مورد (به‌ترتیب ۷۸، ۸۸ و ۱۰) PASS شدند؛ typecheck، lint، production build، بررسی قرارداد API با ۵۸ مسیر frontend و ۱۰۸ route backend، `verify:release` با ۲۶ بررسی و `git diff --check` موفق بودند. migration با Prisma روی production با موفقیت اعمال شد؛ API با MySQL=`up`، taskهای `NIVASafe-API` و `NIVASafe-Nginx` با وضعیت Running و تنها listener مورد انتظار روی `127.0.0.1:5044` تأیید شد. smoke عمومی HTTPS برای `/`، `/login`، `/fmea`، `/assistant`، manifest، service worker و `/api/v1/health` همگی HTTP 200 بودند و index عمومی به bundleهای hash‌شده همین release اشاره می‌کند.

دسترسی مستقیم دستیار به اطلاعات آخرین ارزیابی FMEA/RULA در این release فعال نشد؛ در نتیجه هیچ داده ارزیابی به provider هوش مصنوعی خارجی ارسال نمی‌شود. فعال‌سازی این بخش به تأیید صریح مجوز انتقال داده‌های ارزیابی نیاز دارد.

## انتشار اصلاح امتیاز نیروی واردشده RULA — 2026-09-22

در release `release-20260922-rula-force-score`، گزینه‌های «نیروی واردشده» در مرحله دوم RULA اکنون مقدار امتیاز را نیز نمایش می‌دهند: بدون نیروی قابل‌توجه `۰`، نیروی کم `۱`، نیروی متوسط `۲` و نیروی زیاد `۳`. محاسبه مشترک frontend و backend این مقدار را مستقیماً به امتیاز پایه پوسچر اضافه می‌کند، سهم استفاده تکراری عضله را جداگانه حفظ می‌کند و امتیاز نهایی را در بازه استاندارد ۱ تا ۷ نگه می‌دارد. trace محاسبه نیز اجزای adjustment را شفاف ثبت می‌کند. این release فقط اصلاح محاسبه و UI است و migration یا بازنویسی داده لازم ندارد.

نسخه قبلی برای rollback در مسیر زیر نگهداری شد:

`C:\ProgramData\NIVASafe\backups\release-20260922-rula-force-score`

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `A20B7D3F90A63B757078BEC7F17DC7691B5F178DC6133CC4382A9615E4DA59B8` |
| `frontend/dist/assets/index-Y1xE20rH.js` | `BF4DE32077BAAAA846E78992E2A2FF34EBC78B0493A8CA25CC2616FD941F468A` |
| `frontend/dist/assets/index-CmZeotZO.css` | `C0100D748F745353369B646FB62F7707254B6999058953DE7970112C68318185` |
| `backend/dist/server.js` | `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0` |
| `shared/domain/dist/index.js` | `82A127FD94B67ACDF5923C4F3F6677C0195067007F960C41E21B0468C1A10C05` |

تست‌های frontend/backend/shared-domain در مجموع ۱۹۱ مورد PASS شدند (۸۲، ۹۸ و ۱۱)؛ build تولیدی، typecheck مستقیم، بررسی قرارداد API با ۵۸ مسیر frontend و ۱۰۸ route backend، `verify:release` با ۲۶ بررسی، audit وابستگی و `git diff --check` موفق بودند. در تولید، API با MySQL=`up`، taskهای `NIVASafe-API` و `NIVASafe-Nginx` در وضعیت Running و تنها listener مورد انتظار روی `127.0.0.1:5044` تأیید شد. public HTTPS برای `/`، `/login`، `/fmea`، `/rula`، `/actions`، `/assistant`، manifest، service worker، bundleهای hash‌شده و `/api/v1/health` با HTTP 200 پاسخ داد و bundle عمومی markerهای امتیاز force را شامل می‌شود.

## انتشار معیار استفاده تکراری از عضله RULA — 2026-09-22

در release `release-20260922-rula-muscle-score`، کنترل استفاده تکراری از عضله در مرحله دوم RULA از checkbox به selector بازشونده دوگزینه‌ای تبدیل شد. گزینه اول متن معیار پوسچر استاتیک/به‌شدت تکراری را همراه امتیاز `۱` و گزینه دوم متن معیار پوسچر غیر استاتیک/غیرتکراری را همراه امتیاز `۰` نمایش می‌دهد. مقدار انتخاب‌شده در draft و FormData حفظ می‌شود و محاسبه مشترک frontend/backend آن را به امتیاز نهایی RULA اضافه می‌کند. این انتشار فقط UI و محاسبه است و migration یا بازنویسی داده لازم ندارد.

نسخه قبلی برای rollback در مسیر زیر نگهداری شد:

`C:\ProgramData\NIVASafe\backups\release-20260922-rula-muscle-score`

| artifact | SHA-256 |
|---|---|
| `frontend/dist/index.html` | `E4DB2813DB3315AEBE29BFD1F9288396065B5C8D402B1D72839B17B3E3F0FD29` |
| `frontend/dist/assets/index-CxByXB7D.js` | `D81752361468438C00F38E5652B0E604EF905D867A781ABA3C970314F2974391` |
| `frontend/dist/assets/index-D2sKA5jy.css` | `F3808A3DBC0864FE09E164CA8D92B7909CECD6ED7A2FB9FC8B9495FFB974D443` |
| `backend/dist/server.js` | `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0` |
| `shared/domain/dist/index.js` | `82A127FD94B67ACDF5923C4F3F6677C0195067007F960C41E21B0468C1A10C05` |

تست‌های frontend/backend/shared-domain در مجموع ۱۹۲ مورد PASS شدند (۸۲، ۹۸ و ۱۲)؛ build، typecheck مستقیم، بررسی قرارداد API با ۵۸ مسیر frontend و ۱۰۸ route backend، `verify:release` با ۲۶ بررسی، audit وابستگی و `git diff --check` موفق بودند. artifactها در `C:\ProgramData\NIVASafe\staging\release-20260922-rula-muscle-score` staged و روی static root و مسیرهای backend/shared-domain فعال شدند؛ taskهای API/Nginx Running، MySQL health=`up` و تنها listener مورد انتظار روی `127.0.0.1:5044` تأیید شد. smoke عمومی HTTPS برای `/`، `/login`، `/fmea`، `/rula`، `/actions`، `/assistant`، manifest، service worker، bundleهای hash‌شده و `/api/v1/health` با HTTP 200 پاسخ داد و markerهای معیار استفاده تکراری از عضله در bundle عمومی حاضر است.

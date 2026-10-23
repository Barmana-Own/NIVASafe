# گزارش فنی — اینماد در فوتر ورود

| مورد | مقدار |
|---|---|
| پروژه | NIVASafe |
| تاریخ میلادی | 2026-10-19 |
| تاریخ شمسی | 1405-07-27 |
| نسخهٔ فرانت‌اند | release-login-enamad-20261019-01-r2 |
| وضعیت | DEPLOYED؛ محدودیت متناوب سرویس تصویر اینماد |

## دامنه و تغییرات

فقط این سه فایل کاربردی تغییر کردند:

- frontend/src/features/account/AccountPages.tsx
- frontend/src/i18n.tsx
- frontend/src/styles/authentication.css

کامپوننت کوچک LoginEnamadSeal مالک وضعیت خطای تصویر است؛ پس از خطا به لینک متنی قابل‌خواندن تبدیل می‌شود و حلقهٔ تلاش مجدد ندارد. ردیف Flex کنار لوگوی موجود، اندازهٔ محدود تصویر و حالت focus-visible افزوده شد. متن جایگزین و پیام خطا فارسی و انگلیسی هستند. شناسه و Code عمومی ویجت دقیقاً حفظ شده‌اند.

## امنیت و حفظ پروژه

PASS در محدودهٔ تغییر: URL ثابت HTTPS، rel=noopener، referrerPolicy=origin روی لینک و تصویر، بدون جاوااسکریپت ثالث، بدون HTML تزریقی، بدون proxy سمت سرور و بدون ورودی کاربر در URL. عکس، رمز یا توکن ارسال یا ثبت نشد. فوتر در دو زبان/پوسته و دو عرض بررسی شد؛ دسترسی با صفحه‌کلید و بازشدن فرم ورود تأیید شد. مقایسهٔ متن ثابت کرد منطق حساب خارج از کامپوننت نشان و فوتر عین قبل است. سایر منابع فرانت‌اند و تمام منابع backend با baseline برابرند. اسکیمای Prisma با کاندید قبلی برابر است؛ migration اجرا نشد.

## شواهد واقعی

۴۰۳ آزمون در ۵۸ فایل پاس شد. build، typecheck و lint با pnpm@10.13.1 و Node v22.22.3 پاس شدند. اعتبار قرارداد API و ۲۹ بررسی انتشار پاس شدند. Chrome 155.0.8059.80، هشت حالت کاندید و هشت حالت عمومی را اجرا کرد؛ خطای اجرایی JavaScript ثبت نشد. Safari/WebKit: NOT_RUN. آزمون protected-account برای این تغییر فوتر لازم نبود و اجرا نشد. هیچ فراخوانی مدل AI انجام نشد.

در آزمون عمومی، 5/8 بارگذاری اولیه تصویر واقعی PNG و 3/8 حالت جایگزین تأیید شد. مجموع رخدادها شامل ۵ پاسخ image/png با ۲۰۰ و ۸ شکست درخواست مرورگر است؛ تعداد رخداد با تعداد مشاهده یکسان نیست، چون رفت/برگشت فرم نیز رخ داد. درخواست مستقیم قبلی با referrer مبدأ سایت، HTTP 403 با متن عمومی Forbidden گرفت؛ صفحهٔ مقصد HTTP 200 داشت. علت متناوب‌بودن UNKNOWN است؛ ۲۰۰ صفحهٔ مقصد به معنی تأیید گواهی نیست.

## انتشار و بازگشت

فرانت‌اند واقعاً منتشر شد. هش عمومی index و همهٔ مرجع‌های سطح اول برابر کاندید است؛ فایل‌های قدیمی حفظ شدند و index آخر جایگزین شد. ۵۱۱ فایل پشتیبان با هش و زمان فایل بازسازی و بررسی شدند؛ تمرین تعویض old/new/old روی کپی امن پاس شد. rollback واقعی لازم نشد. backend همان release-rula-image-autoflow-20261019-01-r2، PID 2840 و هویت NT AUTHORITY\SYSTEM است. API عمومی HTTP 200 و database=up ماند. web.config، service worker، CSS مستقل گزارش، env محافظت‌شده و پیکربندی سرویس بدون تغییر هستند.

## خطاهای ابزار و رفع آن‌ها

- Corepack در هویت محدود EPERM داشت؛ فرمان مجاز میزبان با همان pnpm پین‌شده پاس شد، ACL تغییر نکرد.
- مقایسهٔ اولیهٔ URL پس‌زمینه به پورت تصادفی سرور محلی حساس بود؛ فقط origin در مقایسهٔ تست حذف شد، نه تصویر/سبک واقعی.
- آماده‌سازی اولیهٔ بازسازی دوم روی مسیر موجود متوقف شد؛ پشتیبان حفظ و با verify دوباره کنترل شد و مسیر بازسازی برای release مستقل گردید.
- یک فرمان ویرایش موقت به علت کوتیشن PowerShell اجرا نشد؛ ویرایش از فایل/patch انجام و syntax بررسی شد.
- هشدار موجود اندازهٔ chunk خروجی build مانع نبود؛ build با exit 0 پایان یافت.

## دروازهٔ نهایی

تحویل محدودِ ادغام نشان پذیرفته است، با محدودیت صریح دسترس‌پذیری سرویس خارجی. هیچ قابلیت موجود حذف یا غیرفعال نشد. مراحل frontend، امنیت، تست، QA و انتشار با شواهد اجرا شدند؛ backend و database پیاده‌سازی تازه لازم نداشتند. نتایج مرحله‌ای در final-acceptance.json و project-state.json ثبت شده‌اند. صحت دقت RULA و اجازهٔ پردازش تصاویر همچنان از این تحویل مستقل هستند.

## Artifacts

- Candidate: C:/NIVASafe/.local/login-enamad-20261019-01/candidate
- Source digest: efaa94958ee453da0b7630d2384673a0fb372af77d95473647ac747773ec63cb
- Public index SHA-256: 42fc4bea559a56aedbb4eb413e2678f7a048c16cdc9d99f45f410680e2e6d244
- Backup: C:/ProgramData/NIVASafe/backups/release-login-enamad-20261019-01-r2/frontend
- Rollback: C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\login-enamad-20261019-01\static-release.mjs rollback
- Evidence: C:/NIVASafe/reports/evidence/login-enamad-20261019-01

## Executed commands

| Command | Exit |
|---|---|
| corepack pnpm run test | 0 |
| corepack pnpm run typecheck | 0 |
| corepack pnpm run lint | 0 |
| corepack pnpm run build | 0 |
| node scripts/check-api-contract.mjs | 0 |
| node scripts/verify-release.mjs | 0 |
| node .local/login-enamad-20261019-01/browser.mjs candidate | 0 |
| node .local/login-enamad-20261019-01/browser.mjs public | 0 |
| node scripts/releases/login-enamad-20261019-01/static-release.mjs prepare | 0 (final attempt) |
| node scripts/releases/login-enamad-20261019-01/static-release.mjs deploy | 0 |

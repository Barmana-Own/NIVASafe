# RULA selected-banner removal / حذف باکس مشخص‌شدهٔ RULA

| Field | Value |
|---|---|
| Gregorian | 2026-10-20 |
| Jalali | 1405-07-28 |
| Frontend | release-rula-auto-banner-20261020-01 |
| Backend | release-rula-account-consent-20261019-01; PID6608; unchanged |
| Frontend index SHA256 | fad6770ef134082073eca702f51ad77f86ce5087fe010ca8e89364798ce39f30 |
| Safe frontend deployment | DEPLOYED |
| Public image analysis | BLOCKED; actual platform authorization still missing |

## فارسی

طبق درخواست مالک فقط باکس دوخطی «هنوز نتیجه تحلیل خودکار آماده نیست» از مؤلفهٔ مرحلهٔ امتیازدهی حذف شد. تغییر سورس محصول دقیقاً حذف همان قطعه است؛ هیچ متن، دکمه، فیلد، CSS، بخش دیگر، امتیازدهی یا مسیر تحلیل تغییر نکرد. قانون تغییر رابط بدون درخواست صریح مالک در AGENTS.md ثبت شد.

438 آزمون فرانت‌اند، typecheck، lint و build با pnpm10.13.1 موفق‌اند. باکس در نسخهٔ قبل در390/1280 بازتولید شد و در کاندید نهایی وجود ندارد. متن و تعداد تمام دکمه‌ها و فیلدهای باقی‌مانده با قبل مقایسه شد؛ دو گروه/هفت ردیف امتیازدهی و نبود پنجرهٔ تأیید بارگذاری حفظ شد. دو بررسی عمومی مرورگر بدون خطای JavaScript/API موفق بودند. قرارداد94 مسیر فرانت‌اند/157 مسیر سرور و29 کنترل انتشار موفق‌اند.

درخواست تحلیل از قبل خودکار و بدون دکمهٔ تأیید تصویر بود؛ در سرور هر دو تنظیم مجوز تصویر همچنان خالی‌اند. در آزمون، رضایت حساب ثبت‌شده بود و پاسخ سیاست علت privacy-approval-missing را نشان داد. بنابراین ارسال عمومی عکس و ارزیابی واقعی آن در تولید همچنان BLOCKED است. این انتشار هیچ مجوزی جعل نکرده و نیاز به تصمیم مستند واقعی در docs/legal/rula-image-platform-approval.2026-10-19.md را تغییر نداده است. هیچ تماس جدید ارائه‌دهنده یا عکس/گزارش واقعی کاربر استفاده نشد؛ چهار موفقیت مصنوعی انتشار پیشین، شواهد تاریخی‌اند و آزمون این انتشار محسوب نمی‌شوند. دقت آناتومیک تأیید مستقل نشده است.

بک‌اند، PID، هش ماژول‌ها، مدل‌ها، تنظیمات محافظت‌شده، دیتابیس و فایل‌های کاربران تغییر نکردند؛ سرویس بازراه‌اندازی نشد. پشتیبان 607 فایل در C:/ProgramData/NIVASafe/backups/release-rula-auto-banner-20261020-01/frontend تأیید و بازیابی و جابه‌جایی قدیم/جدید/قدیم تمرین شد. فرمان بازگشت: `C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\rula-auto-banner-20261020-01\static-release.mjs rollback`. شواهد: C:/NIVASafe/reports/evidence/rula-auto-banner-20261020-01. Safari و آزمون احرازهویت‌شده روی دادهٔ خصوصی تولید NOT_RUN هستند.

## English

Only the owner-selected two-line pending-analysis banner was removed from the RULA scoring component. The sole product source difference is that exact JSX removal. No new copy, button, field, CSS, other section, score or analysis path was changed. The owner's explicit UI change-control rule is recorded in AGENTS.md.

438 frontend tests, typecheck, lint and build passed with pnpm10.13.1. The prior banner was reproduced at390/1280 and is absent in the final candidate. All remaining button texts/counts and field inventories were compared with the prior build; both scoring groups/seven rows and absence of an upload-confirmation dialog were preserved. Two public browser cases passed without JavaScript/first-party API errors. The94-path/157-route API contract and29 release checks passed.

Image analysis was already scheduled automatically without an image-confirmation button. Both production image authorization settings remain empty. In staging, account consent was recorded and policy returned privacy-approval-missing. Public image transfer and actual production photo evaluation remain BLOCKED. This release does not fabricate approval or replace the actual documented platform decision at docs/legal/rula-image-platform-approval.2026-10-19.md. No new provider call or real user photo/private report was used. Four synthetic successes from the previous release remain historical evidence, not tests of this release. Anatomical accuracy remains independently unvalidated.

Backend, PID, module hashes, model routing, protected settings, database and uploads were unchanged; no service restart. The607-file backup at C:/ProgramData/NIVASafe/backups/release-rula-auto-banner-20261020-01/frontend was verified with reconstruction and old/new/old index rehearsal. Rollback: `C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\rula-auto-banner-20261020-01\static-release.mjs rollback`. Evidence: C:/NIVASafe/reports/evidence/rula-auto-banner-20261020-01. Safari and authenticated private-production-data tests are NOT_RUN.

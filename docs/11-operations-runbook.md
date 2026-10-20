# راهنمای عملیاتی NIVASafe

## سرویس‌های فعال

| سرویس | روش اجرا | وضعیت مورد انتظار |
|---|---|---|
| API | PM2 process: `nivasafe-api` با Scheduled Task راه‌انداز `NIVASafe-API` | Online |
| Nginx | Windows Scheduled Task: `NIVASafe-Nginx` | Running |
| Database | MySQL موجود روی سرور | reachable |

## بررسی سلامت

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5044/api/v1/health
curl.exe -ksS https://app.nivasafe.com/api/v1/health
```

پاسخ سالم باید `status: healthy` و `database: up` داشته باشد.

ثبت‌نام موفق باید در پاسخ login یک سازمان فعال برای کاربر جدید داشته باشد. فهرست `GET /api/v1/projects` با همان `x-organization-id` باید پروژه‌ای با کد `DEFAULT` برگرداند؛ این endpoint برای workspaceهای قدیمی پروژه را idempotently ایجاد و برای starterهای soft-deleted آن را فعال می‌کند. اگر ثبت‌نام HTTP 201 می‌دهد اما workspace در login وجود ندارد، لاگ API و وضعیت تراکنش database بررسی شود؛ پروژه را دستی با درخواست تکراری نسازید. حذف پروژه `DEFAULT` باید با خطای کنترل‌شده `DEFAULT_PROJECT_PROTECTED` رد شود.

اگر پاسخ `503` و `database: down` بود، ابتدا وضعیت سرویس `NIVASafeMariaDB` و لاگ API را بررسی کنید؛ اتصال production باید با حساب اختصاصی application انجام شود و نباید `DATABASE_URL` یا secret آن در خروجی ثبت شود. پس از اصلاح environment، process `nivasafe-api` را با PM2 restart و health عمومی را دوباره بررسی کنید.

برای ساخت عضو جدید، مدیر سازمان از مسیر `/members` واردکردن نام کاربری یا ایمیل (به‌همراه نام و نام خانوادگی و نقش) را کافی است و درخواست را برای سوپر ادمین ارسال می‌کند. اگر درخواست فقط نام کاربری داشته باشد، سوپر ادمین هنگام تأیید باید ایمیل معتبر را وارد کند؛ سپس رمز اولیه قوی تعیین و درخواست را تأیید می‌کند. حساب و عضویت به‌صورت تراکنشی فعال می‌شوند. رمز اولیه در سامانه ذخیره یا در پاسخ API برگردانده نمی‌شود و باید از کانال امن به کاربر تحویل شود. کاربر پس از ورود می‌تواند رمز خود را از Profile تغییر دهد و بازیابی رمز با ایمیل یا نام کاربری انجام می‌شود. دعوت ایمیلی قدیمی برای حساب‌های موجود حفظ شده است و فقط در صورت نیاز استفاده شود؛ از ساخت حساب با رمز ثابت یا درج credential در لاگ خودداری کنید.

## راه‌اندازی مجدد API

```powershell
Restart-ScheduledTask -TaskName 'NIVASafe-API'
Start-Sleep -Seconds 8
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5044/api/v1/health
```

فرایند API باید از طریق `pm2-runtime` در همان Scheduled Task اجرا شود؛ از اجرای daemon جداگانه با `pm2 restart` یا `pm2 save` استفاده نشود. پس از راه‌اندازی مجدد، وضعیت task، listener پورت 5044، health endpoint و لاگ PM2 بررسی شود. کلیدها و مقادیر حساس لاگ نباید در خروجی یا گزارش ثبت شوند.

## rollback

نسخه قبل از استقرار در مسیر backup زیر نگهداری شده است:

```text
C:\ProgramData\NIVASafe\backups\before-assistant-role-20260904-105154
```

Rollback باید با توقف `nivasafe-api` در PM2، بازگردانی source و frontend، بررسی environment و اجرای migration مورد نیاز انجام شود. فایل‌های upload و داده MySQL نباید بدون بررسی جداگانه حذف یا بازنویسی شوند.

## تنظیمات حساس

Environment واقعی فقط روی سرور نگهداری می‌شود. از commit، archive یا انتشار `.env` واقعی خودداری شود؛ در صورت تغییر کلیدهای AI یا secretهای session، process `nivasafe-api` باید پس از بررسی configuration با PM2 مجدداً راه‌اندازی شود.


## Current operational checkpoint — 16 October 2026 / 1405-07-24

- Deployment status: NOT PERFORMED; production files, services, configuration and database were not changed.
- Local health: GET http://127.0.0.1:5044/api/v1/health returned HTTP 200 with healthy status and MySQL up.
- Public app: https://app.nivasafe.com/login loaded without authentication. Public health and authenticated member/admin paths were not verified.
- Candidate: isolated build only. Do not promote it based solely on passing unit/build checks while RULA provider acceptance is blocked.
- Rollback: release directory and timestamped backup are recorded in docs/11-deployment.md. Database restore has not been verified; do not restore over live data.
- External blocker: ArvanCloud rejected the synthetic RULA request with HTTP 401. Keep production RULA image privacy/capability gates closed pending provider authorization and successful end-to-end evidence.
- Runtime inspection: command account could not read process command lines or protected configuration; no credential values were accessed.
- Detailed evidence: reports/NIVASafe-FINAL-TECHNICAL.md and reports/NIVASafe-FINAL-CHECKLIST.md.

## Scoped checkpoint rula-image-experience-20261019-01 — 2026-10-19 / 1405-07-27

Active backend/frontend: release-rula-image-experience-20261019-01; API PID8960, SYSTEM; entry C:\ProgramData\NIVASafe\releases\release-rula-image-experience-20261019-01\backend\dist\server.js; static root C:/inetpub/nivasafe/app-com; index SHA256 1d18d2d8266449731a5ff883705542adac5503db0ed65259b61d3294ee24bcf2. Protected .env unchanged.

Rollback command, from an authorized host shell using existing service-manager access: `C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\rula-image-experience-20261019-01\release.mjs rollback`. The command guards active entry/index/config/env, restores previous API/config/frontend index, preserves newer DB/uploads and retains immutable new assets. Backup: C:/ProgramData/NIVASafe/backups/release-rula-image-experience-20261019-01. Restore old backend version release-fmea-ai-reliability-20261019-01 and frontend index 3ecaddc28249d61daa3c18b52fe98c9ad57a363ce6c36b92f1c8c5ace7b7d396. Do not restore a DB backup over newer user data.

Activation is a separate release: complete docs/legal/rula-image-platform-approval.2026-10-19.md, verify gateway terms, revise/version the bilingual notice accordingly, finish bounded stability/second-organization BOTH acceptance, then set both effective PM2 platform flags once. Changing .env alone cannot override empty process-profile flags.

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

برای ساخت عضو جدید، مدیر سازمان از مسیر `/members` نام کاربری اجباری، اطلاعات تماس و نقش را ثبت و درخواست را برای سوپر ادمین ارسال می‌کند. سوپر ادمین در پنل مرکزی درخواست را بررسی، رمز اولیه قوی تعیین و تأیید می‌کند؛ حساب و عضویت باید به‌صورت تراکنشی فعال شوند. رمز اولیه در سامانه ذخیره یا در پاسخ API برگردانده نمی‌شود و باید از کانال امن به کاربر تحویل شود. کاربر پس از ورود می‌تواند رمز خود را از Profile تغییر دهد و بازیابی رمز با ایمیل یا نام کاربری انجام می‌شود. دعوت ایمیلی قدیمی برای حساب‌های موجود حفظ شده است و فقط در صورت نیاز استفاده شود؛ از ساخت حساب با رمز ثابت یا درج credential در لاگ خودداری کنید.

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

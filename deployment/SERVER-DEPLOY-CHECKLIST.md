# چک‌لیست استقرار NIVASafe روی سرور

## 1. انتخاب روش استقرار

روش پیشنهادی: Docker Compose روی Linux.

روش جایگزین: Node.js 22 + PM2 + MySQL + Redis + Nginx.

## 2. تنظیم Environment

برای Docker:

```bash
cp .env.docker.example .env
```

برای PM2:

```bash
cp .env.production.example .env
```

موارد زیر حتماً با مقدار واقعی جایگزین شوند:

- `APP_URL`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SMTP_URL`
- `SMTP_FROM`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

نکته: در Docker، Host داخل `DATABASE_URL` باید `mysql` باشد. در نصب محلی/PM2 معمولاً `127.0.0.1` است.

## 3. استقرار Docker

```bash
docker compose config
docker compose build --no-cache
docker compose up -d
docker compose ps
```

بررسی Log:

```bash
docker compose logs --tail=200 api worker nginx mysql
```

## 4. ساخت مدیر اولیه

فقط یک بار:

```bash
docker compose exec \
  -e SEED_ADMIN_EMAIL=admin@example.com \
  -e SEED_ADMIN_PASSWORD='A-Strong-Password-12+' \
  -e SEED_ADMIN_NAME='NIVASafe Administrator' \
  -e SEED_ORG_NAME_FA='سازمان اصلی' \
  api ./node_modules/.bin/tsx prisma/provision.ts
```

## 5. بررسی سلامت

```text
https://YOUR-DOMAIN/api/v1/health
```

باید حداقل این وضعیت‌ها را برگرداند:

- `status: healthy`
- `database: up`
- `databaseEngine: mysql`

## 6. Smoke Test خودکار

```bash
SMOKE_API_URL=https://YOUR-DOMAIN/api/v1 \
SMOKE_EMAIL=admin@example.com \
SMOKE_PASSWORD='YOUR-REAL-ADMIN-PASSWORD' \
pnpm smoke
```

## 7. UAT مرورگر

با نقش‌های ORG_ADMIN، HSE_MANAGER، ASSESSOR و VIEWER بررسی شود:

- Login / Logout / Password reset
- Project / Process / Activity
- FMEA / RULA و گزارش PDF/Excel
- Corrective Actions
- File upload/download/delete
- Knowledge Base
- Smart Assistant
- Notifications
- Member invitation و Role change
- Profile / Password change
- Responsive desktop/mobile

## 8. Backup

```bash
pnpm db:backup
```

همچنین Volume یا مسیر Uploadها جداگانه پشتیبان‌گیری شود.

## 9. مواردی که نباید روی سرور عمومی بمانند

- رمزهای نمونه
- `.env` قابل دانلود از وب
- Swagger عمومی بدون محدودیت در صورت وجود داده حساس
- پورت 3306 باز روی اینترنت
- حساب Demo با رمز `Demo123!`

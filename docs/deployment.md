# استقرار NIVASafe

## پشته قطعی

- Frontend: React 19 + TypeScript + Vite
- Backend: Node.js 22 + TypeScript + Fastify
- Database: MySQL 8 یا MariaDB 10.6+ با Prisma ORM
- Ports: Frontend/Reverse proxy روی 5043 و API روی 5044

## قبل از استقرار

1. رمزهای نمونه را تغییر دهید.
2. `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` را حداقل ۳۲ کاراکتر تصادفی قرار دهید.
3. `SMTP_URL` واقعی تنظیم شود؛ بدون SMTP، دعوت عضو و بازیابی رمز در Production عمداً اجرا نمی‌شوند.
4. از پایگاه داده و پوشه فایل‌ها پشتیبان بگیرید.
5. بعد از استقرار، `pnpm smoke` را اجرا کنید.

## روش Docker Compose

1. فایل `.env.docker.example` را به `.env` کپی کنید.
2. دامنه، رمز MySQL، JWT و SMTP را تنظیم کنید. در Docker میزبان `DATABASE_URL` باید `mysql` باشد، نه `127.0.0.1`.
3. اجرا کنید:

```bash
docker compose config
docker compose build
docker compose up -d
```

API قبل از شروع، migrationهای MySQL را با `prisma migrate deploy` اجرا می‌کند. برای ساخت مدیر اولیه فقط یک بار اجرا کنید:

```bash
docker compose exec \
  -e SEED_ADMIN_EMAIL=admin@example.com \
  -e SEED_ADMIN_PASSWORD='A-Strong-Password-12+' \
  -e SEED_ADMIN_NAME='NIVASafe Administrator' \
  -e SEED_ORG_NAME_FA='سازمان اصلی' \
  api ./node_modules/.bin/tsx prisma/provision.ts
```

## روش Node/PM2

```bash
cp .env.production.example .env
pnpm install --frozen-lockfile
pnpm --filter @nivasafe/domain build
pnpm db:generate
pnpm db:deploy
pnpm build
pnpm db:provision
pm2 start deployment/ecosystem.config.cjs --only nivasafe-api --update-env
pm2 save
```

در روش PM2، دستور باید از ریشه پروژه اجرا شود تا `C:\NIVASafe\.env` توسط API بارگذاری شود؛ به همین دلیل `nivasafe-api` با `cwd` ریشه و اسکریپت `backend/dist/server.js` تعریف شده است. در ویندوز، `HOST=127.0.0.1` تنظیم می‌شود تا پورت `5044` مستقیماً عمومی نباشد و Nginx تنها ورودی `/api/` باشد. در استقرار فعال ویندوز، Scheduled Task `NIVASafe-API` اسکریپت `C:\ProgramData\NIVASafe\run-pm2.cmd` را اجرا می‌کند و `pm2-runtime` را به‌صورت foreground نگه می‌دارد تا با پایان task والد، supervisor و API خاتمه پیدا نکنند. پوشه `frontend/dist` را با Nginx سرو کنید و درخواست‌های `/api/` را به `127.0.0.1:5044` Proxy کنید. قانون SPA باید تمام مسیرهای ناشناخته را به `index.html` برگرداند. در production، TLS در Nginx terminate می‌شود و aliasهای قدیمی به `https://app.nivasafe.com` یا `https://api.nivasafe.com` redirect می‌شوند.

## واردکردن دستی ساختار دیتابیس

در صورت نیاز فایل زیر مستقیماً در MySQL قابل اجرا است:

```text
database/nivasafe-mysql-schema.sql
```

روش توصیه‌شده همچنان `pnpm db:deploy` است، چون تاریخچه migration را نیز ثبت می‌کند.

## کنترل پس از استقرار

```bash
SMOKE_API_URL=https://app.nivasafe.com/api/v1 \
SMOKE_EMAIL=admin@example.com \
SMOKE_PASSWORD='strong-password' \
pnpm smoke
```

این تست ورود، سلامت MySQL، پروژه، فرایند، فعالیت، FMEA، RULA، اقدام اصلاحی، گزارش PDF/Excel، فایل، پایگاه دانش، چت، اعلان‌ها، اعضا و پاک‌سازی داده آزمایشی را بررسی می‌کند.

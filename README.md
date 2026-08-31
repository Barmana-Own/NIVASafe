# NIVASafe

سامانه مدیریت HSE با پشته قطعی زیر:

- React 19 + TypeScript + Vite (Frontend، پورت 5043)
- Node.js 22 + Fastify + TypeScript (Backend، پورت 5044)
- MySQL/MariaDB + Prisma ORM (Database، پورت 3306)

## ساختار پروژه

```text
NIVASafe/
├── frontend/           # رابط کاربری React + TypeScript + Vite
├── backend/            # API و Worker مبتنی بر Node.js + Fastify
├── shared/domain/      # قواعد و محاسبات مشترک FMEA و RULA
├── database/           # ساختار و ابزارهای MySQL
├── deployment/         # Docker، Nginx، PM2 و راهنماهای استقرار
├── scripts/            # ابزارهای اجرا، تست، پشتیبان‌گیری و بازیابی
└── docs/               # مستندات فنی و استقرار
```

## اجرای محلی با XAMPP

1. MySQL را در XAMPP روشن کنید.
2. `.env.example` را به `.env` کپی کنید.
3. اجرا کنید:

```cmd
START-NIVASAFE-XAMPP.cmd
```

آدرس‌ها:

- Frontend: `http://localhost:5043`
- API health: `http://localhost:5044/api/v1/health`
- Swagger: `http://localhost:5044/docs`

## کنترل کیفیت

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm verify:contract
pnpm smoke
```

`pnpm smoke` به API در حال اجرا متصل می‌شود. اطلاعات ورود را با `SMOKE_EMAIL` و `SMOKE_PASSWORD` تعیین کنید.

## استقرار

جزئیات در `docs/deployment.md` و `deployment/SERVER-DEPLOY-CHECKLIST.md` است. برای Docker از `.env.docker.example` و برای Node/PM2 از `.env.production.example` استفاده کنید. migrationهای موجود فقط MySQL هستند؛ تمام تنظیمات قدیمی PostgreSQL از نسخه تحویل حذف شده‌اند.

## فایل‌های تحویل

- `deployment/SERVER-DEPLOY-CHECKLIST.md`: چک‌لیست استقرار و UAT سرور
- `database/nivasafe-mysql-schema.sql`: ساختار دستی MySQL

## Brand assets

Official NIVASafe logo files are stored in `frontend/public/brand/` and are used by the login page, application sidebar, favicon and PWA manifest.

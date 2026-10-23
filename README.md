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

## رضایت و تحلیل تصاویر RULA

رضایت اختیاری پردازش تصویر از ثبت‌نام یا تنظیمات حساب، مستقل از قوانین عمومی ثبت می‌شود؛ هنگام هر آپلود دوباره تأیید گرفته نمی‌شود. سرور در هر ارسال، رضایت جاری، نقش، سازمان، سهمیه و مجوز صاحب تصویر را بررسی می‌کند. قرارداد جاری در [راهنمای دسترسی تصویر](docs/rula-image-platform-access.md) و [قرارداد API](docs/rula-direct-consent-2026-10-22/06-api-contract.md) است.

فعال‌سازی عملیاتی تحلیل تصویر با تصمیم مالک از تأیید شرایط ارائه‌دهنده جدا شده است؛ ارسال همچنان به رضایت جاری کاربر و کنترل دسترسی وابسته است. رضایت نسخهٔ جدید هر دو مسیر RULA و FMEA را صریح پوشش می‌دهد و باید یک‌بار در تنظیمات حساب ذخیره شود. شرایط تأییدنشدهٔ نگهداری، حذف، محل پردازش و استفادهٔ آموزشی سرویس، تأییدشده تلقی نمی‌شوند. [شرح اصلاح و شواهد آزمون](docs/assessment-image-activation-2026-10-22.md) مرجع این تغییر است؛ اسناد قبلی وضعیت تاریخی خود را حفظ می‌کنند.

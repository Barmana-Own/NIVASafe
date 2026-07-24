# دیتابیس NIVASafe

- موتور: MySQL 8 یا MariaDB 10.6+
- نام پیشنهادی: `nivasafe`
- Schema دستی: `nivasafe-mysql-schema.sql`
- Migration اصلی Prisma: `apps/api/prisma/migrations/202607210001_mysql_initial/migration.sql`

روش توصیه‌شده برای ساخت/ارتقا:

```bash
pnpm db:generate
pnpm db:deploy
pnpm db:provision
```

برای تهیه فایل پشتیبان از دیتابیس در حال اجرا:

```bash
pnpm db:backup
```

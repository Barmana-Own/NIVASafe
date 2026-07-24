# پشتیبان‌گیری و بازیابی MySQL

## پشتیبان‌گیری

با `DATABASE_URL` صحیح و در دسترس بودن `mysqldump`:

```bash
pnpm db:backup
```

فایل SQL زمان‌دار داخل پوشه `backups` ساخته می‌شود. مسیر را می‌توان با `BACKUP_DIR` تغییر داد و در ویندوز مسیر `mysqldump.exe` را با `MYSQLDUMP_BIN` مشخص کرد.

## بازیابی

```bash
RESTORE_FILE=/path/to/nivasafe-backup.sql pnpm db:restore
```

در ویندوز می‌توان مسیر `mysql.exe` را با `MYSQL_BIN` مشخص کرد. قبل از بازیابی، از دیتابیس فعلی پشتیبان بگیرید و API/Worker را متوقف کنید.

## برنامه پیشنهادی

- پشتیبان کامل روزانه MySQL
- نگهداری حداقل ۱۴ نسخه روزانه و ۴ نسخه هفتگی
- پشتیبان جداگانه از پوشه `uploads` یا Bucket ذخیره‌سازی
- تست بازیابی ماهانه روی محیط آزمایشی

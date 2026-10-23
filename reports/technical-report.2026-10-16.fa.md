# گزارش فنی NIVASafe

| مشخصه | مقدار |
|---|---|
| تاریخ میلادی | 2026-10-16 |
| تاریخ شمسی | 1405/07/24 |
| نسخه مخزن | main / e5bf3f050bd6e127e13918c8d3eefcd3f8376acf |
| وضعیت | NOT READY |

## تغییرات و مرزبندی

تغییرات متمرکز گزارش‌شده در سه مرحله: UIهای پشتیبانی/مدیریت و tokenهای theme در فرانت؛ مجوز محدود صندوق تیکت و آزمون‌های بازگشت در backend؛ پیکربندی Vite/Vitest برای config-loader در محیط محدود. فهرست مسیرهای دقیق در گزارش ممیزی انگلیسی و changelog است. Git status در ابتدای ممیزی 384 و پس از افزودن هشت گزارش 392 مورد داشت؛ نمی‌توان همه تغییرات غیرگزارشی را به این سه مرحله نسبت داد.

## اعتبارسنجی

- build و typecheck مستقیم در کپی ایزوله موفق شد؛ 737/737 آزمون، قرارداد 90 مسیر فرانت/154 route بک‌اند و 29 بررسی انتشار موفق بودند.
- wrapperهای ریشه با pnpm 11.25.0 در حالی که نسخه پروژه 10.13.1 است، پیش از اجرای task با ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY متوقف شدند.
- pnpm audit --prod به علت EACCES رجیستری ناموفق بود.
- تست تیکت در staging ایزوله با MariaDB و مرورگر موفق بود؛ در production آزموده نشد.
- درخواست تصویر مصنوعی RULA در gateway با HTTP 401 رد شد؛ 503 امن برگشت و امتیازی ذخیره نشد.
- migration replay دورریختنی پس از هشت migration به duplicate globalRole و سه checksum متفاوت برخورد کرد.
- WebKit/Safari/iOS، Playwright، authenticated production UAT و restore پشتیبان اجرا نشدند.

## عملیات و ریسک

Health محلی http://127.0.0.1:5044/api/v1/health مقدار HTTP 200، database up و version 0.1.0 داشت. فایل‌های فعال در C:\inetpub\nivasafe\app-com با candidate در temp hash متفاوت داشتند؛ deployment انجام نشد. Backup موجود است اما restore آن pending است. هیچ migration، restart یا تغییر دیتابیس زنده انجام نشد.

## امنیت

آزمون‌های منفی auth/consent/tenant و تفکیک یادداشت داخلی در محیط ایزوله شواهد مثبتی هستند، اما audit وابستگی و آزمون امنیتی runtime کامل نشده است. گیت‌های consent/provider در سورس حفظ شده‌اند. مقدار secret در گزارش درج نشده است.


# گزارش فنی تحویل NIVASafe

| مشخصه | مقدار |
|---|---|
| نوع گزارش | فنی / فارسی |
| تاریخ شمسی | ۱۴۰۵/۰۷/۲۴ |
| تاریخ میلادی | 2026-10-16 |
| مخزن | `C:\NIVASafe`، `main`، `e5bf3f050bd6e127e13918c8d3eefcd3f8376acf` |
| نتیجه | **BLOCKED — انتشار انجام نشد** |

## خلاصه اجرایی

در این نوبت یک اصلاح محدود CSS در نوار کناری جمع‌شده با آزمون بازگشت اعمال شد. تست‌های فرانت‌اند، TypeScript فرانت‌اند و build کاندیدای ایزوله موفق بودند. RULA دیداری در staging به درگاه ArvanCloud رسید اما HTTP 401 گرفت؛ نتیجه ذخیره نشد. پشتیبانی فقط در staging قبلی E2E شده است. هیچ تغییر روی سرویس، تنظیمات عملیاتی یا پایگاه داده انجام نشد.

## تغییرات و محیط‌ها

- تغییر این نوبت: `frontend/src/styles/shell.css` و `frontend/src/components/enterprisePresentation.test.tsx`؛ هر دو فایل در baseline به‌صورت untracked دیده شدند، بنابراین انتساب کامل سابقه آنها نامشخص است. assertion جدید قبل از اصلاح fail و پس از آن pass شد.
- کاندیدای ایزوله: `C:\NIVASafe\.local\execution-20261016\frontend-dist`; خروجی آن به ریشه وب منتشر نشد.
- static root فعال: `C:\inetpub\nivasafe\app-com`; JS و CSS فعال تاریخ قدیمی‌تری از کاندیدای جاری دارند.
- سلامت API روی loopback پورت 5044 فقط‌خواندنی بررسی شد؛ MySQL up و نسخه `0.1.0` گزارش شد. command line سرویس/فرآیند و env محافظت‌شده قابل مشاهده نبود.
- backup موجود در `C:\ProgramData\NIVASafe\backups\debug-phase02-20261016T133843Z` دارای dump دیتابیس است، اما restore verification در manifest برابر pending است. مسیر بازگشت تأییدنشده است.

## مدل‌ها و سفرهای کسب‌وکار

- RULA: یک تصویر مصنوعی به `https://api.arvancloudai.ir/v1/chat/completions` با `GPT-5-Mini` ارسال شد؛ HTTP 401؛ برنامه 503 `RULA_IMAGE_AI_UNAVAILABLE` داد و هیچ نتیجه‌ای ذخیره نشد. شناسه درخواست `b8e12c19-f17b-4c7a-9cdd-875209157873` است. علت دقیق credential/scope/entitlement مشخص نیست.
- کنترل‌های منفی قبلی: unauthenticated 401، نبود consent برابر 403، viewer برابر 403، امضای فایل نامعتبر برابر 415.
- تیکت: گزارش قبلی سفر staging را با create 201، retry برابر 200، conflict برابر 409، reply برابر 201، update برابر 200، cross-org برابر 404، unauth برابر 401 و پنهان ماندن یادداشت داخلی ثبت کرده است. سه اعلان ساخته شد. این نتایج پذیرش سایت جاری نیستند.
- Chat با `DeepSeek-V4-Flash` و تحلیل FMEA با ارائه‌دهنده واقعی پاسخ موفق دریافت نکردند.
- کلیدهای پیکربندی پشتیبانی `SUPPORT_OPERATOR_USER_IDS` و `SUPPORT_OPERATOR_ORGANIZATION_IDS` هستند؛ مقادیر runtime بررسی نشدند.

## اعتبارسنجی جاری

| فرمان | نتیجه |
|---|---|
| `pnpm --version` | 0؛ نسخه 11.25.0، درحالی‌که manifest نسخه 10.13.1 را pin می‌کند |
| Vitest هدفمند فرانت‌اند | 0؛ 16/16 |
| Vitest کامل فرانت‌اند | 0؛ 50 فایل / 323 تست |
| TypeScript فرانت‌اند | 0 |
| Vite build ایزوله | 0؛ 108 module؛ chunk ورودی 554.74 kB و بزرگ‌تر از آستانه advisory |
| `pnpm verify:contract` | 0؛ 90 مسیر frontend / 154 route backend |
| `pnpm verify:release` | 0؛ 29 check |
| `pnpm lint` / `pnpm typecheck` | 2؛ dependency/typeهای backend از جمله `@prisma/client`, `vitest`, `fastify` و Node types resolve نشدند |
| `pnpm test` / API Vitest | 1؛ binary `vitest` در API package در دسترس نیست |
| `pnpm audit --prod` | 1؛ registry با `EACCES` پاسخ داد؛ نتیجه vulnerability در دست نیست |
| `pnpm build` | اجرا نشد؛ مسیر احتمالی خروجی backend و artifact زنده مشخص نبود و dependencyهای backend ناقص‌اند |

گزارش پیشین 737 تست موفق را در isolated workspace ثبت کرده است؛ این نتیجه تاریخی است و جایگزین اجرای جاری root نیست. در این نوبت migration، seed، smoke تست تغییردهنده داده یا آزمون روی DB فعال انجام نشد.

## Windows، امنیت، و انتشار

خطای قبلی `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`/EPERM از گزارش مرحله قبل باقی است؛ در اجرای فعلی، خطاهای root از dependencyهای غایب و audit از `EACCES` ناشی شد. قفل فایل، ACL یا Defender به‌عنوان علت EPERM اثبات نشد. مجوزها تغییر نکرد و هیچ process متوقف نشد. رازها و envهای محافظت‌شده خوانده نشدند. سرویس، DB، فایل‌های وب و پیکربندی عملیاتی تغییر نکردند؛ restart یا deployment وجود نداشت.

جزئیات فنی، اثر انگشت فایل‌ها، مرورگرها، مدل‌ها و شروط پذیرش در [گزارش فنی انگلیسی اجرا](NIVASafe-EXECUTION-TECHNICAL.en.md) آمده است.

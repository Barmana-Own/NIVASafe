# NIVASafe Task 07 — گزارش اجرای تست و تحویل

تاریخ اجرا: 2026-10-15، میزبان macOS (`Darwin`).

Node.js و pnpm از runtime همراه Codex در `PATH` قرار گرفتند؛ تست export نیز برای PDF fontهای سیستم از دو متغیر `NIVASAFE_PDF_FONT_PATH` و `NIVASAFE_PDF_FONT_BOLD_PATH` استفاده کرد.

## تست‌ها و build

| فرمان | نتیجه |
|---|---|
| `NIVASAFE_PDF_FONT_PATH=/System/Library/Fonts/SFArabic.ttf NIVASAFE_PDF_FONT_BOLD_PATH=/System/Library/Fonts/SFArabic.ttf pnpm exec turbo run test --force -- --reporter=dot` | موفق و بدون cache در 2026-10-15: API `58` فایل/`390` تست، frontend `46` فایل/`307` تست، domain `1` فایل/`12` تست؛ مجموع `709` تست. |
| `pnpm exec turbo run typecheck --force` | موفق؛ هر سه package بدون cache. |
| `pnpm exec turbo run lint --force` | موفق؛ هر سه package بدون cache (lint پروژه با TypeScript اجرا می‌شود). |
| `pnpm exec turbo run build --force` | موفق و بدون cache؛ API/domain/frontend. Vite هشدار می‌دهد chunk اصلی minified با اندازهٔ `552.67 kB` از 500 kB بزرگ‌تر است؛ build fail نشد. |
| `pnpm verify:contract` | موفق؛ ۸۸ مسیر فرانت‌اند با routeهای backend تطبیق دارند. گزارش شمارش کل routeهای backend: ۱۵۴. |
| `DATABASE_URL=mysql://nivasafe:unused@127.0.0.1:3306/nivasafe pnpm --filter @nivasafe/api exec prisma validate` | موفق؛ فقط schema validation. این URL placeholder است و اتصال دیتابیس انجام نشد. Prisma هشدار deprecated بودن `package.json#prisma` داد. |

تست‌های تازه/هدفمند شامل `backend/src/rula-registered-member.test.ts`، `backend/src/rula-posture.test.ts`، `backend/src/rula-posture-ai.test.ts`، `backend/src/rula-three-stage.test.ts`، `backend/src/image-analysis-diagnostics.test.ts`، `backend/src/ai-usage.test.ts`، `backend/src/reports-export.test.ts`، `backend/src/support.test.ts`، `backend/src/support-expired-subscription.test.ts`، `backend/src/support-ticket-state.test.ts`، `frontend/src/features/assessments/rulaAiRequest.test.ts`، `frontend/src/features/assessments/rulaPostureReview.test.ts` و `frontend/src/features/support/supportModel.test.ts` هستند. تست source-contract رابط نیز از محل helper جدید بررسی می‌کند.

تست‌های تازه برای confidence/عدم‌تشخیص، retry غیرقابل‌تکرار، قطعی شبکهٔ upload، provider غیرقابل دسترس/timeout، خطای JSON مدل، approval ناقص و رقابت هم‌زمان تیکت ابتدا در RED شکست خوردند و بعد از تغییرات GREEN شدند. رخداد واقعیِ حساب کاربر در محیط واقعی قابل بازتولید نبود؛ این تست‌ها fixture/Prisma mock یا Fastify inject هستند.

بازبینی مستقل read-only پس از اصلاح‌های نهایی در usage retryها، نمایش وضعیت بازبینی RULA و ممیزی assignment تیکت، مورد اقدام‌پذیر دیگری پیدا نکرد.

## چه چیزی اجرا نشد

- `DATABASE_URL`، دیتابیس تست/staging، حساب واقعی و credentialهای provider در محیط unset هستند. هیچ migration روی دیتابیس staging/production اعمال و هیچ دادهٔ واقعی تغییر داده نشد.
- مرورگر E2E با MySQL و کاربرهای واقعی (admin + دو عضو در سازمان‌های مجزا)، reload/session refresh، گزارش واقعی، quota واقعی و notification persistence اجرا نشد.
- provider واقعی و عکس انسانی اجرا/ارسال نشد؛ benchmark متخصص ارگونومی، دقت زاویه و false-low-risk اندازه‌گیری نشده است.
- اجرای Windows، مرورگر Windows، PowerShell/deployment و رفتار migration روی MariaDB واقعی بررسی نشد؛ این میزبان macOS است و فایل‌های deployment ویندوز تغییر نکردند.
- به‌دلیل نبود `.git` در این checkout، branch/status/diff Git در دسترس نیست. فایل‌های source مستقیماً در همان workspace جاری و بدون reset ویرایش شدند.

## migration و عملیات

Migration افزایشی `backend/prisma/migrations/202610150003_task07_rula_support/migration.sql` به `SupportRequest` priority/assignee/assessment reference/public error و index می‌افزاید، `WAITING_USER` را به enum وضعیت و `visibility` را با پیش‌فرض `PUBLIC` به reply اضافه می‌کند. Prisma schema validate شد؛ migration **اجرا نشده** است. پیش از استقرار، backup، بررسی SQL و اجرای migration روی staging لازم است. برای rollback پس از ثبت دادهٔ جدید، restore از backup هماهنگ‌شده لازم است؛ حذف ستون‌های تازه می‌تواند assignment/reference/visibility را از بین ببرد.

## خلاصهٔ تغییر فایل‌ها

- **RULA/API:** `backend/src/modules/assessments.ts`, `backend/src/rula-action-generation.ts`, `backend/src/ai-usage.ts`, `backend/src/rula-posture-ai.ts`, `backend/src/rula-posture.ts`, `backend/src/image-analysis-diagnostics.ts`, `backend/src/app.ts`؛ بررسی تصویر، usage تجمیعی retry، gate تأیید انسانی، finalization و خطا/retry امن.
- **RULA/frontend:** `frontend/src/api/client.ts`, `frontend/src/features/assessments/AssessmentPages.tsx`, `frontend/src/features/assessments/rulaAiRequest.ts`, `frontend/src/features/assessments/rulaPostureReview.ts`, `frontend/src/i18n.tsx`؛ انتقال retryability/error code و مخفی‌سازی زاویه/تشخیص/امتیاز تا بازبینی در نمای گزارش.
- **تیکت:** `backend/src/modules/support.ts`, `backend/src/support-ticket-state.ts`, `frontend/src/features/support/SupportPage.tsx`, `frontend/src/features/support/supportModel.ts`, `frontend/src/components/UI.tsx`, `frontend/src/i18n.tsx`؛ thread، note داخلی، فیلتر/صفحه‌بندی، assignment و ممیزی مقصد، workflow، اعلان و کنترل هم‌زمانی.
- **داده:** `backend/prisma/schema.prisma` و migration افزایشی بالا. Migration در DB اجرا نشده است.
- **آزمون/مستندات:** تست‌های backend/frontend و این پنج سند Task 07.
- **فایل‌های deployment ویندوز و منطق محاسبهٔ FMEA/RULA:** تغییر داده نشدند؛ سازگاری/اجرا روی Windows تأیید نشده است.

## موانع قبل از اعلام تکمیل عملیاتی

1. ارائهٔ requestId و trace پالایش‌شدهٔ حساب واقعی برای تشخیص علت همان رخداد ثبت‌نام.
2. فراهم‌کردن دیتابیس disposable/staging و اجرای migration + تست persistence.
3. تأیید مالک محصول/حریم خصوصی و ثبت allowlist اپراتور و سازمان برای support در secret/config امن؛ تا آن زمان صف کارکنان به‌صورت پیش‌فرض بسته می‌ماند. همچنین تعیین retention/deletion تیکت.
4. بررسی حریم خصوصی و تأیید provider مشخص در `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER`، credential آزمایشی و benchmark برچسب‌خورده توسط متخصص.
5. اجرای browser E2E و Windows validation روی محیط‌های مربوط.

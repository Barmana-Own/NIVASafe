# گزارش فنی — سخت‌گیری و پایداری آزمون تصویری

| مورد | مقدار |
|---|---|
| پروژه | NIVASafe |
| نوع گزارش | فنی |
| زبان | فارسی |
| تاریخ شمسی | ۱۰ مهر ۱۴۰۵ |
| تاریخ میلادی | ۲ اکتبر ۲۰۲۶ |
| بازبینی مبنا | `17c0d8b`؛ تغییرات این کار commit نشده‌اند |
| وضعیت | اعتبارسنجی محلی موفق؛ اجرای CI راه‌دور انجام نشده |

## دامنه و علت ریشه‌ای

حد مجاز عمومی `toHaveScreenshot` برابر `0.08` بود و تمام assertionهای تصویری بدون override از آن استفاده می‌کردند. برای screenshotها `maxDiffPixels`، pixelmatch `threshold`، mask یا استثنای موردی دیگری وجود نداشت. readiness helper فقط ۱۰۰ میلی‌ثانیه مکث می‌کرد و آماده‌شدن فونت/تصاویر را بررسی نمی‌کرد. در trace یک درخواست subset لاتین Vazirmatn از `fonts.gstatic.com` با `ERR_CONNECTION_FAILED` ثبت شده بود؛ همچنین خروجی trace/report زیر watch سرور Vite می‌توانست HMR و reload حین capture ایجاد کند.

## پیاده‌سازی

- `frontend/playwright.config.ts`: حد سراسری به `maxDiffPixelRatio: 0.02` تغییر کرد؛ scale تصویر CSS، locale فارسی، timezone تهران و device scale factor یک تثبیت شده‌اند. Playwright نسخه ۱٫۵۶٫۱ و Chromium نسخه ۱۴۱٫۰٫۷۳۹۰٫۳۷ استفاده شد.
- `frontend/tests/e2e/fixtures.ts`: در مرحلهٔ اولیهٔ سخت‌گیری آزمون تصویری، readiness شامل `networkidle` بود؛ اصلاح مرحلهٔ ۰۴ که پایین‌تر ثبت شده، آن را با آمادگی محدود و مبتنی بر وضعیت واقعی جایگزین کرد. درخواست‌های Google Fonts در تست با همان نسخه Vazirmatn از فایل‌های محلی fixture پاسخ داده می‌شوند؛ CSS و assetهای production تغییر نکردند. مجوز فونت در `frontend/tests/e2e/assets/OFL.txt` قرار دارد.
- `frontend/tests/e2e/visual.spec.ts`: مسیر عمومی login/register حالت theme/language صریح دارد و زمان سیستم ثابت است. پوشش فهرست و فرم FMEA/RULA و Knowledge/Notifications/Members/Profile در ۳۹۰ و ۱۲۸۰ پیکسل اضافه شد.
- `frontend/tests/e2e/__snapshots__/chromium/visual.spec.ts/`: ۱۶ baseline جدید برای همان ۸ سطح اضافه و تصاویر پس از تولید بازبینی شدند. baselineهای موجود در این مرحله به‌روزرسانی نشدند؛ اختلافات موجود در working tree از قبل حاضر بودند و حفظ شدند.
- `frontend/vite.config.ts`: دایرکتوری‌های artifactهای Playwright از watch توسعه Vite مستثنا شدند تا ایجاد trace باعث reload صفحه در capture نشود.
- `docs/testing.md`: حد آستانه، ماتریس صفحه‌ها، منابع فونت fixture و سیاست snapshot مستند شد.

یک اجرای تصویری پیش از اصلاح watch در ۴۲/۵۲ متوقف شد؛ ایجاد trace باعث HMR/reload صفحه شده بود. پس از مستثناکردن پوشه‌های artifact، دو اجرای نهایی متوالی بدون reload ناخواسته کامل و موفق شدند.

هیچ override با آستانه بزرگ‌تر، threshold ثانویه، mask تصویری یا تغییر CSS/فونت production اضافه نشد. اجرای workflow در `.github/workflows/ci.yml` به صورت ایستا بررسی شد: push و pull request را هدف می‌گیرد و job ویژوال `test:visual` را بدون `--update-snapshots` اجرا می‌کند. اجرای واقعی GitHub Actions انجام نشده است.

## اعتبارسنجی

محیط محلی: Windows؛ `@playwright/test` نسخه 1.56.1؛ Chromium نسخه 141.0.7390.37؛ locale=`fa-IR`، timezone=`Asia/Tehran` و deviceScaleFactor=`1`. ماتریس تصویری شامل ۵۲ مورد در viewportهای ۳۲۰/۳۶۰/۳۹۰/۴۳۰/۴۸۰/۷۶۸/۱۰۲۴/۱۲۸۰/۱۴۴۰/۱۹۲۰ (بر حسب صفحه)، مسیرهای موبایل و دسکتاپ، گزارش‌های دو ارزیابی و نمونه‌های RTL/LTR و theme است.

| فرمان | نتیجه واقعی |
|---|---|
| `pnpm.cmd --filter @nivasafe/web test:visual` — اجرای اول | PASS، ۵۲/۵۲ |
| همان فرمان — اجرای پیاپی دوم، بدون تغییر کد/fixture | PASS، ۵۲/۵۲ |
| `pnpm.cmd --filter @nivasafe/web test:e2e` | PASS، ۹۰/۹۰ |
| `pnpm.cmd --filter @nivasafe/web test:overflow` | PASS، ۱۰۸/۱۰۸ |
| `pnpm.cmd --filter @nivasafe/web lint` | PASS |
| `pnpm.cmd --filter @nivasafe/web typecheck` | PASS |
| `pnpm.cmd --filter @nivasafe/web test` | PASS، ۵ فایل و ۱۲۴ تست |
| `pnpm.cmd --filter @nivasafe/web build` | PASS؛ هشدار اندازه chunk بالاتر از ۵۰۰KB |
| `git diff --check` | PASS؛ فقط هشدارهای موجود درباره تبدیل LF/CRLF |

برای آزمون منفی، تغییر موقت CSS با `transform: translateY(140px)` روی `.rula-report-view` اعمال شد. فرمان `pnpm.cmd --filter @nivasafe/web test:visual --grep "rula-report-390"` آزمون بصری را با ۶۶٬۷۲۵ پیکسل اختلاف (نسبت ۰٫۰۳) شکست داد، در حالی که آزمون overflow هم‌نام پاس شد. تصاویر expected/actual/diff بررسی شدند. تغییر موقت حذف شد و اجرای فایل‌محور `pnpm.cmd --filter @nivasafe/web exec playwright test tests/e2e/visual.spec.ts --grep "rula-report-390"` با ۱/۱ موفق شد. هیچ baseline از این آزمون منفی بازنویسی نشد.

## محدودیت‌ها و ریسک باقیمانده

- مخزن و CI، pnpm نسخه 10.13.1 را تعیین می‌کنند؛ محیط محلی pnpm نسخه 11.19.0 داشت. اجرای Corepack برای نسخه pinned به علت `EPERM` هنگام ایجاد cache پیش‌فرض در مسیر خارج از workspace انجام نشد. آزمون‌ها با pnpm محلی و dependencyهای نصب‌شده از workspace اجرا شدند؛ اجرای CI واقعی یا تکرار کامل با pnpm 10.13.1 مشاهده نشده است.
- هشدار chunk بزرگ‌تر از ۵۰۰KB در build باقی است و خارج از دامنه این مرحله است.
- تغییرات working tree commit/push/deploy نشده‌اند. تعدادی تغییر از مراحل قبلی از قبل وجود داشتند و دست‌نخورده حفظ شدند.

## بررسی امنیت و رگرسیون

تغییرات اجرایی این مرحله به Playwright، fixtureها، assetهای آزمون و watch توسعه محدودند؛ مسیر production فونت، API، محاسبات FMEA/RULA، دسترسی‌ها و داده‌ها تغییر نکردند. فایل‌های font با مجوز OFL همراه‌اند. E2E، overflow، typecheck، unit و build اجرا شدند؛ این کار جایگزین audit امنیتی جامع برنامه نیست.

## الحاقیه — آمادگی قطعی صفحه و ساعت اشتراک

در مرحلهٔ بعد، `waitForPageReady()` در `frontend/tests/e2e/fixtures.ts` با بودجهٔ کلی ۱۲ثانیه‌ای و فازهای route، محتوای قابل‌مشاهده، loaderهای واقعی، `document.fonts.ready`، کامل‌شدن و decode تصاویر، font readiness پس از render و ثبات هندسه طی frameهای متوالی تکمیل شد. انتظار عمومی `networkidle` و مکث‌های ثابت از مسیر آمادگی حذف شدند. در `authenticate()` انتظار shell جداگانه حذف شد تا readiness یک بودجهٔ مستقل اضافه نداشته باشد. خطاهای timeout، route، فاز جاری، loaderها، تصاویر و آخرین هندسه را گزارش می‌کنند. تنها `setTimeout`های باقی‌مانده deadline و مهلت محدود جمع‌آوری diagnostics را اعمال می‌کنند. برای اسکرین‌شات همچنان تنظیم Playwright جهت خاموش‌کردن انیمیشن و caret استفاده می‌شود؛ تست‌های تعاملی این رفتار را تغییر نمی‌دهند.

شش regression test آمادگی، بارگذاری تأخیری dashboard، تصویر preview، loader متوقف، فونت محلی، ناوبری SPA و تصویر بدون source را پوشش می‌دهند. هیچ درخواست بیرونی یا mock production اضافه نشده است.

در مرحلهٔ اشتراک، علت ریشه‌ای آزمون این بود که `createSubscriptionFields()` لحظهٔ ساخت را می‌گرفت ولی `subscriptionIsUsable()` زمان واقعی سیستم را جداگانه می‌خواند. تابع backend اکنون پارامتر اختیاری `now = new Date()` دارد و آن را به `isSubscriptionActive()` موجود در domain می‌دهد؛ فراخواننده‌های production بدون پارامتر، همان ساعت جاری را حفظ می‌کنند. هیچ تغییر API، payload، schema، نقش، مدت اشتراک یا business rule وجود ندارد.

آزمون‌ها قواعد موجود را ثبت می‌کنند: فقط `ACTIVE` و `TRIALING` واجد شرایط‌اند؛ `expiresAt` دقیقاً در لحظهٔ انقضا دیگر معتبر نیست؛ `null` برای وضعیت واجدشرایط بدون انقضا همچنان مجاز است؛ تاریخ نامعتبر نامعتبر ارزیابی می‌شود. تست‌های trial در ۲۰۲۶ و ۲۰۴۶ یک لحظهٔ UTC مشترک دارند و انقضای ۱۴روزه را با دقت میلی‌ثانیه بررسی می‌کنند. تست مسیر پیش‌فرض ساعت fake را در `finally` حتماً بازمی‌گرداند.

### اعتبارسنجی الحاقیه

| فرمان | نتیجه |
|---|---|
| `pnpm --filter @nivasafe/web test:e2e --output=playwright-results/stage04-e2e-final2` | PASS، ۹۶/۹۶؛ Chromium، Windows |
| `pnpm --filter @nivasafe/web test:overflow --output=playwright-results/stage04-overflow-final2` | PASS، ۱۰۸/۱۰۸؛ مسیرهای اصلی در ۳۹۰ و ۱۲۸۰ و ماتریس بحرانی ۳۲۰ تا ۱۹۲۰ پیکسل |
| `pnpm --filter @nivasafe/web test:visual --output=playwright-results/stage04-visual-final2-1` | PASS، ۵۲/۵۲ |
| `pnpm --filter @nivasafe/web test:visual --output=playwright-results/stage04-visual-final2-2` | PASS، ۵۲/۵۲ متوالی؛ آستانهٔ ۰٫۰۲ و baselineهای موجود |
| `pnpm --filter @nivasafe/web exec playwright test tests/e2e/readiness.spec.ts --project=chromium --output=playwright-results/stage04-readiness-final2` | PASS، ۶/۶ |
| `pnpm --filter @nivasafe/web lint` و `pnpm --filter @nivasafe/web typecheck` | PASS |
| `pnpm --filter @nivasafe/web test` | PASS، ۵ فایل و ۱۲۴ تست |
| `pnpm --filter @nivasafe/web build` | PASS؛ هشدار chunk بالاتر از ۵۰۰KB |
| `pnpm --filter @nivasafe/api exec vitest run src/organization-rules.test.ts` | PASS، ۱۲/۱۲ |
| `pnpm --filter @nivasafe/api exec vitest run --maxWorkers=1` | PASS، ۲۳ فایل و ۱۵۲ تست |
| `pnpm --filter @nivasafe/domain test` | PASS، ۱۲/۱۲ |
| `pnpm --filter @nivasafe/api lint` و `pnpm --filter @nivasafe/api typecheck` | PASS |
| `pnpm --filter @nivasafe/api build` | PASS |
| `pnpm --filter @nivasafe/api test` | FAIL در یک اجرای parallel: ۱۵۱/۱۵۲؛ timeout موردی در آزمون AI provider |
| `pnpm --filter @nivasafe/api exec vitest run src/ai-provider.test.ts -t "reports configured providers as available"` | PASS، ۱ تست؛ ۱۸ مورد خارج از فیلتر skip |

فرمان موازی متعارف `pnpm --filter @nivasafe/api test` در یک اجرا ۱۵۱/۱۵۲ داشت؛ تنها timeout پنج‌ثانیه‌ای آزمون «reports configured providers as available» در `ai-provider.test.ts` بود. اجرای همان مورد به‌تنهایی PASS شد و اجرای کامل تک‌worker، بدون تغییر timeout یا حذف آزمون، ۱۵۲/۱۵۲ PASS شد. این مورد به منطق اشتراک مرتبط نبود و در گزارش نهایی پنهان نشده است.

یک بررسی strict TypeScript دستی برای فایل‌های E2E، خارج از script/tsconfig پروژه، با فرمان زیر اجرا شد و FAIL شد:

```text
node_modules/.bin/tsc.cmd --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --typeRoots ../node_modules/.pnpm/node_modules/@types --types node --lib ES2022,DOM,DOM.Iterable --jsx react-jsx --esModuleInterop tests/e2e/fixtures.ts tests/e2e/readiness.spec.ts tests/e2e/overflow.spec.ts tests/e2e/visual.spec.ts tests/e2e/touch-targets.spec.ts tests/e2e/interaction.spec.ts
```

خطاها در `overflow.ts:171`، `testData.ts:136`، `touch-targets.spec.ts:75` و `touch-targets.ts:76-77` بودند؛ در helper و spec آمادگی جدید خطایی گزارش نشد. فرمان رسمی frontend lint/typecheck PASS است و Playwright تمام suiteهای مرورگری را اجرا کرد. این بررسی دستی در پیکربندی repository تعریف نشده و خطاهایش خارج از تغییرات فعلی‌اند.

فرمان `git diff --check` برای فایل‌های تغییرکرده موفق بود؛ تنها هشدارهای line ending در Windows دیده شدند. اجرای remote CI انجام نشده و PNG baselineها در Stage 04/05 بازنویسی نشدند.

## مرحلهٔ ۰۷ — دروازهٔ نهایی کیفیت انتشار محلی

**وضعیت: PASS (فقط اعتبارسنجی محلی).** این نقطهٔ کنترل وضعیت working tree فعلی روی revision مبنای `17c0d8b` است؛ تغییرات بدون commit مراحل قبل حفظ شدند. تاریخ: ۱۰ مهر ۱۴۰۵ / ۲ اکتبر ۲۰۲۶.

| بررسی | نتیجهٔ فعلی |
|---|---|
| `corepack pnpm test` | PASS: دامنه ۱۲، API تعداد ۱۵۲ و frontend تعداد ۱۳۱؛ جمعاً ۲۹۵ تست |
| `corepack pnpm lint`، `corepack pnpm typecheck`، `corepack pnpm build` | PASS در ۳ بسته؛ هشدار chunk جاوااسکریپت ۸۹۰٫۲۰ کیلوبایتی باقی است |
| `corepack pnpm verify:release` / `corepack pnpm verify:contract` | PASS: ۲۸ بررسی انتشار؛ ۶۸ مسیر API فرانت‌اند با ۱۲۱ route بک‌اند تطبیق دارند |
| `pnpm --filter @nivasafe/web test:e2e` | PASS: ۹۹/۹۹ تست Chromium در Windows |
| `pnpm --filter @nivasafe/web test:overflow` | PASS: ۱۰۸/۱۰۸ |
| `pnpm --filter @nivasafe/web test:visual` | PASS: ۵۲/۵۲ با `maxDiffPixelRatio: 0.02` |
| آزمون متمرکز PDF/WebM/dialog با pnpm پین‌شده | PASS: ۳/۳ با pnpm 10.13.1 |
| بررسی دستی strict TypeScript برای فایل‌های fixture/spec در Playwright | PASS: بدون diagnostic |
| گراف import محدود FMEA/RULA | PASS: در فایل‌های بررسی‌شده cycle پیدا نشد |

در مرحلهٔ ۰۷ آزمون‌های مرورگری برای PDF محلی، WebM تولیدشده در Chromium، آزادسازی object URL، محدودماندن focus در modal، Escape، قفل اسکرول پس‌زمینه و بازگشت focus اضافه شد. fixture پس از timeout اولیهٔ ضبط و سپس خطای تعداد کارت مورد انتظار اصلاح شد؛ تست‌های اصلاح‌شده و کل E2E موفق شدند. در این مرحله source مربوط به production و baseline تصویری تغییر نکرد. سه تصویر موجود که بازبینی شدند: `rula-report-390.png`، `fmea-report-320.png` و `dashboard-1280.png` در مسیر `frontend/tests/e2e/__snapshots__/chromium/visual.spec.ts/`.

یک اجرای کامل اولیهٔ E2E روی آزمون hit target گزارش RULA در عرض ۱۹۲۰ پیکسل timeout شد و تصویر ثبت‌شده هنوز loader را نشان می‌داد. اجرای همان مورد به‌تنهایی ۱/۱ و اجرای کامل بعدی ۹۹/۹۹ موفق شد. خطا قابل بازتولید نبود و علت قطعی در برنامه شناسایی نشد؛ بنابراین به‌عنوان ریسک گذرای پایداری آزمون ثبت می‌شود.

فایل `error-context.md` مربوط به timeout اولیه پس از اجراهای بعدی دیگر در `frontend/playwright-results/` موجود نیست، چون مسیر خروجی در اجراهای بعدی دوباره استفاده شد. اجرای نهایی visual موفق بود و attachment اختلاف expected/actual/diff تولید نکرد.

فایل‌های آزمون دیگری که در مرحلهٔ ۰۷ اصلاح شدند: `fixtures.ts`، `overflow.ts`، `testData.ts`، `touch-targets.spec.ts` و `touch-targets.ts`. بررسی strict TypeScript دستی برای همهٔ fixtureها و specهای Playwright پس از اصلاحات بدون diagnostic موفق شد. این اصلاحات کد برنامه یا baseline تصویری را تغییر ندادند.

پیکربندی CI به‌صورت ایستا بررسی شد: triggerهای push/PR، job کیفیت Ubuntu، job تصویری Windows وابسته، مسیر artifactهای خطا و نبودن پرچم به‌روزرسانی baseline برقرارند. اجرای واقعی Actions و تنظیمات branch-protection مشاهده نشد. تست زندهٔ MySQL/API، استقرار یا درخواست production انجام نشد. safe-area فیزیکی iOS و مرورگرهای غیر Chromium آزمایش نشدند. ابزار اعتبارسنجی YAML در محیط موجود نبود و workflow به‌صورت ایستا بررسی شد.

نسخهٔ پین‌شدهٔ package manager از طریق cache محلی Corepack در workspace در دسترس قرار گرفت. اجرای کامل E2E/overflow/visual پیش از آن با pnpm محلی 11.19.0 بود؛ تست‌های ریشه، lint/typecheck/build، verifierها و تست‌های متمرکز نهایی مرورگر با pnpm 10.13.1 اجرا شدند. lockfile تغییر نکرد.

پایان موفق `pnpm install --frozen-lockfile` ثبت نشد: dependencyهای موجود از قبل آماده بودند و تلاش نصب به درخواست جایگزینی پوشهٔ modules رسید. lockfile تغییر نکرد؛ این مرحلهٔ نصب به‌عنوان انجام‌نشده ثبت می‌شود، نه PASS.

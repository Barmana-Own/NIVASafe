# شواهد فنی اصلاح دسکتاپ ورود NIVASafe

| پروژه | NIVASafe |
|---|---|
| میلادی / شمسی | 2026-10-19 / 1405-07-27 |
| انتشار frontend | release-login-desktop-20261019-01 |
| وضعیت | DEPLOYED؛ 2026-10-19T12:29:35.917Z |

## علت و اصلاح محدود

در frontend/src/styles.css،هدر backdrop-filter:blur(14px) داشت. override بعدی authentication.css پس‌زمینه را transparent کرد اما blur را حذف نکرد؛محوشدن مرز دو ستون نتیجهٔ همین cascade بود. قبل از اصلاح،هر۹آزمون desktopClearHeader رد و assertion واقعی با exit1 ثبت شد(regression-red.log).

تنها فایل کاربردی تغییرکرده frontend/src/styles/authentication.css است. تمام CSS قبلی عیناً حفظ و یک media query با min-width:901px افزوده شد:هدر opaque۷۶پیکسلی،حذف هر دو backdrop-filter،رنگ خوانای لینک‌ها،فضای مستقل زیر هدر،تیتر۱٫۵تا۲٫۲۵rem و فضای محدود فرم. فرم ساده/ثبت‌نام و موبایل خارج از selector هستند. هیچ TS/JS/HTML،route،فرم،مجوز،dependency یا قانون تجاری تغییر نکرد.۴۰۲فایل منبع با checkpoint پیشین مقایسه شدند و فقط همین CSS تفاوت داشت.

## اعتبارسنجی واقعی

| بررسی | نتیجه | شواهد |
|---|---|---|
| pnpm10.13.1 run build | exit0 | build.retry.log |
| pnpm run typecheck / lint | هر دو exit0 | validation.json |
| pnpm run test | exit0؛۳۴۹/۳۴۹،۵۲فایل | test.retry.log |
| node scripts/check-api-contract.mjs | exit0؛۹۰/۱۵۴ | contract.log |
| node scripts/verify-release.mjs | exit0؛۲۹بررسی | release-check.log |
| Chrome واقعی Chrome 155.0.8059.80 |۲۵حالت عمومی،۹دسکتاپ/۱۶موبایل؛صفرخطای JS/سرریز | browser-after.json |
| بازسازی و تمرین rollback | PASS؛۳۰۴فایل قبلی | prepared.json;backup-manifest.json |
| بررسی امنیت/حفظ کد | PASS؛فقط CSS دسکتاپ | scope-integrity-security.json |

عرض‌های desktop۱۰۲۴/۱۲۸۰/۱۴۴۰/۱۹۲۰ و ارتفاع کوتاه۷۲۰ بررسی شدند. فارسی RTL،انگلیسی LTR و تم‌های blue/white نمونه‌برداری شدند؛تمام ترکیب‌های ممکن دستگاه ادعا نمی‌شود. موبایل۳۹۰/۷۶۸ شامل صفحهٔ معرفی و فرم بررسی شد. هندسه۱۶/۱۶یکسان؛تصویر۱۵/۱۶با یکی از دو baseline قبلی عیناً برابر و مورد باقی‌مانده۱۱پیکسل اختلاف raster,max14/255داشت(public-mobile-render-variance.json). در ثبت تکراری خود نسخهٔ قدیمی نیز اختلاف۸پیکسلی۱/۲۵۵مشاهده شد؛این اختلاف به‌عنوان تغییر طراحی یا برابری کامل همهٔ تصاویر معرفی نمی‌شود. Safari/WebKit و ورود واقعی با credential جدید NOT_RUN؛این وظیفه فقط ظاهر صفحه عمومی بود.

## موانع ابزار و رفع در isolation

Corepack زیر حساب محدود EPERM داد؛اجرای مجاز اپراتور از همان کش و pnpm پین‌شده موفق شد و ACL تغییر نکرد. اجرای نخست آزمون،۸فایل backend را که ui-rules به‌صورت متن می‌خواند در کپی جدا نداشت؛فقط ورودی‌های منبع به staging کپی شدند و آزمون بدون تغییر پاس شد(attempt1,test-context-repair.json). دو اندازه‌گیری اولیه مرورگر زودتر از تثبیت hash/form بودند؛runner منتظر class واقعی فرم،فونت و فریم paint شد و شواهد اولیه حفظ شدند. import مطلق Windows در helper ابتدا ERR_UNSUPPORTED_ESM_URL_SCHEME داد و پیش از هر mutation با file URL اصلاح شد.

## انتشار و بازیابی

فقط۱۷فایل تولیدی(assets جدید و index) منتشر شدند؛همهٔ assets قدیمی،sw.js،web.config،report-actions-mobile.css و brand حفظ شدند. index اتمی و پس از assets تعویض شد. پاسخ /login و۶مرجع آن همگی۲۰۰با نوع محتوا و hash صحیح بودند؛API سالم و نسخهٔ backend همان release-20261019-safe-r8-uiux-handoff ماند. backend/schema/.env/service/AI gates تغییر نکردند؛هیچ restart،migration یا درخواست provider اجرا نشد.

پشتیبان: C:/ProgramData/NIVASafe/backups/release-login-desktop-20261019-01/frontend

stage: C:/inetpub/nivasafe/staging/release-login-desktop-20261019-01

مانفیست: C:/NIVASafe/reports/evidence/login-desktop-20261019-01/backup-manifest.json

فرمان بازگشت فقط frontend،در هویت مجاز اپراتور:

```powershell
C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\login-desktop-20261019-01\static-release.mjs rollback
```

بازگشت در برابر index نسخهٔ ناشناخته رد می‌شود؛فقط index قدیمی بازمی‌گردد زیرا assets قبلی حذف/بازنویسی نشدند. هیچ بازیابی داده انجام نمی‌شود. تست backend/domain،audit وابستگی و inference جدید NOT_RUN؛کد و lockfile آن‌ها تغییر نکردند. بررسی نهایی بر حذف‌نشدن رفتارها،mobile،حفظ مرز auth و عدم ورود URL/dependency/secret جدید متمرکز بود. دوازده مرحلهٔ ساخت محصول دوباره اجرا یا PASS اعلام نشدند؛وضعیت پذیرش کامل RULA قبلی حفظ است.

## هش‌ها

{
  "oldIndex": "39e4cc72b24a145c52f22b2507d96ec5428947056fd8328a3441f9bcbf3c8d28",
  "newIndex": "1e5010b9d01a9710c67c482ee92fb8970d1cdf9e6c59fd31d1b7df71b64e9e93",
  "oldAssets": [
    {
      "url": "/assets/index-CZ6hxJEG.js",
      "sha256": "101a84293ed5db1bc2c8ac7971c85c6d64f91081334376c1931d645bcb04ac08"
    },
    {
      "url": "/assets/index-17Z8GZRa.css",
      "sha256": "7fa339e553da2ddf99c51de8b4295ccc511695d0e5cd95d7714ec5d382e345b7"
    }
  ],
  "newAssets": [
    {
      "path": "/assets/index-DRIFEfyU.js",
      "status": 200,
      "sha256": "07f9670f5554a759e122f1a2f1d4669a01bb2c89086cf864a95b83e8ca4a99d3",
      "contentType": "application/javascript"
    },
    {
      "path": "/assets/index-DH5Fm7ph.css",
      "status": 200,
      "sha256": "7452af985691115d827e399a48cf7030b0f22247be3a3cbd165d66566303f0a2",
      "contentType": "text/css"
    }
  ]
}

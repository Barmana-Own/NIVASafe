# نیواسیف — شواهد نهایی بازیابی دقت RULA

|Field|Value|
|---|---|
|Project|NIVASafe|
|Report|گزارش فنی|
|Language|فارسی|
|Gregorian / Jalali|2026-10-18 / 1405-07-26|
|UTC|2026-10-18T21:46:45.378Z|
|Revision|e5bf3f050bd6e127e13918c8d3eefcd3f8376acf + preserved worktree|
|Executed candidate|rula-image-plane-audit-20261018-r7-final; PID 8300|
|Delivery|BLOCKED / NOT DEPLOYED|

**اصلاحات ایمنی تأیید؛ گردش‌کار اصلی staging موفق؛ دقت FAIL؛ NOT DEPLOYED؛ بینایی زنده فعال نشده است.**

## علت‌های مشاهده‌شده و مرجع

R6 و هر۴۰ مقایسه در frozen-r6-* محفوظ‌اند. این‌ها چهار نمونهٔ استنتاج از یک تصویر مصنوعی دوبخشی1000×700 هستند، نه۴۰ پوسچر مستقل. مرجع از مختصات make-reference.ps1 و هندسهٔ تحلیلی ساخته شده، نه خروجی GPT. محور سر/گردن صرفاً تقریب ترسیمی است و زاویهٔ بالینی گردن تأیید نشده است.

هر۱۰ خطای عمده در درجه‌های تولیدشدهٔ مدل وجود داشت که بدون کنترل سازگاری عبور می‌کردند؛ نقاط overlay با confidence بالا هم با مفصل‌های ترسیم تطابق ندارند. در R6-02 مرجع آرنج90°، مدل180° و هندسهٔ نقاط154.983° است؛ در R6-37 مدل180° ولی هندسه25.017° است. یک تصحیح سراسری آینه/متمم معتبر نیست. parser قبلی درجه را عبور می‌داد و تبدیل رادیان/بردار روی آن نداشت؛ PNG اولیه EXIF نداشت. علت داخلیِ تفسیر مدل UNKNOWN است. مرجع، خطای علامت‌دار، دید، رؤیت‌پذیری و فاصلهٔ پیکسلی هر ردیف در forensic-40.json/.md آمده است.

کنترل تصویری03d3849e93d8ef056d9787d5ef24e1db ارقام تصادفی، دایره‌ها و مثلث را درست خواند؛ دریافت تصویرِ همان کنترل را ثابت می‌کند، نه استدلال آناتومیک یا کل رفتار درگاه. credential/entitlement علتِ باقی‌مانده فرض نشده است.

## معماری و اصلاحات

۱. احراز هویت/سازمان/نقش، MIME/signature، رضایت صریح و gate ارائه‌دهنده حفظ شدند. فقط PNG/JPEG/WebP با سقف10 MiB ورودی/خروجی،۲۴میلیون پیکسل و محدودیت ابعاد/زمان رمزگشایی می‌شود. sharp0.35.5، EXIF را اصلاح و metadata را حذف می‌کند؛ JPEG40×20 با orientation6 به20×40 تبدیل شد. این رفع ریسک مستقل است، نه علت خطای PNG تاریخی.

۲. RULA/FMEA با Arvan GPT-5-Mini و چت با Arvan DeepSeek-V4-Flash باقی ماندند. detail تصویر فقط برای RULA روی high است؛ reasoning_effort ناسازگار و fallback ارزیابی برنگشتند. استنتاج واقعی جدید FMEA/چت انجام نشده است.

۳. مختصات نرمال‌شده، سمت، دید، جهت، قائم‌بودن، visibility و confidence بررسی می‌شوند. نام/نقطهٔ تکراری، null برای نقطهٔ مرئی، دامنه/نوع اشتباه، اختلاط سمت و JSON ناقص با کد امن رد می‌شوند. عدم قطعیت معتبر با خرابی parsing یکی نیست.

۴. مختصات با عرض/ارتفاع واقعی به پیکسل برمی‌گردند. بردارها، آرنج داخلی، انحراف مچ، علامت زاویه، آینه/چرخش و نقاط هم‌مکان آزمون مستقل دارند. عمق و چرخش محوری مچ از خط دوبعدی استنتاج نمی‌شود.

۵. ناسازگاری نهایی بین prompt گردن از قائم و محاسبه نسبت به تنه، با تست قرمز/سبز رفع شد. تعریف جدید صریحاً تقریب دوبعدیِ محور سر نسبت به تنه است؛ نه زاویهٔ کالیبرهٔ مهرهٔ گردن. این، علت ادعایی خطای۹۰درجه‌ای آرنج قبلی نیست و آستانه/جدول RULA عوض نشد.

۶. مکان‌یابی نامطمئن VLM به‌عنوان جایگزین خودکارِ اندازه‌گیری پذیرفته نشد. هندسه فقط audit سازگاری است؛ تطابق با مرجع مستقل یکی نیست. اختلاف یا نبود شواهد به امتناع منتهی می‌شود، نه تصحیح ساختگی. از متمم/کلمپ برای قبولی مصنوعی استفاده نشده است.

۷. زاویهٔ تایپ‌شدهٔ اولیهٔ AI، امتیاز موقت نگاشت‌شده، زاویهٔ audit، ابعاد/دید/نقاط، علت و نسخهٔ image-plane-audit-v1 در JSON می‌مانند. مقدارهای ویرایش‌شده/source USER جدا و نسخه/عامل تغییر در RulaVersion/audit ثبت می‌شوند. این نگهداریِ منشأ داده است، نه امضای ضدجعل برای نویسندهٔ مجازِ بدخواه.

۸. confirmedByUser=true یا requiresReview=false به‌تنهایی نتیجهٔ متناقض AI را نهایی نمی‌کند؛ API واقعی400 و صفر رکورد را تأیید کرد. امتیاز draft موقت است و قبل از بازبینی، نهایی نمایش داده نمی‌شود. تأیید دستی، گواهی متخصص نیست.

۹. متن آزاد مدل، مقادیر متناقض با جدولِ مسدودشده نشان می‌داد؛ پاراگراف تصویر حذف شد، فیلد notes API/تحلیل متن حفظ و هشدار کنترل‌شده باقی ماند. مرورگر واقعی نهایی وجود notes در پاسخ و عدم نمایش آن را بررسی کرد.

## دقت و آزمون مستقل

|معیار|مرجع ثابت R6|خروجی خام نهایی|خروجی نهایی پس از کنترل|
|---|---:|---:|---:|
|تعداد مراجع بدون تغییر|40|40|40|
|برآورد عددی|40|40|21|
|داخل ±۱۵°|30/40|31/40|21/40|
|امتناع از ارائهٔ عدد|0|0|19|
|میانگین خطای مطلق، فقط اعداد|16.5°|12.7°|1.1905°|
|میانهٔ خطا، فقط اعداد|0°|0°|0°|
|بیشینهٔ خطا، فقط اعداد|90°|90°|10°|

هر ۴۰ مرجع حفظ شده‌اند. فقط 21 عدد منتشر و 19 مورد متوقف شده‌اند؛ توقف، موفقیت دقت نیست. برای هندسهٔ دوبعدیِ تعریف‌شدهٔ این ترسیم‌ها، محدودیت ذاتیِ سنجش صفر است. کنترل‌ها 9 برآورد خامِ اشتباه و 10 برآورد خامِ داخل تلورانس را متوقف کردند. کاهش خطای اعداد منتشرشده، پوشش انتخابی است و قبولی هدف نیست. تغییر خروجی خام از۳۰ به31 مورد از۴۰، روی نمونه‌های تکراری کوچک است و خطای۹۰درجه‌ای همچنان وجود دارد. هیچ اعتبارسنجی بالینی ادعا نمی‌شود.

|Part|Numeric within ±15° / original|Numeric|Abstentions|
|---|---:|---:|---:|
|upperArm|0/8|0|8|
|lowerArm|0/8|0|8|
|wrist|5/8|5|3|
|neck|8/8|8|0|
|trunk|8/8|8|0|

جزئیات هر سمت در accuracy-metrics.final.json است. نگاشت باند امتیاز برای 21/21 عدد منتشرشده درست بود؛ اما فقط 18/40 دستهٔ امتیاز پایه با مرجع ترسیمی مطابق بود. حتی خطای کمتر از۱۵° می‌تواند مرز امتیاز را قطع کند. مرجع کاملِ مستقل برای امتیاز نهایی صفر است؛ چرخش مچ/بار/modifierها اثبات نشده‌اند و توافق امتیاز نهایی NOT_VERIFIED است. جداول/آستانه‌های Cornell2001 و نسخهٔ تاریخی حفظ و۱۹ آزمون domain موفق‌اند.

۱۴ حالت ریاضی/۷۰ بررسی و۱۰ آزمون برداری، حالت خنثی، خم‌شدن، اکستنشن، بازوی بالا، چپ/نامتقارن، آینه، مقیاس، چرخش، دید نامناسب و پوشیدگی را پوشش می‌دهند؛ صحت مدل روی عکس کارگر نیستند. کنترل‌های واقعی دوبخشی/پوشیدهٔ قبل از اصلاح محور صرفاً مکمل‌اند. دو کنترل نهایی پیش از upstream با503 محلیِ بودجه رد شدند، چون۵ تصویر و۲ درخواست متنی خودکار گزارش، سقف۷ را مصرف کردند. دوباره اجرا یا PASS اعلام نشدند؛ این نتیجهٔ بودجهٔ رانر است، نه401Arvan/سهمیهٔ حساب یا اثبات قبولی مدل نهایی روی ابهام.

## هر۴۰ مقایسهٔ اولیه

|ID|Side / part|Reference°|R6 old°|Final° / abstention|Old abs error°|Final abs error°|Review state|
|---|---|---:|---:|---|---:|---:|---|
|R6-01|LEFT / upperArm|10|90|ABSTAIN|80|—|CONFLICT; REQUIRED|
|R6-02|LEFT / lowerArm|90|180|ABSTAIN|90|—|CONFLICT; REQUIRED|
|R6-03|LEFT / wrist|0|0|5|0|5|ESTIMATED; REQUIRED|
|R6-04|LEFT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-05|LEFT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-06|RIGHT / upperArm|60|30|ABSTAIN|30|—|CONFLICT; REQUIRED|
|R6-07|RIGHT / lowerArm|90|60|ABSTAIN|30|—|CONFLICT; REQUIRED|
|R6-08|RIGHT / wrist|0|10|10|10|10|ESTIMATED; REQUIRED|
|R6-09|RIGHT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-10|RIGHT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-11|LEFT / upperArm|10|20|ABSTAIN|10|—|CONFLICT; REQUIRED|
|R6-12|LEFT / lowerArm|90|160|ABSTAIN|70|—|CONFLICT; REQUIRED|
|R6-13|LEFT / wrist|0|0|ABSTAIN|0|—|UNMEASURABLE; REQUIRED|
|R6-14|LEFT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-15|LEFT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-16|RIGHT / upperArm|60|70|ABSTAIN|10|—|CONFLICT; REQUIRED|
|R6-17|RIGHT / lowerArm|90|90|ABSTAIN|0|—|CONFLICT; REQUIRED|
|R6-18|RIGHT / wrist|0|5|ABSTAIN|5|—|UNMEASURABLE; REQUIRED|
|R6-19|RIGHT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-20|RIGHT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-21|LEFT / upperArm|10|0|ABSTAIN|10|—|CONFLICT; REQUIRED|
|R6-22|LEFT / lowerArm|90|90|ABSTAIN|0|—|CONFLICT; REQUIRED|
|R6-23|LEFT / wrist|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-24|LEFT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-25|LEFT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-26|RIGHT / upperArm|60|25|ABSTAIN|35|—|CONFLICT; REQUIRED|
|R6-27|RIGHT / lowerArm|90|135|ABSTAIN|45|—|CONFLICT; REQUIRED|
|R6-28|RIGHT / wrist|0|10|10|10|10|ESTIMATED; REQUIRED|
|R6-29|RIGHT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-30|RIGHT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-31|RIGHT / upperArm|60|45|ABSTAIN|15|—|CONFLICT; REQUIRED|
|R6-32|RIGHT / lowerArm|90|60|ABSTAIN|30|—|CONFLICT; REQUIRED|
|R6-33|RIGHT / wrist|0|-10|ABSTAIN|10|—|CONFLICT; REQUIRED|
|R6-34|RIGHT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-35|RIGHT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-36|LEFT / upperArm|10|90|ABSTAIN|80|—|CONFLICT; REQUIRED|
|R6-37|LEFT / lowerArm|90|180|ABSTAIN|90|—|CONFLICT; REQUIRED|
|R6-38|LEFT / wrist|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-39|LEFT / neck|0|0|0|0|0|ESTIMATED; REQUIRED|
|R6-40|LEFT / trunk|0|0|0|0|0|ESTIMATED; REQUIRED|


## اجرای واقعی، مدل و ماندگاری

کاندیدا rula-image-plane-audit-20261018-r7-final، PID8300، هویت SRV9298144857\Administrator، مسیر C:\NIVASafe\.local\rula-final-candidate-20261017-053748\backend\dist\server.js اجرا شد. API5153، UI15144 و MariaDB53306 با datadir دقیق C:\NIVASafe\.local\rula-authenticated-e2e-20261017-01\mariadb\data کنترل شدند. DB/سازمان/حساب/JWT/uploads مجزا و Prisma6.19.3 قبلی استفاده شد. db push --skip-generate فقط روی DB دورریختنی، بدون accept-data-loss و بدون تغییر تاریخ/checksum migration زنده بود.

هش provider نهایی 04FCEBB35D6C54B3E83043FECDCB98A1E94EEF61FD2C8FA897E5A7C206D407BC، posture F45BB530E3B5FE3ECBF5B8391199D42DC9CC92DCECBBDE366E9E6D624D78623C و هندسه EE24713F1C3C7CA5A6CEC0C9C7DF92D54D9B4F55682D4830B6403E2189A8FC3A است. server.js به‌تنهایی نشانگر نسخه نیست. پس از اجرای نهایی، منبع برنامه تغییر نکرده است. parity منبع/کاندیدا و تمام هش assetها ثبت شده‌اند.

مجموع 19 درخواست واقعی پذیرفته شد؛ همه GPT-5-Mini با پاسخ gpt-5-mini-2025-08-07: دوازده درخواست اولیه و هفت درخواست نهایی شامل۵ تصویر و۲ پیشنهاد متنی گزارش RULA. همه upstream200 بودند؛ سه BOTH و RIGHT/LEFT مستقل مرورگر بدون application502 تکمیل و با کاربر عادی، اصلاح/ذخیره/خروج/ورود/بازگشایی/گزارش/PDF گذرانده شدند. شناسه‌ها در real-provider-requests.final.json هستند. علت تاریخی401/502 داخلی همچنان نامعلوم است؛ این فراخوانی‌ها مدل جایگزین نداشتند و مصرف کل حساب به سامانه نسبت داده نشده است.

منشأ AI/audit در چهار رکورد نهایی، پس از ویرایش دستی با پاسخ واقعی مقایسه شد. تلورانس کمتر از1e-10 فقط برای آخرین رقم JSONِ MariaDB بود و معیار ±۱۵° تغییر نکرد. بازگشایی با کاربر عادی تازه، JSON و PDF فارسی/انگلیسی200 با provider خاموش تأیید شد. فایل‌ها synthetic-reviewed-report.final.en.pdf/.fa.pdf هستند. اصلاح مرجعِ مصنوعی، دقت AI را اثبات نمی‌کند.

Chrome155.0.8059.80 از Playwright Core1.64.1 بدون mock، تصویر/رضایت/BOTH/۱۴ویرایش/ذخیره/reload/نشست تازه را در390/1280 گذراند؛ page exception و overflow کلی مشاهده نشد. Safari/WebKit/iOS و مرورگر فارسی RTL اجرا نشدند. PDF فارسی جدا بررسی شد. مرورگر بدون provider، خطای503gate، retry دستی و صفر ارزیابی جدید را تأیید کرد.

## فرمان‌ها و شکست‌های نگهداری‌شده

|Actual command/check|Exit / result|
|---|---|
|pnpm10.13.1, Node22.22.3|Pinned process PATH; no global change|
|pnpm exec turbo build --force; final api build / web build|0; fresh artifacts, no cached result accepted|
|pnpm exec turbo lint --force / typecheck --force|0 /0; lint is TypeScript, not ESLint|
|pnpm exec turbo test --force|0;541 backend +348 frontend +19 domain =908|
|pnpm verify:contract / verify:release|0 /0;90 frontend paths,154 routes;29 checks|
|pnpm audit --prod --json|0; zero candidate production advisories|
|Final run-candidate-e2e.mjs, max7 provider attempts|1 overall: core40 comparisons/UI/persistence passed; two supplemental controls were locally budget-blocked503|
|verify-final-provenance.mjs, AI disabled|0; real stored records/fresh session/report/PDF/review denial, zero provider calls|
|Poppler / pypdf PDF inspection|0; final PDFs: 6 pages each; Persian first-page and English data-table renders inspected; no Safari pass|

خطاهای اولیهٔ copy/sync ناشی از cwd با مسیر مطلق رفع شدند. نصب مستقل ERR_PNPM_UNEXPECTED_STORE داشت و با store-dir موجود رفع شد؛ config سراسری/ACL تغییر نکرد. فرمان lock-only metadata بستهٔ workspace منبع را تغییر داد؛ dependencies سرویس بسته‌بندی‌شدهٔ فعال جایگزین نشدند.

رانر نخست timeout را در جای آرگومان waitForFunction می‌فرستاد؛۱۵ثانیه در برابر زمان حدود۲۲ثانیهٔ سمت دوم کافی نبود. فقط مرورگر پس از رفع آن تکرار شد. ترتیب نامطمئن ردیف DB، آخرین رقم float، attachment رکورد دیگر و content-type اشتباه logout هم در رانر اصلاح شدند. این‌ها bypass پذیرفته‌شده نبودند و شواهد اولیه باقی‌اند. هشدار chunk قبلی بالای500kB باقی است.

## امنیت، حفظ پروژه و انتشار

نوع/منابع تصویر، مدل/درگاه، نقش/tenant/رضایت/سهمیه، schema، بازبینی، صادرات و لاگ بررسی شدند. debug endpoint، bypass امنیت/حریم خصوصی، کلید در لاگ، URL دلخواه، تغییر ACL/firewall یا mock در production اضافه نشد. منفی‌های واقعی401/403/415 و بازبینی400 موفق بودند؛ audit وابستگی کاندیدا صفر finding داشت. confidence کالیبره نیست و تضمین coalescing درخواست پولیِ همزمان داده نشده است.

۴۶۰ ورودی Git قبلی ثبت و تغییرات نامرتبط حفظ شدند. مسیر/منو، پشتیبانی، FMEA/چت، داده/فایل و نسخهٔ قدیمی امتیاز حذف نشدند. schema ریشه و کاندیدا یکسان است. جدول، فقط مسیرهای همین کار است، نه کل diff قبلی:

|Path relative to C:\NIVASafe|Task change|
|---|---|
|backend/src/ai-provider.ts|RULA-only high image detail; existing model/reasoning compatibility retained|
|backend/src/ai-provider.test.ts|High-detail request regression|
|backend/src/rula-posture-ai.ts|Strict landmark schema, frame-aligned prompt, deterministic consistency audit|
|backend/src/rula-geometry.ts|Pixel-aware vectors, unsigned/signed angles, view/visibility/degeneracy states|
|backend/src/rula-measurement.ts|Bounded provenance and explicit review resolution|
|backend/src/rula-image-normalization.ts|EXIF normalization, metadata stripping, bounded raster decode|
|backend/src/rula-posture.ts|Optional JSON metadata and conflict-review enforcement|
|backend/src/modules/assessments.ts|Image normalization and actual-dimension context|
|backend/src/modules/reports.ts|Controlled RULA per-part export uncertainty|
|backend/src/rula-geometry.test.ts|10 vector/frame/edge tests|
|backend/src/rula-geometry-reference.test.ts|70 independent reference tests|
|backend/src/rula-image-measurement.test.ts|13 schema/frame/uncertainty tests|
|backend/src/rula-image-normalization.test.ts|2 decode/EXIF resource tests|
|backend/src/rula-measurement-report.test.ts|1 export uncertainty regression|
|backend/src/rula-posture.test.ts|Provenance/review schema regression|
|backend/src/rula-registered-member.test.ts|Actual-route normalization and review-denial regressions|
|frontend/src/features/assessments/AssessmentPages.tsx|Retain AI metadata across edits, localized controlled warnings, suppress contradictory image prose|
|frontend/src/features/assessments/rulaMeasurement.ts|Bounded typed metadata and localized labels|
|frontend/src/features/assessments/rulaMeasurement.test.ts|3 metadata/review tests|
|frontend/src/features/assessments/rulaPostureReview.ts|Confirmation alone cannot resolve an AI conflict|
|backend/test-fixtures/rula-geometry/|reference-cases.json; provider-reference.json; independent-bilateral.png; occluded-right.png|
|backend/package.json|sharp0.35.5|
|pnpm-lock.yaml|Decoder lock entries; pre-existing package changes preserved|
|docs/rula-image-plane-accuracy-r7.md|Scoped architecture and evidence handoff|
|project-state.json|Append R7 result; INCOMPLETE remains|
|project-integrity-manifest.md|Append preservation review|

سرویس زنده همچنان PID14048 با NT AUTHORITY\SYSTEM و task NIVASafe-API / PM2 nivasafe-api و مسیر C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js است. static در C:\inetpub\nivasafe\app-com است. health عمومی/محلی و login/assets عمومی200 بودند. JS قدیمی index-C58TrXm0.js با SHA2B4F0C30678C311D30F4E0BDD67EBEFB12DA8BB6D1A12CC16A82C65B88094A17 و index با E1C893E440F8B769CB2E119C47D7D682BCD9DB092C0F4FD581A097B830885ED9 باقی ماند. provider قدیمی8784D5C1124B8E727ED33E73E546DA92A0C91243671C89EE521EC67744206FCF کاندیدا نیست؛ R6 مسیرهای جایگزین قدیمی آن را ثبت کرده بود، نه مصرف قطعی هر ردیف حساب.

مجوز/کلیدهای پردازش تصویر در فایل/PM2 بررسی‌شده فعال/منطبق نبودند و ساخته نشدند. انتشار NOT DEPLOYED است: مانع اصلی دقت FAIL، سپس مجوز واقعی تصویر و بازگشت عملی سرویس/config است. این JSON/code migration جدید نمی‌خواهد و drift تاریخی به‌جای علت خطای تصویر استفاده نشده است. restart/static swap یا تغییر DB/حساب/config/کلید/uploads زنده انجام نشد.

snapshot فایل کاندیدا C:\NIVASafe\.local\rula-anatomy-20261018-r7\artifact-snapshot-final و بازسازی C:\NIVASafe\.local\rula-anatomy-20261018-r7\artifact-rehearsal-final، با119هش و asset-reference منطبق موفق بود. این تمرین بازگشت سرویس/config زنده نیست؛ dependencies در نصب مستقل‌اند. انتشار بعدی snapshot محافظت‌شدهٔ نسخه/config فعال و تمرین rollback جزء واقعی را نیاز دارد؛ بازگشت کد نباید دادهٔ جدیدتر را بازنویسی کند.

## باقی‌مانده و gate مراحل

کیفیت مکان‌یابی/زاویه هنوز به هدف نرسیده است. منبع نقاط قابل اتکا، تصاویر مرجع نماینده با annotation مستقل و متخصص لازم‌اند؛ قرارداد مدل generative نباید عوض شود. تغییر کلید/خرید entitlement/ACL/Defender/firewall توجیه ندارد. دو کنترل تکمیلی مدل نهایی پس از سقف بودجه اجرا نشدند. مجوز سازمانی تصویر اقدام سیاستی جداست، نه جایگزین دقت. برای بازتولید این checkpoint دسترسی تازهٔ Windows لازم نبود.

معماری مراحل01–08 با اصلاح محدود استفاده شد؛09 PASS؛10 دقت FAIL؛11 انتشار BLOCKED؛12 پذیرش نهایی NOT_PASSED؛ پروژه INCOMPLETE است.

## ماتریس

|ID|Requirement|Status|Evidence under reports/evidence/rula-anatomy-2026-10-18-r7|Limit / blocker|
|---|---|---|---|---|
|M01|Original 40-case references and baseline preserved|PASS|frozen-40-comparisons.json; frozen-r6-reference-geometry.png|Four repeats of one drawing, not40 different postures|
|M02|Original error provenance / exact internal VLM cause|PARTIAL|forensic-40.json / .md|Model-derived wrong angles/bad points confirmed; internal model reasoning UNKNOWN|
|M03|Independent deterministic geometry|PASS|independent-geometry-tests.log; neck-axis-green.log|14 analytic cases,70 checks +10 vector/frame tests; not3D anatomy|
|M04|≥38/40 numeric anatomical target|FAIL|accuracy-metrics.final.json; before-after-40.final.md|21/40 numeric successes;19 abstentions; raw maximum90°|
|M05|True pose/cervical accuracy and complete reference scores|NOT_VERIFIED|Reference notes; accuracy-metrics.final.json|No qualified ergonomist or independently verified full modifiers/twist|
|M06|Authenticated real RIGHT/LEFT/BOTH, repeated BOTH|PASS|final-candidate-e2e.json|Three BOTH API samples plus browser independent sides; technical pass only|
|M07|Final nonzero-trunk / occluded real-provider controls|NOT_RUN|final-candidate-e2e.json → independentBenchmarks|2 local503s from test budget before upstream; earlier controls are supplementary older-prompt evidence|
|M08|Genuine Arvan model acceptance|PASS|real-provider-requests.final.json|19 accepted real calls; all GPT-5-Mini snapshot; accuracy is separate|
|M09|Human review / no automatic invented correction|PASS|persistence-provenance.final.json|Actual400 confirmation-only denial; source USER review required; no clinical certification|
|M10|RULA scoring rules and old-version compatibility|PASS|axis-final-test.log; unchanged shared/domain|Mapping 21/21; base-category GT agreement 18/40, not full score certification|
|M11|DB save/fresh GET/logout/login/reopen/report/PDF|PASS|final-candidate-e2e.json; persistence-provenance.final.json|Manual synthetic-reference correction is not AI accuracy|
|M12|Real final Chromium UI,390/1280|PASS|screenshots/final-candidate-*; final-candidate-e2e.json|No intercept mocks; Safari/WebKit/iOS not run|
|M13|Contradictory raw narrative hidden|PASS|Browser check unvalidated-ai-narrative-not-rendered|Provider prose present in response but not displayed; structured warnings retained|
|M14|Persian RTL browser / Safari/WebKit/iOS|NOT_RUN|No such browser acceptance claimed|Persian PDF inspected separately|
|M15|Build/lint/typecheck/tests|PASS|axis-final-exits.json; neck-axis-final-build.log|541 backend +348 frontend +19 domain =908; lint is TypeScript|
|M16|Contract / static release checks|PASS|contract.log; release.log|90 paths /154 routes;29 static checks|
|M17|Scoped security/dependency review|PASS|audit-prod.json; review in this report|Zero candidate production advisories; older live runtime not certified|
|M18|Candidate file recovery|PASS|artifact-recovery.final.json|119 files/asset references reconstructed; not live config/service rollback|
|M19|Live code release / operational rollback|BLOCKED|live-runtime-readonly.json; public-readonly.json|Accuracy FAIL; legitimate privacy approval absent; operational rollback not rehearsed|
|M20|Production vision legitimately enabled|BLOCKED|live-runtime-readonly.json → imageGates|No policy authorization invented; gates remain closed|
|M21|Authenticated public image-to-report|NOT_RUN|No live mutation/image/provider request made|NOT DEPLOYED|
|M22|Preserve non-RULA features/data|PASS|Scoped changes; contract/regression logs|No new public support/chat/FMEA acceptance claimed; no production changes|

## ابزار و مراجع

مهارت‌های Debug/تشخیص/TDD استفاده شدند؛ ابزار بومی Debug/Chrome DevTools قابل فراخوانی نبود. ابزار واقعی: PowerShell/exec_command، Node، Prisma/MariaDB، pnpm/Vitest/TypeScript/Turbo، Chrome/Playwright، view_image، مهارت PDF/Poppler/pypdf و مراجع رسمی. مدل Codex با مدل درخواست‌های NIVASafe یکی فرض نشده است. اجرای بومی افزونه یا Safari ادعا نمی‌شود.

[Cornell](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf)، [یادداشت روش](https://ergo.human.cornell.edu/ahRULA.html)، [جهت sharp](https://sharp.pixelplumbing.com/api-operation/)، [decoder](https://sharp.pixelplumbing.com/api-constructor/). این مراجع پشتیبان روش/نسخه/رمزگشایی‌اند، نه دقت مدل.

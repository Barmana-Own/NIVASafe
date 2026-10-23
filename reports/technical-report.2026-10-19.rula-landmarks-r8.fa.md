# NIVASafe R8 — شواهد فنی مکان‌یابی مفصل

|Field|Value|
|---|---|
|Project|NIVASafe|
|Report type|Technical|
|Language|فارسی|
|Gregorian date|2026-10-19|
|Jalali date|1405-07-27|
|Generated UTC|2026-10-19T07:29:29.296Z|
|Candidate|rula-landmarks-r8-20261019-axisfix|
|Revision|e5bf3f050bd6e127e13918c8d3eefcd3f8376acf + preserved worktree|
|Release|BLOCKED / NOT DEPLOYED|

**دقت آناتومیکی: FAIL — اصلاحات کد و گردش کار staging تأیید شد؛ انتشار زنده انجام نشد.**

مکان‌یابی روی زیرمجموعه‌ای همسان بهتر شد، اما معیار مستقل پذیرش به دست نیامد. پیش‌بینی خودکار برای انتشار پذیرفته نیست. سایت جاری، داده‌ها، تصاویر کاربران، کلیدها، سرویس‌ها و مجوزهای تصویر تغییر نکردند.

## موارد تحویل‌شده

۱. R7 و۴۰ردیف اصلی حفظ شدند؛۲۴صحنهٔ هندسی متمایز با تفکیک۱۶توسعه/۸ارزیابی و هش‌های ثابت ساخته شد. حقیقت مرجع از مدل تولید نشده است. از۱۰صحنهٔ جدید واقعاً به مدل درخواست ارسال شد:۲توسعه و۸ارزیابی؛ این به معنی آزمایش۲۴عکس انسان نیست.
۲. قرارداد آزمایشیِ شناسهٔ بدن، سمت و مختصات پیکسلی، محاسبهٔ هندسی، عدم‌قطعیت و منشأ داده اضافه شد. برش و خط‌کش آزمایش شدند و پیش‌فرض نشدند. هیچ مدل ML دومی نصب یا اجرا نشد.
۳. وابستگی غیرضروری زاویه‌های نسبی به محور جاذبه با تست رفع شد؛ تنه همچنان به جاذبه نیاز دارد. جهت بدن و محور مرجع برای بازتولید خطا ذخیره می‌شوند.
۴. الزام بازبینی و رد دستکاری حفظ شد؛ عبارت نادرستِ «وجود ندارد» برای حرکت غیرقابل سنجش در گزارش اصلاح شد.
۵. تحلیل واقعی staging، ویرایش با مرجع مصنوعی، ذخیره، ورود مجدد، بازیابی، PDF و Chrome موبایل/دسکتاپ آزمایش شد.
۶. ۹۷۷تست و build/typecheck/lint، قرارداد API، verifier انتشار و ممیزی وابستگی‌های کاندیدا پاس شدند.

## دقت و محدودیت‌های باقی‌مانده

در ارزیابی قفل‌شدهٔ۸صحنه، قرارداد مکان‌یابی **۱۴از۴۱ مورد در محدودهٔ±۱۵درجه** داشت؛ پوشش عددی۳۰از۴۱، معادل۷۳٫۲٪ و بیشینهٔ خطا۲۰۸٫۱۴درجه بود. کنترل با قرارداد قبلی۱۰از۴۱ مورد صحیح و۱۹از۴۱ خروجی عددی داشت. خروجی بیشتر، دقت قابل‌اتکا ایجاد نکرد.۴۰مورد قدیمی تکرار یک نقاشی‌اند: R7 تعداد۲۱خروجی عددی و۲۱مورد صحیح داشت؛ R8-01 تعداد۱۰خروجی عددی و۶مورد صحیح داشت. بازپخش محدود مختصات پس از اصلاح، استنتاج تازه نیست. در یک BOTH تازه پس از اصلاح،۸از۱۰ خروجی عددی و۵از۱۰ مورد صحیح با بیشینهٔ خطای۱۱۰٫۷۱درجه ثبت شد. تکرار کامل ارزیابی و۴۰مورد روی build اصلاح‌شده انجام نشد؛ سقف۳۰تلاش رعایت شد.

مرجع گردن، محور نقاشی است. تعمیم به کارگر واقعی یا اعتبارسنجی تخصصی ادعا نمی‌شود. تست خودکار، کنترل‌های بازبینی دستی را با مرجع مصنوعی پر کرده است؛ ارگونومیست آن را تأیید نکرده است. صحت امتیاز نهاییِ کامل: NOT VERIFIED.

## وضعیت زنده و تحویل

سرور زنده همچنان build قدیمی را اجرا می‌کند و کد آن مسیر مدل‌های قدیمی RULA را دارد؛ انتساب مصرف حساب ارائه‌دهنده ثابت نشده است. مسیر کاندیدا برای ارزیابی‌ها GPT-5-Mini و برای چت DeepSeek-V4-Flash حفظ شد. مجوز واقعی تصویر در تولید و rollback عملیاتی تأیید نشده‌اند. بازیابی۱۹۰فایل کاندیدا پاس شد؛ این rollback سرویس زنده نیست. Safari/WebKit/iOS و عکس انسان واقعی: NOT RUN.

تصمیم بعدی محصول، ادامهٔ مسیر اندازه‌گیری با اصلاح دستی، یا مجوز جدا برای مطالعهٔ آفلاین مدل تخصصی pose است. RTMPose/MMPose فقط پیشنهاد مستند است و دانلود یا اجرا نشده است. پیش از فعال‌سازی، دقت، پذیرش تخصصی، مجوز واقعی انتقال تصویر و rollback زنده باید تأیید شوند. کلید API و HTTP200 به معنی رضایت یا دقت آناتومیکی نیستند.

شواهد: [acceptance-matrix.md](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/acceptance-matrix.md)، [heldout-metrics.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/heldout-metrics.json)، [legacy-40-before-after.md](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/legacy-40-before-after.md).

## ریشه‌های تأییدشده و موارد نامعلوم

- در R6-02 آرنج مرجع۹۰، مدل۱۸۰ و هندسهٔ نقاط قدیمی۱۵۴٫۹۸۳درجه بود؛ در R6-37 مدل۱۸۰ ولی هندسه۲۵٫۰۱۷ بود. خطا پیش از امتیازدهی وجود دارد. تبدیل ثابت۹۰/۱۸۰، EXIF یا خطای رادیان برای آن PNG اثبات نشد. علت درونی مدل UNKNOWN است.
-۱۴۴مقایسهٔ مفصل R6/R7 با خطای پیکسلی/نرمال‌شده/مقیاس تنه و بازو، تشخیص نزدیک‌ترین مفصل و بدن و تصاویر هم‌پوشانی ذخیره شد. نزدیک‌ترین مرجع، قرینهٔ تشخیصی است و دلیل قطعیِ تفکر مدل نیست.
- در نقاط همسان، خطای شانه۲۲۷٫۵۸→۶۱٫۷۱پیکسل(N7)، آرنج۲۳۲٫۸۹→۶۴٫۹۱(N7) و مچ۲۷۳٫۱۰→۹۷٫۲۹(N5) کاهش یافت؛ هنوز برای پذیرش کافی نیست. در۵موردِ علامت‌دار، بازسازی قطعی فقط با جهت اشتباه سازگار بود. اصلاح سراسری علامت، موارد دیگر را خراب می‌کند.
- تست قرمز، وابستگی غیرضروری همهٔ زاویه‌ها به جاذبه را نشان داد. زاویه‌های نسبی اصلاح شدند؛ تنه نسبت به قائم همچنان جاذبه و زاویه‌های علامت‌دار همچنان جهت معتبر می‌خواهند. جهت و محور مرجع اکنون حفظ می‌شوند. این اصلاح ریاضی، دقت نقاط مدل را اثبات نمی‌کند.
- برش، خروجی ناسازگار با قرارداد داد؛ فیلد دقیقِ پاسخ‌های ازدست‌رفته قابل انتساب نیست. rig18/22 قرارداد جدید localization_schema_invalid و rig19 کنترل قدیمی overlay_landmark_out_of_bounds داشتند. rig24 با finish_reason=length خروجی خالی داد. پاسخ بالادست۲۰۰بود، نه۴۰۱یا مشکل مجوز. این شکست‌ها abstention صحیح نام‌گذاری نشدند.
- از نتایج قفل‌شده، مدل/آستانه/پرامپت انتخاب نشد. اصلاح محور از قانون مستقل هندسی آمد. آزمایش کامل همچنان R8-01 نام دارد؛ نسخهٔ اصلاح‌شده فقط بازپخش محدود و یک BOTH تازه دارد. تکرار کامل ارزیابی نهایی ادعا نمی‌شود.

## بنچمارک و معیارها

جدول فنی زیر برای هر دو زبان از همان دادهٔ ثبت‌شده ساخته شده است؛ خطاهای عددی باید همراه پوشش خوانده شوند.

|Metric|R7-contract contemporaneous control|R8 localization experiment|
|---|---:|---:|
|Distinct held-out scenes|8|8|
|All reference part measurements|55|55|
|Independently measurable image-plane references|41|41|
|Emitted numeric on measurable references|19|30|
|Within ±5° / all measurable|5/41|5/41|
|Within ±10° / all measurable|7/41|13/41|
|Within ±15° / all measurable|10/41 (24.4%)|14/41 (34.1%)|
|Within ±15° / emitted numeric|10/19|14/30|
|Numeric coverage|46.3%|73.2%|
|MAE / median / P90, numeric only|21.55 / 13.00 / 65.00|32.31 / 15.07 / 83.83|
|Maximum signed-convention absolute error|97.00|208.14|
|Wrong numeric estimates (>15°)|9|16|
|Measurable but validly abstained|17|1|
|Measurable missing due to response/parse failure|5|10|
|Correct non-axial unobservable abstentions /14|13|9|
|Unobservable references lost to parser/response failure|0|5|
|Wrong numeric on unobservable references|1|0|
|Base-category matches / all measurable|6/41|13/41|
|Numerical outliers >45° without a specific quality flag|3|7|

۵۵مرجعِ بخش بدن شامل۴۱اندازه‌گیریِ قابل سنجش و۱۴مورد غیرمحوریِ غیرقابل سنجش است. چرخش محوری مچ، جداگانه غیرقابل سنجش است و زاویهٔ سه‌بعدیِ ساختگی ندارد. مخرج۴۱حفظ شده و پاسخ نامعتبر از عدم‌سنجش صحیح تفکیک شده است. MAE/میانه/P90/بیشینه فقط روی خروجی عددی‌اند. خطای۲۰۸٫۱۴با wrap یا clamp کوچک نشده است.

تفکیک برحسب عضو/سمت/دید/بدن، نرخ پذیرش غلط و رد غلط و خطای نقاط در heldout-metrics.json است. بازهٔ اکتشافی۲۰۰۰بازنمونه‌گیریِ خوشهٔ صحنه برای نسبت±۱۵برهمهٔ مراجع،۷٫۵٪تا۵۸٫۱٪ است؛ این فقط۸صحنهٔ مصنوعی است، نه جمعیت انسان. ایراد اندیسِ بیت‌های پایین در ابزار bootstrap رفع و خروجی قبل از QA حفظ شد؛ هیچ پیش‌بینی یا شمارش دقت تغییر نکرد. بررسی confidence فقط روی توسعه انجام شد و نقطهٔ عملیاتیِ معتبر ایجاد نکرد؛۱۰خروجی خامِ درست R7 نیز قبلاً حذف شده بودند.

تطابق۱۳از۴۱باند پایه، فقط قرارداد نرم‌افزار است. امتیاز کامل مستقل با twist/load/muscle/modifier در دست نیست و گردن، محور نقاشی است. جدول‌ها و نسخه‌های تاریخی امتیازدهی تغییر نکردند. [کاربرگ Cornell](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf) و [یادداشت پیاده‌سازی](https://ergo.human.cornell.edu/ahRULA.html) در۲۰۲۶-۱۰-۱۹ بررسی شدند.

## مدل‌ها و اجرای واقعی

درگاه HTTPS api.arvancloudai.ir /v1/chat/completions؛ مدل درخواستی GPT-5-Mini و snapshot پاسخ‌های تصویر gpt-5-mini-2025-08-07 بود. سقف۳۰تلاش رعایت شد:۲۸پاسخ تصویر۲۰۰ و۲تلاش متن خودکار گزارش RULA با شماره۲۰/۲۱، PID4588، بدون پاسخ ثبت‌شده نزدیک خاموش‌شدن staging باقی ماندند: UNKNOWN. این دو تلاش از بودجه کسر شدند و تست چت محسوب نمی‌شوند. یک پاسخ تصویر length و خالی بود. هیچ مدل یا ارائه‌دهندهٔ دیگری آزمایش نشد. برای FMEA/چت درخواست واقعی اضافه نشد؛ رگرسیون قرارداد مدل‌ها پاس شد. مدل خود Codex با درخواست‌های سامانه متفاوت است. انتساب مصرف‌های دیگر حساب Arvan بدون export/dashboard ثابت نیست.

اجرای اصلی PID4588 و اجرای پس از اصلاح PID2692 با Administrator و از C:/NIVASafe/.local/rula-final-candidate-20261017-053748/backend/dist/server.js بود. marker اختصاصی و هش parser با artifact نهایی مطابق است. پس از آن فقط متن عدم‌سنجش PDF اصلاح و خروجی واقعی با AI خاموش دوباره آزمایش شد؛ فایل‌های استنتاج و امتیازدهی عوض نشدند. server.js به‌تنهایی شناسهٔ build کافی نیست. [candidate-manifest.final.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/candidate-manifest.final.json)

پورت API۵۱۵۳ و MariaDB۵۳۳۰۶با datadir برابر C:/NIVASafe/.local/rula-authenticated-e2e-20261017-01/mariadb/data پیش از نوشتن کنترل شدند. DB/حساب/سازمان/JWT/uploads مستقل بودند. Prisma6.19.3 قبلی استفاده شد. db push --skip-generate فقط روی DB تازه و خالی staging، بدون پرچم ازبین‌رفتن داده، اجرا شد. هیچ داده/اسکیما/تاریخچهٔ مهاجرت/کلید/ACL/سرویس زنده تغییر نکرد. بازپخش مهاجرت تاریخی انجام یا تأیید نشد.

سه BOTH و RIGHT/LEFT مستقلِ UI در R8-01 پاسخ۲۰۰دادند؛ سودمندی عددی مردود ماند. پس از اصلاح، BOTH تازه۲۰۰،۸خروجی عددی از۱۰،۵مورد در محدوده و خطای بیشینه۱۱۰٫۷۱داشت. سپس ویرایش با مرجع، ذخیره، خروج/ورود، GET تازه، گزارش و PDF۲۰۰ پاس شد.۱۴ردیفِ منشأ داده پس از ویرایش حفظ شدند. مقایسهٔ اولیهٔ persistence به‌علت تبدیل۰٫۳۱۱۴۲۸۵۷۱۴۲۸۵۷۱۴۴به۰٫۳۱۱۴۲۸۵۷۱۴۲۸۵۷۱۴شکست خورد؛ مقایسهٔ بازگشتی با تلورانس کمتر از1e-10 فقط برای ذخیره‌سازی اصلاح شد. معیار دقت±۱۵و کلید/enum/string دقیق باقی ماندند.

Chrome155.0.8059.80 و PlaywrightCore1.64.1 در۳۹۰/۱۲۸۰، آپلود/رضایت/بازبینی/ذخیره/بارگذاری R8-01 را اجرا کردند؛ مرورگر نهاییِ بدون ارائه‌دهنده، رکورد واقعی، PDF و خطای۵۰۳/تلاش دستی/صفررکورد جدید را آزمایش کرد. login/API/provider mock نشده‌اند. مرورگر انگلیسی، بدون overflow صفحه یا استثنای بحرانی بود. PDF فارسی/انگلیسی۶صفحه و صفحه۱فارسی/۵انگلیسی بصری بررسی شدند. عبارت حرکت نامعلوم اکنون «در تصویر سنجش‌پذیر نیست» است. Safari/WebKit/iOS و UAT مرورگر احرازشدهٔ فارسی: NOT_RUN؛ PDF فارسی جدا بررسی شد.

## اعتبارسنجی و خطاهای فرمان

|کنترل|نتیجهٔ واقعی|
|---|---|
|pnpm10.13.1 / Node22.22.3 در کاندیدای مجزا|تأیید شد؛ EPERM کش هویت محدود با مسیر مجاز Administrator رفع شد، نه تغییر ACL|
|build --force|خروج۰؛ هشدار chunk بزرگ‌تر از۵۰۰KB و خروجی Turbo حفظ شد|
|typecheck --force / lint --force|۰/۰؛ lint پروژه TypeScript است، نه ESLint|
|test --force|۰؛۶۰۹بک‌اند+۳۴۹فرانت+۱۹domain=۹۷۷|
|verifier در کپی مجزا|۱/۱؛ اسکریپت‌های verifier موجود نبودند، شکست سورس نبود|
|verifier مخزن اصلی پس از اصلاح نهایی|۰/۰؛۹۰مسیر فرانت/۱۵۴بک‌اند؛۲۹کنترل استاتیک|
|audit --prod --json کاندیدا|۰؛۴۷۸وابستگی production و صفر advisory|
|هندسه با مختصات مستقل|۱۶۵از۱۶۵؛ نه استنتاج مدل یا اعتبارسنجی انسانی|
|staging واقعی|گردش کار PASS؛ دقت آناتومیکی FAIL|
|مرورگر/persistence بدون ارائه‌دهنده|شکست کاذبِ اعشار رفع شد؛ نتیجهٔ نهایی PASS|
|E2Eتصویر زنده/انتشار/rollback زنده|NOT_RUN / NOT_DEPLOYED / NOT_RUN|

لاگ قرمز/سبزِ قرارداد نقاط، بدن نامشخص، round-trip فرانت، جاذبه و متن گزارش حفظ شده است. خطاهای ابتدایی مسیر و quoting فرمان اصلاح و تست معتبر محسوب نشدند. تست حذف و معیار دقت آسان‌تر نشد.

## امنیت، حفظ پروژه و انتشار

کنترل تغییرات شامل مختصات finite/bounded، حداکثر۹نقطه، تکرار و اختلاط سمت/بدن، قاب تصویر، envelope/connectivity، null، کپی metadata، انتخاب آزمایش فقط در test و بازبینی اجباری بود. خطاهای واقعی۴۰۱احراز/tenant،۴۰۳viewer/رضایت،۴۱۵signature و۴۰۰دستکاری بازبینی پاس شدند؛ تأیید کاذب و gate بسته رکورد ارزیابی جدید نساخت. خروجی نامعتبرِ بنچمارک مستقیم به save نرفت. هیچ reference/مدلML/debugendpoint در production predictor وارد نشد. auditکاندیدا صفر است؛ این تست نفوذ کل production نیست و metadata نویسندهٔ مجاز مصونیت رمزنگاری ندارد.

پیش از کار۴۷۶مدخل Git و snapshot محدود ثبت شد. تغییرات نامرتبط حفظ شدند و کار R8 نامیده نمی‌شوند. ai-provider.ts، جدول‌های امتیاز، schema/migrations، support، منطق FMEA و چت در R8 تغییر نکردند. مسیرهای تغییر:

- C:/NIVASafe/backend/src/modules/reports.ts
- C:/NIVASafe/backend/src/rula-measurement-report.test.ts
- C:/NIVASafe/backend/src/rula-geometry.ts
- C:/NIVASafe/backend/src/rula-geometry.test.ts
- C:/NIVASafe/backend/src/rula-posture-ai.ts
- C:/NIVASafe/backend/src/rula-measurement.ts
- C:/NIVASafe/backend/src/rula-landmark-localization.ts
- C:/NIVASafe/backend/src/rula-landmark-localization.test.ts
- C:/NIVASafe/backend/src/rula-landmark-reference.test.ts
- C:/NIVASafe/backend/test-fixtures/rula-landmarks-r8-reference.json
- C:/NIVASafe/frontend/src/features/assessments/rulaMeasurement.ts
- C:/NIVASafe/frontend/src/features/assessments/rulaMeasurement.test.ts
- C:/NIVASafe/scripts/rula-benchmark/generate-r8.mjs
- C:/NIVASafe/docs/rula-landmarks-r8.md
- C:/NIVASafe/project-state.json
- C:/NIVASafe/project-integrity-manifest.md

API زنده PID14048/SYSTEM از task موجود NIVASafe-API/PM2 و C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\server.js است. healthمحلی/عمومی و login/assets۲۰۰ بودند. staticroot برابر C:\inetpub\nivasafe\app-com و SHAindex زنده E1C893E440F8B769CB2E119C47D7D682BCD9DB092C0F4FD581A097B830885ED9 است. کد قدیمی RULA مسیر GPT-4.1-Mini و GPT-4o-mini دارد؛ درحالی‌که کاندیدا GPT-5-Miniقفل است. اجرای درون‌حافظه یا مصرف حساب از این literalها ثابت نیست؛ تصویر زنده فراخوانی نشد. مجوزهای تصویر در منابع محیطی بررسی‌شده غایب/نامنطبق بودند.

بازیابی کاندیدا: C:/NIVASafe/.local/rula-landmarks-r8-20261019/artifact-snapshot→C:/NIVASafe/.local/rula-landmarks-r8-20261019/artifact-rehearsal؛۱۹۰فایل با هش بازسازی شد. این rollback سرویس/config زنده نیست. به‌دلیل رد دقت، backup/cutover/DBrestore زنده اجرا نشد. هیچ artifactزنده جایگزین، processزنده restart یا gate فعال نشد.

## ادامهٔ کار و وضعیت مراحل

تولید مرجع فقط در مسیر تازه: node scripts/rula-benchmark/generate-r8.mjs <NEW_OUTPUT_DIRECTORY>. ابزارهای forensic/metrics زیر C:/NIVASafe/.local/rula-landmarks-r8-20261019 هستند. ledgerپرداختیِ۳۰درخواست نباید برای تکرار آزمایش حذف شود.

پروتکل annotation/ارگونومیست/رضایت و پیشنهاد آفلاین در C:/NIVASafe/docs/rula-landmarks-r8.md آمده است. [مستند رسمی](https://github.com/open-mmlab/mmpose/blob/main/docs/en/user_guides/inference.md) فقط وجود گزینهٔ معماری را نشان می‌دهد، نه وعدهٔ دقت NIVASafe؛ چیزی دانلود یا نصب نشد. تصمیم لازم: اندازه‌گیری با اصلاح دستی، یا مجوز جدا برای معماری غیرمولدِ تخصصیِ landmark. تعویض کلید یا فعال‌کردن عمومیِ «مجوز vision» از این شواهد توجیه ندارد. انتشار آینده همچنان به دقت/پذیرش تخصصی، رضایت واقعی سازمان و rollbackزندهٔ آزموده وابسته است.

جدول مراحل و شواهد فنی زیر به همان وضعیت واقعی اشاره دارد؛ پروژه INCOMPLETE است.

|Stage|Status|Evidence / scope|
|---|---|---|
|01|PASS|Scoped RULA requirements and preservation baseline|
|02|PASS|Existing review UI preserved; controlled uncertainty states reused|
|03|PASS|Typed frontend provenance round-trip; real browser checks|
|04|PASS|Geometry dependency repair; isolated experimental localization contract|
|05|PASS|Disposable DB/datadir guard; no live migration|
|06|PASS|Real authenticated API/manual correction/save/reopen/PDF|
|07|PASS|401/403 and tenant/review denial checks|
|08|PASS|Changed trust-boundary review; candidate audit0; not a production pentest|
|09|PASS|977 tests and final build/typecheck/lint|
|10|FAIL|Independent accuracy/coverage and outlier goals failed|
|11|BLOCKED|No accuracy/qualified/privacy acceptance or live rollback rehearsal|
|12|FAIL|Overall release not accepted; project remains incomplete|

|Milestone|Status|Evidence / interpretation|Artifact|
|---|---|---|---|
|Final candidate|PASS|rula-landmarks-r8-20261019-axisfix; real inference PID2692 / Administrator; parser hash matches final artifact|[candidate-manifest.final.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/candidate-manifest.final.json)|
|Frozen legacy40|FAIL|R6raw30/40; R7raw31/40, numeric21/40; R8-01 numeric10/40, within15=6/40; partial replay22/40 numeric,13/40 within15 is NOT fresh inference|[legacy-40-before-after.md](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/legacy-40-before-after.md)|
|Independent holdout|FAIL|24 scenes generated (16dev/8held); 8held tested per contract; prototype14/41 within15, coverage30/41|[heldout-metrics.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/heldout-metrics.json)|
|Joint localization|PARTIAL|Paired shoulder/elbow/wrist errors decrease, but remain61.71/64.91/97.29px; five uniquely inferred facing errors|[matched-joint-errors.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/matched-joint-errors.json)|
|Angle to score|PARTIAL|Existing tables/bands preserved and tested; only13/41 reference base categories match prototype; full ergonomic score truth unavailable|[heldout-metrics.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/heldout-metrics.json)|
|Abstention / 3D|FAIL|No axial degree fabricated; wrong numeric predictions remain;14 non-axial unobservable refs:9 correctly withheld,5 parser failures|[development-calibration.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/development-calibration.json)|
|Real Arvan model / budget|PASS|30 capped attempts:28 confirmed image HTTP200 GPT-5-Mini→gpt-5-mini-2025-08-07;2 report text outcomes UNKNOWN|[request-budget-ledger.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/request-budget-ledger.json)|
|Authenticated RIGHT/LEFT/BOTH|PASS|API/browser transport and review mechanics; three BOTH200 + separate UI RIGHT/LEFT200; fresh fixed BOTH200. Not anatomical acceptance|[final-candidate-e2e.axisfix.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/final-candidate-e2e.axisfix.json)|
|Save/reopen/PDF/browser|PASS|Real MariaDB; manual reference edits; logout/login/freshGET/report/PDF200; Chrome155 at390/1280; final provider-free browser/pass|[persistence-provenance.final.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/persistence-provenance.final.json)|
|Tests / build|PASS|609backend +349frontend +19domain=977; build/typecheck/lint0;90/154 contract;29 static release checks; audit0|[report-validation-exits.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/report-validation-exits.json)|
|Live routing audit|PARTIAL|Live PID14048 remains old packaged release and includes GPT4.1/GPT4o RULA paths; no billing attribution or live vision invocation|[live-runtime-readonly.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/live-runtime-readonly.json)|
|Live deployment / rollback|BLOCKED|NOT DEPLOYED.190 candidate artifacts reconstructed; live service/config rollback NOT RUN. Privacy/qualified/accuracy approval absent|[artifact-recovery.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/artifact-recovery.json)|

## مقایسهٔ هر ۴۰ ردیف ثابت

این جدول از چهار تکرار یک نقاشی است. R8-01 اجرای واقعی پیش از اصلاح محور است؛ بازپخش پس از اصلاح فقط محاسبهٔ مجدد مختصات ثبت‌شده است و آزمون تازهٔ ارائه‌دهنده نیست. مقدار نامعلوم یا abstention موفقیت عددی نیست.

|ID|Side / part|Ref°|R6°|R7 raw°|R7 numeric°|R8-01 geometry°|R8-01 numeric°|R8 abs error°|Partial replay°|Reason|
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
|R6-01|LEFT upperArm|10|90|20|ABSTAIN|33.69|33.69|23.69|33.69|REVIEW REQUIRED|
|R6-02|LEFT lowerArm|90|180|168|ABSTAIN|63.43|63.43|26.57|63.43|REVIEW REQUIRED|
|R6-03|LEFT wrist|0|0|5|5|14.25|14.25|14.25|14.25|REVIEW REQUIRED|
|R6-04|LEFT neck|0|0|0|0|0.00|0.00|0.00|0.00|REVIEW REQUIRED|
|R6-05|LEFT trunk|0|0|0|0|0.00|0.00|0.00|0.00|REVIEW REQUIRED|
|R6-06|RIGHT upperArm|60|30|75|ABSTAIN|48.37|48.37|11.63|48.37|REVIEW REQUIRED|
|R6-07|RIGHT lowerArm|90|60|90|ABSTAIN|107.19|107.19|17.19|107.19|REVIEW REQUIRED|
|R6-08|RIGHT wrist|0|10|10|10|28.69|28.69|28.69|28.69|REVIEW REQUIRED|
|R6-09|RIGHT neck|0|0|0|0|0.00|0.00|0.00|0.00|REVIEW REQUIRED|
|R6-10|RIGHT trunk|0|0|0|0|0.00|0.00|0.00|0.00|REVIEW REQUIRED|
|R6-11|LEFT upperArm|10|20|0|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-12|LEFT lowerArm|90|160|90|ABSTAIN|—|—|—|54.63|REFERENCE_FRAME_UNKNOWN|
|R6-13|LEFT wrist|0|0|0|ABSTAIN|—|—|—|3.27|REFERENCE_FRAME_UNKNOWN|
|R6-14|LEFT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-15|LEFT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-16|RIGHT upperArm|60|70|40|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-17|RIGHT lowerArm|90|90|60|ABSTAIN|—|—|—|103.59|REFERENCE_FRAME_UNKNOWN|
|R6-18|RIGHT wrist|0|5|20|ABSTAIN|—|—|—|3.74|REFERENCE_FRAME_UNKNOWN|
|R6-19|RIGHT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-20|RIGHT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-21|LEFT upperArm|10|0|90|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-22|LEFT lowerArm|90|90|180|ABSTAIN|—|—|—|101.31|REFERENCE_FRAME_UNKNOWN|
|R6-23|LEFT wrist|0|0|0|0|—|—|—|2.73|REFERENCE_FRAME_UNKNOWN|
|R6-24|LEFT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-25|LEFT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-26|RIGHT upperArm|60|25|30|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-27|RIGHT lowerArm|90|135|60|ABSTAIN|—|—|—|114.44|REFERENCE_FRAME_UNKNOWN|
|R6-28|RIGHT wrist|0|10|10|10|—|—|—|24.44|REFERENCE_FRAME_UNKNOWN|
|R6-29|RIGHT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-30|RIGHT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-31|RIGHT upperArm|60|45|70|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-32|RIGHT lowerArm|90|60|45|ABSTAIN|—|—|—|158.20|REFERENCE_FRAME_UNKNOWN|
|R6-33|RIGHT wrist|0|-10|10|ABSTAIN|—|—|—|13.24|REFERENCE_FRAME_UNKNOWN|
|R6-34|RIGHT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-35|RIGHT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-36|LEFT upperArm|10|90|15|ABSTAIN|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-37|LEFT lowerArm|90|180|90|ABSTAIN|—|—|—|148.84|REFERENCE_FRAME_UNKNOWN|
|R6-38|LEFT wrist|0|0|0|0|—|—|—|8.33|REFERENCE_FRAME_UNKNOWN|
|R6-39|LEFT neck|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|
|R6-40|LEFT trunk|0|0|0|0|—|—|—|—|REFERENCE_FRAME_UNKNOWN|

[legacy-40-before-after.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/legacy-40-before-after.json) / [legacy-40-before-after.csv](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/legacy-40-before-after.csv) include unchanged originals, signed/absolute errors, provenance and replay limitations.

## کنترل نهایی پس از تولید گزارش

تاریخ 2026-10-19 / 1405-07-27؛ UTC 2026-10-19T07:35:03.937Z. تعداد۵۷کنترل محدودِ integrity/امنیت/عدم‌افشای اطلاعات PASS شد؛ این پذیرش دقت آناتومیکی نیست. PID، entrypoint، هش artifactهای API و index زنده نسبت به ابتدای کار یکسان ماندند. healthمحلی/عمومی و login/assets دوباره۲۰۰بودند. هیچ انتشار یا restartزنده انجام نشد.

ابزار مستقل و قابل‌فراخوانی Debug یا Chrome DevTools در فهرست ابزارها وجود نداشت. مهارت‌های نصب‌شدهٔ Debug entry/diagnosing/TDD خوانده و استفاده شدند. ابزارهای واقعی: PowerShell، Node، Prisma/MariaDB، Playwright/Chrome، sharp، مشاهدهٔ تصویر، Poppler و مستندات رسمی وب. WebKit اجرایی نصب‌شده نبود و NOT_RUN ثبت شد. شواهد: C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/final-integrity-security-check.json و C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/webkit-availability.json.

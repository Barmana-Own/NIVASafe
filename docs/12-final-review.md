# بازبینی نهایی استقرار NIVASafe — نسخه فعلی

| مورد | مقدار |
|---|---|
| تاریخ میلادی | 2026-09-21 |
| تاریخ شمسی | 1405-06-30 |
| نشانی تحویل | https://app.nivasafe.com/login |
| verdict | PASS — release `release-20260921-fmea-registered-assessments-button` فعال؛ ارزیابی‌های ثبت‌شده در مرحله ۱ جدا و دکمه دسترسی آن در page-header اضافه شده، API و MySQL پایدار، hashها تطبیق‌داده‌شده و smoke عمومی موفق است |

## ماتریس اعتبارسنجی

| دسته | نتیجه | شواهد |
|---|---|---|
 | تست‌های واحد و integration | PASS | `pnpm test` — ۱۶۹ تست (۷۵ frontend، ۸۴ backend، ۱۰ shared-domain) |
| typecheck | PASS | `pnpm typecheck` |
| lint | PASS | `pnpm lint` |
| build | PASS | `pnpm build`؛ فقط هشدار اندازه chunk موجود است |
| API contract | PASS | `pnpm verify:contract` |
| release verification | PASS | ۲۶ بررسی |
| dependency audit | PASS | `pnpm audit --prod --audit-level high` |
| TLS و redirect دامنه نهایی | PASS | شواهد انتشار TLS/redirect قبلی حفظ شد و headerهای امنیتی از مسیر عمومی HTTPS دوباره بررسی شدند. |
| محدودسازی exposure API | PASS | API روی `127.0.0.1:5044` listener دارد، health داخلی HTTP 200 است و اتصال مستقیم عمومی به پورت 5044 پاسخ HTTP نمی‌دهد؛ مسیر عمومی از Nginx عبور می‌کند. |
| secret scan و diff check | PASS | بدون secret در source/build و بدون خطای diff |
| Docker Compose config | PASS | `docker compose --env-file .env.docker.example config` |
| migration و Prisma Client | PASS | Prisma validation و تولید Prisma Client موفق؛ migration تمیز برای تغییر فعلی NOT_RUN چون MySQL محلی از قبل schema داشته است؛ SQL افزایشی مصرف AI به‌صورت مستقیم روی schema محلی اعمال و بررسی شد |
| migration نقش دستیار | PASS | `202609040001_add_assistant_role` روی production اعمال شد و `prisma migrate status` up to date گزارش کرد |
| باندهای ریسک FMEA | PASS | migration `202609190001_fmea_risk_bands` با client پشتیبانی‌شده MariaDB روی production اعمال و در `_prisma_migrations` ثبت شد؛ defaults سازمان `101/201/401` و enum شامل `VERY_LOW` بررسی شد |
| API و database smoke | PASS | health داخلی و عمومی HTTP 200 با `database=up`، task Running و فرایند `pm2-runtime`/API پس از session مستقل بررسی شد. |
| AI runtime smoke | PASS | risk با `GPT-5-Mini` و chat با `DeepSeek-V4-Flash` از مسیر provider واقعی ArvanCloud AI پاسخ غیرخالی دادند؛ کلید فقط در environment سرور نگهداری می‌شود و کلیدهای legacy حذف شده‌اند |
| جایگزینی provider هوش مصنوعی | PASS | endpoint سازگار با OpenAI روی `https://api.arvancloudai.ir/v1` فعال است؛ catalog مدل‌ها، health سرور و smoke مستقیم risk/chat با HTTP 200 تأیید شد |
| وضعیت provider و اعتبارسنجی دستیار | PASS | provider نقش‌محور در API اعلام می‌شود و پرسش‌های کوتاه پیش از ارسال متوقف می‌شوند |
| public HTTPS smoke | PASS | `/login`، `/sw.js`، manifest، asset جدید frontend و `/api/v1/health` با HTTP 200 پاسخ دادند؛ APIهای محافظت‌شده بدون session خطای 401/400 مورد انتظار دارند و 502 مشاهده نشد. |
| آپلود چندتصویری و بررسی خودکار تصویر فرآیند FMEA | PASS | ورودی تا پنج تصویر JPG/PNG/WEBP را با کنترل نوع/امضا/اندازه/تعداد می‌پذیرد، پس از انتخاب بدون دکمه جداگانه برای هر تصویر تحلیل می‌کند، ردیف‌های پیش‌نویس قابل ویرایش را در مرور و ثبت قرار می‌دهد و همه تصاویر را پس از ثبت ارزیابی ذخیره می‌کند. |
| نمایش افزودن ردیف خطر در مرحله FMEA | PASS | در source، کارت مستقل با شرط `wizardStep === 2` محدود شد و مؤلفه ردیف ریسک مرحله مرور نیز step-2-only است؛ ۱۶۹ تست، typecheck، lint، build، contract/release verification و smoke HTTPS موفق شدند. |
| دکمه و جداسازی ارزیابی‌های ثبت‌شده FMEA | PASS | دکمه قابل‌دسترس در `page-header`، مقصد `fmea-registered-assessments`، نمایش پیش‌فرض فقط خارج از step 1 و reveal/scroll همان صفحه با ۱۶۹ تست، typecheck، lint، build، contract/release verification و smoke HTTPS تأیید شدند. |
| نوار حمایت صفحه ورود | PASS | محتوای قدیمی `login-approvals` حذف و با نوار حمایت محلی‌سازی‌شده و تصویر کوچک پارک علم و فناوری قزوین جایگزین شد؛ نوار اکنون در یک `footer` خارج از `login-hero-content`، با عرض کامل بخش محتوایی `login-art` و فاصله فشرده رندر می‌شود، در viewport باریک نیز قابل مشاهده است و `/login`، asset لوگو و CSS/JS فعال با HTTP 200 و hash تطبیق‌داده‌شده بررسی شدند. |
| اندازه عنوان صفحه ورود | PASS | عنوان localized `login-art h1` با مقیاس responsive کوچک‌تر، line-height فشرده‌تر و عرض محتوایی کامل‌تر تنظیم شد؛ در viewportهای 1280×900 و 1280×720 یک خط بدون clipping/overflow مشاهده شد و assetهای فعال با hash build تطبیق دارند. |
| برند toolbar و ورود مستقیم | PASS | پنل برند محلی‌سازی‌شده داخل `login-toolbar-brand` قرار گرفت؛ صفحه «نقش و فضای کاری را انتخاب کنید» از جریان login حذف شد و bundle فعال پس از احراز هویت، اولین عضویت سازمانی برگشتی از API را ذخیره و مستقیم به پنل هدایت می‌کند؛ جابه‌جایی شرکت داخل پنل حذف نشده است. |
| stepper مسیر ارزیابی | PASS | `/choose-path` اکنون فقط سه مرحله «انتخاب نوع ارزیابی»، «اطلاعات ارزیابی» و «مرور و تأیید» را نشان می‌دهد؛ «اطلاعات پایه» از چرخه نمایشی حذف و شماره‌گذاری مرحله جاری به ۱ از ۳ اصلاح شد، بدون حذف مسیرهای FMEA/RULA یا داده‌های downstream. |
| stepper ایجاد FMEA | PASS | ویزارد FMEA سه مرحله را با برچسب‌های «اطلاعات فرآیند»، «مرور و ثبت» و «گزارش و نتایج» نمایش می‌دهد؛ مرحله اول به مرور/ثبت می‌رود، ثبت تکراری و خطای/آفلاین بودن درخواست به‌درستی کنترل می‌شود و ثبت موفق با شناسه واقعی ارزیابی به `/fmea/:id/report` به‌عنوان مرحله سوم منتقل می‌شود. تست قرارداد frontend، build و smoke عمومی bundle موفق بود و مسیرهای موجود گزارش/فهرست حفظ شدند. |
| ستون فرآیند / فعالیت در جزئیات کامل FMEA | PASS | جدول `fmea-report-data-table` اکنون فقط نام فرایند اصلی ارزیابی را از `report.assessment.processName` نمایش می‌دهد و توضیحات فعالیت ردیف را در این ستون نشان نمی‌دهد؛ تست frontend، build، hash فعال و smoke عمومی bundle جدید موفق بود. |
| اندازه دکمه‌های `surface-actions` | PASS | typography و padding دکمه‌های مستقیم این ناحیه کوچک شد و `white-space: nowrap` مانع شکستن متن «افزودن اقدام دستی» شد؛ تست frontend، build، hash فعال و smoke عمومی bundle جدید موفق بود. |
 | تراز اطلاعات ارزیابی FMEA | PASS | کنترل‌های کد ارزیابی و دامنه در مرحله مرور و ثبت در یک ردیف responsive با تراز عمودی مشترک قرار دارند؛ راهنمای تولید خودکار کد زیر ورودی خودش باقی می‌ماند و تست قرارداد/CSS و smoke عمومی موفق بود. |
| نمایش پیشنهادهای هوشمند ردیف FMEA | PASS | چهار دسته خطر/حالت خرابی، اثر، علت و پیشنهاد کنترلی حداکثر شش پیشنهاد دارند، سه مورد نخست را نشان می‌دهند و برای بقیه دکمه مستقل +/− با وضعیت دسترس‌پذیر دارند؛ تست frontend/build و smoke عمومی bundle موفق است. |
| قابلیت نصب و بروزرسانی PWA | PASS | manifest با حالت standalone و آیکون maskable، service worker نسخه v12 با مهاجرت یک‌باره کلاینت‌های قدیمی، fallback آفلاین، prompt نصب دسکتاپ/راهنمای iOS، cache navigation بدون نگهداری query و bypass فایل‌های private/upload، بررسی update روی registration/visibility/reconnect و بروزرسانی کنترل‌شده با reload؛ assetهای عمومی با headerهای revalidation و HTTP 200 بررسی شدند |
| اصلاح صفحه سفید و runtime React | PASS | build production اصلاح شد تا JSX توسعه‌ای تولید نکند؛ bundle فعال `index-CipggNix.js` بدون `jsxDEV` و `jsx-dev-runtime`، شامل navigation گزارش FMEA و بدون کلید stepper «اطلاعات پایه» است، hash محلی/سرور تطبیق داده شد و مسیرهای عمومی اصلی با HTTP 200 پاسخ دادند |
| ذخیره خودکار ارزیابی‌ها | PASS | فرم‌های FMEA و RULA در localStorage و IndexedDB ذخیره و از مسیرهای عمومی `/fmea` و `/rula` بررسی شدند |
| recovery سرور | PASS | ناسازگاری احراز هویت MariaDB برای اتصال قبلی برطرف شد؛ حساب application اختصاصی، API و health عمومی بررسی شدند |
| login rate limit | PASS | سقف production روی ۶۰ تلاش در ۱۵ دقیقه فعال است؛ ۱۱ درخواست نامعتبر متوالی بدون 429 زودهنگام پاسخ 401 گرفتند |
| چیدمان گزینه‌های پایگاه دانش | PASS | کنترل visibility و چندانتخابی‌ها در کارت‌های هم‌ارتفاع با selectهای ۱۱۲ پیکسلی و stacking ریسپانسیو پیاده‌سازی شد |
| پالت رنگ پنل‌ها | PASS | اکشن‌های اصلی و accentهای غیرمعنایی از پالت آبی موجود سایت استفاده می‌کنند؛ رنگ‌های معنایی موفقیت و هشدار متمایز باقی مانده‌اند |
| انتخاب تم پوسته احراز‌شده | PASS | پوسته دقیقاً دو انتخاب محلی‌سازی‌شده آبی/تیره و سفید/روشن دارد؛ مقدار انتخاب‌شده بدون reload اعمال و در مرورگر ذخیره می‌شود، لوگوی سایدبار در تم تیره سفید و در تم روشن آبی است و release نهایی `release-20260914-133023-panel-no-pdf` با hashهای build محلی روی سرور فعال است |
| تمایز پنل ادمین | PASS | shell مدیران از پنل کاربران عادی جداست؛ مدیر کل و مدیر سازمان treatment نقش‌محور دارند و مسیرهای مدیریتی برای کاربران عادی نمایش داده نمی‌شود |
| افزودن مدیر و دستیار | PASS | نقش سازمانی محدود `ASSISTANT` و دعوت امن `ORG_ADMIN`/`ASSISTANT` پیاده‌سازی شده است؛ ارتقای `SUPER_ADMIN` فقط در مرز server-side مدیر کل مجاز است |
| onboarding ثبت‌نام | PASS | ثبت‌نام‌های شخصی و سازمانی، workspace اولیه، عضویت `ORG_ADMIN` و پروژه localized با کد `DEFAULT` را در یک تراکنش می‌سازند؛ پروژه‌های قدیمی نیز به‌صورت idempotent backfill/restore می‌شوند، 14 starter فعال production بررسی شد و حذف starter محافظت شده است |
| نام‌گذاری گفتگوی هوش مصنوعی | PASS | مسیر /assistant حفظ شد و asset فعال روی HTTPS متن فارسی «گفتگو با هوش مصنوعی» و متن انگلیسی Chat with AI را دارد |
| loader ورود صفحه | PASS | loader مرکزی برندشده در render اولیه و جابه‌جایی client-side با انیمیشن mark، متن محلی و پشتیبانی از reduced motion بررسی و روی HTTPS مستقر شد |
| دکمه‌های Hide/Show چیدمان داشبورد | PASS | برای هر ویجت دکمه مستقل مخفی‌کردن/نمایش‌دادن با وضعیت `aria-pressed` اضافه شد؛ تنظیمات در محدوده کاربر و سازمان ذخیره می‌شود و بازگردانی همه ویجت‌ها حفظ شده است |
| اطلاعات فرآیند FMEA | PASS | job catalog جستجوپذیر، پیشنهادهای قابل تأیید، افزودن مورد جدید، کمک‌متن محدودشده و ذخیره فیلدهای فرآیند در working tree بررسی شد |
| جدول اصلی ریسک FMEA | PASS | ماتریس کامل فرآیند/خرابی/اثر/علت/کنترل/S/O/D/RPN/سطح ریسک/اقدام، جست‌وجو، فیلتر، مرتب‌سازی، جزئیات، ویرایش، حذف تأییدشده، راهنمای امتیازدهی و خروجی Excel/Word پیاده‌سازی و با تست قراردادی و تست باینری بررسی شد؛ کنترل PDF در پنل نمایش داده نمی‌شود و مسیر سازگاری API حفظ شده است. پنل امتیازدهی افزودن/ویرایش نیز selectors و RPN preview و دکمه ثبت/ذخیره را در یک ردیف هم‌تراز و در موبایل به‌صورت واکنش‌گرا نمایش می‌دهد و معیارهای ۱ تا ۱۰ فایل مرجع اعمال شده‌اند. پیشنهاد AI ردیف خطر اکنون امتیازهای advisory S/O/D و توضیح را نیز از همان context برمی‌گرداند و پس از پنل امتیاز فقط با تأیید صریح کاربر قابل اعمال است. |
| افزودن ردیف خطر FMEA | PASS | فرم افزودن ردیف خطر دیگر ورودی دستی شماره ردیف و مرحله فرآیند ندارد؛ API در صورت حذف این فیلدهای legacy شماره ترتیبی بعدی و زمینه فرآیند/فعالیت ارزیابی والد را تعیین می‌کند و تست‌های frontend/backend آن را پوشش می‌دهند؛ انتشار `release-20260914-135929-fmea-risk-row-defaults` با hashهای محلی/سرور تطبیق داده شد |
| گزارش نتایج FMEA | PASS | header ارزیابی و تیم، خلاصه مدیریتی، نمودار پنج‌سطحی توزیع ریسک شامل «خیلی کم»، top failure modes مرتب‌شده با AP/RPN، پیشنهادهای NIVASafe، ثبت اقدام دستی، وضعیت‌های اقدام، حذف پیشنهاد ثبت‌شده از فهرست انتظار، action register، جزئیات جمع‌شونده، کنترل ارسال تکراری و save audit با تست‌های frontend/backend بررسی شد؛ PDF فقط در API سازگاری باقی مانده است |
| باندهای RPN و score-panel FMEA | PASS | حدود `1–50/51–100/101–200/201–400/>400` در helper مشترک، API، badge زنده پنل امتیازدهی، فیلتر و گزارش یکسان هستند؛ تست‌های مرزی، build، migration production و smoke عمومی موفق شدند |
| حذف دانلود PDF از پنل ارزیابی | PASS | کنترل‌های دانلود PDF از سطوح فهرست و گزارش FMEA/RULA حذف شده‌اند؛ خروجی Excel و Word باقی است، مسیرهای PDF API برای سازگاری حفظ شده‌اند و bundle فعال و smoke عمومی نبود کنترل‌های PDF را تأیید می‌کنند |
| migration و smoke گزارش FMEA | PASS | migrationهای pending مرتبط با FMEA روی production با موفقیت اعمال شدند؛ migration تمیز روی database جدید در این checkpoint همچنان NOT_RUN است |
| اطلاعات فرآیند RULA | PASS | فیلدهای شغل، فعالیت، مدت، تکرار شیفت، نگه‌داشتن پوسچر، وزن/نیرو، توضیحات اختیاری پوسچر، پیش‌نمایش و حذف/جایگزینی عکس، آپلود عکس، راهنمای ثبت تصویر و extension point هوش مصنوعی با اعتبارسنجی backend/frontend پیاده‌سازی شد؛ ارسال تکراری نیز هنگام ثبت قفل می‌شود |
| migration و smoke اطلاعات فرآیند RULA | PASS | migration `202609050003_rula_process_information` روی production با موفقیت اعمال و Prisma Client تولید شد؛ migration تمیز روی database جدید همچنان NOT_RUN است |
| تحلیل پوسچر RULA | PASS | جدول‌های Group A/B، زاویه/وضعیت/منبع/امتیاز پیشنهادی، ویرایش و تأیید ردیف‌ها، محاسبه زنده امتیازهای گروه و نهایی، چهار سطح اقدام، خلاصه عامل اصلی و لایه آماده اسکلت/نقاط مفصلی پیاده‌سازی و با تست‌های frontend/backend بررسی شد |
| migration و smoke تحلیل پوسچر RULA | PASS | migration `202609050004_rula_posture_analysis` روی production با موفقیت اعمال و Prisma Client تولید شد؛ migration تمیز روی database جدید همچنان NOT_RUN است |
| گزارش نتایج و اقدامات اصلاحی RULA | PASS | صفحه گزارش با Score و سطح ریسک، عوامل گردن/بازو/تنه، اولویت اقدامات، اقدام دستی و امتیاز پیش‌بینی‌شده پویا پیاده‌سازی و با تست‌های helper/contract بررسی شد |
| migration و smoke گزارش RULA | PASS | migration `202609060001_rula_corrective_action_impact` روی production با موفقیت اعمال شد؛ migration تمیز روی database جدید همچنان NOT_RUN است |
| مصرف توکن AI در پنل مدیر | PASS | `GET /api/v1/admin/ai-usage` با احراز هویت `SUPER_ADMIN` و `ORG_ADMIN` بررسی شد؛ جدول تفکیک کاربر، خلاصه توکن‌های ورودی/خروجی/کل، ثبت idempotent و محدودسازی سازمانی سمت server پیاده‌سازی و تست شد |
| انتخاب نوع حساب و نقش هنگام احراز هویت | PASS | انتخاب شخصی/سازمانی ثبت‌نام با draft ذخیره‌شده همچنان قابل دسترس است؛ ورود چندفضایی فقط عضویت‌ها و نقش‌های برگشتی از server را نمایش می‌دهد و فضای انتخاب‌شده را پس از تأیید ذخیره می‌کند |
| امنیت ثبت‌نام | PASS | اعتبارسنجی server-side و client-side ایمیل/تلفن، تشخیص خودکار نوع contact، رد شماره‌های نامعتبر، رد نام‌های رزروشده/ناامن، strict payload و الزام اطلاعات سازمانی در تست‌های جدید بررسی شد |

## بازبینی امنیتی

کلید AI در سمت server باقی مانده و در frontend، build، archive یا مستندات ثبت نشده است. هیچ credential production یا credential سرور در repository یا فایل‌های تحویلی قرار نگرفته است؛ fixtureهای شناخته‌شده توسعه محلی به محیط production راه ندارند. نقش‌های احراز هویت و مرزهای مجوز سمت server حفظ شدند. مصرف AI فقط شمارنده‌های معتبر provider را ذخیره می‌کند، prompt/completion یا credential ذخیره نمی‌شود و `ORG_ADMIN` فقط داده سازمان خودش را می‌بیند. TLS با پروتکل‌های 1.2 و 1.3، HSTS و headerهای امنیتی مرورگر فعال است؛ renewal گواهی با win-acme و validation/reload امن Nginx انجام می‌شود. API مستقیماً روی شبکه عمومی ارائه نمی‌شود و دامنه نهایی وب به‌صورت صریح مشخص شده است.

## وضعیت تحویل

نسخه فعلی سامانه شامل قابلیت‌های موجود، PWA، hardening امنیتی/redirect دامنه، پوسته‌های قابل انتخاب آبی/تیره و سفید/روشن و آپلود چندتصویری خودکار FMEA است. build و تست‌های محلی موفق‌اند؛ frontend/backend/shared-domain با hash محلی روی سرور تطبیق داده شدند، API با MySQL روی `127.0.0.1:5044` زیر نظارت persistent `pm2-runtime` اجرا می‌شود و health عمومی HTTP 200 است. هشدار اندازه chunk frontend غیرمسدودکننده است. smoke موفق ثبت‌نام با حساب جدید و click-through احراز‌شده FMEA/RULA در این checkpoint اجرا نشدند.

## اصلاح نهایی مسیر FMEA — 2026-09-15

پس از گزارش بازگشت نادرست ویزارد، مرز مرحله اول و دوم در کد frontend با انتقال غیرارسالی، توقف propagation، markerهای مرحله‌ای و submit guard صریح اصلاح شد. مرحله «مرور و ثبت» اکنون پیش از هر ارسال قابل مشاهده و قابل focus است و مرحله «گزارش و نتایج» فقط از مسیر ثبت موفق ارزیابی باز می‌شود. service worker v13 نیز برای انتقال یک‌باره کلاینت‌های قدیمی منتشر شد. release `release-20260915-fmea-step2-review` روی static root فعال، backup rollback نگهداری و artifact hashها، تست‌های رگرسیون، build، بررسی امنیتی، سلامت API پورت 5044 و smoke عمومی HTTPS تأیید شدند.

## اصلاح نهایی اطلاعات فرآیند RULA — 2026-09-15

بازبینی نهایی تأیید کرد که عنوان ارزیابی بدون حذف فیلد اختیاری شده و با ردیف label ثابت، کنترل آن با سمت بدن هم‌تراز است. گزینه جدید `BOTH` در انتخاب سمت بدن، payload فرم، بازیابی draft و schema backend به‌صورت محدود و صریح پشتیبانی می‌شود؛ راست و چپ قبلی بدون تغییر باقی مانده‌اند. عنوان خالی در API به عنوان شغل یا مقدار امن پیش‌فرض تبدیل می‌شود تا قرارداد ستون اجباری پایگاه داده و رکوردهای موجود حفظ شوند. تست frontend/backend، typecheck، lint، build، contract/release verification، audit وابستگی، hashهای local/سرور و smoke عمومی HTTPS موفق شدند. release `release-20260915-rula-process-info` فعال است، backup rollback نگهداری شده و API داخلی `127.0.0.1:5044` با MySQL سالم است.

## اصلاح نهایی برچسب مراحل RULA — 2026-09-15

برچسب‌های ویزارد RULA با حفظ ساختار سه‌مرحله‌ای اصلاح شدند: مرحله دوم «مرور و ثبت و امتیاز دهی» و مرحله سوم «گزارش دهی ارزیابی» است. کلیدهای ترجمه فارسی/انگلیسی، legend مرحله سوم و متن توضیح ویزارد هم‌راستا شدند؛ هیچ route، API، منطق امتیازدهی یا قابلیت موجود حذف نشد. تست قرارداد frontend، 157 تست کامل، typecheck، lint، build، بررسی قرارداد و release، audit امنیتی، تطبیق hash artifactهای سرور و smoke عمومی HTTPS موفق بودند. انتشار `release-20260915-rula-stepper-labels` با backup قابل rollback فعال است و API پورت 5044 با MySQL healthy باقی مانده است.

## وضعیت checkpoint امنیت ثبت‌نام

| بررسی | نتیجه |
|---|---|
| build و تست‌های تغییر ثبت‌نام | PASS — ۱۴۲ تست، typecheck، lint و build موفق بودند؛ تست‌های shared/backend/frontend و smoke مسیرهای شخصی و سازمانی در frontend preview بازسازی‌شده موفق شدند. ثبت موفق production با حساب جدید در این checkpoint انجام نشد. |
| انتشار artifactهای تغییر ثبت‌نام روی سرور | PASS — artifact frontend فعال و backend با hash محلی تطبیق داده شدند؛ health عمومی HTTP 200 و ورودی نامعتبر API بدون 502 بررسی شد |

## اصلاح نهایی لوگوی سایدبار در تم آبی — 2026-09-15

بازبینی نهایی تأیید کرد که در تم آبی/تیره، `side-brand-icon` دیگر با فیلتر سفیدکننده نمایش داده نمی‌شود؛ پس‌زمینه و حاشیه سفید اطراف نشان قرار گرفته و رنگ‌های اصلی آبی، قرمز و چندرنگ لوگو حفظ شده‌اند. تم سفید/روشن و قواعد responsive و collapse سایدبار بدون تغییر باقی مانده‌اند. release frontend-only `release-20260915-blue-theme-logo` روی static root فعال است، backup قابل rollback نگهداری شده، hashهای local/سرور تطبیق داده شده‌اند و smoke عمومی برای assetهای برنامه، لوگو، PWA و health با HTTP 200 موفق بوده است. تست کامل 157 مورد، typecheck، lint، build، بررسی قرارداد/release، audit وابستگی و Prisma validation موفق شدند؛ هشدار اندازه chunk موجود همچنان غیرمسدودکننده است.

## بازبینی نهایی select و option — 2026-09-15

بازبینی نهایی کد و artifact تأیید کرد که تمام `select`های native از قواعد مشترک فرم استفاده می‌کنند و childهای `option` دارای استایل مشترک برای typography، padding، رنگ‌های سطح و متن، انتخاب‌شده، hover/focus، disabled، placeholder و multi-select هستند. قواعد تم آبی/تیره و سفید/روشن خوانایی را حفظ می‌کنند و native select مخفی مورد استفاده در `ProjectSelect` بدون تغییر باقی مانده است. هیچ route، API، داده، دسترسی یا رفتار کسب‌وکاری حذف یا غیرفعال نشد.

تست‌های frontend و full suite با 157 مورد، typecheck، lint، build، بررسی قرارداد و release، audit وابستگی، Prisma validation، تطبیق hashهای local/staging/active و smoke عمومی HTTPS موفق شدند. release `release-20260915-native-select-options` روی static root فعال و backup rollback نگهداری شده است؛ API پورت 5044 و MySQL سالم و taskهای API/Nginx در وضعیت Running هستند. تفاوت‌های محدود native option rendering بین مرورگرها/سیستم‌عامل‌ها به‌عنوان محدودیت ذاتی کنترل native ثبت شد؛ click-through دستی تک‌تک منوها در این checkpoint NOT_RUN است و CSS مستقر از نظر markerهای موردنیاز تأیید شده است.
## بازبینی نهایی جدول‌های گزارش FMEA و RULA — 2026-09-15

الگوی جدول فشرده و RTL مرجع برای فهرست/گزارش FMEA و فهرست/گزارش RULA تکمیل شد. داده‌ها از مسیرهای واقعی موجود خوانده می‌شوند: FMEA از ارزیابی‌ها و report payload شامل `items` و اقدامات مرتبط، و RULA از فهرست tenant-scoped و `postureAnalysis`/`activityInfo` گزارش. برای موبایل overflow افقی کنترل‌شده و برای دسکتاپ ستون‌های عددی و متنی تفکیک‌شده اعمال شد. عملیات و جریان‌های قبلی حفظ شدند و داده fake یا hardcoded اضافه نشد.

نتیجه نهایی این checkpoint: تست کامل 157 مورد، typecheck، lint، build، بررسی قرارداد API، release verification، Prisma validation، audit وابستگی، تطبیق hash local/staged/active و smoke عمومی HTTPS موفق. release `release-20260915-assessment-report-tables` فعال و backup rollback نگهداری شده است. بررسی تعاملی احراز‌شده روی tenant دارای رکورد در این checkpoint NOT_RUN است؛ سلامت API پورت 5044 و پاسخ HTTP 200 مسیرهای عمومی تأیید شد. تغییرات فاقد اثر روی route، API، schema، مجوز یا داده‌های موجود هستند.

## بازبینی نهایی انتخاب‌گر تم — 2026-09-15

انتخاب‌گر تم authenticated shell بازبینی شد. پیاده‌سازی فقط رفتار نمایش کنترل را اصلاح می‌کند: از دو انتخاب هم‌زمان به یک trigger برای تم فعال و منوی بازشونده برای تم جایگزین تغییر یافته است. دو مقدار `blue` و `white`، persistence، اعمال بدون reload، ترجمه‌ها، رنگ‌بندی پوسته و قواعد لوگوی سایدبار حفظ شدند. کنترل دارای state قابل دسترس برای باز/بسته، بستن با Escape و کلیک بیرون و رفتار responsive است.

نتیجه: تست کامل 157 مورد، typecheck، lint، build، بررسی قرارداد API، release verification و audit وابستگی PASS شدند. release `release-20260915-theme-switcher` با hashهای local/staged/active یکسان، backup rollback، API/MySQL سالم روی `127.0.0.1:5044`، taskهای Running و smoke عمومی HTTPS با HTTP 200 فعال است. click-through احراز‌شده منوی تم در این checkpoint NOT_RUN است؛ بررسی source، bundle، CSS و markerهای production انجام شد. هیچ route، API، schema، داده، نقش یا قابلیت موجود حذف یا غیرفعال نشد.
## بازبینی نهایی responsive انتخاب‌گر تم — 2026-09-15

بازبینی نهایی تأیید کرد که `theme-switcher` و header احراز‌شده در desktop، tablet و mobile از عرض در دسترس خارج نمی‌شوند. در tablet header به ردیف action قابل wrap تبدیل می‌شود؛ در mobile selector شرکت shrink می‌شود، دکمه‌ها wrap می‌شوند و منوی تم با max-width مبتنی بر viewport نمایش داده می‌شود. trigger فشرده موبایل، ellipsis متن‌های طولانی و حفظ stateهای دسترس‌پذیر بدون تغییر در مدل دو تم اعمال شده‌اند.

نتیجه: ۱۵۷ تست، typecheck، lint، build، بررسی قرارداد API، release verification و audit وابستگی PASS شدند. release `release-20260915-theme-switcher-responsive` با hashهای local/staged/active یکسان، backup rollback، API/MySQL سالم روی `127.0.0.1:5044`، taskهای Running و smoke عمومی HTTPS با HTTP 200 فعال است. click-through احراز‌شده در سه viewport در این checkpoint NOT_RUN است؛ source، artifact تولیدی، markerهای responsive و تحویل عمومی assetها تأیید شدند. هیچ route، API، schema، داده، نقش یا قابلیت موجود حذف یا غیرفعال نشد.
## بازبینی نهایی انتشار responsive تم — 2026-09-15

نسخه نهایی `release-20260915-theme-switcher-responsive-v2` بازبینی و منتشر شد. کنترل‌های desktop، tablet و mobile داخل عرض موجود باقی می‌مانند؛ در تبلت ردیف action wrap می‌شود، در موبایل selector شرکت و دکمه‌ها بدون بیرون‌زدگی مدیریت می‌شوند و menu تم با محدودیت viewport باز می‌شود. رفتار دو تم و persistence بدون تغییر است.

تست کامل ۱۵۷ مورد، typecheck، lint، build، بررسی قرارداد API، release verification و audit وابستگی PASS شدند. hashهای local/staged/active یکسان، backup rollback نگهداری‌شده، API/MySQL سالم روی `127.0.0.1:5044`، taskهای Running و smoke عمومی HTTPS با HTTP 200 تأیید شد. click-through احراز‌شده در هر سه viewport NOT_RUN است؛ هیچ route، API، schema، داده، نقش یا قابلیت موجود حذف یا غیرفعال نشد.
## بازبینی نهایی اصلاح هدر — 2026-09-16

بازبینی مستقل علت regression هدر را به width عمومی `100%` روی selector شرکت در flex و wrap ناخواسته دسکتاپ نسبت داد. نسخه اصلاحی selector را bounded می‌کند، دسکتاپ را به layout اصلی تک‌ردیفه برمی‌گرداند و wrap را برای tablet/mobile نگه می‌دارد. تست UI، full suite، build و asset/hash فعال انجام شد؛ هیچ route، API، schema، نقش، داده یا کنترل موجود حذف یا غیرفعال نشده است.

نتیجه نهایی: release `release-20260916-header-responsive-repair` با backup rollback فعال است؛ 157 تست، typecheck، lint، build، API contract، release verification و audit وابستگی PASS شدند. hashهای local/staged/active یکسان، API/MySQL سالم روی `127.0.0.1:5044`، taskهای API/Nginx در وضعیت Running و public HTTPS smoke با HTTP 200 تأیید شدند. click-through احراز‌شده برای هر سه viewport NOT_RUN باقی است.

## بازبینی نهایی فرم تجمیعی ایجاد پروژه و انتشار — 2026-09-16

تغییر نهایی با حفظ پروژه‌ها، فهرست پروژه‌ها، مسیرهای API و داده‌های فرایند/فعالیت بازبینی شد. `/projects` اکنون فقط مسیر ایجاد پروژه و فهرست پروژه‌ها را نمایش می‌دهد؛ ایجاد پروژه نام فرایند و عنوان فعالیت اولیه را به‌صورت اجباری و محل انجام را به‌صورت اختیاری می‌گیرد. سمت server جفت‌شدن این دو مقدار را enforce کرده و ایجاد project/process/activity را در یک transaction انجام می‌دهد. هیچ migration جدیدی برای این release لازم نبود و مسیرهای مستقل فرایند و فعالیت حذف یا غیرفعال نشده‌اند.

| بررسی نهایی | وضعیت |
|---|---|
| requirements و regression | PASS — قابلیت‌های درخواستی، حفظ فهرست پروژه‌ها، validation مستقل backend و ایجاد اتمیک بررسی شدند |
| تست و ساخت | PASS — ۱۵۸ تست، typecheck، lint، production build، release verification و dependency audit |
| artifact integrity | PASS — hashهای local/active برای index، JavaScript، CSS و `modules/projects.js` تطبیق دارند |
| production deployment | PASS — release `release-20260916-project-create-bootstrap-144149` فعال، backup rollback نگهداری، API/Nginx Running، پورت 5044 listening و مسیرهای عمومی/health با HTTP 200 |
| migration تمیز | NOT_RUN — migration جدیدی برای این تغییر وجود ندارد؛ اجرای database disposable مستقل انجام نشده است |
| click-through احراز‌شده | NOT_RUN — ورود با session واقعی tenant و ارسال فرم در این checkpoint اجرا نشد |

نتیجه release: PASS برای انتشار تغییر فعلی؛ وضعیت‌های NOT_RUN محدود به click-through احراز‌شده و migration disposable مستقل هستند و مانع سلامت سرویس عمومی یا سازگاری API این release نیستند.

## بازبینی نهایی مخفی‌سازی login-art در صفحه‌های باریک — 2026-09-16

بازبینی نهایی تغییر frontend-only تأیید کرد که در عرض `900px` و کمتر، `.login-art` از layout حذف می‌شود و `.login` تنها یک ردیف تمام‌ارتفاع دارد؛ بنابراین پنل بازاریابی قبل از فرم نمایش داده نمی‌شود و فضای خالی تصویر ارسالی ایجاد نمی‌کند. در عرض بزرگ‌تر از 900 پیکسل layout دسکتاپ دو ستونه و محتوای login-art حفظ شده است. هیچ route، API، schema، migration، نقش، داده یا سرویس backend حذف یا غیرفعال نشده است.

| بررسی نهایی | وضعیت |
|---|---|
| requirements و regression | PASS — hide واقعی `.login-art` و تک‌ستونه‌شدن grid در breakpoint موردنظر در source و bundle بررسی شد |
| تست و ساخت | PASS — ۱۵۸ تست، typecheck، lint، production build، release verification و dependency audit |
| artifact integrity | PASS — hashهای local/active برای index، JavaScript و CSS تطبیق دارند و rule فعال CSS تأیید شد |
| production deployment | PASS — release `release-20260916-login-art-hide-900` فعال، backup rollback و old root نگهداری، API/Nginx Running، پورت 5044 healthy و مسیرهای عمومی/health با HTTP 200 |
| click-through احراز‌شده | NOT_RUN — ورود و بررسی دستی tenant در چند viewport اجرا نشد؛ بررسی source، build، hash و public smoke انجام شد |

نتیجه release: PASS؛ تغییر با کمترین دامنه اعمال شد و layout دسکتاپ و قابلیت‌های backend بدون تغییر باقی ماندند.

## بازبینی نهایی حذف دکمه حذف چیدمان داشبورد — 2026-09-17

بازبینی مستقل تأیید کرد که دکمه حذف در کنترل‌های چیدمان داشبورد دیگر نمایش داده نمی‌شود و با `display: none` از فضای layout خارج شده است؛ کنترل show/hide، نام ویجت‌ها، جابه‌جایی، reset و سازگاری بازگردانی state قدیمی حفظ شده‌اند. این تغییر frontend-only است و هیچ route، API، schema، migration، نقش، داده یا سرویس backend را تغییر نداده است.

| بررسی نهایی | وضعیت |
|---|---|
| requirements و regression | PASS — rule scoped و قرارداد UI برای حذف کنترل از رابط، بدون حذف قابلیت show/hide، بررسی شد |
| تست و ساخت | PASS — ۱۵۸ تست، typecheck، lint و production build |
| release verification و audit | PASS — بررسی release و audit وابستگی پس از اجرای مجاز subprocess/network تأیید شد |
| artifact integrity | PASS — hashهای local/staged/active برای index، JavaScript و CSS یکسان و rule فعال CSS موجود است |
| production deployment | PASS — release `release-20260917-dashboard-hide-only` فعال، backup rollback نگهداری، API/Nginx Running، API/MySQL healthy و مسیرهای عمومی/PWA/health با HTTP 200 |
| click-through احراز‌شده | NOT_RUN — session tenant در این checkpoint استفاده نشد؛ source، build، hash و public smoke بررسی شد |

نتیجه release: PASS؛ حذف کنترل درخواستی اعمال شد و قابلیت نمایش/مخفی‌کردن به‌عنوان مسیر اصلی مدیریت ویجت‌ها باقی ماند.

## بازبینی نهایی مرکز عمودی کارت ورود در صفحه‌های باریک — 2026-09-16

بازبینی نهایی تغییر frontend-only تأیید کرد که در عرض `900px` و کمتر، `.login-art` از layout حذف می‌شود، `.login` یک ردیف تمام‌ارتفاع دارد و `.login-card` در فضای باقی‌مانده به‌صورت عمودی مرکز می‌شود. محدودیت ارتفاع و اسکرول داخلی کارت برای viewport کوتاه حفظ شده و در عرض بزرگ‌تر از 900 پیکسل layout دو ستونه قبلی بدون تغییر باقی مانده است. هیچ route، API، schema، migration، نقش، داده یا سرویس backend حذف یا غیرفعال نشده است.

| بررسی نهایی | وضعیت |
|---|---|
| requirements و regression | PASS — center عمودی کارت و حذف فضای اضافی پنل marketing در source و bundle بررسی شد |
| تست و ساخت | PASS — ۱۵۸ تست، typecheck، lint، production build، release verification و dependency audit |
| artifact integrity | PASS — hashهای local/active برای index، JavaScript و CSS تطبیق دارند و ruleهای hide/center در CSS فعال تأیید شدند |
| production deployment | PASS — release `release-20260916-login-card-center-900` فعال، rollback backup و old root نگهداری، API/Nginx Running، پورت 5044 با HTTP 200 و MySQL healthy و مسیرهای عمومی/health با HTTP 200 |
| click-through احراز‌شده | NOT_RUN — ورود tenant و بررسی دستی چند viewport در این checkpoint اجرا نشد؛ source، build، hash و public smoke انجام شد |

نتیجه release: PASS؛ کارت ورود در صفحه‌های باریک در مرکز قرار می‌گیرد و layout دسکتاپ و قابلیت‌های backend بدون تغییر باقی مانده‌اند.

## بازبینی نهایی تراز مصرف توکن هوش مصنوعی در پنل مدیریت — 2026-09-17

بازبینی نهایی تغییر frontend-only تأیید کرد که کارت‌های خلاصه مصرف و جدول مصرف کاربران در پنل مدیریت، شامل سرستون‌ها، هویت کاربر و همه مقادیر عددی، تراز افقی مرکز و vertical-middle دارند. هیچ route، API، schema، migration، نقش، داده یا سرویس backend حذف یا غیرفعال نشده است.

| بررسی نهایی | وضعیت |
|---|---|
| requirements و regression | PASS — قرارداد frontend برای selectorهای پنل مدیریت و ruleهای scoped تراز وسط بررسی شد |
| تست و ساخت | PASS — ۱۵۸ تست، typecheck، lint و production build |
| release verification و audit | PASS — بررسی release و audit وابستگی production موفق شدند |
| artifact integrity | PASS — hashهای local/staged/active برای index، JavaScript و CSS تطبیق دارند و markerهای CSS تراز وسط در asset عمومی فعال موجود است |
| production deployment | PASS — release `release-20260917-admin-ai-usage-center` فعال و rollback backup نگهداری شده؛ public application/PWA/health smoke با HTTP 200 پاسخ داد |
| click-through احراز‌شده | NOT_RUN — session administrator در این checkpoint استفاده نشد؛ source، build، hash و public smoke بررسی شد |

نتیجه release: PASS؛ تراز کارت‌ها و جدول مصرف توکن در پنل مدیریت اصلاح شد و قابلیت‌ها و قراردادهای backend بدون تغییر باقی ماندند.
## بازبینی نهایی پایداری hover تم آبی — 2026-09-17

بازبینی نهایی تأیید کرد که کنترل‌های تعاملی header در تم آبی، شامل ghost، انتخاب‌گر سازمان native/styled، انتخاب‌گر زبان و منوی تم، در hover/focus سطح تیره/نیمه‌شفاف و رنگ متن موردنظر را حفظ می‌کنند. ruleهای عمومی که باعث سفیدشدن کنترل می‌شدند با overrideهای scoped اصلاح شده‌اند؛ قابلیت‌های انتخاب تم، سازمان و زبان حفظ شده‌اند.

| بررسی نهایی | وضعیت |
|---|---|
| requirements و regression | PASS — ruleهای scoped و قرارداد UI برای hover/focus بررسی شد |
| تست و ساخت | PASS — ۱۵۸ تست، typecheck، lint و production build |
| artifact integrity | PASS — hashهای local/staged/active/public تطبیق دارند و markerهای CSS فعال موجود است |
| production deployment | PASS — release `release-20260917-blue-hover-stability` فعال، backup rollback و old root نگهداری، API/Nginx و health سالم |
| click-through احراز‌شده | NOT_RUN — بررسی دستی با session tenant انجام نشد؛ source، build، hash و public smoke بررسی شد |

نتیجه release: PASS؛ تغییر فقط در لایه frontend اعمال شد و هیچ route، API، schema، migration، نقش یا داده‌ای حذف یا غیرفعال نشده است.
## بازبینی نهایی ثبات متن styled-select — 2026-09-17

بازبینی مستقل تأیید کرد که تمام نمونه‌های مشترک `.styled-select-trigger` در تم آبی هنگام hover و open شدن رنگ متن پایه را حفظ می‌کنند و دیگر به سفید ناخوانا تبدیل نمی‌شوند. کنترل‌های header با override دقیق خود سطح تیره و رنگ متن روشن مناسب را نگه می‌دارند؛ انتخاب‌گرهای منو، رفتار keyboard و theme سفید بدون تغییر باقی مانده‌اند.

| بررسی نهایی | وضعیت |
|---|---|
| requirements و regression | PASS — rule عمومی trigger و override header بررسی شد |
| تست و ساخت | PASS — ۱۵۸ تست، typecheck، lint، production build، release verification و dependency audit |
| artifact integrity | PASS — hashهای local/staged/active/public برای index، JavaScript و CSS تطبیق دارند و ruleهای hover فعال‌اند |
| production deployment | PASS — release `release-20260917-styled-select-hover-stability` فعال، backup rollback و old root نگهداری، API/Nginx و health سالم |
| click-through احراز‌شده | NOT_RUN — بررسی دستی با session tenant انجام نشد؛ source، build، hash و public smoke بررسی شد |

نتیجه release: PASS؛ اصلاح فقط در لایه frontend انجام شد و هیچ route، API، schema، migration، نقش یا داده‌ای حذف یا غیرفعال نشده است.

## بازبینی نهایی جست‌وجوی درون‌کادر عنوان شغل/فرآیند FMEA — 2026-09-21

بازبینی مستقل release `release-20260921-fmea-inline-job-search` تأیید کرد که عنوان‌های بانک مشاغل، پیشنهادهای AI و عنوان سفارشی در همان dropdown فیلد «عنوان شغل / فرآیند» نمایش داده می‌شوند و پنل بزرگ قبلی دیگر در UI وجود ندارد. پاسخ معتبر AI عنوان‌ها را پس از نرمال‌سازی و حذف تکرار در `JobCatalog` سازمان ذخیره می‌کند؛ جست‌وجوی بعدی همان سازمان می‌تواند آن‌ها را برگرداند و انتخاب عنوان برای اتصال به ارزیابی همچنان صریح است. مرز tenant و مجوز `assessments.create` در routeهای خواندن و پیشنهاد حفظ شده‌اند.

| بررسی نهایی | وضعیت |
|---|---|
| requirements و regression | PASS — تست قرارداد UI و backend markerهای combobox یکپارچه، حذف پنل قدیمی و persistence عنوان AI را پوشش می‌دهند |
| تست و ساخت | PASS — ۱۶۸ تست، typecheck، production build و بررسی قرارداد API با ۵۷ مسیر frontend و ۱۰۷ route backend |
| artifact integrity | PASS — hashهای local/staged/active برای frontend، assessments، fmea-process و shared-domain تطبیق دارند |
| database/schema | PASS — جدول و route موجود `JobCatalog` با scope سازمان استفاده شد؛ migration جدید لازم نبود |
| production deployment | PASS — release فعال، rollback backup نگهداری، API/MySQL سالم، taskهای API/Nginx در وضعیت Running و smoke عمومی `/login`، `/fmea` و health با HTTP 200 |
| click-through احراز‌شده | NOT_RUN — ورود tenant در این checkpoint استفاده نشد؛ source، تست، build، hash و public/API smoke بررسی شد |

نتیجه release: PASS؛ پیشنهاد عنوان شغل/فرآیند اکنون داخل همان باکس و با ذخیره‌سازی قابل جست‌وجوی سازمانی ارائه می‌شود و قابلیت‌های قبلی FMEA حفظ شده‌اند.

## بازبینی نهایی پیمایش خودکار پنل‌ها و حرکت Enter بین فیلدها — 2026-09-21

بازبینی مستقل release `release-20260921-form-navigation-scroll` تأیید کرد که enhancer مشترک فرم در App mount شده، ترتیب کنترل‌ها بر اساس DOM و visibility محاسبه می‌شود، eventهای مصرف‌شده توسط comboboxها دست‌نخورده می‌مانند و فیلد نهایی همچنان submit عادی دارد. پنل‌های inline دارای trigger و target مشخص هستند؛ پس از بازشدن، target با reduced-motion و scroll margin مناسب نمایش داده می‌شود و focus اولیه فقط در صورت تعریف انجام می‌شود. هیچ API، schema، migration، نقش، مجوز یا داده‌ای تغییر نکرد.

| بررسی نهایی | وضعیت |
|---|---|
| requirements و regression | PASS — قرارداد UI وجود enhancer، Enter handling، targetهای داشبورد/مدیریت/اعضا و CSS scroll margin را پوشش می‌دهد |
| تست و ساخت | PASS — ۱۶۹ تست، typecheck، lint، production build و ۲۶ بررسی release |
| artifact integrity | PASS — hashهای local/staged/active/public برای index، JavaScript و CSS تطبیق دارند |
| security/data boundary | PASS — تغییر frontend-only است؛ کنترل‌های hidden/disabled نادیده گرفته می‌شوند و API/auth/data path دست‌نخورده است |
| production deployment | PASS — release فعال، rollback backup نگهداری، API/MySQL سالم، taskهای API/Nginx Running و public HTTPS smoke با HTTP 200 |
| click-through احراز‌شده | NOT_RUN — session tenant برای کلیک دستی استفاده نشد؛ source، تست، build، hash و public/API smoke بررسی شد |

نتیجه release: PASS؛ کاربر اکنون با کلیک روی triggerهای مشخص به پنل بازشده هدایت می‌شود و در فرم‌های چندفیلدی با Enter به کنترل بعدی می‌رود.

## بازبینی نهایی نام برنامه PWA — 2026-09-21

release `release-20260921-pwa-app-name` مستقل بررسی شد. manifest نصب‌شونده اکنون نام برنامه را فقط `NIVASafe` اعلام می‌کند؛ متن توضیحی از نام برنامه جدا و در فیلد مستقل description نگه داشته شده است. تغییر frontend-only است، artifact با SHA-256 تطبیق دارد و rollback backup نگهداری شده است.

| بررسی نهایی | وضعیت |
|---|---|
| manifest contract | PASS — `name` و `short_name` برابر `NIVASafe` |
| release verification | PASS — ۲۶ بررسی |
| production build | PASS |
| deployment integrity | PASS — local/staging/active manifest SHA-256 یکسان |
| public smoke | PASS — HTTP 200، `no-cache` و metadata صحیح |
| API/schema/data boundary | PASS — بدون تغییر |

نتیجه release: PASS؛ نام برنامه نصب‌شده اکنون فقط NIVASafe است.

## بازبینی نهایی مخفی‌سازی افزودن ردیف خطر در مرحله اول FMEA — 2026-09-21

release `release-20260921-fmea-hide-risk-step1` مستقل بررسی شد. کارت مستقل «افزودن ردیف خطر» در ویزارد ارزیابی FMEA با شرط `wizardStep === 2` محدود شده است؛ بنابراین مرحله ۱ «اطلاعات فرآیند» دیگر این بخش یا فضای رزروشده آن را نمایش نمی‌دهد و مرحله ۲ «مرور و ثبت» جریان موجود ردیف خطر را حفظ می‌کند. این تغییر frontend-only است و API، schema، migration، نقش‌ها، مجوزها و داده‌های موجود را تغییر نداده است.

| بررسی نهایی | وضعیت |
|---|---|
| source/UI contract | PASS — کارت مستقل افزودن ردیف خطر فقط در `wizardStep === 2` render می‌شود و مؤلفه inline ردیف مرور نیز step-2-only باقی مانده است |
| تست و ساخت | PASS — ۱۶۹ تست، typecheck، lint، production build، بررسی قرارداد API و release verification با ۲۶ بررسی |
| artifact integrity | PASS — hashهای local/staged/active برای index، JavaScript و CSS تطبیق دارند و rollback backup نگهداری شده است |
| security/data boundary | PASS — تغییر frontend-only است؛ API، احراز هویت، مجوز، schema و مسیر داده دست‌نخورده باقی مانده‌اند |
| production deployment | PASS — release فعال، API و MySQL سالم، taskهای API/Nginx در وضعیت Running و smoke عمومی HTTPS موفق است |
| click-through احراز‌شده | NOT_RUN — session tenant برای کلیک دستی استفاده نشد؛ source، تست، build، hash و public/API smoke بررسی شد |

artifact فعال در `C:\inetpub\nivasafe\app-com` و rollback backup در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-hide-risk-step1` قرار دارد. smoke عمومی برای `/`، `/login`، `/projects`، `/fmea`، `/api/v1/health`، manifest، service worker و bundleهای hash‌شده HTTP 200 بود؛ مسیر محافظت‌شده تحلیل تصویر بدون احراز هویت HTTP 401 مورد انتظار برگرداند.

## بازبینی نهایی دکمه ارزیابی‌های ثبت‌شده FMEA — 2026-09-21

release `release-20260921-fmea-registered-assessments-button` مستقل بررسی شد. دکمه «ارزیابی‌های ثبت‌شده» در ردیف `page-header` قرار گرفته است. در step 1 «اطلاعات فرآیند»، بخش ثبت‌شده تا زمان فعال‌سازی دکمه در DOM render نمی‌شود؛ پس از کلیک، بخش در همان `/fmea` ظاهر و با پیمایش نرم به آن منتقل می‌شود. در step 2 و مراحل بعدی، بخش ثبت‌شده به‌صورت عادی باقی می‌ماند. این تغییر frontend-only است و API، schema، migration، نقش‌ها، مجوزها و داده‌ها را تغییر نداده است.

| بررسی نهایی | وضعیت |
|---|---|
| source/UI contract | PASS — `page-header` شامل دکمه `fmea-registered-button` با `aria-controls`/`aria-expanded` است و شرط `wizardStep !== 1 || registeredAssessmentsOpen` بخش ثبت‌شده را کنترل می‌کند |
| reveal و scroll همان صفحه | PASS — handler دکمه، target `fmea-registered-assessments` را در صورت مخفی بودن reveal و سپس با `scrollIntoView` نمایش می‌دهد |
| تست و ساخت | PASS — ۱۶۹ تست، typecheck، lint، production build، بررسی قرارداد API و release verification با ۲۶ بررسی |
| artifact integrity | PASS — hashهای local/staged/active برای index، JavaScript و CSS تطبیق دارند و rollback backup نگهداری شده است |
| security/data boundary | PASS — تغییر frontend-only است؛ API، احراز هویت، مجوز، schema و مسیر داده دست‌نخورده باقی مانده‌اند |
| production deployment | PASS — release فعال، API و MySQL سالم، taskهای API/Nginx در وضعیت Running و smoke عمومی HTTPS موفق است |
| click-through احراز‌شده | NOT_RUN — session tenant برای کلیک دستی استفاده نشد؛ source، تست، build، hash، bundle marker و public/API smoke بررسی شد |

artifact فعال در `C:\inetpub\nivasafe\app-com` و rollback backup در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-registered-assessments-button` قرار دارد. smoke عمومی برای `/`، `/login`، `/projects`، `/fmea`، manifest، service worker و `/api/v1/health` با HTTP 200 موفق شد؛ bundle عمومی شامل markerهای دکمه و مقصد ارزیابی‌های ثبت‌شده است.

## بازبینی نهایی جست‌وجوی سریع بانک مشاغل FMEA — 2026-09-21

release `release-20260921-fmea-job-catalog-search` مستقل بررسی شد. فیلد «عنوان شغل / فرآیند» با بازشدن خود، بانک سازمانی/عمومی `JobCatalog` را یک‌بار دریافت می‌کند و گزینه‌ها را در سمت کاربر بر اساس عنوان فارسی، انگلیسی، واحد و کلیدواژه فیلتر می‌کند. با تغییر متن جست‌وجو، نتایج از state جاری محاسبه می‌شوند و درخواست‌های تکراری AI برای هر کلید حذف شده‌اند؛ عنوان سفارشی و انتخاب صریح عنوان همچنان حفظ شده‌اند.

| بررسی نهایی | وضعیت |
|---|---|
| source/UI contract | PASS — بارگذاری یک‌باره با limit=200، فیلتر محلی نرمال‌شده، reset امن cache با تغییر سازمان و حذف فراخوان زنده `mode=job-titles` از combobox تأیید شد |
| database/migration | PASS — migration `202609210002_expand_fmea_job_catalog` با MariaDB اعمال و در `_prisma_migrations` ثبت شد؛ ۳۸ عنوان عمومی فعال و دو index ترکیبی تأیید شد |
| تست و ساخت | PASS — ۱۶۹ تست، typecheck، lint، production build، API contract با ۵۷ مسیر frontend و ۱۰۷ route backend و release verification با ۲۶ بررسی |
| artifact integrity | PASS — hashهای local/staged/active برای frontend، `assessments.js` و migration تطبیق دارند |
| security/data boundary | PASS — route بانک همچنان احراز هویت و permission `assessments.create` را الزام می‌کند؛ بدون احراز هویت HTTP 401 برمی‌گرداند و cache با تغییر سازمان پاک می‌شود |
| production deployment | PASS — frontend و backend فعال، rollback backup نگهداری، API/MySQL سالم، taskهای API/Nginx Running و تنها یک listener روی `127.0.0.1:5044` |
| public smoke | PASS — `/`، `/login`، `/projects`، `/fmea`، manifest، service worker، assetهای hash‌شده و `/api/v1/health` با HTTP 200 |
| click-through احراز‌شده | NOT_RUN — session tenant برای کلیک دستی استفاده نشد؛ source، تست، build، hash، migration/data verification و public/API smoke بررسی شد |

نتیجه release: PASS؛ جست‌وجوی عنوان شغل/فرآیند اکنون database-backed، سریع و بدون مصرف AI در هر تغییر عبارت است و مسیرهای دیگر FMEA و مرزهای tenant حفظ شده‌اند. artifact فعال در `C:\inetpub\nivasafe\app-com` و rollback backup در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-job-catalog-search` قرار دارد.

## بازبینی نهایی درج مستقیم شرح فعالیت با AI — 2026-09-21

release `release-20260921-fmea-description-direct-input` مستقل بررسی شد. دکمه «اصلاح متن با AI» پس از پاسخ معتبر، مقدار را مستقیماً در textarea شرح کوتاه فعالیت می‌نویسد و فوکوس را به همان فیلد برمی‌گرداند؛ پنل ثانویه پیشنهاد متن و `fmea-job-ai-actions` در source و bundle عمومی وجود ندارند. بانک عنوان شغل/فرآیند همچنان database-backed است و این انتشار frontend-only بود.

| بررسی نهایی | وضعیت |
|---|---|
| source/UI contract | PASS — direct `setActivityDescription(suggestion)`, focus بعد از درج، حذف پنل پیشنهاد و نبود `fmea-job-ai-actions` تأیید شد |
| تست و ساخت | PASS — ۱۶۹ تست، typecheck، lint، production build، بررسی قرارداد API و release verification با ۲۶ بررسی |
| artifact integrity | PASS — hashهای local/staged/active برای index، JavaScript و CSS تطبیق دارند و rollback backup نگهداری شده است |
| security/data boundary | PASS — فقط frontend تغییر کرد؛ API، احراز هویت، مجوز، schema، migration و داده‌ها دست‌نخورده باقی ماندند |
| production deployment | PASS — release فعال، API/MySQL سالم، taskهای API/Nginx در وضعیت Running و public HTTPS smoke موفق است |
| public bundle markers | PASS — `fmea-description-suggestion` و `fmea-job-ai-actions` در bundle فعال یافت نشدند |
| authenticated click-through | NOT_RUN — session tenant برای کلیک دستی استفاده نشد؛ source، تست، build، hash و public smoke بررسی شد |

نتیجه release: PASS؛ اصلاح شرح فعالیت اکنون بدون بازکردن باکس پیشنهاد، مستقیماً در همان input اعمال می‌شود و گزینه‌های بانک مشاغل بدون مصرف AI در جست‌وجوی عنوان باقی می‌مانند. artifact فعال در `C:\inetpub\nivasafe\app-com` و rollback backup در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-description-direct-input` قرار دارد.

## بازبینی نهایی خودکارسازی metadata مرحله مرور و ثبت FMEA — 2026-09-21

release `release-20260921-fmea-review-auto-metadata` مستقل بررسی شد. در مرحله دوم FMEA، ورودی‌های بزرگ و قابل‌ویرایش کد ارزیابی و دامنه دیگر نمایش داده نمی‌شوند؛ کد برای ارزیابی جدید پایدار تولید می‌شود و برای draft/ویرایش بازیابی می‌گردد، دامنه از پروژه و عنوان شغل/فرآیند مشتق می‌شود و مقدار ذخیره‌شده قبلی حفظ می‌گردد. hidden inputهای نام‌دار، سازگاری FormData، autosave و API را نگه داشته‌اند.

| بررسی نهایی | وضعیت |
|---|---|
| source/UI contract | PASS — مرحله دوم فقط hidden metadata inputs را render می‌کند و کنترل‌های visible code/scope حذف شده‌اند |
| تست و ساخت | PASS — ۱۶۹ تست، typecheck، lint، production build، بررسی قرارداد API و release verification با ۲۶ بررسی |
| artifact integrity | PASS — hashهای local/staged/active برای index، JavaScript و CSS تطبیق دارند و backup نسخه قبلی نگهداری شده است |
| API/schema/data boundary | PASS — انتشار frontend-only است و API، schema، migration، احراز هویت، مجوز و داده‌ها تغییر نکرده‌اند |
| production deployment | PASS — release فعال، API/MySQL سالم، taskهای API/Nginx در وضعیت Running و public HTTPS smoke برای application/PWA/health با HTTP 200 |
| public bundle marker | PASS — index عمومی bundle جدید را reference می‌کند و marker `data-fmea-auto-metadata` در bundle فعال موجود است |
| authenticated click-through | NOT_RUN — session tenant برای کلیک دستی استفاده نشد؛ source، تست، build، hash و public smoke بررسی شد |

نتیجه release: PASS؛ مرحله دوم FMEA بدون اشغال فضای اضافی توسط این دو input، metadata لازم را به‌صورت خودکار و سازگار با مسیر ثبت ارزیابی ارسال می‌کند. artifact فعال در `C:\inetpub\nivasafe\app-com` و rollback backup در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-review-auto-metadata\app-com` قرار دارد.

## بازبینی نهایی خودکارسازی پنج ردیف جزئیات کامل FMEA — 2026-09-21

release `release-20260921-fmea-report-autocreate` مستقل بررسی شد. در جدول «جزئیات کامل FMEA»، اگر داده‌ای وجود نداشته باشد، درخواست جزئیات AI/context پنج ردیف محدودشده را به‌صورت خودکار در ارزیابی ثبت می‌کند؛ پس از reload، همان جدول اصلی آن‌ها را نشان می‌دهد و هر ردیف از مسیرهای فعلی مشاهده و ویرایش قابل تغییر است. ایجاد خودکار فقط برای کاربر دارای مجوز و در محدوده سازمان ارزیابی انجام می‌شود و برای جلوگیری از تکرار، داخل transaction دوباره شمارش ردیف‌ها بررسی می‌شود.

| بررسی نهایی | وضعیت |
|---|---|
| source/UI contract | PASS — `autoCreate` فقط برای جدول خالی و کاربر قابل‌ویرایش ارسال می‌شود؛ پس از `createdCount`، گزارش reload می‌شود و پنج ردیف واقعی در جدول عادی نمایش داده می‌شوند |
| server calculation/data integrity | PASS — متن‌ها bounded/sanitized هستند و S/O/D، RPN و risk level در backend با آستانه‌های سازمان محاسبه می‌شوند؛ persistence اتمیک و idempotent است |
| test and build | PASS — ۱۷۰ تست، typecheck، lint، production build، بررسی قرارداد API و release verification با ۲۶ بررسی |
| artifact integrity | PASS — hashهای local/staged/active برای frontend، backend reports/fmea-report و shared domain تطبیق دارند و rollback backup نگهداری شده است |
| schema/migration | PASS — migration جدیدی لازم نیست و schema موجود `FmeaItem` استفاده می‌شود |
| production deployment | PASS — release فعال، API/MySQL سالم، taskهای API/Nginx در وضعیت Running و public HTTPS/PWA/health smoke موفق است |
| authenticated click-through | NOT_RUN — session tenant برای کلیک دستی استفاده نشد؛ source، تست، build، hash، server health و public smoke بررسی شد |

نتیجه release: PASS؛ جدول جزئیات کامل FMEA دیگر در حالت خالی باقی نمی‌ماند و پنج ردیف اولیه قابل ویرایش را به‌صورت خودکار دریافت می‌کند. artifact فعال در `C:\inetpub\nivasafe\app-com` و rollback backup در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-report-autocreate` قرار دارد.

## بازبینی نهایی محدودیت پیشنهادهای فرآیند FMEA — 2026-09-21

release `release-20260921-fmea-suggestion-limits` مستقل بررسی شد. هر دسته از `fmea-suggestion-board` حداکثر ۱۰ پیشنهاد نمایش می‌دهد و در هر دسته حداکثر ۵ مورد قابل انتخاب یا افزودن دستی است. کنترل frontend برای تجربه کاربری و اعتبارسنجی backend برای جلوگیری از دور زدن محدودیت هر دو فعال هستند؛ داده‌های legacy بیش از سقف حذف یا بی‌صدا کوتاه نمی‌شوند و فقط در مسیر کاهش مقدار قابل ویرایش باقی می‌مانند.

| بررسی نهایی | وضعیت |
|---|---|
| source/UI contract | PASS — ثابت‌های سقف ۱۰/۵، شمارنده انتخاب، disabled state و محدودسازی انتخاب خودکار در source و تست قرارداد frontend تأیید شد |
| server validation/data integrity | PASS — parser/catalog/prompt تا ۱۰ پیشنهاد محدود هستند و create/update API سقف ۵ انتخاب را enforce می‌کنند؛ legacy values بدون حذف حفظ می‌شوند |
| test and build | PASS — ۱۷۱ تست، typecheck، lint، production build، بررسی قرارداد API و release verification با ۲۶ بررسی |
| artifact integrity | PASS — hashهای local/staged/active برای index، JavaScript، CSS، `assessments.js`، `fmea-process.js` و shared domain تطبیق دارند و rollback backup نگهداری شده است |
| schema/migration | PASS — migration جدیدی لازم نیست و schema موجود FMEA کافی است |
| production deployment | PASS — release فعال، API/MySQL سالم، taskهای API/Nginx در وضعیت Running و public HTTPS/PWA/health smoke برای مسیرهای اصلی HTTP 200 |
| security review | PASS — محدودیت در مرز server اعمال شده، route بدون احراز هویت HTTP 401 می‌دهد و secret جدیدی وارد source/build نشده است |
| authenticated click-through | NOT_RUN — session tenant برای کلیک دستی استفاده نشد؛ source، تست، build، hash، server health و public smoke بررسی شد |

نتیجه release: PASS؛ پنل پیشنهادهای فرآیند اکنون تا ۱۰ مورد در هر دسته نشان می‌دهد و انتخاب هر دسته را به ۵ مورد محدود می‌کند. artifact فعال در `C:\inetpub\nivasafe\app-com` و rollback backup در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-suggestion-limits` قرار دارد.

## بازبینی نهایی کنترل فشرده تصویر فرآیند FMEA — 2026-09-21

release `release-20260921-fmea-process-image-compact` مستقل بررسی شد. dropzone تصویر فرآیند/محیط کار اکنون با ارتفاع ورودی‌های فرآیند هم‌تراز است؛ helper copy اختیاری حذف شده و بررسی تصویر با AI فقط از مسیر خودکار پس از upload انجام می‌شود. قابلیت چندتصویری، بررسی authenticated و درج ردیف‌های خطر قابل ویرایش حفظ شده‌اند.

| بررسی نهایی | وضعیت |
|---|---|
| source/UI contract | PASS — helper `fmeaProcessImageHint` و action دستی بررسی تصویر از markup حذف شده‌اند؛ input چندتصویری و handler تحلیل خودکار باقی مانده‌اند و dropzone حداقل ارتفاع ۴۷px دارد |
| test and build | PASS — ۱۷۱ تست، typecheck، lint، production build، بررسی قرارداد API، release verification با ۲۶ بررسی، audit وابستگی و `git diff --check` |
| artifact integrity | PASS — hashهای local/staged/active برای index، JavaScript و CSS تطبیق دارند و rollback backup نگهداری شده است |
| API/schema/data boundary | PASS — انتشار فقط frontend است؛ API، احراز هویت، مجوز، schema، migration و ذخیره‌سازی تصویر تغییر نکرده‌اند |
| security review | PASS — اعتبارسنجی فایل و route محافظت‌شده حفظ شده است؛ endpoint تحلیل تصویر بدون احراز هویت HTTP 401 برگرداند و secret جدیدی در bundle وجود ندارد |
| production deployment | PASS — release فعال، API/MySQL سالم، taskهای API/Nginx در وضعیت Running و public HTTPS/PWA/health smoke موفق است |
| authenticated click-through | NOT_RUN — session tenant برای کلیک دستی استفاده نشد؛ source، تست، build، hash، bundle marker، server health و public smoke بررسی شد |

نتیجه release: PASS؛ باکس تصویر فرآیند دیگر فضای اضافی ندارد و متن توضیحی یا دکمه بررسی دستی نمایش داده نمی‌شود، در حالی که بررسی خودکار پس از upload فعال باقی مانده است. artifact فعال در `C:\inetpub\nivasafe\app-com` و rollback backup در `C:\ProgramData\NIVASafe\backups\release-20260921-fmea-process-image-compact\app-com` قرار دارد.

## بازبینی نهایی پس‌زمینه سفید لوگوی عنوان سایت — 2026-09-21

release `release-20260921-favicon-white-background` مستقل بررسی شد. favicon عنوان تب مرورگر اکنون به `/favicon-white.svg` اشاره می‌کند؛ SVG شامل همان نشان NIVASafe روی یک پس‌زمینه سفید گرد است و به‌صورت self-contained با data URI تحویل می‌شود. service worker به v14 ارتقا یافته و asset را در shell خود cache می‌کند تا clientهای قدیمی نیز نسخه جدید را دریافت کنند.

| بررسی نهایی | وضعیت |
|---|---|
| source/UI contract | PASS — index لینک favicon سفید را دارد و تست PWA وجود مستطیل سفید و data URI را تأیید می‌کند |
| test and build | PASS — ۱۷۲ تست، typecheck، lint، production build، بررسی قرارداد API و `verify:release` با ۲۶ بررسی |
| asset integrity | PASS — hashهای local/staged/active برای index، favicon و service worker برابر هستند |
| security review | PASS — asset self-contained است، secret یا مسیر خارجی جدیدی ندارد و هیچ API، auth، permission یا data path تغییر نکرده است |
| production deployment | PASS — release فعال، rollback backup موجود، API/MySQL سالم، taskهای API/Nginx Running و public HTTPS/PWA/health smoke موفق |
| public favicon | PASS — `/favicon-white.svg` با HTTP 200 و MIME نوع `image/svg+xml` تحویل شد و marker پس‌زمینه سفید در پاسخ عمومی وجود دارد |

نتیجه release: PASS؛ لوگوی نمایش‌داده‌شده در تب مرورگر اکنون روی زمینه سفید دیده می‌شود و نسخه فعال در `C:\inetpub\nivasafe\app-com` با rollback در `C:\ProgramData\NIVASafe\backups\release-20260921-favicon-white-background\app-com` نگهداری شده است.

## بازبینی نهایی امتیاز نیروی واردشده RULA — 2026-09-22

release `release-20260922-rula-force-score` مستقل بررسی شد. گزینه‌های نیروی واردشده مقدارهای ۰، ۱، ۲ و ۳ را صریحاً نشان می‌دهند و `calculateRula` در shared-domain که هم preview و هم API از آن استفاده می‌کنند، مقدار انتخابی را مستقیماً به امتیاز نهایی اضافه می‌کند؛ سقف ۷ و سطوح اقدام موجود حفظ شده‌اند.

| بررسی نهایی | وضعیت |
|---|---|
| source/domain contract | PASS — force در بازه ۰ تا ۳ اعتبارسنجی می‌شود، امتیاز baseline به‌علاوه adjustment محاسبه می‌شود و trace سهم muscle-use/force را جدا ثبت می‌کند |
| frontend contract | PASS — هر چهار گزینه مقدار امتیاز محلی‌سازی‌شده را در selector نمایش می‌دهند |
| test and build | PASS — ۱۹۱ تست، build تولیدی، typecheck مستقیم، بررسی قرارداد API، release verification با ۲۶ بررسی، audit وابستگی و `git diff --check` |
| data/API boundary | PASS — مسیرهای POST/PATCH همان domain calculation server-authoritative را استفاده می‌کنند؛ migration و تغییر destructive داده لازم نبود |
| artifact integrity | PASS — hashهای local/staged/active برای frontend، backend و shared-domain تطبیق دارند و rollback backup نگهداری شده است |
| production deployment | PASS — API/MySQL سالم، taskهای API/Nginx Running، یک listener مورد انتظار، و public HTTPS/PWA/health smoke موفق |

نتیجه release: PASS؛ امتیاز انتخاب نیروی واردشده اکنون در پیش‌نمایش زنده و ثبت/ویرایش server-authoritative RULA یکسان و قابل ردیابی اعمال می‌شود.

## بازبینی نهایی معیار استفاده تکراری از عضله RULA — 2026-09-22

release `release-20260922-rula-muscle-score` مستقل بررسی شد. کنترل مرحله دوم RULA اکنون دو معیار صریح از مرجع ارزیابی را نمایش می‌دهد: پوسچر عمدتاً استاتیک یا بیش از چهار بار در دقیقه تکرارشونده با امتیاز ۱، و پوسچر نه استاتیک و نه به‌شدت تکراری با امتیاز صفر. انتخاب در draft/FormData حفظ می‌شود و `calculateRula` در preview و مسیرهای server-authoritative همان adjustment را به امتیاز نهایی اعمال می‌کند.

| بررسی نهایی | وضعیت |
|---|---|
| source/domain contract | PASS — selector بازشونده، معیارهای فارسی/انگلیسی، مقادیر ۱/۰، hidden input و تبدیل boolean به adjustment در shared-domain تأیید شد |
| frontend regression | PASS — گزینه‌ها، نبود checkbox قدیمی، بازیابی draft و نمایش امتیاز انتخاب‌شده در تست قرارداد frontend پوشش داده شد |
| test and build | PASS — ۱۹۲ تست، build تولیدی، typecheck مستقیم، بررسی قرارداد API، release verification با ۲۶ بررسی، audit وابستگی و `git diff --check` |
| data/API boundary | PASS — قرارداد موجود `inputs.muscleUse` حفظ شد؛ migration یا تغییر destructive داده لازم نبود و score calculation در API همچنان server-authoritative است |
| artifact integrity | PASS — hashهای local/staged/active برای index، JavaScript، CSS، backend و shared-domain تطبیق دارند و rollback backup نگهداری شده است |
| production deployment | PASS — API/MySQL سالم، taskهای API/Nginx Running، یک listener مورد انتظار و public HTTPS/PWA/health smoke موفق است |

نتیجه release: PASS؛ استفاده تکراری از عضله دیگر یک تیک مبهم نیست، معیار امتیازدهی برای کاربر قابل مشاهده و انتخاب است و امتیاز ۱ یا صفر در امتیاز نهایی RULA محاسبه می‌شود.

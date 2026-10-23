# بررسی مستند ارائه‌دهندهٔ تحلیل تصویر / Image-provider evidence review

| مشخصه / Field | مقدار / Value |
|---|---|
| Project | NIVASafe — RULA |
| Gregorian date / میلادی | 2026-10-22 |
| Jalali date / شمسی | 1405-07-30 — converted using Node Intl Persian calendar in America/Los_Angeles |
| Research scope | Public primary sources, existing repository policy and synthetic-test evidence; no credentials, user photos or provider inference requests |
| Actual API | `https://api.arvancloudai.ir/v1/chat/completions` |
| Result | TECHNICAL_ROUTE_VERIFIED_PREVIOUSLY; GATEWAY_PROCESSING_TERMS_UNVERIFIED |
| Authorization effect | None — this research is not provider approval or a finding that the intended use is prohibited |

## فارسی

### نتیجهٔ اجرایی

تصمیم فعلی مالک، رضایت مستقل و اختیاری هر کاربر را مقرر می‌کند؛ این تصمیم به تأیید دستی کاربر‌به‌کاربر یا سازمان‌به‌سازمان نیاز ندارد. شواهد عمومیِ بررسی‌شده چنین تأیید جداگانه‌ای را الزامی نکرده‌اند. با این حال، نسبت قراردادی همین درگاه با اسناد آروان و شرایط دقیق پردازش عکس در این حساب هنوز از شواهد قابل دسترس احراز نشد. نبود این شواهد، اثبات ممنوعیت حقوقی استفاده یا نبود قرارداد خارج از مخزن نیست.

اصلاح رضایت، ثبت Audit، مسیر ارسال و تست‌های مصنوعی مستقل می‌توانند ادامه یابند. انتشار عمومی عکس واقعی نباید با تبدیل یک گزینهٔ خالی به «تأییدشده» صرفاً برای عبور از خطا انجام شود. مانع باقی‌مانده، شرایط پردازشِ قابل استناد همین سرویس است؛ امضای تکراری مدیریت برای کاربران و سازمان‌ها نیست.

### یافته‌های قابل استناد

| مرجع | مشاهده | حدود استناد |
|---|---|---|
| [مستندات رسمی ساخت Endpoint](https://docs.arvancloud.ir/fa/aiaas/api-usage/) — بخش استفاده از API و مدیریت Endpoint | ایجاد نشانی اختصاصی، هدر نمونهٔ `Authorization: apikey`، ذخیره‌نشدن دادهٔ کاربر در زیرساخت و نگهداری متریک‌ها تا ۳۰ روز شرح داده شده است. | در متن خوانده‌شده، `arvancloudai.ir` نام برده نشده است. این صفحه مهلت نگهداری عکس، لاگ محتوایی، نسخهٔ پشتیبان یا حذفِ همین درگاه را احراز نمی‌کند. |
| [معرفی رسمی AIaaS](https://docs.arvancloud.ir/fa/aiaas/) — محدودیت‌ها | تاریخچهٔ مکالمه و تعامل Stateful نگهداری نمی‌شود؛ امکان Fine-Tune/Train مدل برای کاربر فعلاً ارائه نمی‌شود. | این محدودیت محصول، تضمین عدم استفادهٔ آموزشی از داده نزد تمام طرف‌های مسیر همین درگاه نیست. |
| [سیاست حریم خصوصی انگلیسی](https://www.arvancloud.ir/en/legal/privacy-policy) — مقدمه | داده‌هایی که مشتری هنگام استفاده از سرویس پردازش می‌کند، از دامنهٔ این سیاست خارج شده‌اند. | سیاست حساب/وب‌سایت، به‌تنهایی شرایط پردازش عکس‌های NIVASafe را تعیین نمی‌کند. |
| [سیاست حریم خصوصی فارسی](https://www.arvancloud.ir/fa/legal/privacy-policy) — نقش‌ها و اطلاعات گردآوری‌شده | بین نقش کنترل‌کننده و پردازشگر تفاوت گذاشته شده؛ نگهداری در ایران همراه با احتمال انتقال جهانی ذکر شده است. | متن فارسی و انگلیسی یکسان نیستند. محل پردازشِ مدل و طرف‌های دریافت‌کنندهٔ همین درگاه از این متن تعیین نمی‌شود. |
| [شرایط عمومی](https://www.arvancloud.ir/en/legal/terms) — بندهای ۲۰، ۲۵ و ۳۹ | اختیار ارائهٔ داده و رعایت حقوق اشخاص ثالث بر عهدهٔ مشتری است؛ به DPA ارجاع شده است. | اثبات انطباق این شرایط با قرارداد/حساب `api.arvancloudai.ir` در دسترس نیست. |
| [DPA رسمی](https://www.arvancloud.ir/en/legal/data-processing-agreement) — ۱٫۲، ۷٫۶ و پیوست ۳ | کاربرد مشروط است. حذف پس از غیرفعال‌سازی، استثنای قانونی/پشتیبان و نگهداری در مدت قرارداد آمده است؛ فهرست پردازشگران فرعی به درخواست ارائه می‌شود. | تضمین حذف فوری پس از لغو رضایت یا مهلت ثابت برای عکسِ این API از آن به دست نمی‌آید. |

### بررسی مستقیم دامنهٔ درگاه

در 2026-10-22، درخواست GET عمومی و بدون احراز هویت به ریشهٔ `https://arvancloudai.ir`، ریشهٔ `https://api.arvancloudai.ir`، و `robots.txt` و `sitemap.xml` دامنهٔ نخست، همگی HTTP 404 بازگرداندند. این مشاهده محدود به همین چهار نشانی است و اثبات نبود سند در پنل احرازشده نیست. هیچ API تحلیل یا نشانی با دادهٔ کاربر فراخوانی نشد.

### قرارداد فنیِ اثبات‌شدهٔ NIVASafe

`backend/src/ai-provider.ts` مدل ارزیابی `GPT-5-Mini` و هدر `Authorization: Bearer …` را برای مسیر آروان پیاده می‌کند. شواهد `reports/evidence/rula-root-repair-20261021-01/staging-result.json` و `provider.jsonl` موفقیت قبلی تحلیل مصنوعی RIGHT/LEFT/BOTH را با همین مدل ثبت می‌کنند. چهار تلاش از سقف پایدار شش تلاش استفاده شده بود. این بررسی درخواست پولی تازه‌ای نفرستاد.

تفاوت روش احراز هویت مستندات عمومی با مسیر موفق پروژه دلیل تغییر هدر موفق به `apikey` نیست. اتصال فنی و نام پاسخ مدل، هویت حقوقیِ دریافت‌کننده یا قرارداد نگهداری تصویر را اثبات نمی‌کنند.

### فقط موارد واقعاً حل‌نشده

1. مرجع قرارداد/شرایط قابل اعمال به همین حساب و endpoint، همراه با هویت طرف دریافت‌کننده، و مجازبودن ارائهٔ تحلیل تصاویر کاربران NIVASafe به کاربران نهایی.
2. شرایط همین مسیر دربارهٔ نگهداری و حذف عکس، متن همراه، خروجی و لاگ/پشتیبان؛ طرف‌های دریافت‌کننده/پردازشگران فرعی، محل پردازش و استفادهٔ آموزشی. شرط «متریک ۳۰ روزه» نباید به عکس‌ها تعمیم داده شود.
3. سیاست واقعی نگهداری و حذف NIVASafe، شامل نسخه‌های پشتیبان، و مبنای مناسب پردازش عکس اشخاص ثالث. بارگذار نمی‌تواند از طرف صاحب تصویرِ دیگر صرفاً با تیک رضایت حساب خودش حق ایجاد کند.

مدرک حساب، قرارداد یا پاسخ رسمیِ مرتبط با همین endpoint می‌تواند موارد ۱ و ۲ را روشن کند؛ الزام تازه‌ای برای امضای مجزا به‌ازای کاربران/سازمان‌ها از این پژوهش ایجاد نمی‌شود. هیچ پیام به ارائه‌دهنده ارسال نشد. پس از احراز شرایط، یک رکورد ارائه‌دهنده در سطح پلتفرم با مرجع، دامنه، نسخه، زمان و نتیجهٔ بررسی قابل ثبت است؛ سپس رضایت معتبر و دسترسی همان کاربر برای هر ارسال مستقل بررسی می‌شود.

## English

### Operational conclusion

The owner's current decision establishes separate optional consent for each user. It does not require manual owner approval for every user or organization. The public sources reviewed did not establish such a requirement. However, the contractual attribution of this gateway and its account-specific image-processing conditions were not established from accessible evidence. Missing evidence does not prove that the intended use is unlawful or that no contract exists outside the repository.

Consent, Audit, transfer-path repairs and isolated synthetic testing can proceed. Public transfer of real photos must not be enabled by relabeling an empty setting as verified simply to pass a gate. The outstanding condition concerns substantiated processing terms for the actual service, not recurring managerial signatures for users or organizations.

### Attributable findings

| Source | Observation | Evidence boundary |
|---|---|---|
| [Official endpoint documentation](https://docs.arvancloud.ir/fa/aiaas/api-usage/) — API and endpoint management | Describes dedicated endpoints, sample `Authorization: apikey`, no customer-data storage on infrastructure and 30-day metrics. | Retrieved text does not name `arvancloudai.ir` or establish this gateway's image/log/backup deletion terms. |
| [Official AIaaS overview](https://docs.arvancloud.ir/fa/aiaas/) — limitations | No stored conversation/stateful history; customer fine-tuning/training unavailable. | Product functionality does not establish a contractual no-training commitment for all recipients in this gateway's path. |
| [English privacy policy](https://www.arvancloud.ir/en/legal/privacy-policy) — introduction | Excludes data customers process using the services. | Website/account privacy terms alone do not determine NIVASafe photo processing. |
| [Persian privacy policy](https://www.arvancloud.ir/fa/legal/privacy-policy) — roles and collected information | Distinguishes controller/processor roles; mentions storage in Iran and possible worldwide transfers. | Persian/English texts differ; this does not identify the gateway model's processing location or recipients. |
| [General terms](https://www.arvancloud.ir/en/legal/terms) — sections 20, 25, 39 | Customer authority and third-party rights are required; DPA referenced. | Applicability to the actual gateway account remains unverified. |
| [Official DPA](https://www.arvancloud.ir/en/legal/data-processing-agreement) — 1.2, 7.6, Schedule 3 | Conditional scope; deletion on deactivation with legal/backup exceptions; agreement-duration retention; subprocessors on request. | No immediate deletion on consent withdrawal or fixed photo-deletion deadline is established for this API. |

### Direct public gateway observation

On 2026-10-22, unauthenticated public GETs to `https://arvancloudai.ir`, `https://api.arvancloudai.ir`, and the first domain's `robots.txt` and `sitemap.xml` all returned HTTP 404. This finding covers only these four URLs and does not establish that no authenticated account document exists. No inference API or user-data request was made.

### Previously verified NIVASafe technical contract

`backend/src/ai-provider.ts` uses assessment model `GPT-5-Mini` with `Authorization: Bearer …` for the Arvan route. `reports/evidence/rula-root-repair-20261021-01/staging-result.json` and `provider.jsonl` record prior successful synthetic RIGHT/LEFT/BOTH analysis using that model. Four attempts had been consumed under a persistent six-attempt ceiling. This research made no new paid request.

The generic documentation's different authentication example is not a reason to replace the successful gateway Bearer header. Technical connectivity and a returned model name do not establish the legal recipient or image-retention contract.

### Actual unresolved conditions only

1. Applicable account/endpoint contract or terms, actual receiving entity, and permission to provide NIVASafe users' image-analysis service to end users.
2. This route's image/context/output/log/backup retention and deletion, receiving parties/subprocessors, processing locations and training use. The 30-day metrics statement must not be generalized to photos.
3. NIVASafe's actual retention/deletion policy including backups, and an appropriate basis for third-party photos. An uploader's own account-consent checkbox cannot create another photo subject's authorization.

An account document, contract or official endpoint-specific response can establish items 1 and 2. This research does not add per-user/per-organization signature requirements. No provider contact was made. Once the conditions are established, one platform-wide provider record can identify its evidence reference, scope, version, review time and outcome; each transfer then separately checks the current user's valid consent and access.

## Preservation and verification

- Existing provider-approval and legal records were read, not rewritten.
- Only this research file was added by this task; no source, environment, release or runtime setting changed.
- No API key, authorization token, private image or authenticated browser state was accessed.
- No claim that Production processing prerequisites passed is made.

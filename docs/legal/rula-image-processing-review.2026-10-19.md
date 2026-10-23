# بررسی پردازش تصاویر RULA / RULA image-processing review

| مشخصه / Field | مقدار / Value |
|---|---|
| تاریخ میلادی / Gregorian | 2026-10-19 |
| تاریخ شمسی / Jalali | 1405-07-27 — verified with Intl Persian calendar |
| وضعیت / Status | CODE IMPLEMENTED; PLATFORM AUTHORIZATION NOT VERIFIED |
| دامنه / Scope | All eligible NIVASafe organizations; no organization allowlist |
| درگاه واقعی / Actual gateway | https://api.arvancloudai.ir/v1/chat/completions |
| مدل / Model | Requested GPT-5-Mini; previously observed gpt-5-mini-2025-08-07 |

## یافته‌های فارسی

در مخزن، صفحهٔ منتشرشدهٔ مستقل برای شرایط پردازش تصویر یا سند تأیید مالک شناسایی نشد. اسناد مهندسی موجود، بسته‌بودن دروازهٔ سطح پلتفرم را ثبت کرده‌اند؛ تنظیم فعال نیز خالی است. نبود سند در این بررسی، اثبات نبود قرارداد خارج از پروژه نیست. وب‌سایت عمومی NIVASafe از ابزار پژوهش قابل خواندن نبود و شواهد کد جای تأیید حقوقی مستقل را نمی‌گیرد.

سیاست عمومی آروان، محتوای پردازش‌شدهٔ مشتریان را از دامنهٔ خود خارج می‌کند. [سیاست رسمی](https://www.arvancloud.ir/en/legal/privacy-policy)

شرایط عمومی به اختیار نمایندهٔ سازمان اشاره دارد؛ انطباق آن با قرارداد این درگاه هنوز ثابت نشده است. [شرایط رسمی](https://www.arvancloud.ir/en/legal/terms)

توافق پردازش داده، دامنهٔ کاربرد مشروط دارد؛ اعمال آن به همین سرویس و حساب باید تأیید شود. [DPA رسمی](https://www.arvancloud.ir/en/legal/data-processing-agreement)

نشانی‌های عمومی arvancloudai.ir و شرایط اختصاصی همین درگاه در ابزار پژوهش در دسترس نبودند. رابطهٔ قراردادی درگاه با طرف حقوقی اسناد عمومی، مدت نگهداری درخواست/پاسخ/عکس، استفادهٔ آموزشی، پردازشگران فرعی، کشورهای پردازش و مهلت حذف از شواهد فعلی تأیید نشده‌اند. موفقیت API، موجودبودن کلید یا بازگرداندن نام مدل هیچ‌یک جای این اطلاعات نیست.

## رفتار واقعی NIVASafe

- فایل انتخاب‌شده تا رضایت صریح در مرورگر می‌ماند؛ ثبت‌نام، پیش‌نویس و تغییر سازمان رضایت محسوب نمی‌شوند.
- متن اطلاع‌رسانی دو زبانه در `frontend/src/features/assessments/rulaImageConsent.ts` با نسخهٔ `rula-image-consent-2026-10-19-v1` است. نسخهٔ فعلی، نامعلوم‌بودن شرایط اختصاصی ارائه‌دهنده و غیرفعال‌بودن ارسال عمومی را صریح می‌گوید؛ پس از تأیید واقعی باید با شرایط نهایی نسخه‌گذاری شود.
- سرور باید رضایت `true` و همین نسخه را دریافت کند؛ پس از کنترل مجوز پلتفرم، رویداد `RULA_IMAGE_CONSENT_ACCEPTED` پیش از فراخوانی خارجی در AuditLog ثبت می‌شود. کاربر/سازمان/زمان سرور/requestId و SHA256 فایل اصلی بارگذاری‌شده قابل پیگیری‌اند؛ عکس یا پرامپت کامل در این رویداد قرار نمی‌گیرد. نرمال‌سازی موجود پس از این رویداد است؛ این اثرانگشت متعلق به فایل اصلی است و به‌عنوان هشِ payload نرمال‌شده معرفی نمی‌شود. شکست ثبت رویداد مانع ارسال است.
- تصاویر تحلیلی با آماده‌سازی/نرمال‌سازی موجود و زمینهٔ شغل و فعالیت ارسال می‌شوند. تصویر ذخیره‌شدهٔ ارزیابی در Attachment و فضای حفاظت‌شده باقی می‌ماند؛ دانلود نیازمند احرازهویت و سازمان است.
- حذف مجاز فایل در `DELETE /files/:id` نشانگر حذف و حذف شیء ذخیره‌سازی را اعمال می‌کند؛ در شکست حذف شیء، نشانگر برگردانده می‌شود. عمر خودکار تصویر، پاک‌سازی نسخه‌های پشتیبان یا حذف نزد ارائه‌دهنده در این تغییر ساخته یا تضمین نشده است.
- رضایت به این ارزیابی/تصاویر محدود است. افزودن تصویر جدید یا تغییر سازمان رضایت جاری را باطل می‌کند. انصراف، بررسی دستی با بازبینی کامل را نگه می‌دارد؛ نتیجهٔ نامطمئن نهایی نمی‌شود.

## تصمیم‌های واقعاً لازم از مالک

تنها رکورد تصمیم سطح پلتفرم در `docs/legal/rula-image-platform-approval.2026-10-19.md` تکمیل شود. تأیید سازمان‌به‌سازمان لازم نیست. مالک یا مسئول حقوقی مجاز باید طرف قرارداد و شرایط همین endpoint، مبنای مجاز و حوزهٔ قضایی قابل اعمال، اختیار استفاده از عکس دیگران، نگهداری NIVASafe/پشتیبان و روش پاسخ به درخواست حذف را مشخص کند. این بررسی مهندسی، حکم حقوقی قطعی دربارهٔ همهٔ کشورها یا همهٔ عکس‌های کارکنان صادر نمی‌کند. رضایت بارگذار به‌تنهایی اختیار ارسال عکس اشخاص دیگر را ایجاد نمی‌کند.

پس از تکمیل این رکورد و تطبیق متن نسخهٔ نهایی، اپراتور مجاز فقط یک‌بار دو تنظیم سطح پلتفرم را در محیط مؤثر PM2 با `arvancloud` همسان می‌کند؛ سپس آزمون مصنوعی انتشار انجام می‌شود. تا آن زمان هیچ مقدار تأیید ساختگی یا فعال‌سازی خودکار انجام نمی‌شود. مدل‌های FMEA/RULA و چت تغییر نمی‌کنند.

## English findings

No independent published image-processing policy or signed owner authorization was identified in the repository. Existing engineering records and current runtime values indicate closed platform gates. This does not prove that no contract exists outside the project. The public NIVASafe website was unavailable to the research tool; code inspection is not independent legal approval.

Arvancloud's general privacy policy excludes customer-processed content. [Official policy](https://www.arvancloud.ir/en/legal/privacy-policy)

The general terms address organizational authority; their application to this gateway contract is unverified. [Official terms](https://www.arvancloud.ir/en/legal/terms)

The DPA has a conditional scope; applicability to this service/account needs verification. [Official DPA](https://www.arvancloud.ir/en/legal/data-processing-agreement)

Public arvancloudai.ir pages and gateway-specific terms were inaccessible to the research tool. The gateway's contractual entity, request/image/log retention, training use, subprocessors, processing countries and deletion deadline are not established. A working credential, API success or model snapshot does not establish these facts.

## Implemented processing and consent

- Selected files remain in the browser until explicit consent. Registration, drafts and organization changes do not grant consent.
- The bilingual versioned notice is in `frontend/src/features/assessments/rulaImageConsent.ts`, version `rula-image-consent-2026-10-19-v1`. It honestly discloses unverified gateway terms and disabled public transfer. The final verified terms require a new notice version before activation.
- The server requires consent=true and the current notice version. After platform approval checks, the durable `RULA_IMAGE_CONSENT_ACCEPTED` AuditLog event precedes any provider request. It binds the actor, organization, server timestamp, request ID, side, purpose, model and original-upload SHA256; no raw image/full prompt is in the receipt. Existing normalization follows this receipt, so this fingerprint identifies the selected original and does not claim to hash the normalized provider payload. Audit failure prevents transfer.
- Existing preparation/normalization and job/activity context apply. Saved assessment photos use protected Attachment storage; downloads enforce authentication and tenant ownership.
- Authorized `DELETE /files/:id` marks and deletes the stored object, reverting the marker if deletion fails. No automatic image TTL, backup erasure or provider deletion is newly promised or implemented.
- Consent covers this assessment's images; additional images or tenant changes invalidate it. Declining retains fully reviewed manual entry. Uncertain results cannot be finalized.

## Required owner decisions

Complete the single platform decision record in `docs/legal/rula-image-platform-approval.2026-10-19.md`. No organization-by-organization approval is required. The owner/qualified legal reviewer must establish this endpoint's contract and entity, applicable jurisdiction/legal basis, authorization for other people's photos, NIVASafe/backup retention and deletion handling. This engineering review does not give a definitive legal ruling for all jurisdictions or employment photographs. Uploader consent alone does not create rights over third-party photographs.

After that record and the final notice are verified, the authorized operator can configure both effective PM2 platform settings once to `arvancloud` and execute an authorized synthetic release smoke. No approval setting is fabricated before then. Assessment and chatbot models remain unchanged.

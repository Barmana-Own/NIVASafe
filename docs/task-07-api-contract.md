# NIVASafe Task 07 — قرارداد API برای RULA و پشتیبانی

این قرارداد ادامهٔ مسیرهای موجود Task 05/06 است؛ store دوم تیکت یا مسیر `/tickets` جدید ساخته نشده است.

## RULA تصویری

### درخواست تحلیل

`POST /api/v1/rula/posture-image-analysis`

- احراز هویت: `Authorization: Bearer …`، سازمان جاری با `x-organization-id`؛ حساب و عضویت باید فعال باشند؛ اشتراک و `assessments.create` بررسی می‌شوند.
- محدودیت موجود endpoint: ۸ درخواست در دقیقه؛ فایل تصویر حداکثر ۱۰ MiB؛ MIME مجاز به‌همراه امضای واقعی فایل بررسی می‌شود.
- multipart: `file`، `bodySide` (`LEFT | RIGHT | BOTH`)، `jobTitle`، `taskDescription`، `postureDescription`، `locale` و `activityInfo` اختیاری.
- provider باید برای `imagePurpose: rula-posture` واقعاً قابلیت تصویر داشته باشد. عکس به‌صورت base64 در provider input قرار می‌گیرد. fallback متنی به‌عنوان تحلیل تصویر موفق برگردانده نمی‌شود.
- پاسخ موفق در `data` شامل `sides`, `notes`, `provider`, `model`, `aiStatus` است. هر بخش بدن شامل `angle`, `score`, `detected`, `confidence`, `requiresReview` است. برای `BOTH` دو شیء مستقل لازم است.
- `requiresReview=true` وقتی عضو دیده نشده، confidence نامعلوم/کمتر از ۰٫۵ است، یا زاویهٔ لازم موجود نیست. ۰٫۵ آستانهٔ محافظه‌کارانهٔ محصول است و دقت اندازه‌گیری‌شده نیست.

### خطا و retry

خطاها با `error.code`, `message`، `requestId` و در صورت تعیین‌شدن `retryable` برمی‌گردند. پیام عمومی provider جزئیات secret، prompt یا پاسخ خام مدل را افشا نمی‌کند.

| وضعیت | کد | retry |
|---:|---|---|
| 400/401/402/403 | اعتبارسنجی، ورود، اشتراک یا مجوز فعلی | خیر |
| 413/415 | `RULA_IMAGE_SIZE_LIMIT` / `RULA_IMAGE_TYPE_NOT_ALLOWED` / signature نامعتبر | خیر |
| 422 | `RULA_IMAGE_AI_QUALITY_REVIEW` | خیر؛ عکس دوباره گرفته شود یا بررسی دستی ادامه یابد |
| 502 | `RULA_IMAGE_AI_INVALID_RESPONSE` | خیر؛ پاسخ مدل ساختار معتبر نداشت |
| 503 | `RULA_IMAGE_AI_UNAVAILABLE` | فقط وقتی پاسخ `retryable:true` دارد؛ پیکربندی/capability ناموجود `false` است |
| 429 | سقف دسترسی یا rate limit | سهمیهٔ `AI_ACCESS_*` تکرار نمی‌شود |

کلاینت برای تصویر فقط خطایی را خودکار تکرار می‌کند که API صریحاً retryable اعلام کند؛ قطع مبهم اتصال به‌تنهایی تکرار نمی‌شود چون ممکن است سرور تصویر را پردازش و quota را شارژ کرده باشد. عکس و سمت انتخاب‌شده در retry امن سروری تغییر نمی‌کنند.

### ذخیره و تأیید RULA

- مسیرهای فعلی `POST /api/v1/rula` و `PATCH /api/v1/rula/:id` حفظ شده‌اند.
- RULA با وضعیت `APPROVED` باید همهٔ مشاهدات لازم را تأییدشده داشته باشد؛ تأیید ردیف نامطمئن/ناموجود با `400 RULA_POSTURE_REVIEW_REQUIRED` رد می‌شود.
- پیش‌نویس یا کار در حال انجام برای ادامهٔ دستی قابل ذخیره است. score نشان‌داده‌شده برای دادهٔ نیازمند بررسی پنهان می‌ماند.
- امتیاز نهایی با منطق موجود domain محاسبه می‌شود؛ AI score نهایی یا روش RULA را تعیین نمی‌کند.

## تیکت واحد

تمام مسیرها زیر `/api/v1` و مدل‌های موجود `SupportRequest`/`SupportReply` هستند.

### کاربر درخواست‌کننده

| روش و مسیر | توضیح |
|---|---|
| `POST /support/requests` | ساخت درخواست در سازمان جاری؛ `Idempotency-Key` باید UUID باشد. category، subject، message، و context امن assessment/error اختیاری‌اند. requester/org از actor گرفته می‌شوند. |
| `GET /support/requests?page=&limit=&status=&category=&priority=&search=` | صفحه‌بندی، فیلتر سمت سرور، فقط همان `requesterId` و سازمان جاری. |
| `GET /support/requests/:id` | جزئیات فقط برای همان درخواست‌کننده و سازمان؛ replyهای `PUBLIC` בלבד برگردانده می‌شوند. |
| `POST /support/requests/:id/replies` | پیام عمومی idempotent با `Idempotency-Key`; درخواست‌کنندهٔ دیگر `404` می‌گیرد. پاسخ به `WAITING_USER`، وضعیت را `IN_PROGRESS` می‌کند و پاسخ به `RESOLVED/CLOSED` آن را باز می‌کند. |

category موجود: `AI_QUOTA | PROFESSIONAL_PLAN | TECHNICAL_SUPPORT | OTHER`. ارجاع امن شامل `relatedAssessmentType` و `relatedAssessmentId` با هم است و وجود assessment در همان سازمان بررسی می‌شود؛ عکس یا جزئیات provider به تیکت ضمیمه نمی‌شود.

چهار مسیر درخواست‌کننده با `allowUnsubscribed` اجازهٔ بازیابی اشتراک می‌دهند؛ هویت، عضو فعال سازمان، organization scope و محدودیت role همچنان از guard/schemaهای موجود اعتبارسنجی می‌شوند. این bypass به مسیرهای RULA یا سایر APIها تعمیم ندارد.

### صف پشتیبانی فعلی

| روش و مسیر | توضیح |
|---|---|
| `GET /admin/support-requests?page=&limit=&status=&category=&priority=&organizationId=&search=` | صف صفحه‌بندی‌شده با فیلتر سروری. اپراتور باید هم `SUPER_ADMIN` و هم در `SUPPORT_OPERATOR_USER_IDS` باشد؛ سازمان انتخاب‌شده از actor نیز باید در `SUPPORT_OPERATOR_ORGANIZATION_IDS` باشد. query هرگز scope سازمان را گسترش نمی‌دهد. هر خواندن audit می‌شود. |
| `GET /admin/support-staff` | فقط کارکنان فعال `SUPER_ADMIN` که در allowlist اپراتورها هستند؛ خواندن audit می‌شود. |
| `GET /admin/support-requests/:id` | thread کامل شامل note داخلی، فقط در سازمان انتخاب‌شده و مجاز؛ خواندن audit می‌شود. |
| `POST /admin/support-requests/:id/replies` | reply عمومی idempotent و اعلان عمومی به درخواست‌کننده با لینک `/support?ticket=<id>`؛ متن reply در اعلان نیست؛ سازمان تیکت باید با scope جاری برابر باشد. |
| `POST /admin/support-requests/:id/internal-notes` | یادداشت داخلی idempotent؛ اعلان نمی‌فرستد و در query کاربر خوانده نمی‌شود؛ سازمان تیکت باید با scope جاری برابر باشد. |
| `PATCH /admin/support-requests/:id` | تغییر `status`, `priority`, `assignedToId` یا فیلد سازگاری قدیمی `response`؛ فقط تیکت در scope مجاز. در صورت تغییر assignee، audit شناسهٔ قبلی و جدید را ثبت می‌کند. `expectedUpdatedAt` جدید اختیاری است؛ رابط فعلی آن را می‌فرستد و تعارض هم‌زمان `409 SUPPORT_TICKET_CONFLICT` می‌دهد. کلاینت‌های قدیمی بدون timestamp با سیاست آخرین‌نویسنده کار می‌کنند. |

status: `OPEN`, `IN_PROGRESS`, `WAITING_USER`, `RESOLVED`, `CLOSED`. انتقال‌ها در `backend/src/support-ticket-state.ts` تعریف‌اند؛ `CLOSED` فقط به `OPEN` برمی‌گردد. priority: `LOW | NORMAL | HIGH | URGENT`. صفحه‌بندی: `page>=1`, `limit=1..100` (پیش‌فرض ۲۰).

## دسترسی و سازگاری

- کاربر: فقط درخواست‌های خودش در سازمان منتخب.
- `ORG_ADMIN`/نقش‌های سازمانی: صف سراسری فعلی را نمی‌بینند؛ برای عملیات عمومی همان مدل فعلی استفاده می‌شود.
- دسترسی کارمند تا زمانی که هر دو allowlist اپراتور و سازمان تنظیم نشوند، با `503 SUPPORT_ACCESS_POLICY_UNCONFIGURED` بسته می‌ماند. اپراتور مجاز فقط به سازمان جاریِ قرارگرفته در allowlist دسترسی دارد؛ cross-organization selection نیازمند scope صریح در محیط سرور و هر read ثبت‌شده در audit است.
- فرمت‌های جدید schema به‌صورت additive هستند؛ migration باید در staging و بعد از backup اعمال شود. در این task دیتابیس تغییر نکرده است.

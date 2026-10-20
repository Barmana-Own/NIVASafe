# NIVASafe Task 07 — گزارش ریشه‌یابی RULA و AI

## نتیجهٔ ریشه‌یابی

علت رخداد گزارش‌شده برای «کاربر واقعیِ ثبت‌نام‌شده» در این محیط **تأیید نشد**. شناسهٔ کاربر/سازمان، شناسهٔ درخواست یا پاسخ خطای پالایش‌شده در دسترس نبود؛ سرویس MySQL، حساب واقعی و کلیدهای ارائه‌دهندهٔ AI نیز تنظیم نشده بودند. بنابراین موفقیت تست fixture را به‌عنوان رفع قطعی همان رخداد گزارش نمی‌کنم.

مسیر مجاز کاربر عادی را با Fastify واقعی، JWT واقعیِ تست، مجوز واقعی، عضویت tenant و فایل PNG مصنوعی بازتولید کردم. عضو فعال با نقش `ASSESSOR` درخواست تصویر را به مرز provider می‌رساند و همان بایت‌های تصویر، `organizationId`، `userId` و `imagePurpose: rula-posture` را می‌فرستد. این تست provider را mock می‌کند و تماس با سرویس AI یا دیتابیس واقعی نیست: `backend/src/rula-registered-member.test.ts:86`.

## علت‌های قابل اثبات در کد

| مورد | مدرک | نتیجه |
|---|---|---|
| حساب تازه‌ثبت‌نام‌شده تا فعال‌سازی برای ورود و استفاده واجد شرایط نیست. | ساخت کاربر با `active: false` در `backend/src/modules/auth.ts:156`؛ گارد JWT کاربر فعال را می‌خواهد: `backend/src/auth-guard.ts:5` به بعد. | یک محدودیت onboarding واقعی است؛ بدون trace حساب مورد گزارش‌شده علت رخداد او را ثابت نمی‌کند. |
| نبود انتخاب سازمان/عضویت معتبر قبل از رسیدن به تحلیل، خطای مجوز/سازمان است، نه خرابی AI. | `authenticate` عضویت فعال سازمان را بررسی می‌کند (`backend/src/auth-guard.ts:18` به بعد)؛ `requireOrg` در `backend/src/core.ts` شناسهٔ سازمان را لازم می‌کند. | تست‌ها: حساب غیرفعال `401`، سازمان انتخاب‌نشده `400`، tenant نامعتبر `401`، نقش فقط‌خواندنی `403`. |
| اشتراک منقضی پیش از provider متوقف می‌شود. | `backend/src/auth-guard.ts` subscription gate؛ تست `backend/src/rula-registered-member.test.ts:145`. | پاسخ `402 SUBSCRIPTION_REQUIRED` و بدون فراخوانی provider. |
| نقش‌های مجاز همان مدل فعلی می‌مانند. | `ROLE_PERMISSIONS` در `backend/src/core.ts:92`؛ `VIEWER` مجوز `assessments.create` ندارد و `ASSESSOR` دارد. | تست واقعی گارد route برای `VIEWER` پاسخ `403` می‌دهد؛ مجوزی به نقشی اضافه نشده است. |
| محدودیت AI مستقل از مجوز ارزیابی است. | `assertAIAccess` و رزرو کاربرمحور در `backend/src/ai-access.ts:11-18`. | تست‌های `backend/src/ai-access.test.ts` غیرفعال‌بودن AI، quota، رزرو هم‌زمان، آزادکردن درخواست ناموفق و شارژ usage گزارش‌شده را بررسی می‌کنند؛ route fixture provider را mock می‌کند و quota دیتابیسی واقعی را نمی‌آزماید. |
| provider متن‌محور نمی‌تواند جای تحلیل تصویر موفق را بگیرد. | route در `backend/src/modules/assessments.ts:398` در نبود provider تصویری پاسخ `503` می‌دهد؛ payload تصویر در همان route ارسال می‌شود. | نبود قابلیت/پیکربندی `retryable:false` است؛ timeout گذرا `retryable:true`؛ JSON نامعتبر `502 RULA_IMAGE_AI_INVALID_RESPONSE`؛ مشاهدهٔ خالی `422 RULA_IMAGE_AI_QUALITY_REVIEW`. |

## نقص‌های قطعی که در تست RED ثبت و اصلاح شدند

1. **مشاهدات تصویری نامطمئن می‌توانستند شبیه امتیاز عادی نمایش داده شوند.** تست‌های جدید برای عضو تشخیص‌داده‌نشده و confidence پایین ابتدا شکست خوردند. parser اکنون `requiresReview` می‌گذارد؛ score پیشنهادی برای آن ردیف در رابط مخفی می‌شود؛ کاربر باید آن را تأیید کند. تأیید وضعیت `APPROVED` از مسیر ایجاد و ویرایش API نیز برای نتیجهٔ تأییدنشده رد می‌شود. شواهد: `backend/src/rula-posture-ai.ts:49,181`، `backend/src/rula-posture.ts:91-108`، `backend/src/modules/assessments.ts:565,587` و تست‌های `backend/src/rula-posture.test.ts` و `backend/src/rula-registered-member.test.ts:197`.
2. **کلاینت برای پاسخ 503 بدون دانستن retryability، تصویر را دوباره می‌فرستاد.** تست تازه برای 503 غیرقابل‌تکرار ابتدا timeout می‌شد چون درخواست تکرار می‌شد. اکنون برای تحلیل تصویر retry فقط وقتی انجام می‌شود که API صریحاً `retryable:true` بدهد. قطع مبهم اتصال پس از ارسال عکس خودکار تکرار نمی‌شود؛ خطای server-side گذرا می‌تواند دو بار و با سقف مشخص بازیابی شود. audit خطای تصویر `invalidResponseRetryCount` را فقط برای retry اعتبارسنجی پاسخ (صفر یا یک) ثبت می‌کند؛ این شمارنده retry/failover داخلی provider را نمی‌شمارد. کد خطا و metadata پالایش‌شده نیز ثبت می‌شوند؛ متن خام پاسخ مدل، prompt و تصویر ثبت نمی‌شوند. شواهد: `backend/src/app.ts:61`، `backend/src/image-analysis-diagnostics.ts`، `backend/src/modules/assessments.ts:400-421`، `frontend/src/api/client.ts`، `frontend/src/features/assessments/rulaAiRequest.ts:11-34` و تست‌های route و `frontend/src/features/assessments/rulaAiRequest.test.ts`.
3. **وضعیت نهایی RULA می‌توانست با ردیف نامطمئن تأیید شود.** تست RED برای تأیید مستقیم و تغییر وضعیت به `APPROVED` اضافه شد؛ هر دو مسیر اکنون `RULA_POSTURE_REVIEW_REQUIRED` می‌دهند. ذخیرهٔ پیش‌نویس/درحال‌انجام همچنان ممکن است. امتیاز نهایی همچنان با تابع موجود `calculateRula` از بستهٔ `@nivasafe/domain` محاسبه می‌شود؛ روش امتیازدهی دامنه تغییر نکرده است.
4. **پاسخ‌های نامعتبرِ retry شده می‌توانستند با دفتر مصرف AI اختلاف داشته باشند.** تلاش‌هایی که provider برایشان token usage برگردانده، برای تحلیل متن، شرح فعالیت، پیشنهاد اقدام و تصویر جمع می‌شوند؛ یک رکورد idempotent به‌ازای هر درخواست ذخیره می‌شود، حتی اگر همهٔ پاسخ‌ها نامعتبر باشند یا تلاش بعدی با خطای سهمیه متوقف شود. اگر provider هیچ usage ندهد، عدد تخمینی ساخته نمی‌شود. quota همان کنترل و سقف موجود هر فراخوانی را حفظ می‌کند. شواهد: `backend/src/ai-usage.ts`, `backend/src/modules/assessments.ts`, `backend/src/rula-action-generation.ts` و تست‌های `backend/src/ai-usage.test.ts`, `backend/src/rula-three-stage.test.ts`, `backend/src/rula-action-generation.test.ts`.
5. **گزارش RULA اطلاعات تشخیص تأییدنشده را هنوز نشان می‌داد.** جدول خلاصه/جزئیات، ردیف‌های تصویر و exportهای Excel اکنون زاویه، تشخیص و امتیاز را تا تأیید همان ردیف مخفی می‌کنند و وضعیت «نیازمند بازبینی دستی» را نشان می‌دهند. شواهد: `frontend/src/features/assessments/AssessmentPages.tsx`, `backend/src/modules/reports.ts`, `frontend/src/features/assessments/RulaReportDataTable.test.tsx` و `backend/src/reports-export.test.ts`.
6. **ممیزی reassignment تیکت مقصد را ثبت نمی‌کرد.** رویداد staff update اکنون شناسهٔ اپراتور قبلی و جدید را فقط هنگام تغییر assignment در metadata ثبت می‌کند؛ محتوای reply یا note وارد audit نمی‌شود. شواهد: `backend/src/modules/support.ts` و `backend/src/support.test.ts`.

## محدودیت‌های تشخیص رخداد

- یک مسیر ثبت‌نام از `active:false` شروع می‌شود؛ فعال‌سازی حساب/عضویت باید طبق فرایند موجود انجام شود. بدون دانستن وضعیت همان حساب نمی‌توان گفت این علت رخداد است.
- fixture نشان می‌دهد عضو فعال و مجاز تا مرز provider کار می‌کند، نه اینکه کل upload، quota، ذخیره‌سازی، بازگشایی گزارش یا ارائه‌دهندهٔ واقعی کار می‌کند.
- هیچ کلید `ARVAN_API_KEY`، `GAPGPT_API_KEY`، `OPENAI_API_KEY`، `GEMINI_API_KEY` یا `ANTHROPIC_API_KEY` در محیط موجود نبود؛ خطای provider واقعی یا مدل/اعتبارنامهٔ تولید قابل تشخیص نبود.
- ارسال تصویر از RULA اکنون به تأیید provider مشخص از طریق `RULA_IMAGE_PRIVACY_APPROVED_PROVIDER` وابسته است؛ این متغیر در محیط بررسی‌شده تنظیم نیست و بنابراین هیچ تصویر واقعی به provider فرستاده نشد.
- برای بستن ریشه‌یابی همان رخداد لازم است یک `requestId` غیرحساس، کد خطا و وضعیت فعال/عضویت/نقش/اشتراک/quota همان حساب از محیط مجاز ارائه شود. هیچ secret یا عکس شغلی نباید در گزارش ارسال شود.

# وضعیت پروژه و مسیر ادامه / Project status and roadmap

| تاریخ میلادی / Gregorian | تاریخ شمسی / Jalali | Release |
|---|---|---|
| 2026-10-22 | 1405-07-30 | release-rula-direct-consent-20261022-01 |

## فارسی

### خلاصه وضعیت فعلی پروژه

این گزارش، محدودهٔ رضایت مستقیم و اتصال تصویر RULA را از وضعیت واقعی مخزن و انتشار توصیف می‌کند؛ ادعای ممیزی کامل قابلیت‌های نامرتبط ندارد. کد ایمن منتشر شده و API واقعی با تصویر مصنوعی موفق است؛ فعال‌سازی عمومی عکس واقعی BLOCKED است.

### موارد واقعاً پیاده‌شده

رضایت مستقل پیش‌فرض خاموش، پذیرش/رد/لغو نسخه‌دار، مجوز احرازشدهٔ صاحب تصویر، بررسی تازهٔ هر ارسال، شروع خودکار هنگام آپلود، نتیجهٔ معتبر و خصوصیِ ذخیره‌شده، حفظ PDF، سهمیه/نقش/جداسازی سازمان و جلوگیری از Redirect.

### کار باقی‌مانده و موارد ناقص یا مسدود

MUST-FIX/P0 برای فعال‌سازی عمومی: احراز شرایط قراردادیِ همین درگاه و تعیین سیاست واقعی نگهداری/پشتیبان NIVASafe؛ سپس اطلاع‌رسانی نهایی و رضایت جدید در صورت تغییر مادی و فعال‌سازی کنترل‌شده. آزمون عکس واقعی کاربران عمومی NOT_RUN و تا احراز مجاز نیست. اسکن جدید کل وابستگی‌ها/نفوذ بیرونی NOT_RUN؛ دقت آناتومیک مستقل NOT_VERIFIED. شکست باز در تست‌های محدودهٔ نهایی وجود ندارد.

### مشکلات و ریسک‌های فعلی

شرایط نگهداری/حذف/آموزش/دریافت‌کنندگان همین API از اسناد قابل دسترس احراز نشد. خروجی مدل قطعیت آناتومیک ندارد. رضایت فرد جای حق استفاده از عکس دیگران را نمی‌گیرد؛ مجوز احرازشده پیاده شده ولی احراز زیستی تصویر نیست.

### پیشنهادهای مفید و ارزش واقعی کسب‌وکار

P0: تکمیل رکورد مستند ارائه‌دهنده و سیاست نگهداری با فیلدهای دقیق [مدارک لازم](../docs/legal/rula-provider-required-evidence.2026-10-22.md). P1: اعتبارسنجی مستقل اندازه‌گیری و امتیاز RULA روی مجموعهٔ برچسب‌خوردهٔ مجاز توسط متخصص، پیش از ادعای دقت. P2 اختیاری: پس از تعیین سیاست، خودکارسازی حذف و اثبات حذف پشتیبان با رسید قابل پیگیری؛ پایش نرخ شکست/زمان تحلیل بدون عکس یا Prompt در لاگ. این موارد به‌عنوان پیاده‌شده معرفی نشده‌اند.

### اولویت اقدامات، آمادگی Production و جمع‌بندی مدیریتی

ترتیب: شرایط واقعی سرویس/نگهداری → متن نهایی/نسخه رضایت → فعال‌سازی پلتفرم و بررسی مصنوعی → اعتبارسنجی تخصصی. هیچ تأیید دستی برای تک‌تک سازمان‌ها لازم نیست. انتشار کد و۶بررسی مرورگر عمومی موفق است؛ آمادگی فعال‌سازی کامل عمومی BLOCKED است. مدل‌های درخواستی ثابت و حساب‌های تست غیرفعال‌اند؛ مصرف API۵از۶ است. گزارش‌های مشتری و فنیِ فارسی/انگلیسیِ مورخ امروز در همین پوشه موجودند.

## English

### Current Project Status

This report describes the direct-consent/RULA-image scope from actual repository and deployment evidence, not a full audit of unrelated features. Safe code is published and the actual API succeeded with a synthetic image; public real-photo activation is BLOCKED.

### Implemented Items

Independent default-off consent, versioned acceptance/decline/withdrawal, authenticated owner grants, fresh per-transfer authorization, automatic upload-time scheduling, validated private persisted findings, retained PDF, quota/role/tenant isolation and redirect denial.

### Remaining Work; Incomplete, Blocked, FAIL or NOT_RUN Items

MUST-FIX/P0 for public activation: establish the actual gateway contract/processing terms and NIVASafe retention/backup policy; then accurate final notice/new consent if materially changed and controlled activation. Public real-user image tests are NOT_RUN and not authorized until actual conditions are established. New full dependency scan/external penetration test NOT_RUN; independent anatomical accuracy NOT_VERIFIED. No open final scoped test failure remains.

### Current Risks / Problems

This API's retention/deletion/training/recipients were not established from accessible evidence. Model output lacks independently validated anatomical accuracy. A user's consent cannot establish rights over someone else's photograph; authenticated owner authorization is implemented but is not biometric photo verification.

### Recommended Next Improvements; Valuable Product / Engineering Enhancements

P0: complete the evidence-backed provider record and actual retention policy using [required evidence fields](../docs/legal/rula-provider-required-evidence.2026-10-22.md). P1: independent expert validation of measurements/RULA scoring on an authorized labeled dataset before accuracy claims. Optional P2: after policy decisions, automate deletion/backup deletion evidence with traceable receipts; monitor failure rate/latency without logging images/prompts. These are recommendations, not implemented claims.

### Recommended Priority Order; Production Readiness; Management Summary

Actual service/retention conditions → final notice/consent version → platform activation and synthetic verification → expert validation. No per-organization managerial approval is needed. Code publication and six public browser checks passed; full public activation readiness is BLOCKED. Requested models remain fixed, test accounts are disabled, and API budget is 5/6. Dated Persian/English customer and technical reports are in this folder.

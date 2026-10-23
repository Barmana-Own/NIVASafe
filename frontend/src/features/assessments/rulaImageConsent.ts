/** Public notice version; backend validates this identifier before transfer. */
export const RULA_IMAGE_CONSENT_VERSION = "rula-image-consent-2026-10-19-v1";

export const rulaImageConsentNotice = {
  fa: {
    title: "ارسال تصویر برای تحلیل",
    paragraphs: [
      "تصاویر انتخاب‌شده و اطلاعات فعالیت همین ارزیابی برای بررسی پوسچر به ArvanCloud با مدل GPT-5-Mini ارسال می‌شوند؛ این ارسال اختیاری است و بدون رضایت شما انجام نمی‌شود.",
      "فقط تصاویری را انتخاب کنید که مجاز به استفاده و ارسال آن‌ها هستید. پیش از ارسال، چهره‌ها و اطلاعات شناسایی یا محرمانهٔ غیرضروری را حذف کنید. رضایت شما جای مجوز لازم برای تصاویر دیگران را نمی‌گیرد.",
      "با ذخیرهٔ ارزیابی، تصویر و نتیجه در فضای حفاظت‌شدهٔ NIVASafe نگهداری می‌شوند و دسترسی تابع مجوزهای سازمان است. حذف از سامانه توسط کاربر مجاز انجام می‌شود؛ حذف از نسخه‌های پشتیبان و سرویس ارائه‌دهنده تابع سیاست جداگانه است و حذف فوری آن‌ها تضمین نشده است.",
      "شرایط اختصاصی نگهداری، استفادهٔ آموزشی، محل پردازش و حذف تصاویر در درگاه ارائه‌دهنده هنوز برای این سامانه تأیید نشده است. ارسال عمومی تا تکمیل این تأیید فعال نمی‌شود؛ هیچ وعدهٔ حذف فوری یا عدم استفادهٔ آموزشی داده نشده است.",
      "نتیجه پیشنهاد اولیه است و دقت آناتومیک آن تأیید مستقل ندارد. اندازه‌گیری نامطمئن باید توسط انسان بررسی شود. می‌توانید ارسال را نپذیرید و از بررسی دستی استفاده کنید؛ لغو تحلیل، دادهٔ قبلاً ارسال‌شده را از ارائه‌دهنده پس نمی‌گیرد.",
      "نسخهٔ این اطلاعیه و رضایت، همراه کاربر، سازمان، زمان سرور، شناسهٔ درخواست و اثرانگشت تصویر ثبت می‌شود؛ خود تصویر در سابقهٔ رضایت قرار نمی‌گیرد.",
    ],
    agreement: "مجوز لازم را دارم و با ارسال تصاویر انتخاب‌شده و اطلاعات این ارزیابی برای این تحلیل موافقم.",
    accept: "موافقم؛ تحلیل تصاویر",
    decline: "بدون ارسال؛ بررسی دستی",
  },
  en: {
    title: "Send images for analysis",
    paragraphs: [
      "The selected images and this assessment's activity details are sent to ArvanCloud GPT-5-Mini for posture analysis. Sending is optional and does not happen without your consent.",
      "Use only images you are authorized to upload and transfer. Remove unnecessary faces, identifying details and confidential content first. Your consent does not replace required authorization for other people's photographs.",
      "Saving the assessment stores its image and findings in protected NIVASafe storage with organization-based permissions. Authorized users can delete them from the application; backup and provider deletion follow separate policies and immediate deletion is not guaranteed.",
      "Gateway-specific image retention, training use, processing location and deletion terms have not yet been verified for this platform. General image transfer remains disabled until that review is complete; no immediate-deletion or no-training promise is made.",
      "Results are preliminary and anatomical accuracy is not independently validated. Uncertain measurements need human review. You may decline and use manual review; cancelling analysis cannot recall data already transferred to the provider.",
      "The notice version and consent are recorded with the user, organization, server time, request ID and image fingerprint. The consent record does not contain the image itself.",
    ],
    agreement: "I have the required authorization and consent to transferring the selected images and assessment details for this analysis.",
    accept: "I agree; analyse images",
    decline: "Do not send; review manually",
  },
} as const;

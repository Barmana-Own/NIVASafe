# معماری

NIVASafe یک Monorepo مبتنی بر pnpm است:

- `apps/web`: رابط React + Vite، RTL و PWA
- `apps/api`: API مبتنی بر Node.js/Fastify
- `packages/domain`: قواعد محاسبات FMEA و RULA
- `apps/api/prisma`: مدل و migrationهای MySQL

مرورگر فقط با API ارتباط دارد. API از Prisma برای MySQL استفاده می‌کند و فایل‌ها را در دیسک محلی یا S3-compatible storage نگه می‌دارد. Redis برای صف AI و ایمیل در استقرار production استفاده می‌شود؛ در توسعه محلی عملیات fallback بدون Redis اجرا می‌شوند.


## هوش مصنوعی

حالت `fallback` همیشه از پایگاه دانش داخلی استفاده می‌کند. با `AI_ENABLED=true` و تنظیم کلید و مدل، آداپتورهای OpenAI، Gemini یا Anthropic فعال می‌شوند. در صورت در دسترس نبودن ارائه‌دهنده پیش‌فرض، چت به‌صورت امن به fallback برمی‌گردد.

# Testing

`pnpm test` runs pure domain tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` validate all workspaces. Domain coverage includes RPN boundaries, risk classification, bounded/traceable RULA calculation and the canonical phone contract. Phone tests cover Persian/Arabic-Indic digit normalization, the exact `09` + 9 digit shape, length boundaries and rejection of international forms. Integration UAT requires MySQL. Docker checks require Docker Engine, which is not available in every development host.

## ذخیره خودکار فرم‌ها

فرم‌های عملیاتی سازمان، پروژه، فرایند، فعالیت، اقدام اصلاحی، پایگاه دانش، فایل، پروفایل، اعضا، دعوت، گفت‌وگو و تحلیل هوش مصنوعی با `AutoSaveForm` روی هر رویداد `input` و `change` در فضای محلی کاربر ذخیره و با بازگشت به صفحه بازیابی می‌شوند. ارزیابی‌های FMEA و RULA نیز پیش‌نویس IndexedDB خود را روی هر تغییر ذخیره می‌کنند تا حتی یک نویسه واردشده از دست نرود.

رمزهای عبور، توکن‌های بازیابی و فایل‌های باینری عمداً هرگز در پیش‌نویس ذخیره نمی‌شوند و پس از ثبت موفق، پیش‌نویس همان فرم پاک می‌شود.

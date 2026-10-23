# گزارش فنی: خطای متناوب RULA BOTH

| مورد | مقدار |
|---|---|
| پروژه | NIVASafe |
| نوع گزارش | گزارش فنی |
| زبان | فارسی |
| تاریخ شمسی | ۱۴۰۵/۰۷/۲۶ |
| تاریخ میلادی | ۲۰۲۶/۱۰/۱۸ |
| وضعیت | PARTIAL / BLOCKED؛ کاندید ساخته‌شده، اجرا و انتشار زنده تأیید نشده |

## دامنه و محیط

کار روی checkout واقعی `C:\NIVASafe` انجام شد؛ working tree از قبل تغییرات وسیع و نامرتبط داشت و هیچ reset/clean انجام نشد. بک‌اند کاندید جدا از live در `C:\NIVASafe\.local\rula-final-candidate-20261017-053748\backend` ساخته شد. marker اجرای قبلی آن `rula-401-differential-candidate-20261018-01` بود. فرایند جدیدی پس از تغییرات جاری از این کاندید اجرا نشد.

API محلی live روی `127.0.0.1:5044` برای `/api/v1/health` وضعیت HTTP 200، نسخه `0.1.0` و MySQL up برگرداند. PID در snapshot فعلی 14048 و نام process برابر `node` بود، ولی مسیر executable برای هویت Codex `srv9298144857\codexsandboxoffline` قابل خواندن نبود. پورت‌های staging 5153، 53306، 15144 و 9226 در snapshot نهایی listener نداشتند. فایل `.env` محافظت‌شده برای هویت جاری قابل خواندن نبود. static root محلی `C:\inetpub\nivasafe\app-com` همچنان hashهای index `E1C893E440F8B769CB2E119C47D7D682BCD9DB092C0F4FD581A097B830885ED9`, JS `2B4F0C30678C311D30F4E0BDD67EBEFB12DA8BB6D1A12CC16A82C65B88094A17`, CSS `EA10DC070BD448680ADDBDC99305CA95B91C4F6EFB5C2BBF09AE7CA5A468CE86` داشت. سرویس یا داده live تغییر داده نشد.

## تشخیص 502

در اجرای ناموفق کاندید قبلی، مسیر `/api/v1/rula/posture-image-analysis` پس از دو پاسخ بالادستی ArvanCloud با HTTP 200، خطای `RULA_IMAGE_AI_INVALID_RESPONSE` را به HTTP 502 تبدیل کرد. شناسه درخواست برنامه `a41a4fcd-f7d2-461b-9b82-3c1c19e02dce` و شناسه‌های بالادستی `31f36d300656499ffaa9669a7fdc3a3f` و `aef41bceeca45bf945cdffb3b4a9b345` بودند؛ زمان پاسخ‌ها به‌ترتیب ۱۲٫۵۸۷ و ۹٫۷۳۷ ثانیه بود. یک اجرای مستقل BOTH در همان marker با upstream HTTP 200 و زمان ۱۰٫۹۰۲ ثانیه موفق شد، در پایگاه staging ذخیره شد، پس از ورود تازه بازخوانی شد و گزارش JSON/PDF با HTTP 200 تولید کرد. ماتریس مشاهده‌شده: ۱ از ۲ درخواست اپلیکیشن BOTH ناموفق؛ ۱ موفق. این نمونه برای ادعای پایداری کافی نیست.

شواهد قدیمی پاسخ مدل را ذخیره نکرده و observer آن اجرا، فراداده ساختار پاسخ را ثبت نکرده بود. بنابراین محل شکست در لایه اعتبارسنجی/تجزیه پاسخ تأیید است، اما مشخص نیست پاسخ JSON نامعتبر، container سمت‌ها، یکی از اجزای body-part، overlay یا مورد دیگری ناقص بوده است. خطای entitlement/مجوز vision از این شواهد نتیجه نمی‌شود؛ هر دو درخواست بالادستی ثبت‌شده HTTP 200 بودند. درخواست‌های مستقیم text و image کاندید قبلی نیز قبلاً HTTP 200 داشته‌اند، اما این‌ها آزمون کاندید تازه نیستند.

## تغییرات همین اجرا

| فایل | تغییر محدود |
|---|---|
| `backend/src/rula-posture-ai.ts` | قرارداد BOTH صریح شد؛ parser خطاهای JSON/container/سمت ناقص/overlay را با کدهای پایدار مشخص می‌کند. اعتبارسنجی fail-closed باقی است. |
| `backend/src/rula-posture-ai.test.ts` | آزمون prompt قرارداد nested BOTH و کد خطای سمت ناقص اضافه شد. |
| `backend/src/image-analysis-diagnostics.ts` | فقط کدهای اعتبارسنجی از allowlist وارد audit می‌شوند؛ متن پاسخ ذخیره نمی‌شود. |
| `backend/src/image-analysis-diagnostics.test.ts` | آزمون حذف متن خصوصی و ثبت کد مجاز اضافه شد. |
| `backend/src/rula-registered-member.test.ts` | تست route تأیید می‌کند کد تشخیصی امن ثبت و متن خصوصی حذف می‌شود. |

این فایل‌ها پیش از این نیز تغییرات قبلی در working tree داشتند. تغییرات این اجرا با snapshot زمان شروع در `C:\NIVASafe\.local\rula-502-contract-fix-20261018\before` مقایسه شد؛ برای `rula-registered-member.test.ts` backup جداگانه موجود نبود. هیچ تغییر schema، migration، provider adapter، authorization، consent، UI یا backend live انجام نشد. تغییر prompt یک mitigation معقول برای رعایت قرارداد است، اما تا آزمون provider روی کاندید جدید، علت دقیق و رفع نهایی تأیید نشده است.

## هویت candidate و hashها

Candidate backend در مسیر جداگانه بالا build شد. hashهای منبع:

| فایل | SHA-256 |
|---|---|
| `backend/src/rula-posture-ai.ts` | `BD2990401413F6BF126ACD20DAD755AE5959C1AC7E49F656BAF3B5301D03A6A1` |
| `backend/src/image-analysis-diagnostics.ts` | `E70355BE208851C96774FA32D6FD60D76D4EE22674A03DF062882D4484EFAB16` |

hashهای artifact:

| فایل | SHA-256 |
|---|---|
| `backend/dist/server.js` | `E7A26489E1DD96E1C7E9D8C25715C2691E4E6BA590347F088C37961B10BE5CB0` |
| `backend/dist/rula-posture-ai.js` | `D613E5CF59108FF11EACA0611DC2AABF13A1DD7BD841C6F2AF698D8D22DB08BC` |
| `backend/dist/image-analysis-diagnostics.js` | `E53C574DF2E39DCE27A9E348BF7201E9335DCF408E0F24E8B2C555AC74E16C12` |

تغییرات کاندید با marker پیشنهادی `rula-both-schema-contract-candidate-20261018-02` هنوز در process اجرا نشده‌اند. staging runner تازه با hash `B23742A39F850A6B388559EDD0FDA41E1CAFEA10662EC7514D8540B5CA9407EB` و بررسی syntax موفق در `C:\NIVASafe\.local\rula-both-502-final-candidate-20261018\run-candidate-e2e.mjs` آماده است. این runner پنج ورودی تحلیل را سقف می‌گذارد: RIGHT، LEFT و سه بار BOTH؛ شامل یک text probe و حداکثر دو تلاش route برای هر تصویر، بودجه مورد انتظار حداکثر ۱۱ درخواست provider است. در خطای HTTP 502، تکرارهای بعدی را ثبت و ادامه می‌دهد؛ در صورت 200 نیز ذخیره، بررسی انسانی، ورود تازه، reload، JSON report و PDF را بررسی می‌کند.

## اعتبارسنجی کاندید و گزارش فرمان‌ها

| فرمان / نتیجه | خروجی |
|---|---|
| `C:\Runtime\node\node.exe .\node_modules\vitest\vitest.mjs run --configLoader runner --maxWorkers=2` در backend کاندید | PASS؛ ۶۰ فایل، ۴۱۴ تست؛ exit 0 |
| `C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -p tsconfig.json --noEmit` در backend کاندید | PASS؛ exit 0 |
| `C:\Runtime\node\node.exe .\node_modules\typescript\bin\tsc -p tsconfig.json` در backend کاندید | PASS؛ exit 0 |
| Vitest چهار تست RULA در `C:\NIVASafe\frontend` | PASS؛ ۴ فایل، ۲۹ تست؛ exit 0 |
| `C:\Runtime\node\node.exe scripts/check-api-contract.mjs` | PASS؛ ۹۰ مسیر فرانت، ۱۵۴ route بک‌اند؛ exit 0 |
| `C:\Runtime\node\node.exe scripts/verify-release.mjs` | PASS؛ ۲۹ بررسی؛ exit 0 |
| `pnpm --version` | 11.25.0؛ مخزن `pnpm@10.13.1` را pin می‌کند؛ wrapper با نسخه pin شده اجرا نشد. |

خروجی‌ها در `C:\NIVASafe\.local\rula-502-contract-fix-20261018\` ذخیره شدند. smoke/migration/seed روی live اجرا نشد. Full pnpm workspace، frontend build/typecheck و browser E2E اجرا نشدند. تست‌های frontend از source checkout اجرا شدند، نه از مرورگر یا static bundle live.

## Browser، امنیت و انتشار

Debug plugin tool در این session callable نبود. ابزارهای اجراشده PowerShell، Node/Vitest و browser context خواندنی CUA بودند. CUA فقط صفحه قدیمی `http://127.0.0.1:15144/rula/rula-e2e-1/report` را با خطای ارتباط نشان داد؛ این شواهد candidate جدید نیست. Playwright نصب نیست و Safari/WebKit آزمایش نشد. ساخت staging جدید متوقف ماند چون config محافظت‌شده برای حساب جاری قابل خواندن نیست و پورت MariaDB staging خاموش بود؛ هیچ ACL یا task privilege تغییر نکرد.

Production backend/frontend منتشر نشد. هیچ سرویس live restart نشد، DB/schema/records/uploads تغییر نکرد و backup یا rollback rehearsal تولید انجام نشد. مسیر public artifact/version پس از تغییرات verify نشد. مجوزهای پردازش تصویر live نیز بسته/نامشخص باقی ماندند. Runbook امن و فرمان‌های staging در `reports/evidence/rula-both-502-2026-10-18/ADMIN-RUNBOOK.md` موجود است.

## گام بعدی

یک اپراتور مجاز Windows باید runner staging را طبق runbook، با دسترسی ازپیش‌مجاز به credential و MariaDB دورریختنی اجرا کند و evidence جدید را تحویل دهد. پس از آن، browser acceptance با حساب staging مجاز و Chromium واقعی لازم است. انتشار فقط وقتی قابل بررسی است که خطای BOTH در اجرای تکراری برطرف شود، حفظ داده و rollback کد تأیید شود، و مجوز واقعی privacy/vision برای live به‌طور مستقل مستند باشد. تا آن زمان وضعیت `NOT DEPLOYED / LIVE FEATURE BLOCKED` است.

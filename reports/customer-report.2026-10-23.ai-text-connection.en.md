# AI text connection correction — customer report

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | Customer | English | 2026-10-23 | 1405-08-01 | release-ai-text-connection-20261023-01 |

The AI switch and protected credential were present. Two native Node fetch probes to the approved Arvan gateway failed before an HTTP response with UND_ERR_CONNECT_TIMEOUT at about 10.5 seconds. Certificate-verified HTTPS and a separate public Undici Agent succeeded with the same gateway/credential; a real GPT-5-Mini task description was accepted by the existing parser. Assessment text requests now use a bounded separate connection pool. Images, chat, UI, models, prompts, token budgets, request deadlines, retry rules and access/consent controls remain unchanged.

## Delivered verification

The corrected backend was deployed and returned valid real-provider text. 851 backend tests and 19 domain tests, typecheck, lint, build and independent security checks passed. Existing screens and data were preserved.

## Limits

The unavailable badge is generic; historical task-failure audit rows did not retain a specific transport/parser code. The incident diagnosis is based on the reproduced live connection differential, not a retrospective code recovered from those rows. No claim is made that every historical unavailable message had this cause. No customer image, real task text, account mutation or assessment write was used. Live verification called the real deployed adapter with synthetic text and no user/knowledge context; authenticated-route behavior is covered by tests, while live protected-route smoke only verifies unauthenticated denial. No production end-to-end account mutation or image-model accuracy test was performed.

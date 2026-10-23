# NIVASafe safe release and image-processing consent

| Field / مشخصه | Value / مقدار |
|---|---|
| Project | NIVASafe |
| Type | Customer |
| Language | English |
| Gregorian | 2026-10-19 |
| Jalali | 1405-07-27 |
| Release | release-rula-image-experience-20261019-01 |
| Revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf; preserved dirty working tree |
| Delivery | CODE DEPLOYED; LIVE IMAGE DISABLED; provider acceptance PARTIAL |

## Outcome

The new code/UI is deployed and public health verified. Image analysis is designed for every eligible organization; no organization-by-organization enablement was introduced. Public image transfer remains disabled pending real platform authorization.

Compact image cards remove duplicate filenames/messages and retain per-image editing. A bilingual, default-unchecked explicit consent dialog precedes transfer and creates an auditable receipt. Human review and the warning about independently unvalidated anatomical accuracy remain.

## Quality and limits

1092 tests and build/typecheck/lint passed. Three final-candidate image requests succeeded on synthetic staging data; two assessments across independent organizations were saved and verified through relogin, reports and PDF. Chrome390/1280 reopen passed without new provider calls. The uninterrupted full run did not pass: two image timeouts, text latency and a browser reload wait failure remain recorded. The10-call cap was respected; organization B BOTH was NOT_RUN. This is not anatomical validation.

No production data/schema migration occurred. Code/config backups and operational rollback were verified. RULA/FMEA still request only GPT-5-Mini; chatbot remains DeepSeek-V4-Flash.

## Only remaining owner decision

Complete the platform record at `docs/legal/rula-image-platform-approval.2026-10-19.md`, including the actual provider contract/account response and authorized decisions about transfer, retention, deletion, training use, applicable jurisdiction/basis and deletion responsibility. Exact proposed wording is in that file. No approval was fabricated. Remaining engineering checks and the final notice revision must precede activation; these do not require repeated implementation permission.

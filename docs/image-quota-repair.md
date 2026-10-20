# Image analysis quota repair — v51

| Field | Value |
|---|---|
| Gregorian date | 2026-10-10 |
| Jalali date | 07/18/1405 AP |
| Delivery | Deployed; actual image transmission test awaits user authorization |

## Verified failure mechanism
Nginx recorded three FMEA image responses200 followed by FMEA/RULA429 at 04:36 local time. Successful records charged26042,27010,26859 tokens using gpt-4o-mini; input costs were26014/26208/26208. Affected account cumulative usage85412/100000, remaining14588, with no pending reservations. Old RULA catches discarded AI_ACCESS_LIMIT_REACHED and reported a generic vision outage. The old fixed16000 image reservation prevented the remaining balance from supporting RULA.

## Changes
- Image primary GPT-4.1-Mini, existing GPT-4o-mini recovery preserved. Text assessment/chat model routing preserved. Official image patch budget: https://developers.openai.com/api/docs/guides/images-vision . GPT-4.1 Mini1536 patches×1.62; reserve3000 image tokens plus bounded output, text bytes and512 context margin. Legacy GPT-4o Mini fallback reserves50000 image tokens. No image downscaling/detail reduction added.
- FMEA image analysis omits unrelated knowledge, requests bounded3000-token JSON.
- RULA local/saved/text paths preserve quota/auth/rate errors; image review cache retains the message when switching images. Sequential paid image requests release reservations before the next. Stop the batch on blocking failures; do not discard ready results.
- FMEA partial successes remain visible when a later image is quota-blocked.
- PWA v51; additive source changes only; no schema/default/access/history change.

## Validation
| Check | Result |
|---|---|
| Backend tests | PASS294 tests/41files |
| Frontend tests | PASS222 tests/35files |
| Build/lint/typecheck | PASS both packages |
| Browser390/1440 | PASS quota message, one blocking request, image switch, retry all4 |
| Bilateral wizard | PASS independentRIGHT/LEFT, distinct scores, report preservation |
| Real provider bounded text probe | GPT-4.1-Mini200,12tokens; GPT-4o candidate401; model list401; existing4o-mini200 |
| Actual photo/provider semantics | NOT_RUN: automatic approval rejected worker-image external transmission/token use; async approval request remains pending |
| Live health/static | PASS local/publicHTTP200, asset hashes/backend3files match |
| Access security | PASS unauthenticated mutation401;23accounts enabled100000;0reservations |

Initial tests correctly found an old model-routing assertion and a stale v50 cache assertion; expected contracts were updated to the intentional v51 vision choice, with all safety assertions retained. Browser selectors were corrected to target visible stage-two controls, preserving product behavior.

The old backfill-only diagnostic expected quota totals to equal successful records and failed after real runtime use. It was not changed to hide the result. Live totals615366 quota vs610368 successful records; quota includes billable responses that later fail validation. No counter was reset/reduced.

## Security/integrity
Server-only model/budget selection, bounded output, locked per-user reservations, default100000 limit, upload signature/size/type checks, organization/permission boundaries and generic provider-error redaction remain. Image requests do not retrieve unrelated organization knowledge. No secrets, answers or worker image are logged or added to reports. No protected route/data/UI capability removed.

## Deployment / remaining gate
Rollback backup C:/NIVASafe/backups/vision-quota-fix-20261010. Compiled ai-access.js,ai-provider.js,modules/assessments.js and static frontend deployed; API restarted. Restore those backed-up files/static frontend for rollback; no database migration. Actual photo test remains pending consent; no claim that external vision parsing/accuracy passed. Historical consumption is retained; this account can still reach its100000 cap legitimately.

## Scoped checkpoints
01requirements/diagnosisPASS;02existingUIPASS;03frontendPASS;04backendPASS;05schemaNOT_APPLICABLE;06integrationPASS locally;07authorizationPASS;08securityPASS;09testsPASS;10browserQAPASS;11deploymentPASS;12externalvisionverificationPENDING. Full production vision completion is not claimed.

## v52 — automatic RULA photo recovery
The user explicitly requested removal of the manual retry button. Removed only that stage-two control. Image requests now make at most three attempts, with1s/3s waits, replaying the same FormData/photo/anatomical side. Successful real vision fallback is accepted without retry; local offline fallback/unavailable image responses are rejected after the bounded attempts. Existing non-image requests retain their two-attempt policy. Quota, authentication, validation, unsupported files and cancellation are not retried; context cancellation clears waiting timers. Successful image reviews and separate body sides remain preserved.

Verification:224 frontend tests/35files PASS; build/lint/typecheck PASS. Browser1440/390 tests each recover four images after one503 per photo without a manual action; quota failures stop after one call and no retry button exists. Actual provider photo requestsNOT_RUN; tests use synthetic responses. Public/local healthHTTP200, deployed JS/CSS hashes match. No backend/schema/permission change. Security review: bounded retry count/delays, unchanged allowance enforcement, no secret/data logging or authorization bypass. Existing bundle size advisory remains.

Published frontend/PWAv52. Rollback backup:C:/NIVASafe/backups/rula-auto-retry-v52-20261010. Restore its frontend for rollback. Prior real-photo verification gate remains pending; v52 UI/request orchestration is verified.

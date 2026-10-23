# NIVASafe — Direct-consent technical handoff

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Technical |
| Language | English |
| Gregorian | 2026-10-22 |
| Jalali | 1405-07-30 |
| Release | release-rula-direct-consent-20261022-01 |
| Base Git revision | 7f633f0ed1ef7c73a7c370e62b7efdfc2308fbc1 |
| Delivery | SAFE CODE DEPLOYED; PUBLIC IMAGE ACTIVATION BLOCKED |

## Scope and source baseline

Existing React/Vite, Fastify modular backend, Prisma/MySQL, private file storage and PM2/IIS delivery were retained. The working checkout already contained unrelated uncommitted work. A separate frozen candidate based on the previously deployed backend21/frontend22 was used; unrelated FMEA/R8/styles changes were not released. Base revision is recorded above; no Git push or clean whole-checkout claim is made by this task.

## Implementation

- Account image consent version is image-processing-account-2026-10-22-v2. General terms remain nivasafe-terms-2026-10-19-v1 and independent. Registration records ACCEPTED/DECLINED; account updates record ACCEPTED/WITHDRAWN. A user-row transaction and monotonic audit time serialize changes. Policy/provider/purpose and current receipt are checked, not merely a boolean.
- Active-account privacy settings remain reachable after organization access changes without granting tenant access. Existing identity, role, organization, subscription and AI-quota controls remain authoritative.
- Authenticated photo-owner grants use existing AuditLog, same-organization membership, permitted recipient, 1–90-day expiry, immutable revoke events and the owner's original current consent receipt. Reacceptance cannot resurrect an old grant. No biometric identity verification is claimed.
- Each image dispatch, including malformed-answer retry, checks current identity/permission/quota/consent/owner/platform state. A durable transfer audit is followed by a fresh recheck before actual HTTP. The internal provider hook is mandatory. Redirects are rejected to prevent replay to another recipient. The fixed endpoint uses verified Bearer authentication and requests GPT-5-Mini; API credentials stay backend-only. Network inference uses the existing 60-second default with one transport attempt; at most one invalid structured-answer retry gets fresh authorization.
- Existing 10 MB MIME/signature/normalization bounds remain. Model output is strictly validated. Existing AIAnalysisRequest stores RULA_POSTURE_IMAGE output before success with exact actor/tenant, image digest, model/times and receipt references, excluding raw image/full prompt. Storage errors are safe and nonretryable; supplementary completion-audit failure cannot discard a committed paid result. Mandatory transfer audit still fails closed.
- Private result type is unavailable through generic AI create/list/get/retry and forged worker jobs. Existing draft/attachment/private download/PDF and human review are retained. No schema change or production migration was required.
- Image queue no longer waits for job/task text; it survives step navigation. Ownership and actor/tenant are part of context/cache identity. Consent and grant UI are localized and responsive; active global CSS is preserved with only a separate scoped supplement.

## Routes

See [API contract](../docs/rula-direct-consent-2026-10-22/06-api-contract.md). Active implementation paths include /register, /profile#image-processing-consent, /rula, /api/v1/profile/image-processing-consent, /api/v1/profile/posture-image-authorizations, /api/v1/rula/image-analysis-policy, POST/GET /api/v1/rula/posture-image-analysis and /api/v1/reports/rula/:id.pdf. The analysis handler is implemented and tested; real public transfer remains disabled by the unverified provider prerequisite.

## Executed validation

| Check | Result |
|---|---|
| Backend source tests | PASS — 715; 0 fail, 0 skip |
| Frontend source tests | PASS — 471; 0 fail, 0 skip |
| Typecheck/lint/build | PASS — both applications |
| Isolated real HTTP/DB replay matrix | PASS — 27 checks, 96 HTTP requests, 4 replay analyses, 3 PDFs |
| Fresh actual Arvan synthetic BOTH | PASS — 1 new request, about 23 seconds, stored/reopened result and 50,491-byte PDF |
| Browser QA | PASS — 3 automatic upload, 8 isolated consent, 6 public-asset consent cases |
| Scope security review | PASS after redirect repair; no unresolved material introduced code finding identified |
| Packaged old/new/old rollback and public release | PASS — 6 public HTML routes, 21 immutable assets, protected API401 boundaries |
| Public real-user image transfer | BLOCKED — actual gateway processing conditions unverified |
| Independent anatomical accuracy | NOT_VERIFIED — preliminary/human-review states preserved |
| New full dependency advisory scan / external penetration test | NOT_RUN — unchanged dependency versions; scoped review only |

Exact commands and exit codes: [stage09-validation.json](evidence/rula-direct-consent-20261022-01/stage09-validation.json). Tests use unreachable unit DB/unmocked-HTTP denial; integrations use four task-specific loopback schemas on 53306. All task fixture active-user/session/org/member/reservation counts are zero. The owned53306 database process was stopped; Production health remains up.

Fresh real API proof: [result.json](evidence/rula-direct-consent-20261022-01/stage09-live-3f5d08935159/result.json), allowed effective model gpt-5-mini-2025-08-07, one request/approximately 23 seconds, six checks, validated BOTH and 50,491-byte PDF. Cumulative ledger 5/6 includes prior 4 requests. Prior actual RIGHT/LEFT/BOTH proof is preserved; the new 27-check, 96-request matrix is explicitly REPLAY. Human-review flags persist and final approval with unreviewed findings is denied.

## Failures, repairs and security

The scoped independent review found one Medium default-redirect recipient risk, repaired with redirect:error and regression coverage. It reviewed 25 files and found no unresolved material introduced code issue. No dependency version changed; a new full advisory scan/external penetration test was NOT_RUN.

Initial owner-grant unit mocking retained a real core.audit Prisma binding; a synthetic insert was rejected by P2003 for a nonexistent synthetic actor. No successful insert was observed. Explicit mock, unreachable DB override, strict disposable DSN allowlist, unmocked HTTP denial and source-only test discovery now prevent recurrence; see [incident](evidence/rula-direct-consent-20261022-01/stage04-test-isolation-incident.json). Other failed evidence remains: sparse frozen test context, CLI escaping, missing fixture name, fractional geometry JSON precision and missing dotenv harness import. Test fixtures/harnesses were repaired; product assertions were not weakened.

## Deployment, rollback and preservation

API release release-rula-direct-consent-20261022-01, PID 2524; frontend index 7fb9bd8731715243e0f3c688d1b725d361797285524eb6720930c6bda2994277 and main index-DSt9SKZk.js. Global CSS hash ab6f25e515e4d805b7274cf069f70810f67053612071fe370448ccb6df80f7d0 is unchanged; scoped supplement 3ff846b13ecd90e9ef49f65211f7a5f60b14c8a02d2287f5f21d8638a65031ca adds only authorized consent/owner selectors. All 21 published assets match HTTPS bytes. Existing assets remain; no route/source/schema/role was removed.15 runtime modules changed; private compiled test artifacts and source tests are maintained outside the executable production import graph, with the isolated test runner copied.

Packaged old/new/old cold-start rollback passed against the disposable DB with all AI disabled. Previous immutable release remains intact. Protected rollback config/index and manager state are at C:/ProgramData/NIVASafe/backups/release-rula-direct-consent-20261022-01; SYSTEM/Administrators-only ACLs protect secret state. Production .env is byte-identical, provider privacy flag stays empty and vision remains verified. PM2 state is persisted. No production user/photo/assessment data was submitted, migrated or overwritten by tests.

Recovery: restore the backed-up ecosystem and index atomically; restart only nivasafe-api with the protected original manager configuration; verify prior release health and asset hashes. Existing immutable assets need not be deleted. Never print the rollback environment or enable the provider flag while its actual processing conditions are unverified.

## Changed files

| File | Change |
|---|---|
| `backend/src/ai-analysis-types.ts` | ADDED |
| `backend/src/ai-provider.test.ts` | MODIFIED |
| `backend/src/ai-provider.ts` | MODIFIED |
| `backend/src/ai-request-routing.test.ts` | MODIFIED |
| `backend/src/assessment-routing-policy.test.ts` | MODIFIED |
| `backend/src/auth-guard.ts` | MODIFIED |
| `backend/src/image-processing-consent.test.ts` | MODIFIED |
| `backend/src/image-processing-consent.ts` | MODIFIED |
| `backend/src/modules/ai.ts` | MODIFIED |
| `backend/src/modules/assessments.ts` | MODIFIED |
| `backend/src/modules/auth.ts` | MODIFIED |
| `backend/src/modules/image-processing-consent.ts` | MODIFIED |
| `backend/src/modules/posture-image-authorizations.ts` | ADDED |
| `backend/src/posture-image-authorizations.test.ts` | ADDED |
| `backend/src/posture-image-authorizations.ts` | ADDED |
| `backend/src/registration-security.test.ts` | MODIFIED |
| `backend/src/rula-image-consent.ts` | MODIFIED |
| `backend/src/rula-image-result-repository.test.ts` | ADDED |
| `backend/src/rula-image-result-repository.ts` | ADDED |
| `backend/src/rula-image-results.test.ts` | ADDED |
| `backend/src/rula-image-results.ts` | ADDED |
| `backend/src/rula-posture-image-request.test.ts` | MODIFIED |
| `backend/src/rula-posture-image-request.ts` | MODIFIED |
| `backend/src/rula-registered-member.test.ts` | MODIFIED |
| `backend/src/rula-three-stage.test.ts` | MODIFIED |
| `backend/src/worker-image-result.test.ts` | ADDED |
| `backend/src/worker.ts` | MODIFIED |
| `frontend/src/features/account/ImageProcessingConsent.test.tsx` | MODIFIED |
| `frontend/src/features/account/ImageProcessingConsent.tsx` | MODIFIED |
| `frontend/src/features/account/imageProcessingPolicy.ts` | MODIFIED |
| `frontend/src/features/account/posture-image-authorizations.css` | ADDED |
| `frontend/src/features/account/postureImageAuthorization.ts` | ADDED |
| `frontend/src/features/account/PostureImageAuthorizations.test.tsx` | ADDED |
| `frontend/src/features/account/PostureImageAuthorizations.tsx` | ADDED |
| `frontend/src/features/assessments/AssessmentPages.tsx` | MODIFIED |
| `frontend/src/features/assessments/rulaAnalysisQueue.ts` | MODIFIED |
| `frontend/src/features/assessments/rulaAutomaticContext.test.ts` | MODIFIED |
| `frontend/src/features/assessments/rulaImageAnalysisPolicy.test.ts` | MODIFIED |
| `frontend/src/features/assessments/rulaImageAnalysisPolicy.ts` | MODIFIED |
| `frontend/src/features/assessments/RulaImageConsentDialog.test.tsx` | MODIFIED |
| `frontend/src/features/assessments/RulaImageSubjectSelector.test.tsx` | ADDED |
| `frontend/src/features/assessments/RulaImageSubjectSelector.tsx` | ADDED |
| `frontend/src/styles/account-consent.css` | MODIFIED |

Additional test/config changes: backend/package.json test script only, backend/vitest.config.ts, backend/test/database-isolation.ts, backend/test/database-isolation.test.ts, backend/test/setup.ts and the API entry/version in deployment/ecosystem.config.cjs. Feature/legal docs, release evidence, reports and state are additional artifacts. Exact tested candidate source hashes are in [final-source-inventory.json](evidence/rula-direct-consent-20261022-01/final-source-inventory.json). Frozen dependency versions, FMEA/parser research and schema were preserved.

## Stage status and actual blocker

| Stage | Status |
|---|---|
| 01 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 02 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 03 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 04 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 05 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 06 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 07 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 08 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 09 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 10 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 11 | PASS within scoped implementation/verification; stage11 covers safe-code publication |
| 12 | Code/package/public-asset review PASS; overall public activation BLOCKED by real external prerequisite |

Full public Production activation is BLOCKED, not PASS. [Required evidence](../docs/legal/rula-provider-required-evidence.2026-10-22.md) specifies the actual gateway contract/entity and retention/deletion/training/recipients/locations plus NIVASafe retention/backup policy fields. No per-user/organization managerial signoff is introduced. The current code can be released safely with the gate closed; activation requires real terms, an accurate final notice/current consent and controlled verification. Anatomical accuracy is independently unverified.

## Documentation and template alignment

README links the current account-consent API and activation evidence. `.env.example` changes comments only, distinguishing platform privacy facts from technical vision; no credential or approval value was inserted. The obsolete upload-dialog access guide is replaced with current direct-account semantics and its complete prior contents preserved under `docs/history/`.

# RULA image root-cause repair — 2026-10-21

| Field | Value |
|---|---|
| Project | NIVASafe |
| Gregorian | 2026-10-21 |
| Jalali | 07/29/1405 AP |
| Runtime | release-rula-root-repair-20261021-01 |
| Delivery | Safe code deployed; public image activation BLOCKED |

## Verified causes and repairs

1. The active server stopped before provider dispatch because the platform privacy setting was empty. Valid account acceptance did not grant platform/provider authorization. That real prerequisite remains open; no authorization was manufactured.
2. The deployed UI delayed vision until step 2 and completed activity text. Image analysis now starts in step 1, survives navigation to step 2, and accepts absent supplementary activity fields. Text-only analysis still requires its context.
3. The deployed endpoint still required obsolete per-upload consent flags/version in addition to the durable account receipt. The backport uses current server-read account acceptance for every transfer; no new checkbox/dialog was added. Current Git main already contained the modern account-transfer contract and image-first request schema.
4. Activity typing could cancel/requeue a paid image request. Image geometry now uses stable side/language/posture context, independent of supplementary activity text.
5. Updating an in-progress assessment or linking its image incorrectly required final review. Draft/provisional persistence now works. APPROVED still requires review of every submitted side/image, including nested observations.

## Actual validation

| Check | Result |
|---|---|
| Deployed-baseline backend tests | PASS 651 |
| Deployed-baseline frontend tests | PASS 443 |
| Current-main Git backend tests | PASS 662 |
| Current-main Git frontend tests | PASS 454 |
| TypeScript build/typecheck/lint aliases | PASS, frontend/backend for the release candidate and clean Git checkout |
| Frontend production builds | PASS, Vite 7.3.6 deployed-baseline backport; Vite 7.3.7 Git candidate; existing >500 kB warning remains |
| Fresh disposable schema initialization | PASS, Prisma db push, no data-loss switch, isolated MariaDB 53306 |
| Real provider | PASS RIGHT/LEFT/BOTH; two independent organizations; ordinary USER/HSE_SPECIALIST accounts |
| Save/reopen/private download/PDF | PASS for all three analyses; PDFs 45286, 44533, 48090 bytes |
| Authentication/roles/tenant denial/withdrawal/quota | PASS; no dangling reservations |
| Browser interaction/visual QA | NOT_RUN: local browser observation was declined; no bypass or existing browser session used |
| Independent anatomical accuracy | NOT_VERIFIED; provisional rows retain human review |
| Public end-to-end image processing | BLOCKED, authenticated synthetic probe HTTP 503, privacy-approval-missing |

The shared paid-test ledger contains exactly four successful GPT-5-Mini image calls: an initial RIGHT request that exposed draft linking, then RIGHT/LEFT/BOTH validation. The final continuation reused its already verified RIGHT response instead of charging it again. No real worker image or private FMEA report was transmitted. No model fallback, R8 experiment, or alternate pose model was enabled. RULA/FMEA remain GPT-5-Mini and chat remains DeepSeek-V4-Flash.

## Failures found during verification

- New tests first reproduced legacy per-image rejection (403), absent activity rejection (400), and missing automatic-start behavior. They passed after repair.
- The live synthetic integration exposed RULA_POSTURE_REVIEW_REQUIRED on draft image linking; a regression failed before the fix and passed afterward. Final approval denial remains tested.
- The harness initially used a Windows path for --import, expected 403 where tenant-scope rejection intentionally returns 401, and compared database JSON floats bit-for-bit. Those test-environment defects were repaired and their failed evidence preserved. Float persistence is compared at 1e-9 precision; production geometry thresholds were unchanged.
- The clean Git checkout initially lacked built shared/domain exports. Building the workspace prerequisite resolved collection failures. A source-contract test was updated to require the intentional conditional dependency behavior; behavioral regressions remain tested.
- Two release preflights stopped before cutover while verifying rollback file ACLs. An explicit SYSTEM/Administrators-only ACL was established and verified with native icacls before any environment snapshot was written.

## Release and preservation

The production backport changes three compiled backend modules and the RULA scheduling JavaScript from the frozen deployed baseline. Existing production CSS, static assets, routes, authentication, quotas, models, database schema and unrelated UI are preserved. Current-main Git changes preserve its newer FMEA controls and test coverage; unrelated dirty working-tree changes were excluded. Source/runtime snapshots are intentionally distinguished; this is not a claim that every Git file was deployed.

Public health, four HTML routes and 18 JavaScript artifacts passed. Anonymous protected endpoints remained 401. Account consent without obsolete multipart flags now reaches the genuine remaining platform gate. The protected root .env is unchanged. RULA_IMAGE_VISION_SUPPORTED_PROVIDER now truthfully records verified technical image capability; privacy approval remains empty. No per-organization allowlist was added.

Backup: C:/ProgramData/NIVASafe/backups/release-rula-root-repair-20261021-01. Restore its ecosystem config and frontend index, restart the previous API entry, and verify health/version to roll back. Old immutable assets remain available. No migration or customer-data rollback is necessary. A packaged cold start and static old/new/old rehearsal passed; an additional actual service rollback was NOT_RUN.

## Security review

PASS for the changed boundaries: server-authoritative durable consent, audited dispatch before transfer, role and tenant checks, raster signature/size/decoder bounds, quota reservation/usage, private image access and review-required finalization. Synthetic outbound staging was constrained by normalized-image hash, destination/model allowlist and a persistent six-attempt ceiling. Four attempts were used. Fixtures were disabled and sessions revoked. No production bypass or synthetic provider wrapper was installed. No new dependency was introduced. A fresh repository-wide dependency audit was NOT_RUN because this targeted repair does not change dependencies.

## Remaining owner decision

Complete the prepared decision in docs/legal/rula-image-platform-approval.2026-10-19.md with the actual terms/reference for this account and endpoint, authority to process user images, processors, transfer/retention/deletion/training terms, applicable processing basis, approver and date. Do not guess missing facts. Align the final notice/consent version with those terms before setting RULA_IMAGE_PRIVACY_APPROVED_PROVIDER once at platform level. No organization-by-organization approval is needed.

The general [Arvan privacy policy](https://www.arvancloud.ir/en/legal/privacy-policy) excludes customer-processed content from its scope. Its [DPA](https://www.arvancloud.ir/en/legal/data-processing-agreement) is conditional. [AIaaS documentation](https://docs.arvancloud.ir/fa/aiaas/) says conversation history is not stored; this does not establish image-specific handling or contract applicability for api.arvancloudai.ir. Those facts were not inferred from a working API key.

## Scoped stage checkpoint

01–09: technical analysis, preserved design, implementation, disposable persistence, API, auth, security and executable tests completed. 10: synthetic QA passed; public activation BLOCKED. 11: safe-code deployment completed under the owner's instruction to ship safe fixes while genuine approval is pending. 12: technical/preservation review completed; overall image-feature release remains BLOCKED. PROJECT_STATUS is not COMPLETE.

Evidence: reports/evidence/rula-root-repair-20261021-01/. Secret-bearing rollback state remains outside the repository with restricted ACLs.

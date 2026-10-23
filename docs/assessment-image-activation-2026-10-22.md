# Assessment image processing repair

Date: 2026-10-22 / 1405-07-30.

## Scope and owner decision

The owner requested restoration of customer image analysis in RULA and FMEA. The prior deployment had empty operator flags, so account consent could not enable image transfer. Activation is now an explicit operational decision, separate from any claim that vendor processing terms have been verified.

`RULA_IMAGE_PROCESSING_ENABLED_PROVIDER` and `FMEA_IMAGE_PROCESSING_ENABLED_PROVIDER` select the activated provider. An explicitly empty value disables the scope even if a legacy privacy-approval setting remains populated. Deployments without the new setting retain the legacy configuration behavior. Vision capability, provider availability, current user consent and access are independently enforced. Legacy privacy-approval fields remain empty in this deployment; unknown gateway retention, deletion, training and processing-location facts remain unknown.

## Necessary consent update

The existing checkbox now covers authorized RULA posture and FMEA process images. Version `image-processing-account-2026-10-22-v3` uses purpose `assessment-images`. V1/V2 receipts are preserved and cannot authorize the expanded scope. Users must save their own new consent once; no receipt is silently upgraded. Withdrawal stops subsequent transfers. Prior posture-owner grants remain visible and owner-revocable, with an outdated status until replaced under the current policy.

No new product field, page, button, section or layout was introduced. Only the existing image-processing disclosure changed.

## Transfer boundary

RULA retains account consent, photo-owner grants, role, organization, quota, signature/type/size checks, validated durable findings and protected retrieval. FMEA now checks current consent plus fresh authentication, organization, role and quota before transfer. Both paths audit the image hash and recheck authorization at the actual HTTP boundary. FMEA checks the same receipt again after the mandatory audit. Neither path follows provider redirects or automatically replays a timed-out image request. The existing RULA malformed-answer validation remains separately bounded.

FMEA invalid JSON or incomplete rows fail explicitly rather than producing an empty successful analysis. RULA's existing source instruction to avoid inventing missing task, repetition, duration or force context is included in the release.

## Preservation and verification

The candidate starts from the previously deployed frozen source, then overlays only the image-processing modules, consent text and matching tests. Routes, layouts, other pages, database schema and dependency versions are preserved. Builds use existing installed dependencies; no install or upgrade is required. The private environment is not rewritten. Deployment changes only the API process and new static asset references, retains existing assets and includes a private rollback snapshot.

Evidence is recorded under `reports/evidence/assessment-image-activation-20261022-01/`. Initial candidate setup failures remain in their logs: missing built workspace exports and missing Node test types were repaired in the staging harness. The complete successful suites replace no assertion and skip no test.

Production readiness is limited to verified technical image transport and application behavior. AI accuracy and external vendor processing guarantees are not inferred from successful API calls.

## Final executable validation

The frozen candidate passed 744 backend tests and 475 frontend tests, with zero failed or skipped tests. Both packages passed TypeScript checks and production builds; their lint commands use the same TypeScript no-emit check. The existing large JavaScript chunk warning remains. Five additional release-identity regression tests reject a new version label with an old executable, a different listening process and a matching path present only in unrelated arguments.

Eleven isolated integration checks used two genuine synthetic image calls, one RULA and one FMEA. They verified current-consent enforcement, missing/V2/withdrawn-consent denial without outbound transfer, durable findings, draft persistence, reopening and real PDFs. The isolated account was disabled, sessions revoked and the owned database server stopped. No production schema migration, dependency change or private environment rewrite occurred.

## Deployment incident and correction

Earlier deployment attempts temporarily interrupted API availability and recovered the previous release. The first apparent success at 17:05:31Z was invalid: APP_VERSION changed while PM2 still executed the old V2 file. The owner's consent-save error and an independent OS process inspection exposed this. The incorrect declaration remains in `deployment-initial-label-only.json`; earlier failure/recovery evidence remains in `deployment-failure.json`.

PM2's public JSON validation strips `pm_exec_path`. The corrected release operation targets the verified existing API process through `restartProcessId` with `env.current_conf`, then requires matching PM2 path, OS command line, listening PID and database health. Final activation occurred at 2026-10-22T17:11:54.251Z, PID16632, executing the new immutable release entry. The worker and reverse proxy configuration were preserved. Existing global CSS and its supplement were preserved byte-for-byte; only the JavaScript entry reference changed, and old assets remain available.

## Public authenticated confirmation

The owner personally saved V3 consent after the runtime repair; the refreshed account screen showed the checked choice and registered status. The connected browser then sent the known synthetic illustration to both live image paths. RULA received `gpt-5-mini-2025-08-07` findings after one explicit retry following a transient connection failure; the underlying network cause remains undetermined. FMEA succeeded on its first image attempt and added five proposed rows. No automatic transport replay or TLS weakening was introduced. Concurrent owner requests using other images were excluded from this test evidence.

The existing, clearly marked test assessments were updated and remain DRAFT: RULA `92927dab-e99e-4c0c-a8a5-08feb3f9652f` has two linked images, including the new findings requiring human review; FMEA `d65ce6f0-de88-49e8-a69c-6e79700c3e28` contains25 rows, including the five new image proposals. Both were reopened as saved reports and downloaded as nonempty PDFs (RULA5 pages, FMEA11 pages). Their previous test data and the unrelated in-progress new-assessment draft were preserved. No official assessment approval was performed.

Final evidence: `live-browser-results.json`, `live-pdf-validation.json`, `independent-final-review.json` and `network-runtime-review.json` under the evidence directory. Full-repository advisory scanning, external penetration testing and independent anatomical-accuracy validation were not performed for this focused repair. Unknown vendor retention, deletion, training and processing-location guarantees remain disclosed limitations.

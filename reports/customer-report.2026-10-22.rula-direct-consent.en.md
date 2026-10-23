# NIVASafe — Direct image consent delivery

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Customer |
| Language | English |
| Gregorian | 2026-10-22 |
| Jalali | 1405-07-30 |
| Release | release-rula-direct-consent-20261022-01 |
| Base Git revision | 7f633f0ed1ef7c73a7c370e62b7efdfc2308fbc1 |
| Delivery | SAFE CODE DEPLOYED; PUBLIC IMAGE ACTIVATION BLOCKED |

## Delivery

The safe implementation is published. Image-processing consent is optional, unchecked by default and separate from general terms in registration and account settings. The provider, purpose, transferred data and unverified retention conditions are disclosed before the choice. Existing users can explicitly renew consent; uploads do not ask again after valid consent. Withdrawal blocks new transfers. Another person's photo requires an authenticated, revocable owner grant. No manual owner approval is required for each user or organization.

Automatic image analysis starts at upload, even before job/task text is complete, and continues into stage2. Findings are validated and saved before success; private retrieval and assessment/PDF flows work. RULA/FMEA request GPT-5-Mini; chat remains DeepSeek-V4-Flash.

## Verified quality

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

The fresh API test used only a fixed synthetic stick-figure illustration. Prior real RIGHT/LEFT/BOTH evidence is retained; the current two-organization matrix replays those synthetic responses and is not represented as new live inference for every side. Five requests of the existing six-request cumulative budget have been used. Test accounts are disabled and sessions revoked.

## Public activation and required action

Public transfer of real user photos is not activated. Consent does not establish the actual provider's processing contract. The outstanding facts are the applicable contract/entity for this exact gateway, image/context/output/log/backup retention and deletion, training use, recipients/locations, and NIVASafe's actual retention/backup policy. No values or approval were fabricated.

The precise evidence fields and required policy decision are documented in [required evidence](../docs/legal/rula-provider-required-evidence.2026-10-22.md), with the machine-readable [platform record](../docs/legal/rula-provider-activation-record.2026-10-22.json). Once established, update the notice and consent version if materially changed, then enable the verified platform-wide configuration. No organization-by-organization activation process is needed.

## Handover

Safe code deployment and scoped technical checks passed. Full public image activation remains BLOCKED. Anatomical accuracy has not been independently certified. The [technical report](technical-report.2026-10-22.rula-direct-consent.en.md) lists routes, files, evidence and recovery.

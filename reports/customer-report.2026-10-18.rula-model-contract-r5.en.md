# NIVASafe — RULA delivery checkpoint

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Customer report |
| Language | English |
| Gregorian / Jalali | 2026-10-18 / 1405-07-26 |
| Generated UTC | 2026-10-18T20:00:41.882Z |
| Revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf |
| Candidate | rula-versioned-tables-candidate-20261018-05 |
| Delivery | NOT DEPLOYED; staging technical E2E verified; accuracy gate FAIL |

## Verdict

The technical RULA journey works in isolated staging, but this is not an accepted live release. The configured GPT-5-Mini model still made material anatomical-angle errors on the synthetic reference. The running website was not changed.

## Delivered source and verified behavior

1. RULA and FMEA AI routing is constrained to ArvanCloud GPT-5-Mini, with no alternative provider/model or invented scored fallback; chat remains DeepSeek-V4-Flash. The currently running older build still contains GPT-4.1-Mini/GPT-4o-mini RULA routing, so the source fix is not yet a live fix.
2. The final backend genuinely received accepted RIGHT, LEFT and BOTH image results, saved assessments to disposable MariaDB, reopened them after sign-in, and generated reports/PDFs. Repeated final BOTH tests passed without 502.
3. Replaced the averaging formula with published RULA worksheet tables and explicit calculation versions. A read-only check found 44 of 51 existing live assessments would differ under the new formula. Their stored values were not changed; legacy calculations are preserved on reads/metadata edits.
4. Every AI image observation requires human confirmation. The real browser edited all 14 bilateral rows against the synthetic geometric reference and saved/reopened the result.
5. Real Chrome desktop/mobile checks at 1280/390 px passed; final error recovery preserved closed privacy gates, showed explicit retry, and stored no false score.
6. Final pinned build/lint/typecheck, 803 automated tests and static contract/release checks passed. Candidate production-dependency audit returned zero findings.

## Remaining conditions

- **HIGH:** automatic posture accuracy failed the engineering reference check: 14/20 angle comparisons were within ±15°, with a maximum 90° error. Professional ergonomic validation has not occurred. A matching total RULA score does not validate incorrect individual angles.
- **HIGH:** production image-processing/privacy approval has not been established. No gate was enabled and no customer photograph was transmitted.
- **HIGH:** code publication and operational cutover/rollback acceptance were not performed. Backups were reconstructed and hash-verified, which is narrower than a tested service cutover.
- The exact historical 502 response mismatch remains unknown because the original response shape was not captured. A confirmed angle-to-score/parser incompatibility was repaired; the new bounded runs did not reproduce 502.
- Safari/iOS/WebKit, current Persian RTL browser coverage, public authenticated RULA/support acceptance and a genuine new chat/FMEA AI request were not run.

## Owner-side requirement

Obtain documented ergonomic acceptance of the reference/review workflow and the organization's image-processing privacy approval before live activation. The existing Arvan credential and model catalog worked; an account entitlement change has not been shown necessary.

## Evidence

See `C:\NIVASafe\reports\evidence\rula-model-contract-2026-10-18\acceptance-matrix.md` and the accompanying English technical report. Production services, deployment files, credentials, accounts, uploads and database records were not modified.

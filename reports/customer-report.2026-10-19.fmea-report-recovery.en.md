# NIVASafe — FMEA report and session recovery

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Customer / English |
| Gregorian | 2026-10-19 |
| Jalali | 1405-07-27 |
| Frontend | release-fmea-report-recovery-20261019-01 |
| Backend | release-fmea-ai-reliability-20261019-01 |
| Repository base | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf + preserved dirty tree |
| Status | DEPLOYED — scoped update |

## Delivered

The live report shows five compact suggested-action cards. The dots button is removed. Titles use the same small type size as secondary text while retaining the ink color and a single line. Clicking a title opens the retained full-text review dialog. Registration, deletion and manual actions remain available.

Expired-session requests renew before dashboard, notifications and quota calls; concurrent tabs share one rotation. The PWA handler preserves the browser’s native installation promotion and only opens the custom install prompt following a user click.

## AI result and limits

Genuine ArvanCloud GPT-5-Mini inference, action registration, fresh login/GET and PDF passed in isolated staging. The final public result is **NOT_RUN_PUBLIC_OWNER_SYNTHETIC_ONLY**. The requested model is GPT-5-Mini; the returned model is not returned for the final public request. Chat remains DeepSeek-V4-Flash.

An earlier public request completed with fallback at approximately 60 seconds. Its discarded exception prevents a definitive historical root-cause claim. The new FMEA-only profile allows one attempt up to 85 seconds under the existing 90-second client limit, requests five concise JSON actions, rejects invalid/unmapped output, and records safe failure reasons. External gateway availability is not guaranteed. Existing suggestions remain visible on failure and are not relabeled as successful AI.

## Validation and preservation

1067 tests, build, lint and typecheck passed. Chrome 155.0.8059.80 exercised real isolated API/database workflows. Public widths 390 and 1280 passed without overflow; five cards, full-text dialog and no new console warnings/errors were verified. Server/DB health is HTTP 200.

Existing accounts, assessments, uploads, historic RULA rules, FMEA scoring, support, login/Enamad, navigation and chat are preserved. No production schema/data migration or privacy approval change occurred. Live RULA image processing remains disabled pending genuine platform privacy/provider authorization; anatomical accuracy is not independently certified.

## Rollback

Frontend backup: C:/ProgramData/NIVASafe/backups/release-fmea-report-recovery-20261019-01/frontend. Backend/config backup: C:/ProgramData/NIVASafe/backups/release-fmea-ai-reliability-20261019-01. Artifact reconstruction and isolated operational rollback passed. Newer user data is never restored or rolled back by the code rollback.

The private production-report AI test was not run by owner choice; genuine inference passed only with isolated synthetic test data.

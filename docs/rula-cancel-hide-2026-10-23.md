# RULA cancellation button visibility

Gregorian: 2026-10-23; Jalali: 1405-08-01; Release: release-rula-cancel-hide-20261023-01

Both existing Cancel image analysis controls now have consistent button styling and are temporarily hidden in the frontend: the loading-note action and the image-review action. Their original DOM and cancellation handlers remain intact. Analysis, progress, errors, retry, image review and all unrelated controls are preserved.

## Scoped implementation

The 527-file frozen source tree changes only through the appended frontend/src/styles.css supplement. Selectors target .rula-image-cancel and the direct secondary button inside .rula-ai-image-note.is-loading. Source inspection confirms these are the two controls calling cancelRulaImageAnalysis. No JSX, JavaScript, request, queue, API, persistence, authentication or authorization changes. No other cancel, retry or image-edit control is hidden.

The retained button baseline defines theme-aware surface/text/border colors, 8 px radius, inherited typography, compact spacing and a minimum 44 px height, with hover, focus-visible and disabled treatments. The final rule sets display:none for exactly the same pair. This removes only their visual, keyboard and accessibility exposure while hidden; it does not invoke or disable cancellation logic. To restore the UI later, remove only the final visibility rule and retain the styling.

## Verification

| Check | Result |
|---|---|
| Domain compilation; frontend typecheck/lint/compile/build | PASS |
| Actual-bundle isolated browser checks | PASS — 5 |
| Deployed-artifact browser acceptance | PASS — 3 |
| Scoped security/preservation and public bytes/API identity | PASS |
| Unit/backend/dependency suites | NOT_RUN — CSS-only change; logic/dependencies unchanged |
| Production analysis/upload/cancellation/account mutation | NOT_RUN — isolated synthetic fixtures only |

Exact commands, hashes, screenshots and browser cases are under reports/evidence/rula-cancel-hide-20261023-01/. Browser fixtures run on an owned loopback origin with synthetic image/analysis data; no real provider call or production user data is used. Existing consent, tenant boundaries, analysis lifecycle and error handling remain authoritative. CSS adds no endpoint, dependency, secret or outbound resource. No whole-product security or anatomical-accuracy certification is claimed.

## Deployment and rollback

Only /assets/rula-cancel-hide-9f4c14729428.css and one stylesheet link are published. Entry /assets/index-m3J74nZ0.js, all seventeen previous stylesheet links and all 855 previous non-index public files are unchanged. API release-ai-text-connection-20261023-01, PID 11776, all 366 private backend files, environment and proxy are unchanged; no restart, data migration or business-data mutation. Atomically restore C:/NIVASafe/.local/rula-cancel-hide-20261023-01/index.before.html for rollback while retaining immutable assets and data.

## Scoped delivery stages

01 requirement/repository analysis; 02 existing design preservation; 03 scoped CSS; 04–07 unchanged backend, database, API and authorization boundaries; 08 scoped security review; 09 build/type/lint; 10 isolated responsive QA; 11 immutable frontend publication; 12 independent source/evidence/deployed-artifact and bilingual report review.

## Retained validation history

The first browser run failed because its harness measured existing CSS transitions before they settled, assumed a fixed request count despite automatic retries, and matched both dialog Cancel controls. The original evidence and helper are retained under reports/evidence/rula-cancel-hide-20261023-01/attempt-01-harness-checks/ with correction.json. Only the harness was corrected: await existing transitions, assert that manual retry adds one request to the observed automatic-attempt count, and select the intended dialog footer Cancel. All five checks then passed without product source or CSS changes.

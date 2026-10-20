# Independent RULA photo assessment repair

## Scope and failure mechanism

The previous image prompt supplied an all-undetected, score-1 example. The provider could reproduce that empty example while the UI marked the photo ready. Independent photo reviews existed only in transient memory; the report and persistence used the selected photo's analysis rather than the complete set.

## Implemented behavior

- Prompt describes the output fields without blank numerical examples. It asks for visible posture angle estimates and uncertainty. An entirely undetected response is rejected instead of being labelled a successful assessment.
- Each photo retains its own posture, anatomical sides, force and muscle-use adjustments, model and independent official RULA calculation.
- Selecting an uploaded or saved photo loads that photo's observations and adjustments. Existing saved photos without snapshots can be analysed again through the authenticated download and image-analysis APIs, without uploading duplicate attachments.
- Photo reviews are stored in the existing posture-analysis JSON, bounded to four nonrecursive observations. Uploaded attachments are linked to their observations; the primary image pointer follows the highest whole-image risk when available.
- Final scoring uses the highest whole-image result. It does not combine unrelated maximum joint scores from different photos. Backend scoring recalculates independently and persists the corresponding primary observation and inputs.
- Step navigation and final submission require every supplied photo to finish analysis. Failures can be retried; partial observations are preserved.
- Report AI receives every photo's structured observations and adjustments. A responsive report section lists the independent scores. BOTH-side entries retain separate anatomical observations.
- Editing a report updates the original primary photo snapshot while preserving other photos. Manual assessments without images continue through the original path.

## Validation evidence

| Check | Result |
| --- | --- |
| Frontend tests | PASS: 189 tests, 28 files |
| Backend tests | PASS: 261 tests, 34 files |
| Domain tests | PASS: 12 tests, existing Turbo cache |
| Production build, lint, typecheck | PASS; existing frontend bundle-size warning remains |
| API contract | PASS: 71 client paths match 126 backend routes |
| Real Edge responsive report fixture | PASS: 390, 768, 1024 and 1554px; four entries, no clipping or horizontal overflow |
| Live Arvan image analysis | PASS: gpt-4o-mini-2024-07-18, 16.491s; visible angles and non-default scores returned |
| Production assets and API | PASS: local/public HTTP200; asset hashes and four deployed backend module hashes match source build |
| Production database | PASS: health reports database up; MariaDB service running |
| Authenticated production mutation | NOT_RUN: no production account credentials or customer data used for a mutation test |
| Migration | NOT_APPLICABLE: existing JSON storage; no schema or data migration |

The initial added fixture assertion assumed a neutral final score instead of computing the official expected result; it was corrected. New backend test fixtures needed explicit non-null array access for strict TypeScript. Both failures were repaired and verification rerun.

## Security and regression review

Snapshots have strict schemas, bounded names, UUID attachment references, adjustment ranges and a maximum count. Nested snapshot collections are rejected. POST cannot refer to pre-existing attachments; PATCH checks each reference against organization, assessment entity, image kind and deletion state. Existing authentication, assessment permissions, upload signature/MIME/size limits and rate limits remain. Filenames are rendered through React escaping and tested with script-like text. No new raw HTML, SQL, shell execution, outbound destination, secret or log payload was introduced. Download object URLs are revoked and stale asynchronous results are ignored.

Existing routes, manual scoring, corrective action controls, table design, BOTH-side calculations, production settings and unrelated local changes are preserved. No environment file, credential, database data or Git history was changed. Production uses the existing PM2 process; no duplicate service was created.

## Provider limitation

The existing Arvan vision fallback remains necessary because GPT-5-mini image requests failed upstream. GPT-5-mini remains the configured textual risk/report model. Live returned angles are AI estimates, not independently verified measurements; unavailable joints remain marked undetected and observations remain editable. Successful provider execution does not prove expert-level accuracy for every image.

## Deployment and rollback

Source: `C:/NIVASafe/backups/rula-table-fix`, based on `c90c11a32c49d2948b417d3363df8fdd8e7fb6ce` plus preserved patches. Frontend deployed to the existing Nginx directory. Only four changed backend runtime modules were copied; the existing API PM2 process was restarted. PWA cache v19 uses the existing update mechanism.

Rollback snapshot: `C:/NIVASafe/backups/release-rula-multi-image-20261008-143348`. Restore its frontend and four backend modules through the current process manager if required; database rollback is unnecessary. Public/local evidence is recorded under `C:/NIVASafe/backups/rula-image-layout-evidence.json` and `rula-multi-image-backend-evidence.json`.

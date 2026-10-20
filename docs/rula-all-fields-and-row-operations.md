# RULA row operations and FMEA numbering

## Scope

The existing RULA report table and FMEA report workflow are preserved. The RULA editor uses the existing dialog design with a desktop width of 980 px and a responsive mobile layout.

## Changes

- RULA row editor supports group label, body-part label, angle, detection state, suggested score, score share, corrective-action title/description, priority and completion state. Anatomical angle/score inputs apply to posture rows; general corrective actions do not become fabricated anatomical observations.
- Existing corrective actions update through their authenticated action endpoint. Their existing status is preserved when editing text; explicit completion changes use the existing progress calculation.
- All editable rows have a completion button and a delete button, including posture-only rows. Completion and deletion persist for posture-only rows in bounded evaluation-row metadata.
- RULA deletion is a versioned table-row deletion marker, retaining the original image observations and official score inputs. Visible rows are numbered consecutively after filtering. Deleting a displayed row does not delete photographs or erase historical observations.
- Display labels and score-share edits are independent of official anatomical group formulas. Canonical RULA calculations continue using the seven anatomical inputs.
- FMEA deletion retains authentication, permission and organization checks. A transaction locks the parent assessment, deletes the requested matching item, and compacts the remaining row numbers while preserving item IDs and links.
- No database schema migration or production secret/configuration change is required. Frontend service-worker version is v21.

## Validation evidence

| Check | Result |
| --- | --- |
| pnpm test | PASS: frontend 190, backend 266; domain 12 from existing verified cache |
| pnpm build | PASS for frontend/backend/domain |
| pnpm lint | PASS; repository lint uses TypeScript checks |
| pnpm typecheck | PASS |
| git diff --check | PASS |
| scripts/check-rula-row-editor.cjs | PASS: combined edit, cancellation, partial failure/retry, keyboard focus, all completion/deletion controls, deleted-row renumbering |
| Dialog viewports | PASS: 390/768/1554 px; dialog 358/736/980 px; no dialog overflow |
| Local/public login and health | PASS: HTTP 200; database up |
| Deployed assets | PASS: public asset hashes match the built files |

FMEA transactional tests use isolated persistence mocks; no production assessment was deleted during validation. Dependency auditing and unrelated feature verification were not repeated for this bounded change. Existing bundle-size warning remains.

## Security and integrity review

New persistence fields have strict backend schemas, bounded array/text lengths, enumerated priority/status, and finite score-share bounds. User text is rendered through React escaping. The existing assessment and action authorization boundaries are preserved. Deletes require user confirmation. No unsafe HTML, executable strings, credential handling or security-header changes were introduced. Other routes, features, database schema, AI integrations and private configuration are preserved.

## Deployment and recovery

Nginx serves the static production frontend. The two affected backend modules were copied to the existing API runtime and the existing nivasafe-api PM2 process was restarted. The first immediate health probe occurred before startup completed and returned connection refused; the subsequent local/public probes returned HTTP 200. Rollback artifacts are recorded in C:/NIVASafe/backups/rula-all-row-controls-rollback-path.txt and the production deployment manifest. No duplicate service was created.

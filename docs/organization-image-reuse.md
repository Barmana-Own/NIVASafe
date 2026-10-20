# Organization image reuse for assessments

## Scope and preservation

Added an organization-image selection button beside the existing local image selector in RULA and FMEA. Existing image analysis, uploads, assessment fields, routes, authorization, databases, configuration and previous local changes are preserved. No backend/schema/dependency changes were needed for this task.

## Implementation

- Shared `OrganizationImagePicker` loads the current organization's authenticated `/files` listing in pages of eight records.
- Only JPEG, PNG and WebP images within the destination assessment's size limit appear. Downloads use the existing authenticated, organization-scoped file download endpoint.
- At most two preview downloads run concurrently. Unmounted/page-change responses cannot update the modal; preview object URLs are revoked on cleanup.
- Actual downloaded MIME and size are checked before creating a File. Existing assessment upload validation remains authoritative, including server content validation.
- Selection is bounded by remaining capacity: RULA four images total / 10 MB each; FMEA three / 5 MB each. Selections can span pages.
- Selected File objects enter the same local-image selection handlers, preserving duplicate detection and existing analysis/upload flows. Original organization files are not altered or deleted.
- Modal supports Escape, focus trapping/restoration, RTL/LTR, loading, empty, retry and pagination states. Buttons cannot submit the surrounding assessment form or open the native file dialog.

## Validation evidence

| Check | Result |
| --- | --- |
| Frontend tests | PASS: 206 tests, 31 files |
| Full workspace production build | PASS: 3 packages |
| Workspace lint and typecheck | PASS |
| Browser integration | PASS: real RULA and FMEA components at 390 and 1280 pixels, filtering, multi-selection, limits, Escape and focus restoration, existing-form image previews |
| Native file chooser interference | PASS: zero unexpected file dialogs |
| Modal horizontal overflow / browser runtime errors | PASS: none in four scenarios |
| Git diff whitespace check | PASS |
| Security review | PASS for changed boundaries: existing organization-scoped authentication retained; encoded download identifiers; no HTML injection, credentials, new API, permissions or configuration changes |
| Live health and asset hashes | PASS: local/public frontend and API HTTP 200; database up; published JS/CSS match built artifacts |
| Real private images / external AI calls | NOT_RUN: tests use synthetic images; no production private data submitted for testing |

Existing non-blocking build warning: main JS chunk exceeds 500 kB.

Evidence: `C:/NIVASafe/backups/organization-image-{tests,build,lint,typecheck}.log`, `organization-image-browser-evidence.json`, `rula-image-layout-evidence.json`.

## Deployment and recovery

Frontend published into existing Nginx static directory on 2026-10-09. PWA cache version advanced to v27. No backend restart, migration or service duplication.

Rollback snapshot: `C:/NIVASafe/backups/release-organization-images-20261009-123124/frontend`. Restore this frontend snapshot through the existing static deployment process if necessary. Production `.env`, secrets and user data are untouched.
## Image button visual alignment — 2026-10-09

Both image choices now use equal grid columns, 44px height, 12px font and radius, matched borders, colors and 16px icons. The local choice is an explicit non-submit button invoking the existing file input, with pointer events enabled; the organization choice continues opening its existing picker. Existing assessment logic, limits, APIs and credentials are preserved.

Verification: four Playwright scenarios (RULA/FMEA, widths 390/1280) measured identical dimensions and computed visual properties for both choices. Each scenario successfully opened the native local file selector and organization image dialog. Frontend build, lint, typecheck and PWA contract tests passed. Security/regression review found no new data/API/auth boundaries. Live frontend/API return HTTP 200, database up, public assets match the release. PWA v28. Rollback: `C:/NIVASafe/backups/release-image-buttons-20261009-124405/frontend`. Evidence: `C:/NIVASafe/backups/image-button-design-evidence.json` and `image-button-design-*.log`.
## Selected FMEA image actions repair — 2026-10-09

The selected-image action row now sits independently below the gallery, aligned to the physical left corner of the box. The previous absolutely positioned change span was replaced with an explicit local-image button. The organization-image button remains alongside it and continues using remaining capacity and the authenticated picker. Existing images are preserved when another source is selected; existing three-image and size limits remain enforced.

Browser evidence: `C:/NIVASafe/backups/fmea-selected-image-actions-evidence.json` verifies local selection, organization selection after the first image, subsequent native file selection, and a separate left-aligned action row at 1280/390/320 widths. No box overflow, overlap or browser runtime errors. Tests: 206 PASS. Frontend build, lint/typecheck and scoped security review: PASS. No backend, permission, database or secret/configuration changes. The underlying failure was the absolute positioning inherited by the old change span, which overlapped the adjacent organization control.

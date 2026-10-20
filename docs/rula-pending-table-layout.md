# RULA pending-result table layout

## Scope

- Persian and English upload guidance uses a generic AI service name.
- Existing provider selection and analysis behavior are preserved.
- Stage-two posture tables use fixed column proportions above 760px, wrapping headings, detection states, source badges and manual-review labels within their cells.
- Existing phone cards, data, edit controls and result fields are preserved.

## Verification

- Frontend: 224 tests in 35 files PASS.
- TypeScript/lint and production build PASS. Existing bundle-size advisory remains.
- Browser: ready and unreviewed states at 320, 390, 768, 1024 and 1440 pixels; visible table elements remain inside cards and badges inside desktop cells; no page horizontal overflow.
- The phone table heading is intentionally clipped for accessibility; its invisible geometry is excluded from visual overflow assertions.
- Browser image responses are fixture responses; no external AI request is part of this copy/layout change.
- Security review: only static CSS, localization and cache-version changes; no authentication, authorization, upload, quota or provider boundary changes.
- Regression review: no source/result fields or existing user operations removed; mobile card behavior preserved.

## Deployment

- PWA cache version v53.
- Public health/login and local health/login HTTP 200; served JS/CSS SHA-256 matches local production assets.
- Existing backend provider build unchanged and matching.
- Rollback: C:/NIVASafe/backups/rula-pending-table-v53-20261010/frontend.
- Verification command: node scripts/check-rula-pending-table.cjs (requires fixture Vite server on 5178).

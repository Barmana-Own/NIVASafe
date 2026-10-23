# Temporarily hide account image authorization controls

## Scope

The owner requested the screenshot section Permission to use my images to be hidden temporarily in the frontend. One CSS rule hides .posture-image-authorizations only under .app #image-processing-consent. The component stays mounted with its existing code and read-only list loading. All form fields, grant records and handlers remain in source; no API, validation, consent policy, server authorization or database behavior changes. The main image-processing consent checkbox, explanatory/legal copy, status and Save control remain visible and unchanged. No consent or grant mutation was performed.

## Preservation and verification

The candidate is copied from the verified latest admin-directory-cards source. Only frontend/src/styles.css changes by the exact CSS append; unrelated root changes are preserved. Existing JavaScript remains active. Shared-domain build, frontend typecheck/lint, TypeScript compilation and production build pass. 8 isolated browser scenarios pass, covering temporary hidden state and unavailable keyboard focus within that subtree, retained consent/profile content and unaffected presentation. All account data is synthetic and API writes are blocked. Scoped security/helper/preservation and fresh production read-only acceptance pass. Unit/backend/dependency checks are NOT_RUN because this one-rule CSS visibility change alters none of their code or controls; no whole-project certification is claimed.

## Deployment and recovery

Release: release-hide-image-authorizations-20261022-01. CSS asset: /assets/hide-image-authorizations-1739ca6aadf8.css. All 786 previous non-index files and 12 stylesheet links are preserved. No API restart or backend/database change. Restore the hash-verified previous index at C:/NIVASafe/.local/hide-image-authorizations-20261022-01/index.before.html to restore the temporary hidden section without touching grants or data. Evidence: reports/evidence/hide-image-authorizations-20261022-01/.

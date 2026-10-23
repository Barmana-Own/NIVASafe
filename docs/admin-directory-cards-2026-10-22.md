# Global administration user and membership-request cards

## Scope and layout

The owner requested boxed cards with three per desktop row and responsive wrapping for Users and Membership requests in the global administration panel. The implementation appends CSS scoped by the two existing global panel IDs. CSS Grid retains three desktop tracks even for one or two records and reduces to two or one column when width requires it. All existing content and controls remain present; no new fields, labels, buttons or records are added.

User cards present their existing avatar/identity, account/status/protected badges, last login and organization chips in a vertical hierarchy with the existing Edit action. Membership request cards retain identity, role/pending state, organization, requester and date, with approval/reject controls. Approval forms stack within narrow cards and retain both password fields, conditional missing-email input and cancellation behavior. No text is clamped, hidden or clipped and no fixed card height is imposed.

## Preservation and deployment

The candidate is derived from the hash-verified admin-support-dedup frozen source. Only frontend/src/styles.css changes; unrelated root work is preserved by appending the exact supplement. The live JavaScript bundle stays unchanged. Only one immutable CSS asset and one reversible stylesheet link are published. All 785 previous non-index assets and 11 stylesheet links remain byte-identical. Backend, database, authorization, API process, environment and reverse proxy are untouched.

## Verification

- Shared domain build, frontend typecheck/lint, TypeScript compilation and Vite production build: PASS.
- 22 isolated browser scenarios: PASS. Coverage includes multiple rows, sparse lists, desktop/tablet/mobile, RTL/LTR, themes, complete long identities and metadata, visible actions and focus, user-editor cancellation, approval-form cancellation and reject-dialog cancellation. Only synthetic intercepted API fixtures were used; no real credentials, account change or membership approval was submitted.
- Organization administration, Members, Files, Checklist and dedicated Support preserve content and presentation. Global AI/Overview and hidden panel behavior remain outside the supplement.
- Scoped independent security/helper/source/preservation review and deployed final gate: PASS.
- Actual production acceptance: read-only checks of three-column user and request tracks, complete content/actions, correct hidden panels and unchanged deployed script/styles.
- Unit/backend/dependency checks: NOT_RUN because this CSS-only task changes none of their inputs. No entire-project security, clean-install or database migration readiness claim is made.

## Recovery

Release: release-admin-directory-cards-20261022-01. CSS: /assets/admin-directory-cards-1b950c789928.css. Restore the hash-verified previous index at C:/NIVASafe/.local/admin-directory-cards-20261022-01/index.before.html to revert the presentation while keeping immutable assets. Evidence: reports/evidence/admin-directory-cards-20261022-01/.

## QA adjustments

Two initial browser attempts ended at 20/22 and 21/22 because modal/support fingerprint comparisons observed different pointer hover or transition states. The isolated test normalizes pointer/focus state and waits for finite animations before equivalent baseline/candidate captures. Both original failure reports are retained and the complete browser matrix was rerun successfully. No application CSS or preservation criteria were weakened to bypass these comparisons. The copied release helper's public smoke and rollback check paths were corrected to /admin before publication.

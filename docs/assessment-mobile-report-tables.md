# Mobile assessment report tables

## Scope and preserved behavior

RULA suggested corrective actions, RULA posture report data and the interactive
FMEA full-details table share an explicit mobile table class. Existing data,
columns, permissions, handlers, action status and desktop layout are preserved.
No API, database, migration, dependency or authorization changes.
The existing dirty worktree was preserved.

## Cause and implementation

Older RULA mobile rules covered the saved-report page but excluded wizard previews.
FMEA retained a fixed multi-column layout on phones. At screen widths up to 760px,
the shared layout renders each record as a bordered key/value table: all fields
are labeled, text wraps, actions have 40px targets and headers remain accessible.
FMEA cells have localized data-label attributes. Expanded RULA details flow
inside the record rather than overflowing. Print and desktop remain unchanged.

## Verification

- Frontend tests: 156/156, including three new contract regressions.
- Frontend TypeScript/lint and production build passed; existing large-chunk warning.
- API contract: 70 frontend paths matched 123 backend routes.
- Browser QA used isolated synthetic fixtures and actual production CSS: wizard
  RTL at 320/375px, saved-report LTR at 414px, desktop at 1280px. Phone cells had
  no horizontal overflow. Expanded RULA details stayed inside the 320px viewport
  after correcting an existing inline-flex constraint.
- Desktop rows remained table-row and headers remained static.
- Security review: translated data-label values are React-escaped; no unsafe
  HTML, new network access, secret or authorization change introduced.
- Authenticated full-app testing NOT_RUN; fixture QA checks layout, not persisted
  business mutations. Production deployment NOT_PERFORMED.

## Integrity and rollback

No field, page, route, test, action or feature removed. Existing class names and
selectors preserved. Rollback removes the shared class/rules and FMEA labels;
no data migration required. Temporary QA server was stopped and removed.

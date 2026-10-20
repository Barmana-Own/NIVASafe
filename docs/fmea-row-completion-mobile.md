# FMEA mobile layout and row-completion workflow

## Behavior

Mobile report cells now inherit the table's direction rather than desktop numeric-cell `ltr`. Persian field labels from S through risk level therefore occupy the right grid column and values the left. English layout keeps LTR. Desktop numeric formatting and horizontal-table structure remain unchanged.

Registered FMEA report rows have a completion check control, permission-gated, busy-protected and disabled when already complete. `POST /api/v1/fmea/:id/items/:itemId/complete` requires authentication, organization context and `assessments.update`, validates UUID parameters and accepts only an empty command body. A transaction locks the tenant-owned, non-deleted assessment row with parameterized MySQL SQL. All active linked controls become COMPLETED with progress 100. Where no active control exists, one linked completion record preserves the row's recommendation (or failure-mode text), so confirmation remains persisted across reloads. The row lock prevents duplicate records from repeated completion commands. Cancelled/rejected controls are preserved untouched. Confirmation emits an actor-associated audit event.

The dashboard now counts one entry per registered risk row: complete when all its active linked controls are complete, otherwise in progress. Remaining entries are the currently displayed, undismissed, unregistered AI/local recommendations, including recommendations beyond the collapsed five-item preview. Completion percentage uses completed rows divided by all registered rows plus remaining recommendations. It does not use the former unrelated average of action progress percentages or duplicate a row for multiple controls. Changing existing action statuses can move a row back to in progress on reload.

## Evidence and limits

| Check | Result |
| --- | --- |
| Frontend unit/source-contract tests | PASS: 169 / 23 files |
| Backend HTTP/unit tests | PASS: 239 / 32 files |
| Shared domain tests | PASS: 12 |
| Build / lint / typecheck | PASS; existing bundle-size warning remains |
| API contract / release checks | PASS: 71 client paths / 125 routes; 28 checks |
| Browser visual QA | PASS: production CSS with representative fixture at 320 and 390 px; all cell directions observed RTL |
| Real MySQL transaction / concurrency | NOT_RUN: local read-only EXPLAIN attempt failed; tests mock the transaction adapter |
| Full authenticated browser completion flow | NOT_RUN; endpoint and count transitions tested independently |
| Production deployment / external Git push | NOT_PERFORMED in this task |

An initially broad test payload type failed TypeScript overload resolution; it was narrowed to the real command-object type and builds/lint/typecheck rerun. A first SQL diagnostic failed shell quoting and a corrected file-based read-only attempt did not reach verification; neither changed database data. Browser fixtures do not replace a full authenticated product end-to-end test.

## Preservation and security

No migration, dependency, clinical/risk score change, export change or existing route removal. Existing action editing/deletion remain available. Tenant ownership is checked inside the locking query before reading or mutating row/control data. User values are SQL parameters, not interpolated query text. Output includes only the row identifier and completion status. The UI escapes existing action/risk content and does not expose completion controls to read-only users. Negative HTTP cases cover unauthenticated, forbidden, missing/cross-tenant/deleted rows, invalid UUIDs, mass assignment and transaction failure. Unit cases cover empty charts, multiple controls per row, cancellations and mixed completion states.

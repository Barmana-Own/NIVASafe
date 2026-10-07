# RULA corrective-action workflow

## Scope

The stage-three preview and saved RULA report use an explicit corrective-action inventory. Each visible unselected recommendation contributes one remaining item. Each selected non-completed action contributes one in-progress item, including legacy saved OPEN actions. Completed actions contribute one completed item. Cancelled/rejected persisted actions do not enter the active inventory; their matching recommendation is available again as remaining.

The completion percentage is completed items divided by the total recommendation/action inventory, not average recorded progress. Manual active actions enter the same inventory. Body-side filtering remains in the report view, and a single action associated with several posture parts is counted once, even though its completion control can appear in several rows. Completing that record updates every representation on reload.

## Interaction and persistence

- Selecting a recommendation or adding a manual action creates an IN_PROGRESS corrective-action record via the existing authenticated `/actions` endpoint.
- The data table operations column contains a labelled check button for each related selected action; general actions also have completion controls. The action title is included in the accessible label and tooltip.
- Confirming completion patches the specific persisted record to COMPLETED. The existing server-side status mapping sets progress to 100 independently of supplied progress.
- A successful mutation immediately uses the returned server record, including its persisted identifier, then reloads the report. Errors are surfaced without fabricating completion. Pending and already-completed controls are disabled.
- Unsaved stage-three selections and completion confirmations remain local until assessment submission, at which point their status is included when creating the actions. No background mutation occurs merely by viewing a report.
- The ring renders green completed, orange in-progress and neutral remaining segments with actual counts beside them. Its accessible progress value describes actual completion.

## Boundaries and preservation

No schema, migration, API contract, scoring algorithm, AI integration, report-export generator or role definition was replaced. Existing report exports are not redefined by this UI workflow change. Saved data remains intact. Completion writes retain the existing assessments.update permission, authenticated organization-scoped lookup, project/RULA/body-side validation and audit trail. Read-only users receive no completion callback. Title-based matching cannot bridge different body-side scopes.

## Validation

Final checks: frontend production build, lint/typecheck and 153 tests across 19 files PASS; backend build, lint/typecheck and 206 tests across 29 files PASS. API contract validation matches 70 frontend paths against 123 backend routes. Diff whitespace checks PASS. The existing frontend large-bundle warning remains and is not hidden.

- Frontend workflow unit tests cover remaining, legacy selected OPEN, in-progress, completed, cancelled and empty inventories.
- Real React static rendering checks the ring percentages, accessible progress and three legend counts in Persian and English. This is not browser interaction or visual QA.
- HTTP route tests exercise the actual action handlers, with the database adapter mocked, for selection persistence, completion progress coercion, tenant scoping, unauthenticated/forbidden access and invalid statuses.
- Database-backed integration and browser visual/click-through checks: NOT_RUN in this task. Production deployment: NOT_PERFORMED.
- No new dependencies, credentials or external data transfer were introduced.

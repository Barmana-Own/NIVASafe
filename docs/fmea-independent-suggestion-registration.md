# Independent FMEA corrective suggestion registration

## Root cause and behavior

The report previously submitted suggestions to the generic actions endpoint with the original risk's `fmeaItemId`. Consequently multiple registered controls accumulated in one recommendation cell instead of creating separate rows.

The report now submits selected suggestions to `POST /api/v1/fmea/:id/items/:itemId/register-action`. A transaction locks the tenant-owned assessment, checks that the source risk belongs to it, appends a risk-context row and creates its linked corrective action atomically. Source risk fields and S/O/D/RPN are copied, not reassessed or reduced. New controls have no verified residual scores. Existing source rows and their actions remain unchanged. The recommendation and matching registered action render once in a cell, with the registered status. Manual generic action creation retains its existing route.

An assessment/source/title-derived identifier and an assessment lock prevent duplicate rows on retries. Sequential row numbering uses the assessment's maximum existing row number. Registration matching recognizes an action attached to a new row using its title and related failure mode, not just its former source ID. Counts use the existing row workflow; unregistered suggestions remain pending and registered rows count as in progress until confirmed.

## Security and preservation

The route requires authentication and `assessments.update`, strict UUID parameters and a strict allowlisted command body. Titles are bounded to the database width and descriptions to 20,000 characters. Tenant and deleted-assessment checks precede source access. SQL is parameterized; client tenant/project identifiers cannot be assigned. No migration, dependency, previous action relocation, clinical scoring rule, role or existing route removal.

## Verification

Regression tests cover new-row linkage, copied scores, cleared residual assumptions, retries, foreign/missing/deleted records, transaction failures, authentication/permission denial, mass assignment, title limits and registered suggestion filtering. Real MySQL transaction/concurrency and authenticated browser interaction are NOT_RUN; persistence is mocked in unit/HTTP tests. Production deployment and Git push are NOT_PERFORMED. The initial sandbox run failed to write Turbo logs, and strict TypeScript checks caught unchecked test-call indexing; permission-scoped rerun and optional test indexing repaired these issues. Final executable counts and checks are recorded in `project-state.json`.

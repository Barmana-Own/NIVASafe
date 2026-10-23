# Organization-image reuse — 2026-10-22

## Scope, requirements and preservation baseline

The owner requires an existing organization image to remain a single stored file when selected and used in FMEA or RULA assessments. Preserve all current assessment screens, image analysis and consent checks, editing/report retrieval, local-file upload, file-management permissions and previously stored records. Existing duplicates are preserved; this change must not delete or merge customer data.

- FR-001: selecting an organization image and saving an assessment creates an authorized reference to the original attachment, without uploading bytes or creating another library attachment.
- FR-002: the same original image can be used in multiple assessments, including both assessment types, and remains available after reload and in reports.
- FR-003: repeating the same association is idempotent; mixed local and organization images retain the existing three-image FMEA and four-image RULA limits.
- FR-004: removing an image from an assessment detaches that assessment reference without deleting the original image or references from other assessments.
- FR-005: local or edited image content remains an ordinary validated upload; filename/size matching must never establish stored-file identity.
- NFR-001: the server enforces authentication, update permission, same-organization source and target, source lifecycle/type/size and image-count limits independently of the client.
- NFR-002: additive migration only; existing attachments, stored objects, assessments and roles must remain intact. Concurrent/retried commands must not exceed limits or create duplicate associations.
- NFR-003: preserve API compatibility and unrelated dirty work. Build from the last verified frontend and active backend source, then apply only scoped patches.

The verified baseline is frontend `files-organization-image-picker-20261022-01` and backend `release-image-first-attempt-20261022-02`. Protected source/runtime/configuration and static-asset inventory is recorded in `reports/evidence/organization-image-reuse-20261022-01/`.

## UI and API architecture

No visual redesign, new UI copy, or additional user action. The existing picker retains canonical source identity alongside downloaded File objects for analysis/preview. Only a validated picker-origin image may use the association API; newly uploaded or edited bytes follow the existing upload API. Analysis consent, provider policy, review state and scoring remain unchanged.

The planned association contract uses the existing authenticated file resource: POST or DELETE `/api/v1/files/:id/assessment-links`, JSON `{ entityType: "FmeaAssessment" | "RulaAssessment", entityId: UUID }`. POST returns the original attachment; DELETE removes the target association. Legacy primary attachment ownership remains readable. Image retrieval, RULA attachment validation and image-count enforcement must recognize both legacy ownership and the new references.

## Data, authorization and concurrency architecture

Use an additive assessment-image association table with source attachment, organization and typed target identifiers plus a unique association key and lookup indexes. Preserve the canonical attachment ID/objectKey and original metadata. Parameterized SQL allows the additive model to coexist with the deployed Prisma client without replacing shared generated client files. Migration and clean-database testing must precede production application.

Link/unlink operations validate the source and target within the caller's organization. Lock source/target consistently, return an existing association on retry, and enforce total linked plus legacy image counts transactionally. A shared source must not be deleted through assessment removal. Explicit library deletion must not silently break other active references.

## Scoped delivery gates

This is an existing full-stack behavior repair. Product definition and unchanged UI architecture are established above. Frontend, backend, additive persistence, API integration, authorization, scoped security, automated tests, product QA, deployment and independent final review are accepted in that order and recorded under the task-specific project-state entry. Source preparation is not validation; publication and completion require executed evidence. Test writes use an isolated database and synthetic browser fixtures. Production verification is read-only unless a precisely scoped test mutation is necessary and separately authorized.

## Baseline issue found by the isolated installation check

The historical migration chain fails on a new empty database: `202608050900_global_super_admin` adds `User.globalRole`, and `202608240002_global_role` attempts to add the same column again (MariaDB 1060 / Prisma P3018). These existing migration files are outside this repair and remain unchanged. Failed-run evidence is retained in the task integration directory. This is a pre-existing fresh-install limitation, not a failure of the new association migration; no whole-project clean-install or production-readiness claim is made.

The actual deployment is an incremental update of an existing schema. Read-only production preflight found 34 successfully applied migrations, no unfinished migrations, and the same migration names as the protected backend baseline. The release checks that this history and its checksums remain unchanged before applying only the reviewed new migration. Isolated verification bootstraps the protected previous schema in a fresh disposable database, applies the new additive DDL, and checks its uniqueness, two foreign keys and target lookup index before testing application behavior. This does not edit or bypass the production migration history.

## Source verification checkpoint

All 841 backend tests, 496 frontend tests, both TypeScript typecheck/lint commands, shared-domain build, backend compilation, frontend production build and Prisma schema validation passed for the final frozen candidate. The six isolated browser cases passed with no failures or skipped cases. Initial test failures and the exact test-input-only corrections are retained under `attempt-1/`: one missing protected compose fixture, three assertions pointing to code moved into helpers, and one unrelated synchronous render timeout during concurrent compiler/test load. Existing test timeouts were unchanged; separated validation phases passed. No production code was changed during these test-input repairs.

## Verified incremental delivery

- Release: `release-organization-image-reuse-20261022-01`; frontend entry `/assets/index-Du1t0jkn.js`; API executable identity verified after restart.
- Existing-schema association migration: PASS after a verified private single-transaction database backup. Existing attachment rows and file objects were not modified by the release. No previous duplicate records were deleted or merged.
- 841 backend tests, 496 frontend tests, six browser cases, both typecheck/lint checks, shared/backend/frontend builds and schema validation: PASS.
- Five real isolated-database integration groups, 68 requests: PASS. One canonical attachment served two FMEA and two RULA assessments, retries/concurrency remained idempotent, storage.put and attachment.create remained unused during association, reload/list membership worked, authorization/count limits were enforced, and unlink preserved original/other references. Isolated test databases, owned server and upload fixtures were cleaned; no external provider call was made.
- Initial publication stopped before DDL or API/index changes because production dependencies intentionally omit the Prisma CLI. The already validated build-tool CLI was used on resume; staged code/config/index/backup hashes and unchanged migration history were reverified. Original failure/private logs were retained.
- 749 prior static files, seven stylesheet links, private environment, worker configuration and proxy configuration were preserved. Both local and organization-image controls remain intact. Production acceptance was read-only.
- Peer security reviews and independent final scoped preservation/public-byte checks: PASS.
- Historical clean-install migration chain: FAIL_PREEXISTING_UNRELATED as documented above. This existing-schema maintenance delivery does not claim to repair the old empty-database installer or make the whole repository production-ready.

## Rollback and operations

Retain the new additive table and all references when rolling back code; never drop the table to undo this release. Original files remain canonical. The old API does not understand durable-only memberships, so prefer a compatible roll-forward if references have already been created. The protected pre-release index/configuration and database backup are retained under the release's private backup directory. No automatic deletion, data merge or customer-data cleanup is included.

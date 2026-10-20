# Stage 04 — Backend Architecture

FMEA process behavior is implemented in the existing assessment module with a small pure helper module at `backend/src/fmea-process.ts` for normalization, prompt construction and deterministic fallback text.

The assessment routes validate request bodies with Zod, verify project/activity ownership, verify active global or organization-owned job catalog entries, and require `assessments.create` for catalog and suggestion operations. Activity descriptions are limited to 1,200 characters and at most two sentences by a shared pure validator. AI calls are made through the existing server-side provider boundary. Audit events record operation metadata only, not user descriptions or credentials.

Provider adapters normalize supported usage payload formats into bounded input/output/total counts. Successful risk and chat calls pass those counts to the idempotent `AIUsageRecord` writer; calls without provider-reported counts are not estimated.

The Activity Log route applies server-side visibility rules: a normal authenticated user can read only their own records in the selected organization plus their own account-level records, while `audit.read` roles can read the selected organization and account-level events belonging to its active members. An unscoped Super Admin retains the global view. Login and logout records are written for every active membership, chat messages are audit-recorded with their assistant message ID, and the response enriches assessment events with FMEA/RULA metadata and matching provider-reported token usage without exposing prompts or responses.

Expected validation failures use the existing API error envelope. The implementation does not trust client-selected organization identifiers or AI output.

Project creation remains backward-compatible for existing callers that send only the project fields. The extended create schema accepts an initial process name and activity title as a validated pair plus an optional activity location; when supplied, the project, process and linked activity are committed in one Prisma transaction and each created entity receives an audit event. The existing standalone process/activity routes remain available to preserve API compatibility even though their cards are no longer shown on the projects page.

FMEA item create, update and delete operations stay in the assessment module. The API recalculates RPN/risk level from S/O/D using the shared reference bands (VERY_LOW 1–50, LOW 51–100, MEDIUM 101–200, HIGH 201–400 and CRITICAL above 400), checks tenant ownership and permissions, and records item updates/deletions in the audit stream. The reports module renders full FMEA/RULA PDFs as styled, paginated landscape reports; Word remains editable Office Open XML with formatted tables and RTL-aware layout, and Excel uses styled, filterable, wrapped multi-sheet workbooks. The FMEA final-table PDF/DOCX/XLSX exports use the same visible table columns, preserve line-separated controls/actions and omit only the UI operation buttons. The legacy `.doc` route remains an alias for DOCX. The full FMEA export consumes the same tenant-scoped report read model for summary/top-risk/proposal data; locale is explicit. The read model remains permission-scoped and corrective-action link validation remains in the actions module.

RULA posture-image analysis is a purpose-scoped request. Each authenticated multipart request accepts one image only; file signature, MIME, byte limit, organization context, permission and rate limit are checked before calling GapGPT. This route uses a dedicated GapGPT provider adapter rather than the general failover chain, so an image cannot fall through to another provider. GapGPT does not advertise FMEA image capability, so RULA consent does not route FMEA images to GapGPT. Persisted RULA images use the existing Attachment model; entity aliases are canonicalized before per-assessment counts are enforced under a transaction lock on the tenant-owned assessment row.


## Scoped checkpoint rula-image-experience-20261019-01 — 2026-10-19 / 1405-07-27

Scoped status: PASS — safe code release with public image processing disabled.

Current consent version required and durable actor/tenant-bound audit receipt awaited before provider dispatch. Exact authenticated Arvan response alias openai/gpt-5-mini accepted only for the configured GPT-5-Mini family; request model and endpoint unchanged.638 backend tests passed.

Evidence: C:/NIVASafe/reports/evidence/rula-image-experience-20261019-01. Full-product status is not COMPLETE.

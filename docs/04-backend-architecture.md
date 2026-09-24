# Stage 04 — Backend Architecture

FMEA process behavior is implemented in the existing assessment module with a small pure helper module at `backend/src/fmea-process.ts` for normalization, prompt construction and deterministic fallback text.

The assessment routes validate request bodies with Zod, verify project/activity ownership, verify active global or organization-owned job catalog entries, and require `assessments.create` for catalog and suggestion operations. Activity descriptions are limited to 1,200 characters and at most two sentences by a shared pure validator. AI calls are made through the existing server-side provider boundary. Audit events record operation metadata only, not user descriptions or credentials.

Provider adapters normalize supported usage payload formats into bounded input/output/total counts. Successful risk and chat calls pass those counts to the idempotent `AIUsageRecord` writer; calls without provider-reported counts are not estimated.

Expected validation failures use the existing API error envelope. The implementation does not trust client-selected organization identifiers or AI output.

Project creation remains backward-compatible for existing callers that send only the project fields. The extended create schema accepts an initial process name and activity title as a validated pair plus an optional activity location; when supplied, the project, process and linked activity are committed in one Prisma transaction and each created entity receives an audit event. The existing standalone process/activity routes remain available to preserve API compatibility even though their cards are no longer shown on the projects page.

FMEA item create, update and delete operations stay in the assessment module. The API recalculates RPN/risk level from S/O/D using the shared reference bands (VERY_LOW 1–50, LOW 51–100, MEDIUM 101–200, HIGH 201–400 and CRITICAL above 400), checks tenant ownership and permissions, and records item updates/deletions in the audit stream. Report generation includes the complete risk register and produces a real Office Open XML Word document (`.docx`) plus a structured, filterable Excel workbook (`.xlsx`); the legacy `.doc` route is retained as an alias that returns the same valid DOCX payload. The reports module exposes a tenant-scoped JSON read model with summary/top-risk/action data and an audit-backed save endpoint; corrective-action link validation remains in the actions module.

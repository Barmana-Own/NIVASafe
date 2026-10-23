# Durable results and consent persistence

Date: 2026-10-22 / 1405-07-30.

## Existing storage retained

No schema or destructive migration is required. Existing `AuditLog` stores immutable account acceptance, registration decline, account withdrawal, owner grant/revocation and transfer authorization receipts. Existing `AIAnalysisRequest` stores validated successful `RULA_POSTURE_IMAGE` results with actor, tenant, model, timestamps, image digest and receipt references. Raw image bytes and full prompts are excluded from result metadata.

The image result is committed before HTTP success. A storage failure is nonretryable to avoid an automatic second paid inference. Failure of the supplementary completion audit after commit is logged with safe identifiers and does not discard the committed response; the mandatory pre-transfer authorization audit remains fail-closed.

Result retrieval requires both the original user and organization and assessment permission. Generic AI list, read, retry and worker paths exclude this reserved result type. Existing assessment drafts, protected attachments and PDF paths remain available with human-review state preserved.

## Verified evidence

`reports/evidence/rula-direct-consent-20261022-01/stage05-database.json`: five checks passed against a newly initialized loopback database on port 53306, including real Prisma persistence, reopening and negative user/organization lookups. The unchanged schema initialized successfully. Test fixture accounts are disabled. Identity-output escaping and a missing bilingual fixture name were corrected in the test harness; their failed evidence is retained separately.

No Production database migration or data deletion was performed.

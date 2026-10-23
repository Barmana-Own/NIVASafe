# RULA direct account consent — scoped requirements

Date: 2026-10-22 / 1405-07-30 (Intl Persian calendar).

## Product brief

Provide optional account-level, identified-provider posture image processing for every authenticated, authorized eligible user/organization. The existing modular Fastify/Prisma backend, React frontend, protected attachment storage and PDF routes remain authoritative. This is a scoped extension of the existing feature, not a repository rewrite.

Actors: image uploader, authenticated image owner granting permission to a different uploader, organization member with assessment-create permission, and platform operator maintaining actual provider terms/capability evidence. No actor approves new organizations individually.

## Requirements

| ID | Observable requirement |
|---|---|
| FR-01 | Registration/account contain a separate default-unchecked Arvan image-processing choice; general terms remain independent. |
| FR-02 | Purpose, provider, transferred data and verified/unknown retention/deletion facts are visible before the choice. Material notice change creates a new consent version; prior receipts do not silently upgrade. |
| FR-03 | Acceptance, decline and withdrawal persist with actor, server time, provider, purpose, version and source. |
| FR-04 | Each actual outbound attempt rechecks current account consent, authenticated actor, organization access and platform eligibility immediately before fetch; withdrawal prevents subsequent attempts. |
| FR-05 | No consent means no external transfer; existing Persian account guidance/settings link remains. Uploads do not request repeated processing consent. |
| FR-06 | Own-photo declaration is distinguished from a third-party photograph. A third-party transfer needs a current authenticated owner grant scoped to uploader, organization, provider purpose/version and expiry; owner can revoke it. No arbitrary client flag or invented proof is verified permission. |
| FR-07 | RIGHT/LEFT/BOTH use the successful fixed Bearer/GPT-5-Mini gateway contract. Chat remains DeepSeek-V4-Flash; FMEA remains GPT-5-Mini. |
| FR-08 | Validated image inference is durably stored in existing actor/tenant-bound AIAnalysisRequest persistence; result retrieval enforces actor and tenant; later assessment save and PDF remain available. No raw image/base64/full prompt is stored in the inference log/record. |
| FR-09 | Malformed-answer retry is bounded and independently authorized; timeout/network failures never trigger blind paid image retries. Usage/reservations release correctly. |
| FR-10 | Platform provider processing approval is a single genuine terms/capability decision with evidence; no per-user/organization owner approval or allowlist. Unknown gateway terms remain an explicit activation blocker. |
| NFR-01 | Preserve auth, role, subscription, quota, MIME/signature/size validation, tenant/private-file isolation and human review. |
| NFR-02 | Never log API keys, raw images, full prompts or private authorization payloads; redact errors. |
| NFR-03 | Preserve unrelated dirty working-tree changes and deploy only an isolated reviewed patch over the actual deployed baseline. |
| NFR-04 | Reuse the existing AuditLog/AIAnalysisRequest tables; no destructive migration or new external service is required. |
| NFR-05 | Test with synthetic data only and reuse prior real provider/PDF evidence under the existing persistent six-call ceiling (four previously used). |

## Scope, assumptions and limits

In scope: consent UI/API/audit version, dispatch authorization, authenticated owner grants, immediate inference persistence, regressions and conditional safe deployment. Out of scope: unrelated UI redesign, biometric ownership verification, FMEA behavior changes, fake provider approval and claims of validated anatomical accuracy.

An authenticated owner grant records the owner's explicit declaration for their own photos. It does not establish biometric identity of a person in arbitrary pixels. External/unregistered subjects require a separately verifiable permission process; no fabricated owner record is accepted. New grants expire after at most 90 days and can be revoked. Actual gateway terms remain unknown according to current official-source research; engineering cannot present generic AIaaS retention as this gateway's confirmed terms.

Stage 01 gate: purpose, actors, journeys, scope and testable requirements defined; safe implementation can proceed while actual production activation remains conditional.

STAGE_01_STATUS: PASS

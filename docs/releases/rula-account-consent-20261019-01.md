# RULA account consent and step-two recovery

## Scope and acceptance

- FR-AC-01: Restore both body-scoring groups, seven editable observations, force/muscle controls and RIGHT/LEFT/BOTH with images selected.
- FR-AC-02: Remove provider branding and repetitive processing copy from the assessment surface. Preserve preliminary/uncertain results and human review.
- FR-AC-03: Separate required general terms from optional external-image consent at registration. Existing users can accept or withdraw in account settings. No upload consent dialog.
- FR-AC-04: Persist consent before transfer with actor, server timestamp and policy version. Registration alone, another user's choice, stale policy and forged multipart fields do not authorize transfer.
- NFR-AC-01: Preserve tenant permissions, quotas, private attachments, database schema, historic scoring, model routing and all existing source/assets.
- NFR-AC-02: Synthetic-only external acceptance, bounded calls, operational/static rollback and read-only production schema comparison.

## Implementation

The image-present conditional hid the body analysis except inside the image editor. Inline scoring is restored; opening the per-image editor remains supported. Editing an unavailable image explicitly enters manual review and does not fabricate AI observations. Account policy is read from the authenticated user's latest global audit record. PUT is strict, authenticated, rate-limited and serialized through a parameterized user row lock. Registration records optional consent atomically alongside the user; it preserves pending activation. Two authenticated profile routes are added. No migration or new dependency.

The two legacy split CSS files are preserved byte-for-byte. New account styles are imported by their component; review layout rules use the active enterprise assessment stylesheet. This avoids broad stylesheet migration.

## Verification checkpoints

Evidence: C:/NIVASafe/reports/evidence/rula-account-consent-20261019-01. Twelve package checks and 1102 tests passed. The API contract has 94 frontend paths and 157 backend routes; 29 release checks passed. Two isolated ordinary-user organizations completed closed-platform manual RIGHT/BOTH save/relogin/report/PDF. Four genuine synthetic-image requests completed RIGHT, LEFT and automatic independent BOTH; three reviewed assessments persisted with PDF. These are workflow results, not anatomical validation. Final static visual checks and production deployment are still pending at this checkpoint.

## Operational constraints

Production image privacy and vision flags remain empty. The platform/provider approval document remains pending. Account consent is not a substitute for actual provider authorization; final verified processor terms require an updated notice/version and renewed consent where needed. No organization allowlist is introduced. Existing role/subscription/quota/tenant enforcement still applies. The old backend/frontend and protected settings are backed up; isolated PM2 old/new/old health verification passed. The existing PM2 WMIC process-metrics warning is non-blocking; health, identity and artifact checks succeeded.

## Owner action

Complete the real contracting entity/account-specific terms, processing locations/recipients, retention/deletion/training controls, applicable authorized basis, NIVASafe retention/deletion owner and approver/reference in docs/legal/rula-image-platform-approval.2026-10-19.md. Do not treat this pending file or the synthetic staging flags as approval.

## Final scoped release — 2026-10-20 / 1405-07-28

DEPLOYED_CODE_ONLY: release-rula-account-consent-20261019-01, PID6608, frontend SHA256 52a461c18eab7e44ea83dd7548597305714f32b1c4ce0b50acfdc6b9b712ff88. Final source/build, two-organization manual browser/PDF and eight anonymous public browser cases passed. Four genuine synthetic image calls and three reviewed saved reports passed before the final presentation-only CSS changes; final closed-provider QA verifies the final UI. Full591-file frontend and16644-file backend backups and operational/static rollback verified. No production records/uploads/schema were mutated. Account consent is enforced; actual platform/provider authorization remains missing and public image processing remains BLOCKED. Reports: reports/customer-report.2026-10-20.rula-account-consent-20261019-01.fa.md, reports/customer-report.2026-10-20.rula-account-consent-20261019-01.en.md, reports/technical-report.2026-10-20.rula-account-consent-20261019-01.fa.md, reports/technical-report.2026-10-20.rula-account-consent-20261019-01.en.md.

# Stage 08 — Application Security Review

## Scope

The review covers the FMEA catalog, process and risk-row suggestion API, bounded AI prompt/output boundaries including advisory S/O/D score parsing, persisted process fields and frontend confirmation flow, server-authoritative risk-row validation/RPN recalculation, the tenant-scoped FMEA results report and corrective-action row links, provider-reported AI usage accounting with administrator visibility, and registration/login account-type and membership selection. The registration boundary was rechecked for contact classification, email/phone validation, reserved display names and strict payload handling.

| Finding | Severity | Result |
|---|---:|---|
| Cross-organization job catalog access | High | PASS — active global/current-organization scope is enforced server-side. |
| Oversized or overlong process/AI payload | Medium | PASS — Zod limits, item limits, prompt bounds, output truncation and the one/two-sentence description validator are applied. |
| Unconfirmed AI output persisted automatically | High | PASS — only explicit frontend selections are serialized into create payloads. |
| Risk-row AI suggestion scope or unbounded row text | High | PASS — the risk-row endpoint is authenticated, organization/permission scoped and rate-limited; row fields and parsed text/score suggestions are trimmed and bounded, and selecting a suggestion is the only path that applies it to the form. |
| AI secret or user text in audit metadata | High | PASS — provider keys stay server-side and audit metadata is operation-only. |
| Unsafe rendering of AI output | Medium | PASS — output is rendered as text and sanitized/bounded before response. |
| Cross-assessment corrective-action link | High | PASS — action creation/update verifies organization, project, assessment and FMEA-row ownership; row deletion uses `ON DELETE SET NULL` to preserve action history. |
| AI usage exposure across tenants | High | PASS — the usage endpoint permits only `SUPER_ADMIN` or `ORG_ADMIN`; organization administrators are constrained to active memberships in the selected organization, while global aggregates remain available only to `SUPER_ADMIN`. |
| Untrusted provider token counts or sensitive usage data | Medium | PASS — counts are accepted only as bounded non-negative integers, source-linked writes are idempotent, and usage responses exclude prompts, completions, credentials and raw provider payloads. |
| Client-selected or self-assigned login role | High | PASS — the login flow does not render a role/workspace chooser; it persists only the first active membership returned by the authenticated credentials response, while the backend derives the effective role from membership and never accepts a role field from login. The in-panel company switcher remains membership-checked. |
| Stale or malformed registration draft bypasses account-type selection | Medium | PASS — persisted registration kinds are normalized against the two supported enum values and the registration entry screen always starts with the visible account-type selector. |
| Mismatched or malformed registration contact | High | PASS — the shared contact classifier and server-side boundary distinguish email from phone, normalize only supported digits/separators, reject malformed values and keep the API authoritative. |
| Cross-company object access or forged workspace switch | High | PASS — scoped routes require an active `OrganizationMember`; project/assessment/action/file/knowledge/notification and AI-usage queries carry the selected organization, and the client-side selector is only a convenience layer. |
| Subscription state leaking between companies | High | PASS — plan/status/expiry are stored and evaluated on the selected organization, while production creation uses `PENDING_PAYMENT`; local checkout is rejected as a production activation mode. |
| Reserved or unsafe registration display name | Medium | PASS — the shared display-name policy enforces length/character constraints and rejects reserved names even when separated by punctuation or whitespace; server and browser use the same rule. |
| Invalid organization national identifier | Medium | PASS — the browser normalizes Persian/Arabic digits and applies the checksum rule; the API repeats normalization and validation before persisting the organization identifier, without relying on client state. |

`pnpm audit --prod --audit-level high`, typechecks, tests, release verification and diff checks passed. No new Critical or High issue was identified. The optional risk failover uses the same server-only key and remains disabled until a provider-catalog model ID is explicitly configured. The additive local usage table and authenticated admin endpoint smoke were verified; clean migration deployment against a newly initialized database remains not run because the local database is pre-existing.

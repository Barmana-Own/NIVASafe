# Backend delivery checkpoint

The modular Fastify application and existing Prisma persistence remain authoritative. New account-consent/owner-authorization services are kept outside transport handlers; the provider adapter receives a server-only dispatch authorization hook immediately before the actual image fetch. A malformed-answer retry constitutes another outbound transfer and requires a fresh authorization check.

The result use case and persistence port are implemented in `backend/src/rula-image-results.ts`, with six passing unit tests. Validated findings must be saved before success is returned. Storage failure exposes a safe nonretryable error, not database diagnostics or an automatically repeated paid inference. Result lookup carries the actor and tenant together and validates stored output before returning it. The concrete adapter belongs to Stage05.

The internal image-result type is reserved for synchronous private image output. It must not be replayed by generic text requests or the queue worker; the lightweight constant is separate from the posture parser.

Stage04 passed with isolated focused and full backend tests, typecheck and build. Stage05 additionally verified the concrete adapter against a clean disposable schema. The exact final evidence and stage states are recorded in `project-state.json` and `reports/evidence/rula-direct-consent-20261022-01/workflow.json`. Later final-suite reruns remain separate evidence rather than assumed results.

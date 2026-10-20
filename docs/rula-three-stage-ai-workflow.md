# RULA three-stage AI workflow repair

## Scope and preservation

The existing three-stage RULA interface is retained. No new panels, schema migrations, environment edits, credentials, or production data mutations are introduced. Previous row editing, completion, deletion, table layout, manual scoring and independent image/BOTH-side behavior are preserved.

## Implementation

- Stage 1 uses the dedicated RULA task-description prompt and validates concise ergonomic activity descriptions; malformed model output is requested again once.
- Stage 2 sends validated process measurements, job/task/posture context and the selected anatomical side. Each uploaded or saved image retains its independent observations and scores. Changed process context invalidates the saved-image review cache. Without images, the text assessment uses process information.
- Stage 3 receives compact summaries of every image, including independent official scores, observations and confidence. The server recalculates the primary score from the worst complete image; it does not combine unrelated body parts from different images or add separate image scores. This follows the RULA lookup method, whose final score is 1–7: https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf
- Report recommendations refresh when the persisted assessment version changes. Existing tables consume the same typed response contracts.
- Structured model answers are validated before use. Observed angles determine provisional body-part scores; undetected parts stay explicitly unobserved. Invalid part-specific scores without angle evidence are rejected.
- One backend retry repairs malformed responses. One client retry after 600 ms covers transient failures and locally generated advisory responses. Authorization, invalid input and cancellation are not retried. Existing provider network retry/failover behavior is retained; retries are finite.
- Unneeded knowledge retrieval is disabled for these dedicated requests. Compact image summaries omit overlays and unrelated editing metadata. Existing output limits and independent image concurrency are retained.

## Live provider evidence

Only generic test text and a generated nonprivate posture diagram were sent. A proposed existing production-image probe was rejected by automatic approval and abandoned; no private production image was selected or transmitted.

| Probe | Model | Result | Observed duration |
| --- | --- | --- | --- |
| Task description | GPT-5-Mini | Valid text | 4.422 s |
| Process-only posture | GPT-5-Mini | Valid numeric part scores | 5.543 s |
| Synthetic image | gpt-5-mini-2025-08-07 | Six visible parts; no alternate-model fallback | 15.009 s |
| Corrective report | GPT-5-Mini | Six actions, connected | 13.348 s |

Evidence: C:/NIVASafe/backups/rula-three-stage-live-evidence.json. These timings are samples, not latency guarantees. Diagram transport and response validation do not independently establish real-photo ergonomic accuracy. AI measurements remain estimates requiring review. Upstream outages can still prevent an AI response; local advisories remain truthfully identified as fallback rather than fabricated AI output.

## Validation and security

Backend tests exercise malformed answer recovery, independent LEFT/RIGHT results, actual multipart process context, part score limits, per-image calculation and report generation. Frontend tests exercise bounded retries, cancellation, validation/auth failures and existing RULA controls. Build, TypeScript-based lint and type checking must pass before deployment. Existing authenticated permission checks, organization ownership checks, upload signatures/MIME/size limits, rate limits and secret controls are preserved. Multipart context is bounded to 4,000 characters and validated by the existing process schema. No new raw model/customer payload logging is introduced.

Deployment uses the existing Nginx static site and PM2 nivasafe-api process, with a new rollback backup and PWA cache v22. Backend runtime changes are limited to the assessment route, posture parser, action generation, action prompt and new retry module. Production verification checks local/public login and health, database readiness and compiled/public asset hashes. Authenticated production assessment mutations are NOT_RUN; synthetic integration tests cover those contracts without changing customer records.

## Final executed validation

- Backend: 273 tests across 38 files PASS.
- Frontend: 199 tests across 29 files PASS; domain: 12 tests PASS.
- pnpm build, pnpm lint, pnpm typecheck and git diff --check PASS. Existing large frontend chunk warning remains.
- Security/regression review: bounded retry and cancellation paths; multipart validation; existing authentication, authorization, upload and organization isolation preserved. Unchanged CSS SHA256 confirms no table/design modification in this patch.
- Deployment: existing PM2 nivasafe-api restarted, no duplicate process created. MariaDB running with automatic startup. No migration required.
- Local and public login/health HTTP 200; database up. Public JS/CSS match built artifacts; all five changed backend modules match source build SHA256.
- Rollback: C:/NIVASafe/backups/release-rula-three-stage-20261009-073144.
- Evidence logs: C:/NIVASafe/backups/rula-three-stage-{backend-tests,frontend-tests,build,lint,typecheck}.log; rula-image-layout-evidence.json and rula-three-stage-live-evidence.json in the same backup directory.

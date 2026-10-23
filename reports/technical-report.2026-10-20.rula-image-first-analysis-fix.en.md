# Technical Report: RULA Image-First Analysis Fix

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Technical |
| Language | English |
| Gregorian date | 2026-10-20 |
| Jalali date | 1405-07-28 |
| Change ID | rula-image-first-analysis-fix-2026-10-20 |
| Baseline revision | e5bf3f0; the working tree already contained uncommitted changes and was preserved |
| Status | Local code change; not deployed |

## Scope and root cause

The active UI route is implemented in `frontend/src/features/assessments/AssessmentPages.tsx`. Its automatic-analysis effect required a job title and task description of at least two characters before it would request image analysis. When users uploaded an image first, this guard returned before sending the request and left the review queued.

The multipart backend contract in `backend/src/modules/assessments.ts` independently required both strings. Changing only the UI would therefore still have produced a rejected request. Both blockers were corrected.

## Implementation

### Frontend

- Added `canStartRulaAutomaticAnalysis` and `hasRulaActivityContext` to `frontend/src/features/assessments/rulaAnalysisQueue.ts`. Image mode can start without task text; text-only mode still requires valid context.
- Updated the analysis effect in `frontend/src/features/assessments/AssessmentPages.tsx` to use the mode-aware gate.
- For both selected and previously saved images, structured `activityInfo` is sent only when job and task context are complete. Empty text fields remain bounded compatibility inputs.
- No user-facing copy, button, or section was added or removed.

### Backend and request contract

- Added `backend/src/rula-posture-image-request.ts`. `bodySide` and field length limits remain validated; missing `jobTitle` and `taskDescription` default to empty strings with maximum lengths of 180 and 500 characters.
- `activityInfo` remains optional, but if supplied it is validated by the existing strict `rulaActivityInfoSchema`.
- Wired `/api/v1/rula/posture-image-analysis` to the extracted schema in `backend/src/modules/assessments.ts`.
- Updated `backend/src/rula-posture-ai.ts` so missing task context means assess only visible posture and do not infer work activity, repetition, duration, force, or muscle use from the image.
- No database, migration, dependency, model-routing, or chatbot change was made.

## Security and privacy boundaries

The change removes the job/task text prerequisite for visual analysis; it does not remove image transfer controls. Server authentication, `assessments.create` permission, rate limits, file size/signature checks, persisted account consent, audit receipt, and platform provider-approval/capability checks remain in the request path. A supplied structured activity object still receives strict validation. Human review of image-derived scores remains required.

`docs/legal/rula-image-platform-approval.2026-10-19.md` records `PENDING_OWNER_AND_PROVIDER_VERIFICATION`. Contracting terms, processing locations/recipients, retention/deletion, training use, legal basis, and approver details remain unverified. Existing project evidence says production approval flags are empty. No permission value was fabricated or changed.

## Validation matrix

| Check | Result | Evidence / limitation |
|---|---|---|
| Frontend tests | PASS | 63 files, 450 tests passed; Vitest over `src` |
| Frontend typecheck | PASS | `node node_modules/typescript/bin/tsc -b --noEmit` |
| Frontend production build | PASS | `node node_modules/vite/bin/vite.js build --configLoader runner`; emitted a non-blocking warning for chunks over 500 kB |
| Focused backend tests | PASS | 3 files, 25 tests: RULA prompt/parser, `rula-process`, and image request schema |
| Isolated backend typecheck | PASS | `rula-posture-ai.ts` and `rula-posture-image-request.ts` |
| Full backend typecheck | FAIL / environment | Widespread unresolved Fastify modules and generated Prisma exports; dependency purge/reinstall was not attempted |
| Fastify multipart route test | NOT_RUN | Test collection failed with `Cannot find package 'fastify'`. A synthetic-image route regression test was added to `rula-three-stage.test.ts` but could not execute |
| `git diff --check` | PASS | No whitespace errors reported |
| Live model request / main site | NOT_RUN | Synthetic-only constraint and platform approval pending; the user's current image was not submitted |
| Deployment | NOT_PERFORMED | Changes remain in the local working tree |

### Relevant commands

```text
frontend: node node_modules/vitest/vitest.mjs run src --configLoader runner --maxWorkers=1
backend: node node_modules/vitest/vitest.mjs run src/rula-process.test.ts src/rula-posture-image-request.test.ts src/rula-posture-ai.test.ts --configLoader runner --maxWorkers=1
```

The package-manager test attempt stopped when `pnpm` tried to replace `node_modules` in a non-interactive session. Local binaries were used for checks that could run. Fastify dependencies could not be resolved by the route test.

## Defect and security review

Regression tests cover image mode with no context, text-only mode with missing context, schema defaults for image-first requests, rejection of incomplete structured `activityInfo`, and prompt limits against unsupported inference.

The scoped review confirmed that authentication, role/tenant checks, image consent, file signature/size checks, rate limiting, and platform approval remain intact. No new material security defect was identified in this change. This was a focused trust-boundary review, not a product-wide audit.

## Database, dependencies, deployment, and rollback

No database schema or data changed, so no migration is needed. No dependency was added. This change is not committed or deployed, and no production rollback was performed. Because the worktree already had uncommitted modifications, any reversal must first compare the affected diff hunks and must not reset the shared worktree.

## Twelve-stage workflow status

This was a focused regression fix in an existing product; the formal twelve-stage delivery workflow was not executed.

| Stage | Formal status for this delivery | Note |
|---|---|---|
| 01 Project analysis | NOT_RUN | No new project or scope redefinition was requested |
| 02 Design system/UI architecture | NOT_RUN | No design-system or screen-map change |
| 03 Frontend architecture | NOT_RUN | Scoped implementation/tests/build completed; full stage gate not run |
| 04 Backend architecture | NOT_RUN | Image request contract corrected; full stage gate not run |
| 05 Database architecture | NOT_RUN | No database change needed |
| 06 API integration | NOT_RUN | Schema and caller changed; actual multipart route test could not load Fastify |
| 07 Authentication/authorization | NOT_RUN | Existing controls were preserved, not redesigned |
| 08 Application security | NOT_RUN | Scoped trust-boundary review only |
| 09 Software testing | NOT_RUN | Focused tests passed; complete backend test/typecheck gate did not run |
| 10 QA/debugging | NOT_RUN | Root cause fixed; no browser or live-server QA |
| 11 Deployment/production | NOT_RUN | No deployment |
| 12 Full-stack final review | NOT_RUN | Full workflow and release gate were not run |

## Remaining work and readiness

1. Complete the real platform-approval record. Account consent does not substitute for this approval.
2. Restore/verify the locked backend dependencies and generated Prisma client, then run the full backend typecheck and synthetic multipart route test.
3. After approval, test synthetic images in Staging across RIGHT/LEFT/BOTH, save and PDF flows; then deploy under a controlled release and run smoke checks.

**Code correction readiness: PASS for review. Public live image analysis and deployment readiness: BLOCKED / NOT_VERIFIED.**

# NIVASafe — RULA local-landmark technical report

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Technical |
| Language | English |
| Gregorian date | 2026-10-22 |
| Jalali date | 1405-07-30 |
| Task | rula-landmark-accuracy-20261022-01 |
| Source checkpoint | aee9d0671f5f4e58cb1abe35ca36d4035f488e02 |
| Status | COMPLETE_SCOPED_REPAIR — deployed; landmark/projection/persistence acceptance PASS_SCOPED |
| Deployed release | release-rula-landmark-accuracy-20261022-01 |
| Deployment time | 2026-10-22T18:17:29.495Z |
| Recorded API PID | 13180 |

## Scope, baseline and recovery

The React/Vite frontend, Fastify API, Prisma/MySQL storage, existing consent controls and editable assessment workflow remain the baseline. The defect is generated RULA joint coordinates that do not reliably align with visible anatomy. The correction introduces a separate local detector for joint coordinates; the existing generative provider remains responsible for editable posture suggestions and high-level view context.

Verified local backup: `backups/NIVASafe-before-landmark-fix-20261022-aee9d06.zip`, SHA-256 `b1581bf6a5b8fa5ab37e196ad18afc7bde4361688035738026c869b6e2ca4a00`, 16,084,955 bytes. Backup evidence records 957 files and ZIP CRC validation. No successful remote GitHub push is established by this evidence. The previous immutable production release and its private operational backup remain the recovery baseline.

## Implementation and API boundaries

| Component | Change or responsibility |
|---|---|
| `backend/src/rula-pose-provider.ts` | Bounded shell-free local subprocess and strict response protocol |
| `backend/python/rula_pose_worker.py` | Local CPU MediaPipe inference; strict stdin envelope; no image-file persistence |
| `backend/python/requirements.lock` and model manifest | 19 pinned wheel hashes, model source/hash and license record |
| `backend/src/rula-local-pose-geometry.ts` | Independent anatomical sides and exact normalized-frame mapping |
| `backend/src/rula-posture-ai.ts` | Ignore generated coordinates in local mode; use local points for drawing and geometry audit |
| `backend/src/modules/assessments.ts` | Refresh authorization before local CPU work and preserve external transfer guards |
| `backend/src/config.ts` | Validate explicit activation and required absolute local runtime/model configuration |
| RULA lightbox JSX and two CSS rules | Fit the overlay canvas to the rendered image; preserve other image workflows and global CSS |

The same Sharp-normalized, EXIF-oriented PNG frame feeds localization and posture analysis. Response dimensions, request identity and model hash must match. Low-visibility, absent and out-of-frame points are omitted, without clamping, mirroring or other-side substitution. No person, multiple people or no usable connected limb produces abstention. Local failure does not fall back to generated dots.

The native nose is a face proxy; no neck or head center is fabricated. Local detector confidence is not calibrated ergonomic accuracy. It does not produce final RULA scores. Unsupported measurements remain unavailable and human review is required. FMEA, product layout and unrelated routes are outside the repair scope. No database migration or schema change is required by the new local worker.

## Security and privacy review

Authentication, organization and assessment permission precede upload work. Before CPU inference the route refreshes identity, tenant/role/subscription, AI access, current account consent and photo-owner authorization. External token quota reservation and the existing mandatory transfer audit remain in place; authorization is refreshed again after that asynchronous audit before dispatch.

Only operator-configured absolute local executable, worker and model paths are accepted. There is no shell, request-selected path or subprocess secret inheritance. Python runs with `-I`; image bytes use stdin. Limits are 10 MiB image input, 24 million pixels, 64 KiB stdout, 20 seconds and one active inference per API process. The slot stays held until worker exit after failure; diagnostics are not returned to the user.

Model SHA-256 `5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1` is checked in Node and Python. The worker requires MediaPipe 0.10.32 on dedicated Python 3.12 AMD64. Independent inspection confirmed runtime/model directory inheritance disabled with SYSTEM/Administrators only, plus an enabled all-profile outbound Block rule targeting the dedicated `python.exe` and any remote address. The root agent's actual TCP probe failed with Windows permission error 10013. No global firewall policy was changed.

Local landmark inference adds no external image service. The existing ArvanCloud image-analysis transfer remains consent controlled. External retention, deletion, training and processing-location guarantees remain unverified; this repair does not claim their approval. No security defect requiring remediation was identified in the independently reviewed new boundary. Final deployment must preserve these controls.

## Validation executed

| Check | Status | Result |
|---|---|---|
| Subprocess boundary Vitest suite | PASS | 22 tests |
| Local geometry and posture parser Vitest suites | PASS | 32 tests |
| Python boundary unittest suite | PASS | 10 tests |
| Backup hash, model hash, private ACL and firewall configuration | PASS | Independently checked |
| Actual local inference smoke | PASS | Existing task evidence: one synthetic reference, blank and two-person cases |
| Six-point reference comparison | PASS_LIMITED | All six limb points improved against independent visual boxes; not anatomical ground truth |
| Pinned-package advisory metadata | PASS_LIMITED | 19 version records without reported advisories; no absence-of-vulnerability guarantee |
| Complete frozen-candidate tests | PASS | 793 backend and 475 frontend; zero failed or pending |
| Domain/frontend/backend builds and typecheck/lint | PASS | Eight recorded checks; Node 24.19.0 |
| Dedicated offline Node-to-worker smoke | PASS | 11,788 ms, one pose, 33 native landmarks, maximum difference 0 against direct-worker probe; zero external calls |
| Production-runtime startup smoke | PASS | Node 22.22.3 on isolated port 5057; correct immutable entry and healthy database |
| Authenticated desktop landscape inline/lightbox | PASS | Actual image/SVG bounds identical; eight rendered point values agree with stored coordinates within 1e-12 |
| Durable result, test-draft save and reopen | PASS | Pinned model-stamped local points preserved; original user assessment posture-analysis hash unchanged |
| Actual browser PDF/XLSX/DOCX downloads | PASS_STRUCTURAL | 71,071/18,066/7,695 bytes; PDF header/EOF, OOXML ZIP CRC and expected parts; no complete content/layout audit claimed |
| New deployment/OS process/listener identity | PASS | PID 13180; matching immutable entry; healthy API; four protected public routes return 401 |
| Actual mobile overlay viewport check | NOT_RUN | Browser resizing unavailable |
| Actual portrait overlay visual check | NOT_RUN | No additional paid analysis solely for layout |
| Independent final release review | PASS_SCOPED | Deployed module/source/worker/lock identity, runtime, preserved assets, local isolation, stored geometry and browser evidence reviewed |
| Clinical/population accuracy | NOT_RUN | Not part of this focused engineering check |
| Whole-product security audit or external penetration test | NOT_RUN | Scope limited to affected boundaries |

```text
backend: node node_modules/vitest/vitest.mjs run src/rula-pose-provider.test.ts --reporter=dot
backend: node node_modules/vitest/vitest.mjs run src/rula-local-pose-geometry.test.ts src/rula-posture-ai.test.ts --reporter=dot
C:/ProgramData/NIVASafe/runtimes/rula-pose-20261022/python.exe -I -m unittest discover -s backend/python -p test_rula_pose_worker.py -v
```

Independent evidence: `reports/evidence/rula-landmark-accuracy-20261022-01/independent-security-review.json`. A single supplied synthetic worker and transformed cases are engineering reference material, not clinical, population or pixel-perfect validation. Reported distances to visual boxes are not exact joint-point errors.

## Stage and preservation checkpoint

All twelve scope-specific stages passed through the verified candidate, route/worker, deployment, live desktop browser/lightbox/save/reopen/export checks and independent final review. Historical project-state keys and prior maintenance runs remain preserved. This does not declare the whole historical project accepted.

The frozen source hashes match. Five runtime modules changed or were added, and none was removed. Protected schema, manifests, lockfile, entry modules and unrelated baseline artifacts match. No migration was executed. Node dependencies, private environment and existing worker configuration were preserved. Existing stylesheets and old assets remain; only a scoped two-rule CSS supplement and the new JavaScript entry are introduced.

The first deployment attempt timed out at the executable/database health check; automatic recovery restored the previous release and verified its executable identity without data change. The exact timeout mechanism is unproven. Independent inspection found the earlier environment merge and later payload semantically equivalent for the captured configuration, so no environment-merge root cause is claimed. A minimal previously verified RPC retry and a separate Node 22 candidate startup both passed. Both `deployment-attempt-one-failure.json` and `restart-retry.json` remain preserved. The deployed OS command line and listening PID resolve the new immutable entry, rather than relying only on an application version label.

## Authenticated browser and persistence evidence

Analysis `494cb5ee-2e19-44a8-8ab1-008e02630ac1` succeeded in one provider-validation attempt. Eight published points carry the local detector/model audit stamp, match the durable analysis exactly and contain no invented neck point. Test assessment `92927dab-e99e-4c0c-a8a5-08feb3f9652f` was saved as version 6, remains DRAFT and reopened with the same coordinates. The original user assessment's posture-analysis hash was unchanged. Source rows were not certified by the agent.

Desktop landscape inline and enlarged views had exactly equal image/SVG bounds. Rendered point values match persistence within 1e-12. The browser downloads passed the structural checks and sizes above; these checks alone do not certify complete document content or visual layout. A separate download concern was confirmed resolved by the user without code changes. Evidence is retained in `browser-qa.json`, `live-result-verification.json`, `live-reopened-result.json` and the inline/lightbox measurements/screenshots.

No required page, feature, route, role, schema, migration, asset or test was removed. Independent final review passed at 2026-10-22T18:29:33.448Z, with matching published source/compiled modules/worker/lock and no material scoped security finding. It reviewed existing immutable validation evidence rather than rerunning the full suites or repeating downloads. Mobile and portrait actual-overlay visual checks remain NOT_RUN; clinical/population and pixel-perfect anatomical accuracy are not claimed. The final landmark/projection/persistence verdict is PASS_SCOPED.

## Subsequent separate reliability repair

A separate first-attempt image-analysis incident was reported after the landmark acceptance. It was subsequently repaired and accepted in `release-image-first-attempt-20261022-02`: clean first uploads passed for RULA in 39.210 seconds and FMEA in 24.967 seconds, each without manual retry. The landmark repair alone had not addressed that incident. See the subsequent reliability report and `reports/evidence/image-first-attempt-20261022-01/independent-final-review-r2.json` for evidence and limits; no universal image-processing or whole-project completion is asserted.

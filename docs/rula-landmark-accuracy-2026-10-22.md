# RULA local landmark localization repair

| Field | Value |
|---|---|
| Task | rula-landmark-accuracy-20261022-01 |
| Gregorian date | 2026-10-22 |
| Jalali date | 1405-07-30 |
| Checkpoint status | COMPLETE_SCOPED_REPAIR — landmark source, frame projection and persistence verified |
| Preserved source checkpoint | aee9d0671f5f4e58cb1abe35ca36d4035f488e02 |

## Scope and preservation

The owner reported that image analysis completed but its displayed joint points were misplaced. This repair changes the source of RULA joint localization while retaining existing assessment screens, editable findings, consent, ownership, access, quota and provider-transfer controls. FMEA and unrelated product areas are outside the implementation scope. A successful transport response does not establish anatomical accuracy.

Before this repair, the sanitized source checkpoint was archived as `backups/NIVASafe-before-landmark-fix-20261022-aee9d06.zip`. Its independently rechecked SHA-256 is `b1581bf6a5b8fa5ab37e196ad18afc7bde4361688035738026c869b6e2ca4a00`. The archive records 957 source files, ZIP CRC validation and preservation of the working tree. This evidence establishes a local backup; it does not establish a successful remote GitHub push.

Release `release-rula-landmark-accuracy-20261022-01` was deployed at 2026-10-22T18:17:29.495Z. The authenticated browser checks and independent final review passed. Acceptance covers this landmark localization, projection and persistence repair, not all image-processing reliability or the whole historical project.

## Failure mechanism and implementation

The previous image path accepted generated joint coordinates alongside generated posture suggestions. Plausible numerical coordinates can still miss visible anatomy. The new enabled path obtains native body points from MediaPipe Pose Landmarker Full on the server, then uses those same normalized coordinates for drawing and image-plane geometry auditing. The existing generative provider still supplies editable posture suggestions and high-level view context under its existing consent-controlled transfer path; it no longer supplies the displayed joint coordinates in local mode.

The detector receives the exact PNG normalized by the existing Sharp decoder, with EXIF orientation applied and metadata removed. Its width and height are bound to the request and checked in the returned result. Anatomical LEFT/RIGHT remain independent. Low-visibility, absent and out-of-frame points are omitted; points are not clamped to a border or borrowed from the other side. Zero subjects, multiple subjects or no usable connected limb produce abstention. There is no generated-coordinate fallback following an enabled local detector failure.

The RULA enlarged-image canvas now fits the rendered image's width instead of stretching the overlay across empty horizontal space. This is one conditional lightbox class and two scoped CSS rules; other image workflows and the existing global stylesheets are preserved. Actual desktop landscape browser checks confirmed identical image/overlay bounds in both inline and enlarged views.

MediaPipe has no cervical or head-center landmark. The visible nose is used only as a face proxy; no neck point or cervical measurement is fabricated. The detector does not compute final RULA scores. Existing geometry checks may withhold unsupported angles, and human review remains required.

## Local worker boundary

`rula-pose-provider.ts` starts only an operator-configured absolute local executable and worker with argument arrays, `shell:false`, a hidden Windows process and isolated Python `-I`. The subprocess environment is allowlisted and excludes application credentials and Python import-path overrides. Image bytes pass through stdin without image-file persistence. Neither uploads nor request fields select executable, model or filesystem paths.

The worker accepts one strict JSON/PNG envelope, at most 10 MiB decoded input and 24 million pixels, and emits at most two native poses. The adapter limits stdout to 64 KiB, inference to 20 seconds and active inference to one per API process. After a timeout or protocol error, the slot remains held until process termination is confirmed. Diagnostics are drained without logging image bytes, secrets, private paths or tracebacks to the user. Errors are fixed safe codes.

The model is `pose_landmarker_full.task`, 9,398,198 bytes, SHA-256 `5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1`. Node and Python both verify the model hash. The worker requires MediaPipe 0.10.32; the Python 3.12 Windows AMD64 dependency profile contains 19 exact wheel hashes in `backend/python/requirements.lock`. The model manifest and Apache license notice are retained.

Dedicated runtime/model directories under `C:/ProgramData/NIVASafe/` have inheritance disabled and grant access only to SYSTEM and Administrators. An enabled outbound Windows Firewall Block rule for all profiles targets exactly `C:/ProgramData/NIVASafe/runtimes/rula-pose-20261022/python.exe`, with any remote address. The owner-agent's runtime probe received Windows permission error 10013 rather than establishing a TCP connection. This is an executable-specific policy; global firewall policy was not changed. Deployment must preserve this rule and these private paths.

## Authorization and external processing

The route requires authentication, organization context and assessment permission before upload processing. Before local CPU inference it refreshes authentication, role, active organization/subscription, AI access, current account consent and photo-owner authorization. Before each existing external dispatch it refreshes access again, durably audits transfer authorization, and rechecks the same authorization after that asynchronous write. The existing provider quota reservation remains authoritative for external token use.

Local localization adds no image transfer to another service. The existing ArvanCloud image-analysis transfer remains consent controlled; unknown vendor retention, deletion, training use and processing-location conditions remain unknown. No new consent is silently accepted for the user. No production image or customer identity was needed for the focused security tests.

## Executed checkpoint validation

| Check | Status | Evidence and limit |
|---|---|---|
| Backup hash | PASS | Exact archive SHA-256 independently rechecked |
| Node subprocess boundary | PASS | 22 tests, including hash/protocol/frame mismatches, concurrency, timeout, size, missing config and safe diagnostics |
| Coordinate mapping and parser | PASS | 32 tests across two suites; local coordinates, side isolation, abstention and no fabricated neck |
| Python input/model/output boundary | PASS | 10 unittest cases on the dedicated runtime; no model or network needed |
| Runtime/model ACL and firewall configuration | PASS | Independent read-only inspection; exact executable rule and manifest hash |
| Actual local detector smoke | PASS | Existing task evidence: one synthetic worker, zero-person and two-person cases; not an independent population study |
| Reference comparison | PASS_LIMITED | All six reviewed limb points improved against pre-specified visual boxes in one synthetic reference; box distance is not anatomical point ground truth |
| Dependency metadata review | PASS_LIMITED | PyPI metadata for 19 pinned versions reported no advisories; this is not proof of absence of vulnerabilities |
| Full frozen-candidate tests | PASS | 793 backend and 475 frontend tests; zero failed or pending |
| Domain/backend/frontend typecheck, lint and builds | PASS | Eight recorded candidate checks; Node 24.19.0; existing chunk-size warning retained |
| Actual dedicated offline Node-to-worker call | PASS | 11,788 ms, one person, 33 native points, maximum coordinate difference 0 against the direct-worker probe; zero external provider calls |
| Production-runtime startup smoke | PASS | Node 22.22.3, isolated port 5057, correct immutable entry and healthy database; zero external provider calls |
| Authenticated public image, inline and enlarged view | PASS | Desktop landscape; image and SVG bounds identical; eight rendered coordinates match stored findings within 1e-12 |
| Durable findings and saved test draft reopen | PASS | Eight local points, model-stamped audit, original user assessment posture analysis unchanged; test draft version 6 reopened |
| Actual browser PDF/XLSX/DOCX downloads | PASS_STRUCTURAL | 71,071/18,066/7,695 bytes; PDF header/EOF and OOXML ZIP CRC/expected parts verified; not a complete visual/content audit |
| New production deployment and runtime identity | PASS | Correct PM2 path, OS command line and listening PID 13180; public protected routes return 401 |
| Mobile viewport visual check with actual overlay | NOT_RUN | Browser resizing unavailable |
| Portrait-image visual check with actual overlay | NOT_RUN | No additional paid analysis made solely for this layout check |
| Independent final release review | PASS_SCOPED | Exact deployed module/source/worker/lock identity, runtime/listener, privacy boundaries, assets, saved points and browser evidence reviewed |
| Clinical/population anatomical accuracy | NOT_RUN | Outside this focused engineering repair |
| Whole-product penetration/security audit | NOT_RUN | Scoped trust-boundary review only |

Independent review evidence: `reports/evidence/rula-landmark-accuracy-20261022-01/independent-security-review.json`.

Commands executed by the independent reviewer:

```text
backend: node node_modules/vitest/vitest.mjs run src/rula-pose-provider.test.ts --reporter=dot
backend: node node_modules/vitest/vitest.mjs run src/rula-local-pose-geometry.test.ts src/rula-posture-ai.test.ts --reporter=dot
C:/ProgramData/NIVASafe/runtimes/rula-pose-20261022/python.exe -I -m unittest discover -s backend/python -p test_rula_pose_worker.py -v
```

## Remaining release gates and recovery

The independent final release review passed. Candidate/published source hashes and worker/lock hashes match, no prior runtime module was removed, and only five runtime modules changed or were added. The database schema/migrations, private environment, existing worker configuration and unrelated baseline artifacts were preserved. Existing global CSS and its previous supplement remain; the release adds only the scoped image-frame supplement. Actual browser save/reopen, image/lightbox bounds and exports passed within the desktop landscape scope; mobile and portrait visual coverage remains explicitly NOT_RUN.

Keep the prior immutable application release and its private operational backup. Runtime activation must use explicit local-pose configuration; failure must remain an error/manual-review state rather than substituting invented points. A rollback must restore the prior verified application/configuration without deleting assessment records, image files, source history or the dedicated offline rule.

The first deployment attempt timed out at the executable/database health guard and automatically restored the previous release, with runtime identity verified and no data change. The exact cause of that timeout is unproven; inspection found the earlier environment merge and the later payload semantically equivalent for the captured configuration. A retry using the minimal previously verified RPC payload passed, as did a separate Node 22 candidate startup smoke. Both `deployment-attempt-one-failure.json` and `restart-retry.json` are retained alongside final `deployment.json`; the initial failure is not hidden or assigned an unsupported cause.

At the deployment checkpoint the new JavaScript entry is `/assets/index-D-il0xP7.js`; existing global stylesheet `/assets/index-ab6f25e515.css` and consent supplement `/assets/rula-direct-consent-3ff846b13ecd.css` remain, with `/assets/rula-pose-frame-59040026907e.css` added for the two scoped rules. Old assets remain available. No migration was executed.

## Authenticated browser and stored-result verification

The live RULA request succeeded in one provider-validation attempt and stored analysis `494cb5ee-2e19-44a8-8ab1-008e02630ac1`. Its eight published overlay points originate from the local detector with the pinned model stamp; no neck point is invented. Persisted coordinates match the analysis exactly. The clearly marked test assessment `92927dab-e99e-4c0c-a8a5-08feb3f9652f` was saved as version 6, remains DRAFT, and reopened with the same geometry. The original user assessment's posture-analysis hash remained unchanged; no existing customer result was silently rewritten or certified by the agent.

Image and SVG bounds are identical in the inline and enlarged desktop landscape views. The displayed normalized point values agree with stored coordinates within 1e-12. This establishes correct frame projection and persistence for the tested image, rather than clinical joint-location accuracy. The actual browser downloads have the sizes in the table above and passed the recorded structural checks. The user's separate download concern was confirmed resolved, requiring no code change.

Evidence: `browser-qa.json`, `live-result-verification.json`, `live-reopened-result.json`, `live-inline-landscape.json`, `live-lightbox-landscape.json`, `live-corrected-landmarks.png` and `live-reopened-landmarks.png` under the task evidence directory. Actual overlay testing was desktop landscape only. Browser resizing was unavailable; portrait overlay testing would have required another paid analysis and was not performed solely for layout. No unexecuted coverage is claimed.

## Final scoped verdict and subsequent reliability repair

PASS_SCOPED. The candidate's 1,268 application tests, 10 Python boundary tests, builds and type/lint checks passed; the new release is deployed with verified executable identity, and desktop landscape browser/save/reopen/export checks passed. Independent review in `independent-final-review.json` passed at 2026-10-22T18:29:33.448Z. Scoped stages 01–12 are complete. Mobile/portrait visual testing and clinical/population accuracy are not claimed.

A separate first-attempt image-analysis incident was reported after the landmark acceptance. It was subsequently repaired and accepted in `release-image-first-attempt-20261022-02`: clean first uploads passed for RULA in 39.210 seconds and FMEA in 24.967 seconds, each without manual retry. The landmark repair alone had not addressed that incident. See the subsequent reliability report and `reports/evidence/image-first-attempt-20261022-01/independent-final-review-r2.json` for evidence and limits; no universal image-processing or whole-project completion is asserted.

# RULA connected landmark display

Date: 2026-10-22 / 1405-07-30. Task: `rula-connected-overlay-20261022-01`.

## Requested behavior and scope

Join the existing visible posture landmarks with readable lines in the inline image and its enlarged view. Preserve existing points, scores, image analysis, consent, files, routes and all other product areas. This is a targeted presentation repair; backend, database, API and identity implementations require no change.

The live overlay already emitted five links for the stored eight-point worker image, but `.008` stroke width combined with `non-scaling-stroke` resolved to `0.008px`, making them effectively invisible. Use a fixed `2px` stroke with round ends and a `1px` point outline. Add the omitted wrist-to-hand link. Where no visible neck point exists, connect the existing head and shoulder for display without inventing a joint or changing measurements. Other missing or uncertain joints retain their gaps.

## Preservation boundary

The published frontend baseline is the immutable landmark release candidate. Apply only the overlay function, its two CSS rules and focused regression coverage. Unrelated unpublished working-tree changes and the duplicate feature refactor are excluded. Preserve all existing live assets and three stylesheet links; publish new immutable JavaScript and one overlay-only stylesheet through an atomic index switch. Retain the exact old index for recovery.

The active image-processing backend remains `release-image-first-attempt-20261022-02`, PID 4420. No provider call, reassessment, data mutation, migration, dependency change, backend restart or proxy reload is required.

## Validation

Status: COMPLETE_SCOPED_REPAIR. Primary evidence is retained in `reports/evidence/rula-connected-overlay-20261022-01/`.

- Production Node 22.22.3: 480 frontend tests passed, including five actual SVG rendering cases for native points, visible necks, uncertain wrists, missing/nonfinite joints and absent overlays. Typecheck/lint, unchanged domain build and production frontend compile/build passed.
- Independent source and security review confirmed that reversing the overlay block and two CSS rules restores the prior application source byte-for-byte. No new dependency or security boundary was introduced.
- The initial validation harness lacked the compiled domain and nine unchanged backend files read by existing UI contract tests. Building the unchanged domain and supplying those hash-verified test inputs resolved this prerequisite issue; the failed attempt and repair remain recorded. No application behavior or test assertion was weakened.
- Frontend publication succeeded at 19:40:42 UTC. All 699 prior non-index static files and three existing stylesheet links were preserved; the original index is retained for recovery. The API process, configuration, environment and reverse proxy remain unchanged.
- Actual browser verification passed in the inline and enlarged views: the same eight saved point coordinates now have seven visible round `2px` links. Image/overlay bounds differ by at most 0.015625 CSS pixels. No new analysis or assessment save was performed.

Evidence: `build-validation.json`, `security-review.json`, `deployment.json`, `preservation-review.json`, `browser-verification.json` and `live-connected-landmarks.png` in the task evidence directory. Lint uses the repository's TypeScript no-emit command. The five focused tests overlap the 480-test suite.

This presentation change does not establish anatomical accuracy or complete unrelated project work. New mobile/portrait and export checks were not run; no responsive layout or export handler changed. Missing or uncertain joints remain omitted rather than receiving fabricated coordinates.

# StyledSelect intrinsic height stability repair

The option menu placement used its own constrained scroll/client height as its natural height. This created a feedback path from applied max-height and rounded scrolling geometry back into placement. StyledSelect now requests intrinsic row measurement: actual option row heights plus gaps, padding and borders, rounded once. Popup size/scrollbar state is no longer an input into its desired option height. Other popup types retain the existing overflow measurement so asynchronous flex content can still expand correctly.

Existing stable scrollbar gutter, custom thin scrollbar, minmax content width, selected values, form inputs, keyboard controls, clipping-container support and responsive placement are preserved. PWA cache is advanced to v26. No backend, database, environment, project data or AI behavior changes.

Unit regression verifies fractional option dimensions and independent desired height. Browser regression observes 40 consecutive animation frames after opening, for 4/6/8 options, 390/1280 widths and triggers near the top, boundary and bottom of an 800px viewport. Position, size and scrollbar state must remain identical; menus must remain in viewport, Escape and keyboard selection must still work. Synthetic test data only; no production records mutated.

Security review: no new untrusted input, HTML rendering, request or permission boundary. DOM measurements are local, observers and event listeners retain existing cleanup, and disabled/required behavior is unchanged. Build/lint/typecheck and full frontend tests are run before deployment. Existing large bundle warning remains.

Evidence: C:/NIVASafe/backups/select-stability-{tests,build,lint,typecheck}.log and scripts/check-select-stability.cjs. Rollback and deployment health/artifact verification are recorded in project-state.json.

## Final verification

203 frontend tests, production build, lint, typecheck and diff check PASS. All 18 browser stability/keyboard cases PASS. Frontend deployed with PWA v26, local/public login and API health HTTP200, database up, public assets match source build hashes. Rollback is recorded in latestSelectIntrinsicHeightStability in project-state.json and the deployment manifest. No backend restart or customer data mutation was required.

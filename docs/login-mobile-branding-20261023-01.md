# Mobile login branding maintenance

Release: `release-login-mobile-branding-20261023-01`

Status: implemented, validated and published. Independent final acceptance is governed by reports/evidence/login-mobile-branding-20261023-01/final-review.json.

## Stage 01 — requirements and preservation

Only the mobile login landing surface at widths of 900 px and below changes. Reuse the existing main-brand icon container and the two already published original locale wordmarks. Desktop login, the mobile login form, every authentication handler and all unrelated pages remain unchanged.

| ID | Observable behavior |
|---|---|
| FR-01 | On the mobile landing view, remove the existing icon from the toolbar visually and show the existing icon in the main brand area. |
| FR-02 | Place the currently selected locale's existing original wordmark directly beneath that main icon; retain the existing subtitle node and translations. |
| FR-03 | Reflow the landing toolbar within the space released by its hidden brand, preserving all theme/language/navigation controls and destinations. |
| FR-04 | Use compact responsive brand sizing, including shorter viewport heights, without overlap, distortion or horizontal clipping. |
| NFR-01 | Preserve the desktop layout above 900 px, mobile form layout/navigation/content, validation, submission locking, credentials/session/redirect handling and API authorization. |
| NFR-02 | Preserve every prior source/asset/API/data/configuration boundary. Reuse both original supplied PNGs byte-for-byte; add no new image assets or dependencies. |

## Stage 02 — UI architecture and verification

Reuse LoginPage and its existing `.login-mobile-brand` container. Add only the requested locale wordmark image; retain existing text nodes and behaviors. Scope new visual rules to mobile landing state, excluding the mobile form, registration and recovery screens. Reuse the established 900 px boundary, RTL/LTR behavior and selected locale/theme. Preserve desktop typography, 64 px desktop header and compact footer from the previous accepted release.

Verify the actual candidate JavaScript with all twenty existing production stylesheet links retained exactly and one new scoped mobile stylesheet. Do not publish the rebuilt global stylesheet. Compare desktop and mobile form geometry/content against the actual published baseline in Persian and English, white and blue themes. Exercise landing/form/back navigation and runtime locale/theme switching with isolated loopback fixtures. No real credentials, provider calls, production business writes or external seal service calls are required.

## Initial integrity and handoff

The unchanged baseline has 533 source files. Current entry is `/assets/index-BUWCCQVs.js`; all 909 public files and 368 private backend files are inventoried. API `release-rula-review-population-20261023-01`, PID 10380, reports database up. The two wordmarks are already public and hash-verified. Original public index and configuration snapshots support preservation/rollback; environment evidence contains a hash only. Root source snapshots preserve the original files separately from the published candidate.

Evidence: `reports/evidence/login-mobile-branding-20261023-01/runtime-before.json`, `baseline.json`, `initial-candidate-manifest.json`, `root-initial-sources.json`, `assets-preservation.json`, `integrity-baseline.json` and `scope.json`.


## Stage 10 — comparable form snapshot state

The first 32-profile run passed the 12 desktop profiles and failed the 20 combined mobile profiles at the protected form screenshot check; their preceding landing-brand/layout checks passed. The original 52-stage baseline, failed screenshots, helpers, source and build are retained under `reports/evidence/login-mobile-branding-20261023-01/attempt-01-pointer-hover/`. Product source, build and frontend plan remain unchanged.

Residual pointer position after the relocated landing CTA produced different existing form hover-border states. Independently served original and hybrid applications matched with zero differing pixels in paired clean-form diagnostics at widths 320, 390 and 812 px. A separate observation-only canonical baseline covers all 20 form profiles using the original published index and assets: real CTA navigation, pointer at (0,0), reload of the same `#login-form` URL, font/image settlement and 350 ms rest. No DOM, CSS, focus or pixel manipulation is used. Original post-click geometry, controls, focus and navigation assertions remain; screenshot equality is checked in the same canonical state on both versions.

Canonical evidence: `canonical-form-baseline.json`, its captured original index, helper, source/fonts, static inputs and all 20 DOM/screenshot pairs. The original baseline remains immutable. Stage 10 requires the same 32-profile acceptance rerun to pass; deployment and final acceptance follow their existing gates.


## Stage 10 — exact theme settlement

The next unchanged-product run passed 31 of 32 profiles; one runtime blue-to-white appearance check sampled an inherited park-logo text color during the existing CSS transition. Paired original published and candidate diagnostics reproduced that timing and reached the same exact expected color after settlement. The harness uses a bounded two-second poll for the existing baseline color before the unchanged full computed-state and pixel comparisons. No CSS, expected value, tolerance, product source, build, frontend plan or original/canonical baseline changes are involved. Failed evidence and helper are retained under `reports/evidence/login-mobile-branding-20261023-01/attempt-02-theme-settle/`; the same 32-profile matrix must pass.


## Stage 10 — screenshot identity integrity

A subsequent run passed all 32 functional checks, but its evidence audit found that a repeated 390 px Persian white landing capture reused a pathname. One first-recorded hash no longer matched the later actual PNG. Publication remained blocked. The exact ledger and current actual files are archived under `reports/evidence/login-mobile-branding-20261023-01/attempt-03-screenshot-identity/`; the missing earlier bytes were not reconstructed or represented as retained. The evidence-only repair assigns a unique owned pathname to every capture, refuses overwrites and validates every recorded PNG hash before the unchanged 32-profile matrix can be accepted. Product source, build, frontend plan and both original/canonical baselines remain unchanged.


## Stage 10 — desktop paint readiness checkpoint

The unique-capture run passed 31 of 32 profiles, with all 76 screenshot records unique and hash-valid. Only the initial 1920 px English blue desktop raw-pixel comparison differed (1,215 pixels) while its computed state matched. Publication remained blocked pending a bounded paired original/candidate paint-readiness diagnostic. The exact failed ledger, current PNGs and browser helper are retained under `reports/evidence/login-mobile-branding-20261023-01/attempt-04-desktop-paint/`; source, build, plan and both baselines remain unchanged. No tolerance or expected-value change is permitted.


## Stage 10 — fixed original-published desktop rasters

The paired diagnostic served the original published index and assets independently and captured a second stable exact raster for only the 1920 × 1080 English blue desktop landing. Its difference from the stored original was 1,215 pixels; the rendering cause remains unproven and is not described as a transition. The approved supplemental oracle fixes those two original-published PNGs and their index, source, font, asset and diagnostic provenance. This single profile must match one fixed original frame with exactly zero differing pixels, while retaining all original computed-state, control, geometry and focus assertions. The other 31 profiles retain their original comparison rules. There are no retries, masks, tolerance, candidate-derived expectations or automatic oracle extension. Product source, build, frontend plan and original/canonical baselines remain unchanged. The same 32 profiles require a fresh passing run before deployment.


## Published verification checkpoint

Gregorian: 2026-10-23; Jalali: 1405-08-01; release: release-login-mobile-branding-20261023-01. Frozen source files: 534. Frontend tests 533/533, all type/lint/build checks and 32+3 browser acceptance checks PASS. Desktop and mobile form are compared against the actual published baseline; only the requested mobile landing branding and necessary responsive flow change.

AccountPages.tsx adds only the localized image to the existing main-brand container; main.tsx imports login-mobile-branding.css. All new styles exclude the mobile form, registration and recovery screens and stay at or below 900 px. The original hidden subtitle node is retained. The main icon and wordmark form a centered vertical stack with compact sizes for shorter viewports. The original PNG bytes and desktop styling remain unchanged; the blue theme uses the existing white CSS treatment. At short landscape heights, the landing-only viewport sizing chain permits vertical document scrolling rather than clipping existing content.

All 908 prior non-index public files and 368 private backend files are preserved. All twenty prior stylesheet links and original PNGs are retained; one scoped mobile stylesheet is added. API PID 10380 is unchanged.

# Unified RULA evaluation and corrective action rows

The saved report and wizard preview now share one evaluation table. Each action occupies its own row with its title, full description, priority, state, action editor and completion control. Posture measurements and assessment scores remain available beside their corresponding actions. Multiple actions for a body part repeat the assessment context instead of stacking unrelated actions and buttons inside one cell.

An action affecting multiple body parts appears beside each relevant body part, using the same action identity and persistence callback. Postures without actions remain visible. General actions without posture mappings receive independent rows. The separate action register is no longer rendered; its editing and completion behavior is integrated into the evaluation table. The standalone component and its tests remain preserved.

Body-side filtering, permission-controlled callbacks, server persistence, AI request behavior, database schema and report exports were preserved. No production data or secret was modified for this change. Rendering escapes titles and descriptions, including in editable/read-only reports. Busy and completed states continue to disable applicable mutation controls.

## Validation

- Production build, typecheck and lint: PASS.
- Workspace tests: PASS, 184 frontend + 251 backend + 12 domain tests (unchanged backend/domain results reused from the validated cache).
- New regression coverage: independent related/general action rows, multi-factor mappings, persisted identities, completed/unselected states, bilingual rendering, one table, matching controls, read-only behavior and escaped content.
- API contract: PASS, 71 frontend paths and 126 backend routes.
- Release checks: PASS, 28 checks.
- Public login and exact deployed JavaScript/CSS hashes: PASS.
- API health and database readiness: PASS.
- Browser visual/interaction verification: NOT_RUN; browser tool failed to initialize twice with "trusted Node process exited unexpectedly".

## Deployment and preservation

Production base revision: c90c11a32c49d2948b417d3363df8fdd8e7fb6ce plus this local frontend patch. The patched source is preserved in C:/NIVASafe/backups/rula-table-fix, and the live deployment manifest records this distinction. The current checkout's prior local changes remain preserved.

Rollback frontend snapshot: C:/NIVASafe/backups/release-rula-unified-table-20261008-054938. Restore its index and assets through the existing static deployment process if necessary. No database rollback is required.

## Stage-three viewport repair

The minimum width of the desktop table escaped its grid ancestors. At a 1280px viewport, the reproduced page width was 1527px. Report/secondary grid tracks now use minmax(0, 1fr), and their cards, details and table wrapper have min-width: 0 and max-width: 100%. Only the table viewport scrolls horizontally.

Real headless Edge checks passed at 390, 768, 1280 and 1600px with page width equal to viewport width and all three synthetic action rows retained. A desktop screenshot was reviewed. The fixture uses synthetic data, not a production user session. Frontend build/typecheck/lint and 184 frontend tests passed. This supersedes the prior unavailable visual check for the affected layout. No server authorization, secrets, persistence or database behavior changed.

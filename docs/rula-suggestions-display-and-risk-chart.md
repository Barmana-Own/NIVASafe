# RULA risk distribution and corrective suggestion display

## Changes

The overview risk chart now consumes actual completed RULA results instead of mapping AI action priorities to clinical action levels. A score-7/action-level-4 assessment produces the immediate-change category even when its recommendations have HIGH rather than CRITICAL priority. All independent image results are included; without images, existing body-side results are used. Before posture review is complete, the existing advisory priority distribution remains available and is described as priorities. Labels distinguish measured assessments from advisory actions.

The correction suggestion table displays the first five recommendations initially. A plus control reveals the remaining already-received recommendations; the same control can restore the first five. No extra AI request is made, and the full recommendation inventory remains available for reports, risk/workflow metrics, row editing and selection.

Corrective action text in both existing tables uses a single-line escaped preview with an ellipsis. Native keyboard-accessible details expand the complete title and description in the same cell and provide a collapse control. Source text and editing values are preserved.

Missing separators were caused by numeric LTR cells changing the physical side of logical borders and by more specific table/mobile border overrides. Scoped physical left/right borders now protect every boundary in both RULA tables without changing column widths or adding horizontal scrolling.

## Verification

Regression tests cover actual immediate-change risks, incomplete-review advisory behavior, first-five rendering, hidden remaining recommendations, native full-text content and HTML escaping. Browser checks use the real React components with synthetic recommendations, verify 5/8/5 toggling, text expand/collapse, single-line previews, computed 1px separators, and no overflow at 390/768/1024/1554 pixels. Existing primary posture/action controls, image observations, API contracts and database persistence are preserved.

Security review: all title/description content remains React-escaped, no innerHTML or new endpoint/input/data mutation is introduced, toggles are type=button and details retain native keyboard operation. No secrets, environment or database changes.

Evidence logs: C:/NIVASafe/backups/rula-suggestions-{tests,build,lint,typecheck}.log. Deployment uses existing Nginx hosting with PWA cache v24 and a rollback backup; production health and asset hashes are checked after publication. No customer assessment mutation was needed for verification.

## Final verified release

202 frontend tests across 30 files PASS; build, lint, typecheck and diff check PASS. Real React browser interaction checks PASS at all four tested viewport sizes. Production local/public login and health return HTTP200 with database up; published assets match source build hashes. Frontend-only release deployed with PWA v24. Backend and database were unchanged. Rollback path is recorded under latestRulaSuggestionDisplayRepair in project-state.json and in the production deployment manifest. Security and regression review passed for the affected display boundaries.

## Compact mobile corrective suggestion rows
At widths up to 768px, corrective suggestions use a compact pale-blue list/grid presentation instead of six stacked labeled blocks. Each row preserves related factors, truncated/expandable full action text, current action state, body side, priority, estimated reduction and the existing select/status control. Existing first-five/show-more behavior and desktop table remain intact. No production TSX/business logic/API change was required; CSS selectors are limited to the corrective suggestion table.

Validation: 211 frontend tests PASS; build and lint/typecheck PASS; existing bundle warning remains. Edge browser at 320/390/430/768 and 1440 verified compact mobile rows (159–179px closed), unchanged desktop table-row presentation, selection/unselection, full text expansion/collapse, five/eight/five suggestion toggling, and no overflow/errors using synthetic fixtures. Existing connected mobile data table suite PASS with all 23 rows, pagination, operations, retry behavior and refresh parity. Scoped security/regression review PASS: CSS-only production change, no new HTML/input/API/credential/auth/persistence boundary; all fields and actions retained. Production mutations and physical device tests NOT_RUN.

Compact suggestion release published frontend-only with PWA v40. Public login/API health HTTP 200, MySQL up and deployed asset hashes verified. Backend unchanged.

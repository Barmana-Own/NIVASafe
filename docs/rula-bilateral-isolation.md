# Bilateral RULA isolation repair

## Scope and cause
When BOTH is selected, text, uploaded-image and saved-image analysis now request RIGHT and LEFT independently and merge only the requested anatomical side. The previous helper could copy a reviewed single-side result into both sides. Missing sides now remain unreviewed instead of inheriting the other side's score or overlay.

The report previously rendered only the active overview side. It now renders separate labelled right and left tables using each side's analysis, factors and corrective actions. Posture/detail edits preserve the other side and the existing image snapshot persistence path. Single-side assessments retain one request and one table. Equal genuine posture scores are still allowed.

A browser regression also found that advancing to stage 3 reused the same button DOM element with type submit, allowing the navigation click to submit and reset the form. Distinct React keys keep navigation and registration buttons separate.

## Validation
- 214 tests across 34 frontend files: PASS.
- Frontend lint/typecheck and production build: PASS; existing bundle size advisory remains.
- Real RulaPage with synthetic API: BOTH sends RIGHT then LEFT; independent scores; both stage-3 sections visible; Next preserves the form; single-side sends one request: PASS.
- Real analysis/report components: left-only edit preserves right score; 14 side-labelled rows; desktop and mobile parity: PASS.
- Existing connected mobile table regression: 23 rows, responsive 320/390/430/768, edit/complete/reopen/delete/undo, error paths and refresh/desktop sync: PASS; zero AI calls.
- Live AI semantic accuracy: NOT_RUN; synthetic provider fixtures were used without consuming production tokens.

## Security and integrity
Existing authenticated endpoints, organization ownership, validation, cancellation, retry limits and server-side calculations are preserved. Requests are sequential and bounded to at most two anatomical sides per analysis. React escaping remains in use. No backend/schema/migration, credentials, role or route change; no production data mutation in tests. Existing content and desktop/mobile operations are preserved.

Existing saved equal results are preserved; this repair does not automatically spend tokens to regenerate historical evaluations. Previously generated results require explicit reanalysis if the stored anatomical data is incorrect.

## Delivery
Frontend-only PWA v48. Production backup and public health/asset verification recorded in project-state.json. Rollback uses the saved frontend directory; no database migration is required.

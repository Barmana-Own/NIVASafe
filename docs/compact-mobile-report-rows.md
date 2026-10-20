# Compact mobile report rows

## Scope and preservation
The final FMEA report and RULA corrective suggestions now use the same clickable `rm-row` layout as RULA evaluation data at widths up to 768px. Desktop tables retain all columns and existing callbacks. FMEA review-stage tables retain their existing operations and rendering. Parent padding is removed only in the related mobile sections.

## Data and operations
- FMEA rows display failure mode, process step, recommendation preview, row/status, recalculated RPN and risk level. Search, sort, filters and 10-row pagination share the desktop data state.
- FMEA details preserve effect, cause, both controls, S/O/D/RPN, recommendations and linked action states. Authorized edit, completion and deletion use existing handlers and confirmation/error paths.
- RULA rows show factor, side, action preview, status, reduction and priority. Details preserve the full description and existing selection callback. Native dialog supports focus, Escape, backdrop dismissal and closes when switching to desktop.
- Text is rendered through React escaping; no HTML injection, new endpoint, credential, dependency, permission change or AI request is introduced.

## Verification
- Frontend: 212 tests in 33 files PASS; lint/typecheck and production build PASS. Existing bundle-size advisory remains.
- `scripts/check-compact-mobile-rows.cjs`: synthetic browser verification at 320/390/430/768/1440px; compact button rows, details, selection toggle, FMEA edit/complete/delete, 10/10/3 pagination, search, overflow and desktop preservation.
- `scripts/check-rula-mobile-connected.cjs`: all 23 rows, scores/shares/images, edit/complete/reopen/delete/undo, failure recovery and refresh parity PASS; zero AI requests.
- Security review: local escaped labels and full descriptions; existing authorization/server validation and mutation callbacks preserved. Synthetic fixtures only; production records were not mutated.
- Deployment: frontend only, PWA v44; static backup and public asset verification recorded in project-state.json. Backend and database unchanged.

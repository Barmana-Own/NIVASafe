# FMEA compact mobile full-details table

## Scope
Only the final report full-details section has the new fmea-full-details-section marker. At up to 768px, its existing table renders compact rows showing row number, failure mode, calculated RPN, risk level and view/edit/complete/delete controls. The existing detail dialog preserves full process, failure mode, effect, cause, both controls, recommendation and S/O/D/RPN/risk values; linked corrective action titles, status and priority were added to preserve all desktop information. Desktop and stage-two tables retain their existing layouts. Search, filters, sorting, pagination, exports and mutation handlers are reused.

## Validation
- 212 frontend tests across 33 files PASS; new regression covers full risk/action detail preservation, escaped untrusted title and read-only edit restrictions.
- Build and lint/typecheck PASS; existing bundle-size warning remains.
- Edge browser synthetic fixture: 320/390/430/768px compact rows 144–150px, 1440px original desktop table; full details, edit/completion/delete callbacks, completion disabled state, contiguous deletion numbers, search and 10-row pagination verified; no horizontal overflow.
- CSS scoped only to final FMEA details; no backend/API/schema/provider/auth changes. React escapes record content. Production record mutations and physical-device tests NOT_RUN.

## Artifacts
frontend/src/styles.css; frontend/src/features/assessments/AssessmentPages.tsx; frontend/src/features/assessments/FmeaCompactTableDetails.test.tsx; frontend/test-fixtures/fmea-mobile-table.tsx; C:/NIVASafe/backups/check-fmea-mobile-compact.cjs; C:/NIVASafe/backups/fmea-mobile-compact.png.

Frontend-only release PWA v41 published; public login/API health HTTP 200, MySQL up and deployed JS/CSS hash parity verified. Backend unchanged.

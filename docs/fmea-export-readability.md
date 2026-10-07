# FMEA export readability

## Scope and preservation

The supplied FMEA PDF, DOCX and XLSX samples were inspected as defect references. Corrections are in the production report generators, not replacements for downloaded files. Original samples, stored assessments, all nine workbook sheets, eleven-column risk tables, scoring rules, permissions and existing export routes are preserved. No migration, dependency or deployment change is required.

## Presentation and report content

- PDF: the executive summary, risk distribution and registered-action progress precede assessment metadata. Persian words retain their order, Persian/Arabic date digits remain left-to-right internally, wrapped text uses consistent measurement, headers repeat across pages, and the standalone final table uses compact S/O/D column headings.
- DOCX: native editable tables retain logical text order, with separate Persian and Latin/numeric runs, complex-script font properties, readable spacing, centered numeric cells and proportional descriptive columns. Assessment and process key/value tables reserve more space for values.
- XLSX: native RTL sheets and reading order, Tahoma, wrapped-content row heights, frozen detail headers and landscape fit-to-width printing remain enabled. Distribution shares and action progress use numeric cells with explicit percentage formats.
- PDF/Word summary reports and the SUMMARY worksheet explain S/O/D, RPN, configured risk thresholds and the meaning of registered-action progress. Registering a recommendation does not imply completing an action.
- Word and Excel preserve every recommendation supplied to the export instead of slicing that list to five. The top-risk summary intentionally remains a five-row summary; complete risks remain in the detail table. This does not alter AI generation or the upstream suggestion payload.
- The PDF action register includes its actual due dates. Word progress values include their percentage unit.

## Verification evidence

| Check | Result |
| --- | --- |
| Backend build | PASS — `pnpm --filter @nivasafe/api build` |
| Backend lint/type checking | PASS — `pnpm --filter @nivasafe/api lint` (TypeScript noEmit) |
| Backend tests | PASS — 203 tests, 28 files |
| API contract | PASS — 70 frontend paths matched against 123 backend routes |
| Whitespace diff check | PASS — `git diff --check`; existing LF/CRLF notices are non-failing |
| PDF visual QA | PASS — all six report pages and both standalone-table pages inspected using local Poppler renders; corrected dates and compact headers re-rendered |
| XLSX | PASS — saved/reopened with ExcelJS; data, numeric formats, RTL properties and preserved tables checked; OVERVIEW, PROCESS, FMEA, ACTIONS and PROPOSED ACTIONS previews inspected |
| DOCX structure | PASS — editable tables, mixed-direction runs, text preservation, guide and untruncated recommendations checked |
| DOCX visual rendering | NOT_RUN — bundled LibreOffice is unavailable |
| External deployment | NOT_PERFORMED |

The test fixture reuses the sample's long task description and ten S/O/D combinations, but uses synthetic risk titles and one synthetic registered action to exercise wrapping, percentages and deadlines. It is a regression fixture, not a recreation or amendment of the customer's assessment.

The spreadsheet preview renderer does not fully emulate native Excel RTL column order and word layout. Native worksheet and cell direction are independently verified after saving/reopening; preview inspection is not a claim of verification in Microsoft Excel. Likewise, structural DOCX checks do not substitute for visual verification in Word.

## Security and regression review

The changed export boundary retains XML entity/control-character escaping and spreadsheet formula neutralization. Export routes still require authentication, `reports.generate`, and organization-scoped assessment/action queries. No external service receives report content during QA. File generation for visual QA is opt-in through a test-only environment variable. No production secrets, source samples, existing tests, routes, database fields or authorization controls were removed or weakened.

This is a focused export correction; unrelated frontend, database, authentication and deployment implementations were not rewritten. RULA and existing FMEA export regression tests remain in the full backend suite.

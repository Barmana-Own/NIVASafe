# RULA export readability

## Scope

The production PDF, DOCX and XLSX generators in `backend/src/modules/reports.ts` were corrected using the supplied RULA exports as the defect reference. Original downloaded files, stored assessments, scoring rules, routes and permissions are preserved. Shared presentation helpers also improve FMEA exports; existing FMEA regression coverage remains enabled.

## Rendering and content

- PDF: embedded fonts, explicit Persian word placement, consistent wrap measurement, larger table text, descriptive-column widths, compact summary charts, repeated table headers and separated page numbering.
- DOCX: editable native tables, independent Persian and Latin runs, complex-script font/size/bold properties, Tahoma, readable paragraph spacing, headings kept with their content and a native Title paragraph. No text rasterization.
- XLSX: explicit RTL reading order, Tahoma, dynamic wrapped-content row heights including merged dashboard ranges, frozen detail headers and A4 landscape print settings with unrestricted page height.
- Standard RULA interpretation strings are localized without replacing user-written explanations.
- Posture-part score shares use the sum of reviewed posture-part scores, not a mixture of main-factor shares and posture-part shares. Rounded percentages can differ slightly from 100%; the authoritative RULA score is unchanged.
- Recommendation selection is explicitly labelled as selection status, not completion of corrective actions. Predicted scores remain estimates requiring reassessment.

## Verification

The regression suite generates Persian reports with the long task description from the supplied example and mixed Latin identifiers. It verifies text preservation, independent Word run directions, complex-script styles, editable worksheet round-tripping, adaptive heights and a common score-share denominator. Existing XML escaping and FMEA/RULA compatibility checks remain enabled.

All four pages of the updated local PDF fixture were rendered with Poppler and inspected. The PROCESS worksheet was previewed with the artifact renderer; native RTL sheet and cell properties were independently checked through ExcelJS after saving and reopening. The preview renderer does not fully reproduce Excel's native RTL column ordering.

DOCX visual rendering is NOT_RUN because this workspace runtime has no bundled LibreOffice executable. OOXML structure and content are verified, but that is not a claim of visual verification in Word. Actual production deployment is NOT_PERFORMED.

## Security and preservation

No new dependencies, external transfers, database migrations, credentials or authorization changes were introduced. XML escaping and spreadsheet formula-neutralization remain in the export boundary. QA generation is opt-in through a test-only environment variable and is not part of production report generation. The original uploaded/downloaded samples are untouched.

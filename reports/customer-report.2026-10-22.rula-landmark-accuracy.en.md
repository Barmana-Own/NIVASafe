# NIVASafe — RULA joint-point repair report

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report | Customer |
| Language | English |
| Gregorian date | 2026-10-22 |
| Jalali date | 1405-07-30 |
| Task | rula-landmark-accuracy-20261022-01 |
| Delivery status | COMPLETE_SCOPED_REPAIR — published and independently verified for joint placement |

## Objective and work implemented

The reported issue concerns points drawn away from the visible joints after successful RULA image analysis. The new implementation uses a specialist pose detector on the NIVASafe server to locate the displayed points, while preserving editable assessment findings and the existing screens and workflows.

The enlarged RULA image also receives a narrowly scoped frame correction so its overlay follows the displayed image rather than empty horizontal space. Unrelated styling and image workflows are preserved.

Missing, hidden and low-confidence points remain unavailable. The implementation does not invent a neck point, silently choose among multiple people or substitute generated points when the local detector fails. Assessments still require human review.

A verified local source backup was created before this work. That evidence does not constitute confirmation of a remote GitHub push. Existing source, user data and unrelated features are preserved as the required release baseline.

## Quality and privacy checkpoint

The complete candidate passed 793 backend and 475 frontend tests, plus domain/frontend/backend build and type/lint checks. The independent reviewer separately executed 54 focused TypeScript tests and 10 Python boundary tests; all passed. The local worker's model hash, protected directories and executable-specific network block were independently checked. An actual offline detector call and production-runtime startup smoke also passed. These checks support technical isolation and correct data handling.

The localization stage runs locally. The existing consent-controlled external posture-analysis service remains part of the workflow; no new user consent is silently recorded. Unverified external provider retention, deletion, training and processing-location conditions remain unchanged limitations.

One synthetic worker reference and transformed cases provide engineering evidence of improved placement. They do not certify performance across people, workplaces or camera views, and they are not clinical or pixel-perfect validation.

## Delivery and remaining work

The new release was published with verified server executable and listener identity. The first deployment attempt timed out at a health guard and automatically restored the previous version without data change; a verified retry succeeded. The exact initial timeout cause remains unproven. Both outcomes remain recorded.

Authenticated desktop browser checks passed for the actual image and enlarged view. All eight displayed points matched the saved analysis, the test draft reopened with the same geometry, and PDF, Excel and Word downloads passed structural file checks. The original user assessment was preserved and the test assessment remains a draft requiring human review. A separate download concern was confirmed resolved without code changes.

Actual overlay testing covered desktop landscape. Mobile and portrait visual checks were not performed; no additional paid analysis was made solely for layout. Candidate comparison and deployment evidence preserve the schema, private settings, existing assets and unrelated features. Independent final release review passed. The joint-localization, image-frame and saved-result repair is complete within this scope.

A separate first-attempt image-analysis incident was reported after the landmark acceptance. It was subsequently repaired and accepted in `release-image-first-attempt-20261022-02`: clean first uploads passed for RULA in 39.210 seconds and FMEA in 24.967 seconds, each without manual retry. The landmark repair alone had not addressed that incident. See the subsequent reliability report and `reports/evidence/image-first-attempt-20261022-01/independent-final-review-r2.json` for evidence and limits; no universal image-processing or whole-project completion is asserted.

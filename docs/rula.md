# RULA

RULA inputs are validated and calculated by the shared data-driven domain engine; the server is authoritative and returns score 1–7, action level 1–4, and a calculation trace. UI drafts are written immediately to user-scoped localStorage and backed up to serialized IndexedDB writes, so power loss, refreshes, and temporary network loss do not discard entered values. A saved offline draft can be synchronized after reconnection, and the result explicitly remains subject to HSE expert review.

## Activity information

The three-stage RULA stepper is directly navigable. Selecting process information, review/scoring, or assessment reporting changes the visible stage without triggering required-field validation. Process information is validated when leaving the first stage; posture-review completeness remains enforced before final registration so an incomplete preview cannot be saved as a final assessment.

The RULA job field uses the same database-backed searchable job catalog control as FMEA. Opening the field loads the organization and global catalog entries; typing filters Persian and English titles, departments, and catalog keywords locally. Selecting an entry keeps the localized catalog title in the RULA activity information, while a new title can be added to the organization catalog or retained as a custom title if catalog persistence is unavailable. The selected catalog identifier and custom-selection state are included in the local draft so refreshing or returning from project creation does not discard the job choice.

The first RULA wizard step records the context needed to interpret a posture assessment:

- project and assessment title; the project selector includes a «پروژه جدید» option that preserves the RULA draft, opens project/process management, and returns with the created project selected;
- job title and the activity/task being assessed;
- optional duration of each occurrence with seconds, minutes, or hours as the unit;
- optional repetitions per shift;
- optional duration of holding the posture with an explicit unit;
- optional force/load weight in kilograms or pounds;
- body side and optional subject/station code;
- optional posture photo in JPEG, PNG, or WEBP format, limited by the server's 10 MB image upload policy;
- optional short posture description covering the observed neck, trunk, upper limb, angles, applied force/load, and holding duration.

The activity context is persisted as validated `RulaAssessment.activityInfo` JSON so optional measurement units, the posture description, and future posture-assistance fields can evolve without changing the scoring contract. Each optional numeric measurement is stored only when supplied and is validated together with its unit. Adding the posture description or omitting the three measurements requires no new database migration. The API rejects invalid ranges and prevents an image reference from being attached to another organization or assessment. The image is uploaded through the authenticated attachment route after the RULA record exists and is linked with `entityType=RulaAssessment` and the assessment identifier.

The UI shows clear posture-photo guidance: the assessed body segments should be unobstructed, the body side and camera angle should be clear, and lighting should be adequate. A selected image is previewed before submission, can be replaced or removed, and is linked to the created RULA assessment only after the assessment exists. The optional posture description is shown with the image during analysis and is bounded to 1,000 characters in both the client and API contract. Automatic AI image analysis is intentionally represented as a future extension point only; the structured activity data is ready for a later provider integration and no unverified image result is generated or saved today.

## Posture analysis review

The second wizard step presents two editable result tables: Group A (upper arm, forearm, wrist, and wrist twist) and Group B (neck, trunk, and legs). Each row contains the detected angle, detection/presence state, result provenance, suggested score, and edit/confirmation actions. Missing observations start at an unreviewed neutral placeholder and are displayed as unavailable rather than as a valid RULA score. Editing an angle or detection state updates the suggested score where a deterministic RULA angle rule is available; the user can also correct the score directly. Group A and Group B totals, the final score, the four action-level badges, and the leading contributing factor are recalculated from the reviewed values without a refresh. Every posture row must be reviewed and confirmed before registration; AI-sourced rows additionally carry an explicit user-confirmation flag and cannot be accepted by the API as final until confirmed.

The posture-analysis view renders the uploaded worker photo and a prepared joint-overlay layer for neck, shoulder, elbow, wrist, hip, knee, and ankle. It is explicitly marked as ready for an image-model integration; the current release does not claim that the overlay or angle values were produced by a vision model. `RulaAssessment.postureAnalysis` stores the reviewable values with `AI`, `USER`, or `DEFAULT` provenance plus an explicit `confirmedByUser` review state so a future provider can populate the same contract without bypassing human review.

## API and migration

`POST /api/v1/rula` accepts the optional validated `activityInfo` and `postureAnalysis` objects. When posture analysis is supplied by the current UI, the server rejects missing, default, or unreviewed rows with `RULA_POSTURE_REVIEW_REQUIRED`; it never treats a base row as an AI observation. `PATCH /api/v1/rula/:id` updates them, recalculates the server-authoritative score from the scoring inputs, and validates any posture-image attachment reference. Metadata-only updates remain compatible with legacy records. Existing RULA records remain compatible because both JSON columns are nullable. Migrations `202609050003_rula_process_information` and `202609050004_rula_posture_analysis` add the JSON columns without changing existing scores or versions.

## Results and corrective actions

After registration, `/rula/:id/report` presents a focused result view with the current RULA score, assessment status, action/risk level, and the three primary contributing factors: neck, upper arm, and trunk. Factors are ordered by their relative contribution and show the reviewed angle, detection state, posture score, impact level, and provenance. The report also exposes bilingual corrective-action suggestions derived from the reviewed posture values and force/muscle inputs.

Assessors can select or remove suggested actions from a responsive table that shows the related body factor, the proposed corrective action and explanation, target body side, priority, estimated score reduction, and selection operation. The manual-action form explicitly displays and lets the user choose whether the action applies to the right side, left side, or both sides, alongside its title, description, related factors, priority, and estimated reduction. For a `BOTH` assessment, posture suggestions are generated independently for the LEFT and RIGHT analyses and each selected action stores its explicit `LEFT`, `RIGHT`, or `BOTH` scope. The server rejects a missing action side and rejects a side that is absent from a single-side assessment. Selected actions are persisted as tenant-scoped `CorrectiveAction` rows with validated `rulaImpact` and body-side metadata. The predicted score is recalculated immediately with a bounded reduction when actions are selected, removed, or added, and is explicitly labeled as a non-definitive estimate; it is not stored as the final RULA score and does not replace reassessment. Real Word (`.docx`), Excel (`.xlsx`), and PDF exports include the action body side alongside related factors and selection state. The predicted score is included when the report model is available. The tenant-authorized PDF route remains available only for backward-compatible API clients and is not rendered as a panel control.

## Force/load score contribution

The stage-two «نیروی واردشده / Applied force» selector explicitly displays the four point values required by the assessment workflow: no significant force = 0, low force = 1, medium force = 2, and high force = 3. The shared domain calculation used by both the live frontend preview and the server-authoritative `POST /api/v1/rula` and `PATCH /api/v1/rula/:id` paths adds the selected force value directly to the posture baseline, together with the separate repetitive-muscle adjustment, and then bounds the final RULA score to 1–7. The calculation trace records the muscle-use and force components separately so the final score remains auditable. This is a calculation-only correction; no schema migration or data rewrite is required.

## Repetitive-muscle score contribution

The stage-two «استفاده تکراری از عضله / Repetitive muscle use» control is now an expandable two-option selector instead of a standalone checkbox. The first option represents a mainly static or highly repetitive posture: held fixed for more than one minute or repeated more than four times per minute, and contributes score 1. The second option represents a posture that is neither static nor highly repetitive and contributes score 0. Both options display the explanatory criteria from the RULA reference material, keep the selected value in the draft/FormData contract, and expose the selected score clearly to the assessor.

The shared `calculateRula` calculation used by the live preview and server-authoritative create/update paths converts the selected boolean to the corresponding 0/1 adjustment and adds it to the posture baseline together with applied force. The final score remains bounded to 1–7 and the calculation trace records the muscle-use contribution separately. This is backward-compatible with the existing boolean `inputs.muscleUse` field; no database migration or data rewrite is required.

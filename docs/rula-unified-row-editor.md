# RULA unified row editor

## Change and preservation

Each evaluation row now exposes one edit button. The FMEA-style modal contains the row number and body part, posture angle, score and detection fields, and the associated corrective action title, description and priority. Posture-only and general-action rows retain the applicable fields. The view and completion operations and original table layout remain.

The dialog uses the existing FMEA presentation classes and existing update callbacks. Posture updates retain the selected anatomical side and update the relevant image snapshot through the existing multi-image helper. Action updates preserve identity, status, impact and other metadata. Permission-based callback visibility and backend authorization are unchanged. No API, schema, environment or database change is required.

## Failure behavior and accessibility

Only changed fields are saved. Duplicate submission is blocked synchronously. Action and posture use existing independent APIs, so the dialog does not claim transactional atomicity: if action persistence succeeds and posture persistence fails, it explicitly reports that partial outcome and retries only the remaining operation. Saved action fields are locked until the dialog closes. Errors retain the draft.

The modal is portalled to the application shell to preserve theme inheritance and avoid nesting a form inside the wizard form. Submit propagation is stopped at the portal form so editing cannot submit the assessment wizard; the browser fixture includes an outer form and verifies this boundary. It locks background scrolling, traps keyboard focus, restores the triggering button, and handles Escape. Escape closes an open priority menu before closing the dialog. Closing and editing are disabled during save. Report data remains mounted during a refresh so the dialog is not discarded between its saves.

## Verification

- Frontend: 189 tests across 28 files pass, including one edit control per action row and preserved read-only rendering.
- Production build, TypeScript-based lint and typecheck pass; the existing bundle-size warning remains.
- Real Edge regression fixture exercises combined action/posture saving, cancellation without mutation, partial-failure retry without duplicate action saving, general-action editing, Escape/menu behavior and restored focus.
- Modal fits at 390, 768 and 1554px without horizontal overflow.
- Security review: bounded input lengths and posture ranges, React escaping, preserved resource IDs and existing authenticated update boundaries; no new secret, raw HTML or external request introduced.
- An initial strict type error from a nullable action was fixed with an explicit undefined mapping and validation rerun.

The fixture is synthetic and excluded from the production build. Authenticated production customer mutations are not used for testing. Frontend deployment and public asset/health verification are recorded in project-state.json and the existing deployment manifest. Rollback uses the saved frontend snapshot; backend and database rollback are unnecessary.

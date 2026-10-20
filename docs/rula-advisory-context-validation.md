# RULA advisory context validation repair

## Failure and fix

The screenshot's two minimum-string validation errors match the draft suggestion endpoint reusing the mandatory saved-assessment activity schema. A stage-three request containing empty job title and task description was rejected before any provider call, and the frontend mislabeled that HTTP 400 response as AI unavailability.

Only the advisory endpoint now normalizes absent/null job/task text to empty context and allows bounded short/empty text. It still validates posture, inputs, independent sides, numeric bounds and paired measurement units. The saved-assessment schema retains required minimum-length job/task fields. No task description is fabricated and no clinical score is inferred from AI. The existing assessment provider routing/model remains unchanged.

Draft UI validation errors now show a localized input-check explanation instead of the AI-disconnected badge/raw English Zod details. Genuine provider/network errors still retain their failure handling and local advisory suggestions. Previously completed chat-composer changes in the working tree are preserved separately.

## Evidence and limits

HTTP regression tests reproduce empty strings, whitespace, short localized labels and missing optional job/task fields, reach the mocked provider and return parsed connected suggestions. Oversized/malformed fields and incomplete measurement pairs still return 400 without contacting AI. Existing authentication, tenant, permissions, independent-side, provider-failure and rate-limit tests remain passing. Saved-assessment empty activity text is explicitly asserted invalid.

Validation: backend 251 tests / 33 files; frontend 177 tests / 24 files. Builds, lint and typecheck passed for both packages (existing frontend bundle warning). API/release check results are recorded in project-state.json. Initial advisory-schema experiments failed TypeScript safeExtend compatibility; normalization moved outside the shape override and final checks were rerun. No migrations, credentials, dependencies, scoring/auth weakening or production data changes.

Actual Arvan/provider connectivity and production/browser interaction are NOT_RUN. Provider execution in regression tests is mocked, not evidence that the deployed provider is online. This repairs the pre-provider validation defect shown in the screenshot; the server must receive the code update. Git push and production deployment are NOT_PERFORMED in this task.

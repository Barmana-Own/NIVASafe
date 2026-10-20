# RULA corrective AI and report repair

## Root causes and changes

The wizard's report preview generated only local advisory suggestions; it did not call an AI endpoint. The new authenticated draft endpoint and the saved-report endpoint share server-side generation, independent-side scoring and bounded model-response parsing. GPT-5 corrective text requests now use the existing provider adapter's low-reasoning JSON settings, previously applied only to posture images, with a 6000-token output budget.

The model selects a useful number of distinct actions up to 20. Valid output is not padded with local recommendations. Provider failure or unusable output has a safe reason code and explicitly local advisory suggestions. A valid alternate provider response is distinguished from a local failure. Successful empty filtered output remains empty in the client.

The seven standard anatomical posture rows remain unchanged in meaning. An additional action register shows model-generated actions, priority, status, inline edit and completion controls in the same report. Anatomical rows show the highest associated action priority and completion controls, disabled when no action exists. Posture editing opens in the report rather than navigating to step two. Both charts use one deduplicated action inventory: unselected recommendations are remaining, selected actions are in progress, confirmed actions are completed. Priority distribution is advisory action priority, not a replacement for the clinical RULA score.

Saved actions use the existing authorized action API. Unselected suggestion edits remain report-local until selected or completed; they are not silently committed as active actions. Existing exports, scoring, organization boundaries, body-side separation and schemas are preserved. No dependency or migration was added.

## Verification

| Check | Result |
| --- | --- |
| Frontend tests | PASS: 166 / 22 files |
| Backend tests | PASS: 229 / 30 files |
| Shared domain tests | PASS: 12 |
| Production builds, lint and typecheck | PASS; pre-existing frontend bundle warning remains |
| API contract | PASS: 70 client paths / 124 server routes |
| Release script | PASS: 28 checks |
| Synthetic external AI | PASS: 7 parsed AI actions, `openai/gpt-5-mini`, connected, no local or alternate fallback, 13221 ms |
| Browser interaction | NOT_RUN; React static rendering and source-contract checks exercised |
| Real database integration | NOT_RUN; route persistence is mocked in tests |
| Production deployment | NOT_PERFORMED |

Before the JSON/low-reasoning correction, a synthetic full generation took 70439 ms and succeeded through the configured Qwen fallback. After correction, the local synthetic full RULA example succeeded directly through GPT-5 Mini. These individual samples are connectivity evidence, not a production latency guarantee. Failed initial diagnostic invocations used an unavailable dotenv package and an incorrect environment-file path; neither sent external data. A new test initially failed TypeScript's optional-call indexing check; it was repaired and checks rerun.

## Security and preservation review

Draft requests require authenticated organization context, `assessments.create`, strict existing assessment schemas and eight requests/minute. Saved requests require `reports.generate` and a tenant-scoped assessment lookup. Scores are calculated server-side; client final scores are not accepted. Both-side requests require independent analyses. Responses are bounded and external text is rendered escaped. Provider errors do not expose secrets, stack traces or payloads. Audit and usage recording remain in place. Synthetic checks used no personal data and performed no database mutation.

This is a focused workflow repair, not a full-system redesign or production deployment. Deployment still requires updating both backend and frontend and retaining valid server-side AI configuration. Existing private configuration and supplied report samples were not edited or committed.

# RULA task suggestion feedback repair

## Root cause
When the job field was empty, the task suggestion handler returned before calling AI and set a general page error. This was distant from the activity field, so the button appeared ineffective. The screenshot showed the empty job state.

## Change
The handler now displays an actionable localized error directly below the activity field and focuses the job input. Valid requests clear stale general errors and retain the existing RULA-specific API, response validation, preview/accept interaction and stale-response guard. Duplicate clicks while pending are guarded. No AI response is fabricated in production.

## Verification
- Browser synthetic API: PASS at 390/1440px for missing-job feedback/focus/no request, valid request payload, suggestion preview/accept, service failure recovery and stale response protection after text edits.
- 212 frontend tests/33 files PASS; lint/typecheck/build PASS. Existing bundle-size advisory remains.
- Direct live provider test: NOT_RUN. Automatic approval review rejected authenticated external AI usage because it would consume tokens and conflicts with the synthetic-fixture testing constraint. Provider availability is not claimed.
- Security/regression review: no new backend endpoint or permission change, existing server validation/auth/rate limits preserved, React-escaped descriptions and bounded output retained. No database mutation or production AI invocation.
- Frontend-only deployment PWA v47; rollback backup and public asset checks recorded in project-state.json.

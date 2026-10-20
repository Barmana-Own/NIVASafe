# NIVASafe Task 06 → Task 07 handoff

Date: 2026-10-15  
Scope: frontend RULA image-review recovery and UX improvements to the existing support-request module. This handoff records contracts observed in source; no live API/database transaction was exercised.

## Task 06 delivered in the frontend

- Kept the existing `/rula`, results, edit, and report routes and the current image-review pipeline. Up to four images remain independent; `BOTH` continues to make separate LEFT and RIGHT requests and retain per-image review snapshots.
- Added queued/loading/ready/error/cancelled photo states, per-photo retry where the current error is retryable, cancellation, error copy, and links into the existing support request page. The UI does not retry permission, quota, subscription, or other non-retryable failures.
- Added explicit manual fallback after an image request fails or is cancelled. The user must save a confirmation for each of the seven anatomical parts on every failed image. `BOTH` requires all seven parts on each side. A failed image is included in the assessment only after that review, is presented as manually reviewed, and receives no model label. No RULA scoring formula or API payload contract changed.
- Shows the API's numeric per-part confidence as a percentage when it is present. The source contract allows `0..1` or `null`; the UI does not add a confidence threshold for completion or a new “better photo” result.
- Kept one canonical `/support` module and the existing super-admin inbox. The requester list consumes current page metadata and status filtering, adds clearly page-scoped local search/category filters, supports `?ticket=<existing UUID>` deep links, and shows existing ticket details/replies. RULA context prefill contains only allowlisted category/error codes and a validated assessment UUID; users can edit/remove it.
- Added no backend code, route, schema, migration, permission, quota, notification, provider, deployment, or calculation change.

## Current source contracts

### RULA image analysis

`POST /api/v1/rula/posture-image-analysis` accepts a multipart image and existing body-side/activity fields. Source checks require authentication, organization scope, `assessments.create`, a supported MIME type matching the file signature, a maximum 10 MiB image, and a rate limit of eight requests per minute. For `BOTH`, the frontend preserves separate requests per side.

The source response schema contains the requested side(s), seven per-part `angle`, `score`, `detected`, and `confidence` fields, side overlay, notes, provider, optional model, and `aiStatus`. Confidence is constrained to `0..1` or `null`. Provider unavailability, empty observations, and invalid provider answers are currently collapsed to `503 RULA_IMAGE_AI_UNAVAILABLE`; there is no distinct “image is unclear / upload a better photo” response. The frontend cannot reliably distinguish image quality from provider failure under this contract.

### User support requests

| Operation | Existing source contract |
|---|---|
| Create | `POST /api/v1/support/requests`; UUID `idempotency-key`; `{ category, subject, message }`; category is `AI_QUOTA`, `PROFESSIONAL_PLAN`, `TECHNICAL_SUPPORT`, or `OTHER`. Server scopes requester and organization. |
| List | `GET /api/v1/support/requests?page=&limit=&status=`; requester/organization scoped; returns pagination metadata. No server category or text-search fields and no list reply/unread count. |
| Read | `GET /api/v1/support/requests/:id`; requester/organization scoped; chronological replies are included. |
| Reply | `POST /api/v1/support/requests/:id/replies`; UUID `idempotency-key`; a requester reply reopens resolved/closed tickets. |

### Global support inbox

`GET /api/v1/admin/support-requests?page=&limit=&status=`, `GET …/:id`, `POST …/:id/replies`, and `PATCH …/:id` are the existing operations. The server requires global `SUPER_ADMIN`. Update accepts status and/or the existing public response. There are no category, organization, priority, assignee, or date filters; no attachment, assignment, priority, internal-note, or activity-history contract exists. Existing notifications link to `/support` without a ticket identifier.

## Task 07 API work to define before frontend adoption

1. Add separate, validated RULA image-quality outcomes for unreadable/unsupported/unclear images while retaining provider-outage status. Define which outcomes are retryable, which are user-actionable, and whether/how per-part confidence affects review guidance. Preserve current side isolation, upload limits, authorization, and scoring inputs.
2. Define secure ticket attachment ownership, upload constraints, malware/content validation, download authorization, and persistence before adding any attachment UI.
3. Add server-side support list search/category filters and list reply/unread metadata if required. Define pagination, normalization, access scope, and stable response shape; the current frontend's search is explicitly page-local.
4. If support operators beyond global super-admins are needed, define a dedicated permission and tenant scope. Then define the queue fields and supported filters (organization, priority, assignment, dates) before exposing controls.
5. Define assignment, priority/SLA, private notes, and auditable activity as separate data/contracts with clear user-vs-staff visibility. Do not overload the public response field for internal notes.
6. Include a validated ticket identifier in notification destinations so the frontend can open the corresponding existing ticket detail route.
7. Supply an applied migration/database and an authenticated test setup. Run tenant-isolation, role/permission, attachment ownership, idempotency, notification destination, and existing workflow regression checks before connecting the new UI.

The migration is still reported as unapplied in the existing Task 05 handoff. Task 06 verification did not run a live API, database, or production mutation. See `ui-ux-audit-task-06.md` and `task-06-ui-verification.md` for evidence and limits.

# AI Image Analysis for FMEA and RULA

Updated: 2026-10-15

## Scope

The assessment image workflow now treats model-generated geometry as reviewable data tied to the original image coordinate system.

### FMEA

'POST /api/v1/fmea/process-image-analysis' returns:

- editable risk-row drafts;
- a concise image summary;
- up to eight validated hazard annotations per image;
- normalized 'x', 'y', 'width', and 'height' values relative to the original image.

Annotations are discarded when they are incomplete, outside the image bounds, below the confidence threshold, or not visibly supported by the model response. The frontend keeps each uploaded image's analysis separate, renders the original aspect ratio, and draws the annotation rectangles and labels on the same frame. Generated risk rows remain editable suggestions and are never treated as approved findings.

### RULA

'POST /api/v1/rula/posture-image-analysis' returns an independent result for each requested anatomical side. Each side contains:

- body-part visibility, angle, confidence, and provisional score;
- normalized landmarks for 'head', 'neck', 'shoulder', 'elbow', 'wrist', 'hip', 'knee', and 'ankle';
- review notes.

The parser rejects invalid coordinates and removes low-confidence landmarks. The frontend renders a line only when both endpoints are visible and confidence-qualified; it never bridges a missing landmark. The image is displayed without a crop so coordinates remain aligned with the original image. When an angle is available, the provisional score is recomputed through the shared RULA angle-band rules. An undetected part remains marked `detected: false`, receives only the schema's neutral draft value, is flagged for review and cannot be represented as an observed or approved score.

For 'BOTH', left and right analyses and overlays remain independent. Editing a right-side result cannot discard the stored overlay or left-side result.

## Safety and trust boundaries

- Authentication and 'assessments.create' authorization are enforced server-side.
- Image MIME type, file signature, and the 10 MB size limit are checked before the provider call.
- Image analysis is rate-limited to eight requests per minute.
- Image requests are recorded in audit logs and token usage records when the provider reports usage.
- The fallback knowledge provider is not used for image interpretation. RULA and FMEA image requests use the configured assessment provider and fixed `GPT-5-Mini` request model without image failover. Each purpose has separate privacy and vision/structured-output approval variables; either missing approval blocks the request before provider invocation.
- AI scores, angles, boxes, and landmarks are advisory. The RULA flow requires explicit user confirmation before final registration.
- No database migration is required. RULA overlay data is stored inside the existing posture-analysis JSON only when the assessment is submitted; FMEA image annotations are request-scoped review data.

## Request and rendering reliability

Image analysis is debounced before a provider request is sent. Context changes invalidate stale responses, preventing an earlier image or task description from overwriting the current review. FMEA image annotations and RULA landmarks are rendered in normalized SVG layers over the natural-size image, avoiding the previous crop/resize coordinate mismatch.

## Provider capability and deployment gate

An adapter's ability to construct an OpenAI-compatible image request does not establish that the configured upstream endpoint supports `GPT-5-Mini` vision and the required JSON response. The authenticated provider-list endpoint reports local configuration and approval status separately from live reachability; it does not probe the upstream service. The `RULA_IMAGE_*` and `FMEA_IMAGE_*` approval variables must remain empty until privacy terms and a real non-production endpoint check have both passed. Missing approval returns a stable unavailable result and preserves manual review. The exact environment values, upstream capability, and successful real-user flow were not available or verified for this checkpoint.

## Validation record

- The previous source checkpoint recorded backend image-parser/provider tests and frontend UI/overlay tests as PASS. They were not rerun against this checkpoint's latest changes.
- Focused tests are present for model routing, exact provider identity, per-purpose image approval, and blocked-before-provider behavior. Current execution was NOT_RUN because Windows denied access to the installed Vitest entrypoint (`EPERM` on `node_modules/.pnpm/.../vitest.mjs`).
- Live provider reachability, ArvanCloud GPT-5-Mini vision support, privacy approval and authenticated real-user image success: NOT_RUN.
- Database migrations and Prisma operations: NOT_RUN; this task did not need a schema change and no database was mutated.
- Responsive/browser and real iOS Safari visual checks: NOT_RUN; no local authenticated browser session or iOS device/browser evidence was available.

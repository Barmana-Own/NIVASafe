# AI Image Analysis for FMEA and RULA

Updated: 2026-09-26

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

The parser rejects invalid coordinates and removes low-confidence landmarks. The frontend renders a line only when both endpoints are visible and confidence-qualified; it never bridges a missing landmark. The image is displayed without a crop so coordinates remain aligned with the original image. When an angle is available, the provisional score is recomputed through the shared RULA angle-band rules. Undetected parts receive a neutral starting score of 1 and remain subject to assessor confirmation.

For 'BOTH', left and right analyses and overlays remain independent. Editing a right-side result cannot discard the stored overlay or left-side result.

## Safety and trust boundaries

- Authentication and 'assessments.create' authorization are enforced server-side.
- Image MIME type, file signature, and the 10 MB size limit are checked before the provider call.
- Image analysis is rate-limited to eight requests per minute.
- Image requests are recorded in audit logs and token usage records when the provider reports usage.
- The fallback knowledge provider is not used for image interpretation. If no configured image-capable provider is available, the user receives an unavailable state and can continue with manual review.
- AI scores, angles, boxes, and landmarks are advisory. The RULA flow requires explicit user confirmation before final registration.
- No database migration is required. RULA overlay data is stored inside the existing posture-analysis JSON only when the assessment is submitted; FMEA image annotations are request-scoped review data.

## Request and rendering reliability

Image analysis is debounced before a provider request is sent. Context changes invalidate stale responses, preventing an earlier image or task description from overwriting the current review. FMEA image annotations and RULA landmarks are rendered in normalized SVG layers over the natural-size image, avoiding the previous crop/resize coordinate mismatch.

## Provider limitation

The current provider abstraction enables image requests only for configured providers that explicitly advertise image support. The existing ArvanCloud adapter sends the image as a vision-compatible 'data:' URL. Text-only providers and the local knowledge fallback are intentionally excluded from image requests.

## Validation record

- Backend image parsers and provider tests: PASS.
- Frontend UI and overlay regression tests: PASS.
- Full repository tests (223 tests), typecheck, lint, production build, API contract, release verification, dependency audit, and security review: PASS in the current work session.
- Prisma schema validation: PASS.
- Prisma client generation: NOT_RUN/FAILED because Windows denied replacement of the locked Prisma query-engine DLL; this is an environment file-lock issue and does not alter source or schema.
- Authenticated browser visual smoke: NOT_RUN because local authenticated browser automation was unavailable.

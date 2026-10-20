# RULA stage-two vision analysis

## Scope and routing

RULA uploaded-image analysis explicitly requests `gpt-5-mini` through the existing GapGPT endpoint. Generic risk-model and fallback configuration cannot redirect uploaded images to another provider. A failed vision request returns the existing safe unavailable error; no synthetic posture is reported as an image analysis. Original files remain unchanged for attachment storage.

The dedicated request uses `max_completion_tokens`, low reasoning effort and JSON-object output. Single-side requests have a 3,000-token budget and BOTH-side requests have 5,000 tokens. Organization knowledge retrieval is disabled for this narrowly scoped vision request. Transport is limited to one attempt with a 45-second timeout rather than multiple full timeout windows.

Reference contracts: [GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini), [Chat Completions parameters](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). Compatibility with the intermediary's actual deployment still requires a live GapGPT check.

## UI and latency changes

- At most two images are analyzed concurrently, with the selected image prioritized in the queue.
- Large analysis payloads are resized proportionally to a maximum 1,600-pixel side and encoded as JPEG only when this reduces file size. There is no cropping. Original uploads and previews are preserved. Unsupported image decoding safely uses the original file.
- Results are cached separately by file identity and assessment context for the current mounted form. Switching steps or changing force/muscle adjustments does not rerun completed image analysis. Changing job, task, posture description, anatomical side or locale invalidates cached results.
- Stage two exposes clickable thumbnails with per-image loading/error/ready status, notes and returned model metadata. A pending or failed image cannot display the previous image's scores or overlay. Out-of-order completions update the display only for the currently selected image.
- Manual edits remain associated with each image while switching between images. In-flight browser requests are aborted on context change or unmount; stale queued work is not started. Already dispatched server/provider work may continue until its bounded timeout.
- This is an in-memory review cache, not a new database history of every image analysis. The existing assessment persistence contract remains unchanged.

## Verification and security

Automated tests cover two-worker scheduling, stale queues, model pinning independent of generic risk configuration, GPT-5 payload parameters, no image failover/retry, skipped knowledge retrieval, proportional image sizing, original-file preservation, decode failure and bitmap cleanup. Existing posture parsing, upload limits/signature checks, authenticated organization scope and create permission are preserved. Model output remains validated and rendered as text, never injected as HTML. Credentials, image base64 and task content are not added to logs.

Live GapGPT availability, provider-specific parameter support and measured production latency: NOT_RUN. Browser end-to-end stage-two interaction verification: NOT_RUN. These limitations must not be described as verified production performance.

Local validation: frontend 149 tests PASS; backend 194 tests PASS; frontend/backend builds and TypeScript lint checks PASS; API contract check PASS (70 frontend paths / 123 backend routes); whitespace diff check PASS. The pre-existing Vite large-bundle warning remains. No dependencies, schema migrations, permissions or existing routes were removed.

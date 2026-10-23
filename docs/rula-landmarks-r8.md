# RULA R8 — localization research and release gate

R8 is **not anatomically accepted and is not deployed**. Its source repairs do not enable live vision. The versioned R7 workflow, historical assessments, Cornell table implementation, UI, support, FMEA and DeepSeek chat are preserved.

## Executed architectures

1. The production-default R7 prompt/angle audit remains the default. It is not independently accurate merely because its JSON parses.
2. A separate localization-only contract (`rula-landmarks-v2`) requests one body instance per side, pixel coordinates, a subject envelope, visibility, confidence, view, facing and gravity reference. It computes image-plane angles and existing base bands deterministically. There is no second overlay coordinate source or competing VLM degree guess. `trustedSource` identifies the mathematical source, **not independently validated keypoints**.
3. This experiment is selectable only with **both** `NODE_ENV=test` and `RULA_LANDMARK_EXPERIMENT_V2=1`. It is not promoted into production. Neither setting bypasses consent, tenant membership, roles, quotas, decoder/signature validation or review.
4. Subject/side mismatches, duplicated/invalid coordinates and malformed schemas fail safely. Valid unidentified subjects, occlusion, unsuitable views and unsupported axial motion abstain. Gross envelope/connectivity checks are consistency guards, not a validated anatomical detector.
5. A test-proven correction removes the unnecessary gravity dependency from joint-relative arm/elbow/wrist/head-axis calculations. Trunk versus upright still requires gravity. Facing is still needed for signed arm/head-axis interpretation. No universal mirror/complement, score-band change or reference relabel was applied.
6. Persisted measurement metadata remains backward compatible. R8 additionally retains body ID/envelope, mathematical source, facing and reference-up vector. USER corrections remain distinct from AI metadata. This does not create cryptographic immutability against a malicious authorized author.
7. Reviewed unobservable motion is labeled **Not measurable in image**, not anatomically absent, in RULA exports. No FMEA report logic changed.

## Independent references and limitations

`reports/evidence/rula-landmarks-r8-20261019/benchmark-v4` contains 24 distinct analytic scene configurations: 16 development / 8 held-out. The seed/configuration list, SVGs, rasters, coordinates, person IDs, visibility and hashes are frozen. Earlier generator QA versions remain preserved: clipping was corrected by translation; acos endpoint roundoff was corrected; frontal/oblique artwork was made visibly non-sagittal before any held-out inference. Reference angles, splits and measurability were not changed to fit model predictions.

There are no independently consented real worker photographs or qualified cervical annotations. The neck value is a head-axis drawing proxy. Axial twist/depth is not measurable from a single 2D image. A base-band agreement test is a software convention check, not certification of full RULA scoring or clinical validity. Complete reference scores including twist/load/muscle/modifiers are unavailable.

The original 40 rows are four repeats of one two-person drawing, not 40 independent postures. Their original references and R6/R7 predictions remain unchanged. R8's first full held-out evaluation and 40-row comparison used the pre-axis-fix experimental build; subsequent relative-axis repair is independently tested, partially replayed from captured coordinates, and checked by one fresh authenticated BOTH. The entire held-out/40 suite was **not** charged again after that repair. The report does not relabel these as a fresh final-build full benchmark.

## Experiments and budget

The hard shared cap was 30 Arvan attempts, including retries and report text. There were 28 confirmed image responses (HTTP 200, GPT-5-Mini → gpt-5-mini-2025-08-07); two automatic RULA report text attempts have no captured response before staging shutdown and remain UNKNOWN. No extra inference is authorized by this document. No FMEA/chat request was added.

Simplified localization, a deterministic connected-component crop, and a coordinate grid were evaluated on development artwork. Grid/cropping were not promoted. No MediaPipe, MoveNet, RTMPose or other ML pose estimator was installed or run. Production inference imports no benchmark identifiers or ground-truth coordinates.

## Required next accuracy protocol

1. Keep this benchmark and observed failures immutable. Further tuning requires a new unseen held-out set, not repeated optimization against the eight observed scenes.
2. Use two independent blinded annotators, including a qualified ergonomist, with explicit image-use/provider-transfer permission before any real photographs. Establish image orientation, individual identity, anatomical side, camera view and visibility. Measure disagreement before interpreting model errors.
3. Use anatomical reference markers/camera calibration where appropriate. Do not substitute head-center inclination for cervical anatomy or infer axial wrist rotation from a side silhouette. Record UNMEASURABLE for unsupported 3D quantities.
4. Compare joint localization, numeric coverage, false acceptance/rejection, signed angles and exact score-band agreement separately. Acknowledged manual corrections demonstrate workflow, not professional certification. Independently establish the full score inputs before claiming final-score agreement.
5. The currently permitted recovery path is explicit manual review/correction with deterministic geometry. If fully automatic localization is essential, obtain a **separate owner decision** before an offline non-generative pose-model study, such as RTMPose/MMPose. Review model/weight licensing and server resource/privacy requirements first; do not download or run it under this task. GPT-5-Mini would remain the sole generative assessment model, but the landmark architecture would change. [Official inference documentation](https://github.com/open-mmlab/mmpose/blob/main/docs/en/user_guides/inference.md).

## Release conditions

Accuracy/qualified acceptance has failed. Organizational production image-transfer approval is not documented, and live operational rollback has not been rehearsed. The 190-file candidate recovery rehearsal is not a live service/config rollback. Do not enable production image gates or publish this experimental predictor. The old live compiled RULA adapter still contains GPT-4.1-Mini/GPT-4o-mini paths; that is code drift, not proof of account usage. Candidate routing remains GPT-5-Mini for assessments and DeepSeek-V4-Flash for chat. No account billing export was available for attribution.

Existing table conventions were preserved. [Cornell RULA worksheet](https://ergo.human.cornell.edu/Pub/AHquest/RULAworksheet.pdf) and [Cornell notes on implementation differences](https://ergo.human.cornell.edu/ahRULA.html) were checked on 2026-10-19. Qualified review must confirm geometric conventions and complete posture modifiers before ergonomic acceptance.

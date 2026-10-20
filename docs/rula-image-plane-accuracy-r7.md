# RULA image-plane architecture — R7

Gregorian 2026-10-18 / Jalali 1405-07-26

## Scope and observed causes

R6 originals are frozen under frozen-r6-* and frozen-40-comparisons.json. These40 rows are four inference samples of one1000×700 two-panel synthetic drawing. Exact coordinates are from the preserved make-reference.ps1, not GPT output. Head/neck is a drawing-axis proxy, not a professionally validated cervical measurement. No labels were changed or difficult cases removed.

All10 old large angle errors arose in model-derived degrees accepted without anatomical/landmark consistency checks. Stored high-confidence overlays also miss the actual joints. R6-02: elbow reference90°, model180°, old overlay geometry154.983°. R6-37: model180° while overlay geometry25.017°. This disproves a single universal mirror/supplement correction. The old parser passed degree values through; no radians/vector transform produced those values. PNG EXIF rotation was not involved. **The exact internal model reasoning remains UNKNOWN.** Complete per-row signed errors, camera projection, visibility, landmark availability and pixel errors are in forensic-40.json/.md.

A separate real canary correctly read randomly generated digits/circles/triangle, request03d3849e93d8ef056d9787d5ef24e1db. It supports image transport/recognition for that control, not anatomical reasoning or all gateway behavior. Credentials/entitlement are not diagnosed as the remaining problem.

## Implemented architecture and safeguards

1. Validate auth/tenant/role, file signature/MIME, explicit consent and approved provider gates. Decode only PNG/JPEG/WebP with10MiB input/output bounds,24M decoded pixels, bounded dimensions/time. sharp0.35.5 auto-orients and strips metadata. JPEG orientation6 was analytically tested40×20→20×40. This addresses a separate risk, not the original PNG cause.
2. Keep RULA/FMEA on Arvan GPT-5-Mini and chat on Arvan DeepSeek-V4-Flash. RULA image detail is high. Existing reasoning_effort omission and no fallback remain. No real FMEA/chat test was repeated and no model-substitution claim is made.
3. Validate named, normalized coordinates, side, view, facing, upright reference, visibility/confidence. Reject duplicate/unknown points, null visible coordinates, missing fields, invalid ranges/types, side mixing and malformed/truncated JSON with safe codes. Valid uncertainty is distinct from parsing failure.
4. Convert normalized X/Y back to pixels before deterministic vectors/angles. Signed arm/trunk/head-axis conventions, interior elbow, wrist deviation, mirror/rotation, coincident vectors and unsuitable views have analytic checks. Axial wrist twist/depth are not inferred from a2D line.
5. A final review found the prompt requested neck tilt from upright while the auditor used an upper-trunk reference. That newly exposed contract inconsistency was fixed and test-first verified. The defined neck value is explicitly only a relative head-axis image-plane proxy; RULA thresholds/tables were not redefined. It is **not** presented as the historical elbow90° cause.
6. The unreliable VLM landmark strategy was **not adopted as an automatic replacement measurement source**. Geometry audits internal consistency; agreement is not independent truth. Disagreement/missing evidence withholds the model angle, not an invented correction. No180-angle/clamp heuristic was used to force the benchmark.
7. Existing JSON retains typed pre-audit AI angle, mapped provisional score, geometric audit angle, dimensions/view/required points, controlled reason and image-plane-audit-v1. Reviewer values/source USER remain separate; RulaVersion/audit records actors/versions. This is retained application provenance, not cryptographic tamper proof against a malicious authorized author.
8. New image observations require explicit review. Real400/zero-row tests reject confirmation-only of a conflicted AI row or omitted/false requiresReview. Draft score indices remain provisional and hidden until review; no unreviewed/failure score is presented as a final posture assessment. An intentional manual acknowledgement is not an ergonomist certification.
9. The actual browser screenshot exposed free-form provider prose that contradicted withheld table values. Its image-UI paragraph was removed; API notes/text analysis remain compatible and controlled per-part warnings remain. Final real BOTH UI verified provider notes present but not displayed.


## Gate

Accuracy FAIL. See reports/technical-report.2026-10-18.rula-anatomy-r7.en.md and C:/NIVASafe/reports/evidence/rula-anatomy-2026-10-18-r7/LATEST.md. No production vision activation.

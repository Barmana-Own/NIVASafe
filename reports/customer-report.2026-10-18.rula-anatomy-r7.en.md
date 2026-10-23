# NIVASafe — RULA accuracy recovery, final R7 checkpoint

|Field|Value|
|---|---|
|Project|NIVASafe|
|Report|Customer report|
|Language|English|
|Gregorian / Jalali|2026-10-18 / 1405-07-26|
|UTC|2026-10-18T21:46:45.378Z|
|Revision|e5bf3f050bd6e127e13918c8d3eefcd3f8376acf + preserved worktree|
|Executed candidate|rula-image-plane-audit-20261018-r7-final; PID 8300|
|Delivery|BLOCKED / NOT DEPLOYED|

## Decision

**NOT READY for automatic image assessment. Production was not changed.** The authenticated test workflow is technically usable with explicit manual reference correction, but the≥38/40 accuracy target failed.

## Delivered and verified

- Frozen original40-case comparison; independent mathematical fixtures and pixel-aware geometry.
- EXIF normalization, metadata stripping and bounded decoding; strict side/visibility/landmark contract.
- No guessed repair of bad angles: conflicting/unobservable values are withheld with controlled reasons; original AI evidence and reviewer edits remain separate.
- Fixed a neck-frame prompt/auditor inconsistency; no RULA threshold or old scoring version changed. Removed unvalidated image prose that contradicted blocked rows.
- Real Arvan GPT-5-Mini, requested GPT-5-Mini and returned gpt-5-mini-2025-08-07;19 bounded accepted requests.
- Ordinary staging member RIGHT/LEFT/BOTH, three repeated BOTH calls, manual review/save/logout/login/reopen, report and English/Persian PDF passed. Final Chrome155 at390/1280 passed; Safari was not tested.
- 908 tests, build/typecheck/TypeScript lint, contract90/154 and29 static release checks passed.

## Accuracy

|Metric|Frozen R6|Final raw model|Final published output|
|---|---:|---:|---:|
|Unchanged original denominator|40|40|40|
|Numeric estimates|40|40|21|
|Within ±15°|30/40|31/40|21/40|
|Abstentions|0|0|19|
|MAE, numeric estimates only|16.5°|12.7°|1.1905°|
|Median, numeric estimates only|0°|0°|0°|
|Max, numeric estimates only|90°|90°|10°|

All 40 references remain. Only21 numeric outputs were published;19 abstentions do not count as successes. The defined 2D drawing references are geometrically measurable, so intrinsic2D-unmeasurability count is0. The guard withheld9 wrong raw estimates and10 raw estimates already inside tolerance. The lower numeric-only error is selective coverage, not acceptance of the original task. Raw31/40 versus old30/40 is a small change on repeated samples, with the90° outlier still present. No clinically validated accuracy claim is made.

## Remaining work

Reliable joint localization and a qualified independently annotated reference set are still needed. Complete ergonomic accuracy, especially elbow/shoulder/wrist, is not accepted. Two final additional image controls stopped at the test budget after automatic RULA report text calls; they were not falsely marked passed. Earlier controls remain supplementary. No credential/entitlement change is indicated by the successful calls. Actual production image-processing approval and a supported service/config rollback rehearsal remain separate release gates.

The candidate/source is available, but no live files, services, accounts, database, provider keys or uploads were changed. FMEA/chat/support/UI workflows were preserved; new public acceptance of those features was not claimed.

[Engineering evidence and every original row](technical-report.2026-10-18.rula-anatomy-r7.en.md).

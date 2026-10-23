# RULA group summary scores

## Requested change

Populate only the existing Group A and Group B score badges. Keep every other field, table, summary, photo/side state and certification workflow unchanged.

## Requirements and design

- FR-01: A complete group displays its existing exact adjusted worksheet group score.
- FR-02: A completed observation with unsupported member scores displays the mathematical minimum–maximum group score permitted by the published worksheet tables and current force/muscle controls. Missing members are not assumed normal.
- FR-03: An untouched or pending group remains unavailable. An interval with equal endpoints remains a partial result and does not establish a missing observation or approval.
- FR-04: Values follow the selected photo and anatomical side and update after explicit manual changes.
- NFR-01: Preserve audited measurements, stored inputs, overall score/gauge readiness, final approval, authorization, consent and all prior assets.
- NFR-02: Use the existing two badges; no new UI section or control. Preserve current styles unless verified clipping requires a narrow correction.

## Engineering evidence

Group A member domains are 6/3/4/2 and Group B domains are 6/6/2. Group outputs include the current force/muscle adjustment and can reach 13; final-score limits and Table-C caps do not apply to these badges. An exact range comes from all legal completions of missing members; known AI proposals or reviewed manual values stay fixed. A numerical interval is neither measured anatomy nor a statistical confidence interval.

The previous all-member-available display gate explains the screenshot. This maintenance replaces only that display policy. API/backend/database changes are unnecessary. Source, runtime and asset baselines and all stage gates are maintained under `reports/evidence/rula-group-scores-20261023-01/`.


## Published verification checkpoint

Gregorian: 2026-10-23; Jalali: 1405-08-01; Release: release-rula-group-scores-20261023-01. Frontend 533/533 tests, typecheck/lint/build and 6+3 browser checks PASS. 873 prior non-index public files and 368 private backend files preserved; all 19 stylesheets retained. API PID 10380 unchanged.

The interval is a possible worksheet group score, not measured anatomy or a statistical confidence interval. Equal endpoints do not establish missing observations or approval. Overall score, gauge, final approval, audited observations, stored inputs, image/side selection and manual editing remain unchanged. Group scores can reach 13 with adjustments; final score caps do not apply to them.

Restore C:/NIVASafe/.local/rula-group-scores-20261023-01/index.before.html atomically; retain immutable assets. API release-rula-review-population-20261023-01, PID 10380, environment and proxy are unchanged. No API restart, migration or production business mutation.

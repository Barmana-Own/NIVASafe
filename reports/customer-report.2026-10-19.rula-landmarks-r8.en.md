# NIVASafe R8 — Customer handover

|Field|Value|
|---|---|
|Project|NIVASafe|
|Report type|Customer|
|Language|English|
|Gregorian date|2026-10-19|
|Jalali date|1405-07-27|
|Generated UTC|2026-10-19T07:29:29.296Z|
|Candidate|rula-landmarks-r8-20261019-axisfix|
|Revision|e5bf3f050bd6e127e13918c8d3eefcd3f8376acf + preserved worktree|
|Release|BLOCKED / NOT DEPLOYED|

**ANATOMICAL ACCURACY FAIL. SOURCE REPAIRS VERIFIED. STAGING WORKFLOW VERIFIED. NOT DEPLOYED.**

R8 improved localization on a small paired subset but did not meet the independent acceptance target. The automatic predictor is unsuitable for release. The existing testing site, credentials, data, uploads, service configuration and privacy gates were not changed.

## Delivered

1. Preserved R7 and the original40; generated24 distinct analytic scenes with16development/8held-out split, immutable image/coordinate hashes and no model-generated ground truth. Ten distinct new benchmark scenes received real model requests (2dev,8held); this is not24 tested human photographs.
2. Added body/side/pixel-frame validation, deterministic geometry experiments, controlled uncertainty and provenance; tested cropping/grid without adopting them. No second ML model was installed or used.
3. Fixed a proven unnecessary gravity dependency in joint-relative calculations; trunk still requires gravity. Stored facing/up reference to make future errors reproducible.
4. Retained mandatory review and rejected tampering; corrected misleading RULA export wording for unobservable motion.
5. Verified genuine staging analysis, manual-reference correction, persistence, fresh sessions, reports/PDF and Chrome mobile/desktop.
6. Passed977 tests, build/typecheck/lint, contract/release checks and candidate production-dependency audit.

## Accuracy and remaining limits

The frozen eight-scene localization experiment produced **14/41 within±15°, numeric coverage30/41 (73.2%), max error208.14°**. The matched old-contract control produced10/41 within±15° with19/41 numeric coverage. More output did not establish reliable anatomy. The original40 are repeated samples of one drawing: R7 had21numeric/40 and21within15; R8-01 had10numeric/40 and6within15. Later partial coordinate replay is not new inference. A fresh BOTH after the geometry fix yielded8numeric/10,5within15,max110.71°. Full final-build holdout/40 inference was not repeated after the repair; the cap was30attempts.

The neck reference is a drawing proxy. No real-worker generalization or qualified ergonomic validation is claimed. Manual controls were filled by the automated test using known synthetic references, not by an ergonomist. Full-score category accuracy remains NOT VERIFIED.

## Live state and handover

Production remains the old packaged backend/static build. Live compiled RULA routing still includes older GPT model paths; no account-usage attribution is proved. Candidate routing is GPT-5-Mini for assessments and DeepSeek-V4-Flash for chat. Live privacy approval and operational rollback are unverified. Candidate-only190-file recovery passed. Safari/WebKit/iOS and real-photo evaluation were NOT RUN.

The next product decision is whether to retain an explicitly assisted manual-measurement workflow, or separately authorize an offline specialist pose-estimation study. RTMPose/MMPose is documented only as a proposal; no download/inference occurred. Accuracy, qualified acceptance and genuine production privacy/rollback gates must pass before activation. An API key or HTTP200 is not consent or anatomical accuracy.

Evidence: [acceptance-matrix.md](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/acceptance-matrix.md) / [heldout-metrics.json](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/heldout-metrics.json) / [legacy-40-before-after.md](C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/legacy-40-before-after.md).

## Post-report final verification

Dates 2026-10-19 / 1405-07-27; UTC 2026-10-19T07:35:03.934Z.57 scoped integrity/redaction/security checks PASS; this is not anatomical acceptance. Live PID/entrypoint/API artifact hashes/index remained identical to the before-task read-only observation. Public/local health and login/assets again200. No live deployment/restart occurred.

No native callable Debug or Chrome DevTools tool was in the available inventory. Installed Debug entry/diagnosing/TDD skills were read and applied. Actual tools: PowerShell, Node, Prisma/MariaDB, Playwright/Chrome, sharp, image inspection, Poppler and official web sources. No installed WebKit executable was present; NOT_RUN. Evidence: C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/final-integrity-security-check.json and C:/NIVASafe/reports/evidence/rula-landmarks-r8-20261019/webkit-availability.json.

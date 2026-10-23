# Safe-code deployment and recovery

Date: 2026-10-22 / 1405-07-30.

Safe-code release: `release-rula-direct-consent-20261022-01`, API PID2524 under the existing PM2 daemon. Public real-photo activation: **BLOCKED**, not PASS. The existing effective privacy provider value is empty and technical vision remains `arvancloud`.

## Verified package and cutover

- Frozen candidate passed 715 backend/471 frontend tests, typecheck/lint/build. Exactly15 non-test runtime modules differ from the preceding release;149 source files match the tested candidate. Schema, dependencies and unrelated FMEA/RULA research modules remain unchanged.
- The private release cloned the preceding immutable runtime, then incorporated the reviewed source/build and isolated unit-test configuration. Private compiled test artifacts remain outside the explicit production import graph; no prior tests were removed.
- Packaged old/new/old startup and rollback were exercised on the disposable database with AI disabled. No production migration was required.
- Existing CSS `/assets/index-ab6f25e515.css` remains byte-identical. New main is `/assets/index-DSt9SKZk.js`; only the scoped consent/owner stylesheet is added as `/assets/rula-direct-consent-3ff846b13ecd.css`. The candidate's full index stylesheet is not published or loaded. Existing immutable assets remain available.
- Six HTTPS HTML routes, all21 published assets, five protected API routes returning401 anonymously, six public browser cases and database health passed. The production `.env` is unchanged; only API entry/version in the ecosystem configuration changed. PM2 state was saved.

Evidence: `reports/evidence/rula-direct-consent-20261022-01/stage11-deployment.json`, `stage12-independent-release-review.json`, and `stage12-public-consent-qa-summary.json`.

## Recovery

Previous immutable API: `C:/ProgramData/NIVASafe/releases/release-rula-root-repair-20261021-01/backend`. Backed-up ecosystem/index and secret manager environment: `C:/ProgramData/NIVASafe/backups/release-rula-direct-consent-20261022-01/`. Release and backup ACLs permit SYSTEM and Administrators only; never print or copy the manager environment into source or reports.

Restore the backed-up ecosystem and index atomically, restart only `nivasafe-api` with its protected original manager configuration, verify prior-version health and expected asset hashes, and persist PM2 state. Do not delete immutable assets or database rows. Rollback does not undo consent/results recorded after deployment.

Runtime configuration must continue to enforce current account/owner authorization. A provider contract or retention value must never be invented to enable the gate. The remaining evidence and policy decisions are in `docs/legal/rula-provider-required-evidence.2026-10-22.md`; no per-user or per-organization management approval is needed.

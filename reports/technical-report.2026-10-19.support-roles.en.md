# NIVASafe — Support role and conversation release evidence

| Project | NIVASafe |
|---|---|
| Gregorian / Jalali | 2026-10-19 / 1405-07-27 |
| Release | release-support-roles-20261019-01 |
| Git revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf (existing dirty worktree preserved) |
| Delivery | DEPLOYED |

## Confirmed causes and changes

The support route always rendered the requester workspace; the existing operator inbox was hidden in the admin panel. Backend operator access additionally required optional user/org allowlists or protected-system-admin status and restricted tickets to the selected organization. Customer messages did not notify administrators. These conflicted with the owner's explicit global account-role policy.

The revised API trusts the active global role reloaded by the existing authentication guard, never browser/JWT or organization-role claims. All active global SUPER_ADMIN users can manage the platform inbox; requester endpoints retain organization AND requester scoping. Existing optional operator environment settings were not edited; support authorization no longer depends on them. Staff assignment accepts only active global administrators. All fan-out notifications are in the existing ticket/reply transaction, with existing idempotency and rate limits. Global admins read only their own notifications across organizations; ordinary recipients remain user+tenant scoped.

Real browser QA found an additional concrete defect: notificationLink rejected /support?ticket=<UUID>. A failing regression demonstrated null; the strict UUID-only query is now allowed while external, encoded, extra-parameter and malformed links remain rejected. No arbitrary URL forwarding was added. Open conversations support explicit refresh and refresh on focus, with cleanup; no new polling service.

## Changed application/test files

- frontend/src/features/notifications/notificationModel.test.ts — MODIFIED
- frontend/src/features/notifications/notificationModel.ts — MODIFIED
- frontend/src/features/support/SupportPage.tsx — MODIFIED
- frontend/src/features/support/supportWorkspace.test.tsx — ADDED
- frontend/src/i18n.tsx — MODIFIED
- frontend/src/layout/AppLayout.tsx — MODIFIED
- frontend/src/layout/navigation.test.ts — MODIFIED
- frontend/src/layout/navigation.ts — MODIFIED
- backend/src/modules/notifications.ts — MODIFIED
- backend/src/modules/support.ts — MODIFIED
- backend/src/notifications.test.ts — MODIFIED
- backend/src/support-expired-subscription.test.ts — MODIFIED
- backend/src/support.test.ts — MODIFIED

Only dist/modules/support.js and dist/modules/notifications.js differ in the deployed backend. The other 130 compiled files are byte-identical to the previous deployed package. Frontend uses a fresh complete build including all previous safe UI work. No dependency, schema, migration, CSS, generative model, route removal or live privacy change. deployment/ecosystem.config.cjs changes only API entrypoint and API APP_VERSION; the inactive worker configuration is unchanged. Durable release tools are scripts/releases/support-roles-20261019-01/{prepare.mjs,backup-protected-config.ps1,release.mjs}.

## Executed verification

| Check | Result | Evidence |
|---|---|---|
| Backend pnpm test | PASS 615 tests / 68 files | backend-test.log |
| Final frontend pnpm test | PASS 395 tests / 56 files | frontend-final-test.log |
| Domain pnpm test | PASS 19 tests / 2 files | shared-domain-test.log |
| pnpm 10.13.1 typecheck/lint/build per package | PASS, all exit 0 | validation.json and frontend-final-validation.json |
| check-api-contract.mjs | PASS, 91 paths / 154 routes, exit 0 | api-contract.log |
| verify-release.mjs | PASS, 29 checks, exit 0 | release-check.log |
| Real HTTP/login/DB/rollback acceptance | PASS, 65 checks | api-acceptance.json |
| Chrome 155.0.8059.80, genuine API/DB | PASS, both roles at 390/1280; six result entries | browser-acceptance.json and staging-support-*.png |
| Public authenticated global-admin desktop/mobile | PASS, no console errors | public-browser.json |
| Public HTML/assets/health/auth denials | PASS, 14 checks | deployment.json |
| Safari/WebKit | NOT_RUN, unavailable; no Chromium-to-Safari equivalence claimed | final-acceptance.json |
| Public ordinary-user write/reply | NOT_RUN to avoid changing valuable customer data; real staging covers it | final-acceptance.json |

Exact package commands: C:/Runtime/node/corepack.cmd pnpm run test, typecheck, lint, build, executed in candidate/backend, candidate/frontend and candidate/shared/domain. Backend focused 34 tests and frontend role/navigation tests also passed; these are subsets, not added to the total. Node --test scripts/releases/controlled-20261019/rollback-guard.test.mjs passed.

## Real isolation, privacy and security

Disposable DB nivasafe_support_45516c94d38a at 127.0.0.1:53306; actual datadir checked against the established isolated MariaDB. Schema-only mysqldump restored from the existing isolated synthetic DB; column/type/nullability equality and initially empty key tables verified. This was not claimed as historical migration replay or a live DB backup restore. API 5153, frontend 15144, separate uploads and random independent JWT secrets. Accounts/passwords were generated in memory; no production secrets were copied into staging, no provider calls made.

Real negative checks include unauthenticated 401, ordinary-account admin 403, same-org different requester and cross-org 404, internal-note denial, forged author/organization payload rejection, oversized replies, invalid assignment, stale-update conflict, concurrent duplicate reply deduplication, notification-recipient isolation, role demotion and inactive-user denial. Customer replies and notifications persist once; login/logout/fresh GET retain messages. Global administrators can operate without a selected organization and see another organization's ticket while their own organization remains selected.

Scoped adversarial review: React-escaped text, no unsafe HTML, strict request schemas, UUID links, fresh DB role checks, no client-side permission trust, private internal notes, transactional notifications, bounded pagination/rate limits and idempotency. No material new defect found. Existing trust boundaries and unrelated feature sources preserved (scope-security-integrity.json).

## Failed attempts and repair evidence

- Initial full backend run failed because the new isolated copy lacked existing reference fixtures/config; copied the existing safe files and reran 615 tests successfully (backend-missing-fixtures.log).
- Restricted sandbox could not read the protected Corepack cache / Playwright dependency (EPERM); ordinary authorized host execution succeeded without ACL, identity or Task changes.
- Initial browser notification deep-link failed; strict destination regression was red, implementation fixed, final full frontend and browser journeys passed.
- One isolated API startup timed out while artifact preparation was active; its exact cause remains UNKNOWN, not attributed to production. The same immutable backend subsequently started and passed with sanitized startup shape diagnostics (browser-startup.failure.json and browser-acceptance.json). No timeout was hidden as success.
- Pre-existing Vite chunk-size warning remains; build exit 0. No unrelated bundle rewrite.

## Deployment and operational recovery

Actual manager: scheduled task NIVASafe-API, SYSTEM, run-pm2.cmd -> PM2 nivasafe-api. Old PID 11620; new PID 8352, SYSTEM, Node C:/Runtime/node/node.exe, one 127.0.0.1:5044 listener. Static root C:/inetpub/nivasafe/app-com; public /api response shows the new build.

- Backend entry: C:\ProgramData\NIVASafe\releases\release-support-roles-20261019-01\backend\dist\server.js
- Entry hash: e7a26489e1dd96e1c7e9d8c25715c2691e4e6ba590347f088c37961b10be5cb0; wrapper unchanged intentionally, changed module hashes below prove the scoped code update.
- modules/support: 50e38b851b6fc85d5399d8244312477c0cf8ccb52e0d2a0f5622733d655f59a2
- modules/notifications: 9251779a93c9b63ce0e4e3a76a038b06af7440526bf7ec76a9ae680cd64a5b1d
- Public frontend index: 0c75e6beb0837170d6e6bdf258d536a6ed9ab89fcd571373096b5947f2295164
- /assets/index-CN_8Devi.js: bffb9a9714871210dc4dd26ac9e402fb9aefe221f5bcc762816c01f257498af9
- /assets/index-BuPzz-_U.css: a5206c91f121042aaf073efe446126b7d2adc418f62a9ada29e55a09ceb5295d
- Backup: C:/ProgramData/NIVASafe/backups/release-support-roles-20261019-01; 16643 backend files/783 internal links plus 463 frontend files, hash-verified reconstructed copies. Config/environment backed up under original SYSTEM/Administrators-only ACL; rollback runtime snapshot ACL rechecked after writing. No configuration secret in evidence.
- Rehearsals: frontend old/new/old swap; separate PM2 IPC/home/port old/new/old; actual previous and candidate APIs old/new/old/new against the same disposable DB, messages retained. Production rollback was not needed and was not executed.

Rollback command (authorized host/admin context; refuses later unrelated releases/config drift):

```powershell
C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\support-roles-20261019-01\release.mjs rollback
```

Restores only code/config/index and original API invocation. Retains old/new immutable assets and newer DB/uploads. Never restores or rewrites live data. Protected environment hash and image gates unchanged; production account/org/ticket/reply/notification counts did not decrease. DB schema hash identical to deployed base; no migration.

## Scoped stage gates

| Stage | Name | Status | Evidence |
|---|---|---|---|
| 01 | Project scope | PASS | Explicit account-role contract, scoped repository baseline, existing requester/tenant protections retained. |
| 02 | Role-specific UI | PASS | Existing RTL/LTR support design reused; personal form versus system inbox; refresh/error/empty states; no redesign. |
| 03 | Frontend | PASS | Role dispatcher, navigation labels, conversation refresh and safe UUID notification deep-links implemented and built. |
| 04 | Backend | PASS | DB-authenticated active global SUPER_ADMIN manages platform tickets; transactional bidirectional in-app notices. |
| 05 | Database | PASS | No schema change. Disposable schema-only restore and live read-only compatibility check; real staging persistence. |
| 06 | API integration | PASS | 65 real API/DB/rollback checks, 91 frontend paths against 154 routes. |
| 07 | Authentication/authorization | PASS | Real login, same-tenant requester isolation, cross-tenant denial, global role demotion/inactive denial, all ordinary admin actions denied. |
| 08 | Application security | PASS | Private-note exclusion, per-recipient notification isolation, strict inputs, rate limits, idempotent transactional fan-out and escaped text retained. |
| 09 | Automated tests | PASS | 615 backend + 395 final frontend + 19 domain tests = 1029; pinned pnpm 10.13.1; typecheck/lint/build exit zero. |
| 10 | Browser QA | PASS | Chrome 155.0.8059.80, real stage API/DB, both roles at 390 and 1280; notification defect reproduced then fixed. |
| 11 | Production release | PASS | Verified artifact/config backup, reconstructed backup, isolated PM2 and real artifact rollback rehearsals, actual cutover and public hashes. |
| 12 | Final scoped review | PASS | Source/candidate/deployed module parity, public authenticated admin views, process owner, preserved data/settings and unchanged AI/privacy modules. |

This scoped release is COMPLETE/DEPLOYED. This is not a new RULA provider/anatomical acceptance, nor an email/SMS implementation. No support owner action remains. Full actual evidence is in C:/NIVASafe/reports/evidence/support-roles-20261019-01.

# Admin AI controls and primary-account protection

## Delivered behavior

- AI access uses a compact switch with checked/disabled/focus states, an accessible checkbox and an explicit Allowed/Disabled label.
- Global administrators can edit each user's cumulative token limit using an integer field and Save; unchanged, invalid and pending submissions are disabled.
- New-user default remains 1,000,000. Updating limits never resets recorded consumption.
- Organization administrators retain read-only access and cannot change limits.
- The primary NIVASafe Administrator account is marked by a persistent protectedSystemAdmin flag. Its global role and active status cannot be downgraded through the admin user API, even by another global administrator.
- The alternate member API enforces the same global-role safeguard. Account protection is independent of display name or email changes after migration.
- Admin UI disables protected role/status controls and displays an explicit locked-account explanation.
- Other profile fields, memberships and supported administrative operations are preserved.

## API and security

PATCH /api/v1/admin/users/:id/ai-access accepts only aiEnabled and/or aiTokenLimit. Limits are integers between 0 and 2,147,483,647; unknown fields, empty payloads and invalid limits are rejected. Authentication and server-side global administrator authorization remain required; mutation and audit record share a transaction. Consumption cannot be reset by mass assignment. A zero limit disallows further AI consumption.

The protection flag cannot be set or cleared through account-edit endpoints. Migration marks the existing designated admin account; no other user is protected. Controlled future provisioning of a replacement primary administrator must set the flag explicitly. Role enforcement applies to both global user changes and membership-based global-role changes.

## Validation evidence

| Check | Result |
|---|---|
| Backend suite | PASS 305 tests / 42 files before the final alternate-route and bypass additions |
| Final focused security/API suite | PASS 16 tests, including alternate member API and flag-unset/demotion attempt |
| Frontend suite | PASS 224 tests / 35 files |
| TypeScript/lint/build | PASS both packages |
| Prisma schema | PASS |
| Isolated MySQL migration | PASS primary-only protection; default quota, usage/access/custom quota preservation; reservation concurrency |
| Browser at 390 and 1440 | PASS switches, save-limit payload, API failure preserves state, org-admin read-only |
| Protected account browser at 390 and 1440 | PASS role/status visibly disabled for another super administrator |
| Live database | PASS exactly one protected account, primary role SUPER_ADMIN and active |
| Live builds/assets/health | PASS handler hashes and served asset hashes match; HTTP 200 |
| Unauthenticated quota mutation | PASS HTTP 401 |

Initial fixture render omitted DialogProvider and was repaired before UI verification. TypeScript found unsupported StyledSelect title props and unchecked mock-array access; both were corrected and checks passed. Existing bundle-size advisory remains. Production protected-account downgrade was not attempted; negative role tests run against isolated route dependencies, avoiding changes to the real primary administrator.

## Deployment and preservation

- PWA v55, additive migration 202610100003_protected_system_admin.
- Backup: C:/NIVASafe/backups/release-ai-access-controls-20261010-231304 (database, backend and frontend).
- Only the changed admin/user handlers, protection helper, schema/client and frontend assets were published.
- No quota consumption reset, permission bypass, deleted route, deleted feature, replaced provider, or production test identity.
- Preserve the additive flag on rollback. Removing its server enforcement would restore the old demotion risk and requires a deliberate decision.
- Evidence: scripts/admin-controls-live-evidence.json; scripts/check-admin-controls-live.mjs; scripts/check-admin-ai-access.cjs; scripts/check-protected-admin-ui.cjs.

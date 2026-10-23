# NIVASafe Technical Report

| Field | Value |
|---|---|
| Gregorian date | 2026-10-16 |
| Jalali date | 1405/07/24 |
| Repository | main / e5bf3f050bd6e127e13918c8d3eefcd3f8376acf |
| Status | NOT READY |

## Verified changes and boundaries

Reported focused work across phases 01–03 covers support/admin UI status behavior and theme tokens, tenant-scoped protected-operator fallback with regression tests, and isolated Vite/Vitest config-loader adjustments. Exact paths are listed in the English evidence audit and changelog. Git status held 384 entries at audit start and 392 after adding the eight reports; whole-tree attribution is not possible.

## Validation

- Direct build/typechecks in an isolated workspace passed; 737/737 tests, 90 frontend API paths / 154 backend routes, and 29 release checks passed.
- Root pnpm wrappers using installed pnpm 11.25.0 against the repository's 10.13.1 pin stopped before task execution with ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY.
- pnpm audit --prod failed because the npm advisory endpoint returned EACCES.
- Support ticket journey passed against isolated MariaDB and browser; production was not tested.
- Synthetic RULA image request received gateway HTTP 401; API returned sanitized 503; no score was persisted.
- Disposable migration replay stopped after eight migrations on duplicate globalRole and three checksum mismatches.
- WebKit/Safari/iOS, Playwright, authenticated production UAT, and backup restore were not run.

## Operations and risk

Local health at http://127.0.0.1:5044/api/v1/health returned HTTP 200, database up and version 0.1.0. Active assets under C:\inetpub\nivasafe\app-com hash differently from the isolated candidate; no deployment occurred. A backup exists but restore verification is pending. No migration, restart or live database change occurred.

## Security

Isolated negative auth/consent/tenant and internal-note checks passed. Consent/provider gates remain in source. Dependency audit and complete runtime security checks are not complete. No secret values are included.


# Final NIVASafe Release Quality Gate

| Field | Value |
|---|---|
| Project | NIVASafe |
| Gate status | PASS — local verification only |
| Gregorian date | 2 October 2026 |
| Jalali date | 10 Mehr 1405 |
| Base revision | `17c0d8b` |
| Working tree | Contained uncommitted Stages 01–06 changes before this gate; preserved |
| Environment | Windows 11 Pro, Node 22.15.0, pnpm 10.13.1 via workspace-local Corepack cache, Playwright 1.56.1, Chromium 141.0.7390.37 |

## Scope and verdict

The six stabilization outcomes were checked against current source and browser behavior. No unresolved regression was found in the checked scope. Stage 07 changed no application/runtime code, schema, API, permissions, calculation logic, or visual baselines. It added browser regression coverage for local PDF/WebM previews and modal focus/scroll-lock behavior that the existing interaction suite did not cover.

PASS applies to the local checks below. It is not a remote GitHub Actions result, live backend/database smoke test, production deployment, or a claim that the entire application is defect-free.

## Stabilization outcomes

| Outcome | Evidence | Result |
|---|---|---|
| Touch targets/accessibility | Correct `.rula-side-tabs button` selector; rendered target audit over seven surfaces at 10 widths; FMEA/RULA controls, tabs, labels, focus, overlap, and opened menus/dialogs exercised. | PASS |
| CI visual gate | Workflow runs on push and pull request. Ubuntu quality job runs tests/build/browser setup, E2E, overflow; dependent Windows job runs visual checks. Failure artifacts upload; CI has no baseline-update command. | PASS — configured, remote run not observed |
| Visual sensitivity | Effective screenshot ratio is `0.02`; no per-assertion allowance, `maxDiffPixels`, pixel threshold, masks, or broad exceptions found. | PASS |
| Page readiness | Bounded 12-second helper checks route/content, loaders, fonts, visible image decode and stable geometry. Six readiness regressions cover delayed data/image/font, SPA routing, stuck loader and invalid image. | PASS |
| Subscription time | Creation and checks share controlled UTC instants. Strict expiry, supported statuses, null/invalid expiry, paid subscription and default-current-time semantics are tested. | PASS |
| FMEA/RULA architecture | Public route exports remain connected; scoped import-graph traversal found no cycles in 6 FMEA and 4 RULA modules; domain/report/API tests passed. | PASS |

## Commands and results

| Command | Result |
|---|---|
| `corepack pnpm --version` | PASS — 10.13.1 |
| `corepack pnpm test` | PASS — domain 12/12, API 152/152, frontend 131/131 (295 total) |
| `pnpm --filter @nivasafe/domain test` | PASS — 12/12 |
| `pnpm --filter @nivasafe/api test src/organization-rules.test.ts` | PASS — 12/12 |
| `pnpm --filter @nivasafe/web test` | PASS — 7 files, 131/131 |
| `corepack pnpm lint` | PASS — 3 packages |
| `corepack pnpm typecheck` | PASS — 3 packages |
| `corepack pnpm build` | PASS — 3 packages; Vite retained an 890.20 kB JavaScript chunk warning |
| `corepack pnpm db:generate` | PASS — Prisma Client 6.19.3 generated |
| `pnpm --filter @nivasafe/api prisma:validate` | PASS — schema valid |
| `corepack pnpm verify:release` | PASS — 28 checks |
| `corepack pnpm verify:contract` | PASS — all 68 frontend API paths matched among 121 backend routes |
| `pnpm --filter @nivasafe/web test:e2e` | PASS — 99/99 Chromium tests |
| `pnpm --filter @nivasafe/web test:overflow` | PASS — 108/108 |
| `pnpm --filter @nivasafe/web test:visual` | PASS — 52/52 at ratio 0.02 |
| `corepack pnpm --filter @nivasafe/web test:e2e --grep "previews a (local|generated)|traps dialog focus"` | PASS — 3/3 under pinned pnpm |
| Manual strict TypeScript check for all Playwright fixture/spec files | PASS — no diagnostics |
| Scoped inline Node import-graph traversal for FMEA/RULA | PASS — 0 cycles |
| `git diff --check` | PASS — no whitespace errors; line-ending warnings only |

The additional strict TypeScript check was run from `frontend/` with this exact command:

```text
node_modules/.bin/tsc.cmd --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --typeRoots ../node_modules/.pnpm/node_modules/@types --types node --lib ES2022,DOM,DOM.Iterable --jsx react-jsx --esModuleInterop tests/e2e/fixtures.ts tests/e2e/readiness.spec.ts tests/e2e/overflow.spec.ts tests/e2e/visual.spec.ts tests/e2e/touch-targets.spec.ts tests/e2e/interaction.spec.ts
```

The full Playwright runs used the installed Playwright 1.56.1/Chromium 141 browser on Windows. The overflow suite checks 22 routes at 390×844 and 1280×900, plus six critical routes at 320×640, 360×800, 390×844, 430×932, 480×900, 768×1024, 1024×768, 1280×800, 1440×900 and 1920×1080. Dynamic checks cover drawers, portal menus, selects, dialogs, validation, file preview, expanded report/activity content, RTL/LTR and themes. Internal horizontal scrolling is confined to explicit data containers on wider layouts.

The target audit measures dashboard, FMEA report/process, RULA report/analysis, admin and files at all 10 widths, plus eight selected language/theme scenarios. It is not a full route × viewport × theme Cartesian matrix. Visual snapshots span the listed widths on relevant login/report surfaces and phone/tablet/desktop samples elsewhere. They include FMEA/RULA lists, editors/reports, actions, files, admin, activity log, knowledge, notifications, members, profile and representative English/white-theme states.

Reviewed snapshots are in `frontend/tests/e2e/__snapshots__/chromium/visual.spec.ts/`; representative files inspected were `rula-report-390.png`, `fmea-report-320.png` and `dashboard-1280.png`. No snapshot changed in Stage 07. Successful comparisons produced no expected/actual/diff failure image. Playwright output paths are `frontend/playwright-results/` and `frontend/playwright-report/`.

No failure attachment remains from the first timeout: the named error-context path under `frontend/playwright-results/` is absent after subsequent runs. The timeout's captured page state was observed while diagnosing; no final visual diff or trace was produced because the final runs passed.

## Workflow and behavior review

- Existing FMEA/RULA calculation, report transformation and export tests passed; Stage 07 changed no calculation code.
- API route parity and the release verifier passed. No schema, migration, permission or subscription duration change was made.
- Subscription semantics remain unchanged: eligible active/trial statuses only; exact expiry is expired; trial duration remains 14 days.
- Test identities and media are synthetic/local. PDF/WebM preview tests assert object URL revocation on close.
- No deployment, push, production request or production-data operation occurred.

## Test-only failures resolved

The first WebM fixture attempt produced no data in headless Chromium. It was changed to explicitly request canvas frames and recorder data with a bounded timeout. A later test failure was an incorrect expected file-card count. The corrected PDF, WebM and dialog regressions passed 3/3; the full browser suite passed 99/99. These were test-fixture defects, not product defects. No assertion was removed or weakened.

One earlier full E2E run also timed out on the RULA report touch-target case at 1920px; its captured page was still showing the loading state. The exact case then passed alone (1/1), and a subsequent full run passed 99/99. The timeout was not reproducible and no deterministic application defect was isolated; it is recorded as a transient test-run anomaly rather than omitted.

## Limitations

- Remote GitHub Actions and branch-protection state were not observed. The workflow was reviewed in the current checkout.
- No live MySQL/API smoke test was run; browser requests used local route mocks, and no production endpoint or credential was used.
- No workflow YAML validator was installed; workflow triggers, steps and artifact paths were reviewed statically.
- Browser coverage is Chromium on Windows only. Physical iOS safe-area insets and Firefox/WebKit were not tested; phone viewport/overflow checks passed and safe-area CSS remains present.
- Build warning: minified JavaScript chunk is 890.20 kB. It is non-failing and outside this stabilization change.
- The full E2E/overflow/visual commands used global pnpm 11.19.0 before the repository-pinned pnpm 10.13.1 was provisioned. Root tests/lint/typecheck/build/verifiers and final focused browser regressions were then run with pnpm 10.13.1. Both used the same lockfile-resolved Playwright 1.56.1 and installed Chromium; remote CI remains the environment confirmation.
- A completed `pnpm install --frozen-lockfile` result was not recorded: dependencies were already present, and the attempted command entered the package manager's existing-module-directory replacement prompt. The lockfile was not changed; the installed workspace supported all executed checks.
- The initial full E2E timeout did not reproduce in the isolated case or the subsequent full run. Its cause remains unconfirmed, so browser-run stability should be observed in CI.

## Stage 07 changed files

- `frontend/tests/e2e/interaction.spec.ts` — local PDF/WebM preview, URL cleanup, modal focus trap, Escape, scroll lock and focus return.
- `frontend/tests/e2e/fixtures.ts`, `overflow.ts`, `testData.ts`, `touch-targets.spec.ts`, `touch-targets.ts` — test-helper type fixes and deterministic fixture adjustment; strict standalone TypeScript check passes.
- `docs/final-stabilization/FINAL-QUALITY-GATE.md` — this report.
- `reports/customer-report.en.md`, `reports/customer-report.fa.md`, `reports/technical-report.en.md`, `reports/technical-report.fa.md` — final checkpoint appended while preserving prior content.

No production source or visual snapshot changed in Stage 07. Earlier uncommitted work remains uncommitted.

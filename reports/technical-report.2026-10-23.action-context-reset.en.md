# Corrective-action context reset — technical report

| Project | Audience | Language | Gregorian | Jalali | Frontend release |
|---|---|---|---|---|---|
| NIVASafe | Technical | English | 2026-10-23 | 1405-08-01 | release-action-context-reset-20261023-01 |

After a successful FMEA corrective-action submission, its project, FMEA assessment and linked risk selection return to their existing defaults. A successful RULA submission similarly resets its project and related RULA assessment. Failed submissions preserve entered values and retry identity. An older response does not clear a newer selected assessment or a changed draft in a remounted form. The other tab’s unsent action and the separate action-list filters remain intact. No control, label, style, route or API field was added or removed.

## Root causes and focused implementation

Existing success handling reset the inner form but retained controlled project/assessment selections. Those selections now reset only after the server confirms creation and only while the submitted form instance remains connected. Each mounted FMEA/RULA form now uses its own existing type-and-assessment-scoped draft key, instead of sharing the active tab’s key. A late detached form clears saved data only if a known captured local snapshot still matches; changed or unknown draft ownership is preserved. The original connected-form success-reset convention is retained. Draft namespaces/formats, initial deep links, native/custom field defaults, duplicate-submit protection, idempotency and list filtering remain compatible.

Only frontend/src/features/actions/ActionsPage.tsx and frontend/tests/e2e/actions-create-reset.spec.ts changed. Independent AST review preserves JSX order, tags, text and attributes except the intended key/storageKey and existing risk-change event bindings. No shared autosave module or backend code changed. Existing server-side authorization, tenant boundaries and action contracts remain authoritative. No sensitive logging, secret, dependency or persistence migration was introduced.

## Validation

| Check | Result |
|---|---|
| Frozen frontend unit / rendering / source contracts | PASS — 510/510 |
| Frontend typecheck / lint / compile / production build | PASS |
| Actual planned production JS + existing CSS, desktop/mobile | PASS — 24 browser cases |
| Independent source/security/preservation review | PASS |
| Live public index/immutable assets and unchanged API identity | PASS |
| Backend/schema/dependencies/environment/proxy | UNCHANGED |
| Real production action creation / account mutation | NOT_RUN — isolated synthetic API fixtures used |

Executed commands and logs are bound in reports/evidence/action-context-reset-20261023-01/build-validation.json and e2e-validation.json. The twelve browser cases run for both FMEA/RULA across desktop and mobile, including success defaults, failed retry, pending selection changes, other-tab drafts, hidden submitted forms and returning to the same assessment with a newer draft. External network and unexpected writes are blocked by the synthetic harness. No production action is created for verification.

## Retained failure evidence

The source author retained local harness startup failures for missing bundled Chromium and optional video FFmpeg, then used installed Chrome with video disabled. A real 10-case run reproduced two hidden-tab completion failures before per-form keys were repaired; both return-to-A cases then reproduced newer-cache deletion before the local snapshot guard was repaired. Evidence is retained under .local/action-context-reset-20261023-01/. A subsequent 12-case source run exposed FMEA controlled-risk restoration on reload; the scoped native-change binding repaired it before final 12/12. The initial isolated frontend copy also omitted backend sources read by existing tests; this failed attempt is preserved at reports/evidence/action-context-reset-20261023-01-attempt-01-missing-cross-tree-fixtures. The complete unchanged sanitized baseline fixtures were restored, without changing test assertions. Byte-equality guards protect changed/unknown drafts; byte-identical detached submitted content retains the prior cache-clear convention while its DOM is preserved. No generation-based ownership claim is made. The first release-browser setup stopped before launching tests because the author config filename already existed; e2e-attempt-01-config-collision.json retains that failure. A separate hybrid-playwright.config.mjs preserved the author config and the final 24-case run passed. The final frozen browser run uses the existing fourteen production stylesheet links and the exact proposed JS graph.

## Preservation and deployment

Frontend-only release; entry /assets/index-DT4v4FlK.js. All 820 prior non-index public files remain present, with fourteen stylesheet links unchanged. API PID 11776 and version release-ai-text-connection-20261023-01, all private backend artifacts, protected environment, proxy, model/worker settings, database schema/migrations and data are preserved. No API restart or new provider inference is performed. To roll back, atomically restore C:/NIVASafe/.local/action-context-reset-20261023-01/index.before.html; retain immutable assets and business data.

## Scoped twelve-stage gate

01 repository/user requirement analysis,02 existing design preservation,03 focused frontend implementation,04–07 unchanged backend/persistence/API/auth verification,08 scoped security review,09 tests,10 isolated actual-page QA,11 immutable frontend publication,12 independent final review all PASS for this bounded maintenance task. No whole-product security, anatomical accuracy or production-data end-to-end certification is claimed.

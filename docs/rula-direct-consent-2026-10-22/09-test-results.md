# Test evidence

Date: 2026-10-22 / 1405-07-30.

| Verification | Actual result | Evidence |
|---|---|---|
| Candidate backend full source suite | PASS, 715 tests, zero failure/skip | `stage09-backend-tests.json` |
| Candidate frontend full source suite | PASS, 471 tests, zero failure/skip | `stage09-frontend-tests.json` |
| TypeScript typecheck/lint and production build, both applications | PASS, six process checks | `stage09-validation.json` |
| Clean schema, real result repository, actor/tenant negative reads | PASS, five checks | `stage05-database.json` |
| Two ordinary-user organizations, consent/owner/role/quota, all sides, saved reports/PDF | PASS, 27 checks across 96 real HTTP requests, four replay dispatches, three PDFs | `stage06-validation.json` |
| Replay-confinement self-test | PASS, three accepted replies/eight rejected paths | `stage06-replay-guard-validation.json` |
| Browser upload starts with empty text, survives step change; no-consent/no-owner denial | PASS, three isolated browser cases | `frontend-browser-regression.json` |
| Redirect confinement regression | PASS, 57 adapter tests including one fixed-recipient redirect rejection | `stage08-redirect-regression.json` |
| Fresh actual Arvan BOTH with fixed synthetic image | PASS, one new paid attempt, six functional checks, persisted/reopened output and PDF | `stage09-live-3f5d08935159/result.json` |

Evidence directory: `reports/evidence/rula-direct-consent-20261022-01/`. Test scripts are retained under `.local/rula-direct-consent-20261022-01/`; no test adapter or fake key is imported by production.

The fresh actual response completed in about 23 seconds, requested `GPT-5-Mini`, and returned the permitted effective model ID `gpt-5-mini-2025-08-07`. Cumulative requests are five under the existing six-attempt ceiling, including four earlier documented attempts. No extra call is needed. The fixed stick-figure illustration was the only transferred image. Prior RIGHT/LEFT/BOTH real-service proof is retained separately; the new 27-check matrix uses replay and is not mislabeled live inference.

Failed harness/setup attempts remain in evidence: escaped database CLI identity output, missing bilingual organization fixture name, MySQL geometry float round-trip comparison, sparse frozen test-context files, and an unavailable dotenv import in the prepared live harness. Their fixes did not weaken product assertions; the final live harness uses Node's built-in environment parser and the unchanged production timeout. The first live-harness failure dispatched zero provider requests and seeded no account.

An initial unit audit mock inherited a real Prisma binding and attempted a synthetic audit insert, rejected with P2003. No successful insert was observed. Backend unit tests now force an unreachable database, restrict any explicit integration override to the disposable loopback schema convention, deny unmocked HTTP, and exclude compiled duplicate tests. See `stage04-test-isolation-incident.json` for the containment record.

No independent anatomical accuracy validation or general public processing-terms approval is established by these tests. All temporary fixture accounts are disabled, sessions revoked and owned API processes stopped after each integration run.

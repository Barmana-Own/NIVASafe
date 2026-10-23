# AI text connection correction — technical report

| Project | Audience | Language | Gregorian | Jalali | Release |
|---|---|---|---|---|---|
| NIVASafe | Technical | English | 2026-10-23 | 1405-08-01 | release-ai-text-connection-20261023-01 |

## Diagnosis

The AI switch and protected credential were present. Two native Node fetch probes to the approved Arvan gateway failed before an HTTP response with UND_ERR_CONNECT_TIMEOUT at about 10.5 seconds. Certificate-verified HTTPS and a separate public Undici Agent succeeded with the same gateway/credential; a real GPT-5-Mini task description was accepted by the existing parser. Assessment text requests now use a bounded separate connection pool. Images, chat, UI, models, prompts, token budgets, request deadlines, retry rules and access/consent controls remain unchanged.

## Implementation and security

Only backend/src/ai-provider.ts and its regression test changed. A lazy process-lifetime assessmentTextDispatcher uses four connections, pipelining one, 60-second idle bounds and a 30-second TLS connector with certificate verification enabled. It is passed only after existing approved Arvan assessment checks and only on the non-image risk route. The image pool remains distinct; other provider and chat routing stays intact. No global dispatcher, DNS override, certificate bypass, credential rotation, dependency or database change was introduced. Existing text abort deadlines, retry counts, usage accounting, model validation and image authorization/no-replay behavior remain enforced.

## Validation

| Check | Status / evidence |
|---|---|
| Backend tests | PASS — 851/851 |
| Shared-domain tests | PASS — 19/19 |
| Backend typecheck / lint / build | PASS |
| Schema validation | PASS — no schema/migration change |
| Frozen candidate and deployed synthetic text adapter | PASS — real provider, parser accepted |
| Public health/version and protected-route denial | PASS |
| Frontend | 821 files including index preserved; no rebuild needed |
| Independent scoped security/regression/final review | PASS |
| Production account mutation / new image inference | NOT_RUN — unnecessary for scoped text transport fix |

Full commands and logs are hash-bound in reports/evidence/ai-text-connection-20261023-01/build-validation.json. Candidate and deployed live probes retain metadata only, no output text or credentials. One initial focused test invocation used the repository root and found no files; the corrected backend working directory passed91/91, then the full frozen suite passed. Independent release review found and repaired a derived-test artifact exception and strengthened public HTTP/config/copied-file proof checks before deployment. No application test was deleted or weakened.

## Scoped workflow

01 diagnosis,02 existing design preservation,03 frontend preservation,04 backend implementation,05 unchanged persistence,06 live provider transport/API tests,07 existing access tests/401smoke,08 strict TLS/security review,09 test suite,10 real-adapter QA,11 private immutable deployment,12 independent final review all PASS for this bounded maintenance change. Frontend/persistence stages preserve existing implementation rather than creating new features.

## Preservation and recovery

Only ai-provider.js changed among runtime modules. The matching compiled regression-test artifact changed as expected. All 821 current public files including index, private environment, proxy, schema/migrations, Python/model settings and worker identity remain preserved. Managed configuration changes only the exact API executable and release label. Rollback: restore the verified config backup at C:/ProgramData/NIVASafe/backups/release-ai-text-connection-20261023-01 and restart the previous managed API release; retain public assets and business data. No migration rollback is necessary.

## Limits

The unavailable badge is generic; historical task-failure audit rows did not retain a specific transport/parser code. The incident diagnosis is based on the reproduced live connection differential, not a retrospective code recovered from those rows. No claim is made that every historical unavailable message had this cause. No customer image, real task text, account mutation or assessment write was used. Live verification called the real deployed adapter with synthetic text and no user/knowledge context; authenticated-route behavior is covered by tests, while live protected-route smoke only verifies unauthenticated denial. No production end-to-end account mutation or image-model accuracy test was performed.

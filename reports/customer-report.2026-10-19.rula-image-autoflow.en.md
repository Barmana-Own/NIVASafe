# RULA platform access and image review — customer report

| Project | NIVASafe |
|---|---|
| Gregorian | 2026-10-19 |
| Jalali | 1405-07-27 |
| Release | release-rula-image-autoflow-20261019-01-r2 |
| Revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf (dirty tree preserved) |
| Status | DEPLOYED CODE ONLY / LIVE IMAGE DISABLED |

## Delivered

The updated backend and frontend are live. The large image-consent checkbox and global manual-scoring banner were replaced by a clear informed-upload disclosure and a review/edit action beside each image. Users still explicitly consent by the described choose/send action; registration and reopening a record do not grant image-transfer consent. RULA remains a platform capability for all eligible organizations, with no organization activation list.

Authentication, roles, subscription, quota, tenant/image isolation, seven-part and independent-side review, historic scoring versions and PDF are retained. Only the RULA completion allocation changed within the existing supported ceiling; no model substitution, scoring-threshold change or additional AI model.

## Verified status

| Milestone | Result |
|---|---|
| Backend/frontend code deployed | PASS; exact r2 marker and served hashes |
| Current r2 genuine image workflow | PASS: organization A fresh independent BOTH, review/save/reopen/PDF; organization B RIGHT HTTP200 |
| Current r2 all RIGHT/LEFT/BOTH cases in both organizations | PARTIAL; the full matrix was not completed within12 attempts |
| Two-org manual BOTH review, save and PDF | PASS; Chrome fa390/en1280, actual isolated DB |
| Application regression tests |1041 PASS; typecheck/lint/build, API/release checks PASS |
| Public pages | PASS read-only; no new console errors or overflow |
| Production image processing | BLOCKED; real platform privacy authorization not verified, gates closed |
| Independent anatomical accuracy | NOT VALIDATED; warnings and mandatory review retained |

The run also observed one provider timeout and three rejected/unverified HTTP200 outputs. Increasing the completion ceiling addressed the observed length limit; the exact cause of the internal rejections is still UNKNOWN. Failed inference created no partial assessment. Passing infrastructure tests is not anatomical certification.

## Activation and preservation

The owner must provide recorded platform-wide contractual/privacy approval for sending the intended images to ArvanCloud. After approval, the effective PM2 platform settings must be updated once; no organization-by-organization activation is needed. Complete the remaining fresh two-org side/stability matrix before feature activation. Per-upload informed consent and human review stay mandatory. See docs/rula-image-platform-access.md.

RULA/FMEA remain ArvanCloud GPT-5-Mini; chat remains DeepSeek-V4-Flash. FMEA/chat source behavior was preserved; no new paid FMEA/chat smoke call was made. Existing accounts, uploads and schema were preserved; production row counts compared unchanged.

Backups: C:/ProgramData/NIVASafe/backups/release-rula-image-autoflow-20261019-01. Code/config rollback was rehearsed with newer disposable records preserved. Live rollback was not needed. Further anatomical optimization remains paused.

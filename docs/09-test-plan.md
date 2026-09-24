# Stage 09 — Test Plan

| Requirement/risk | Test level | Coverage |
|---|---|---|
| FR-FMEA-PROC-002/003 | Frontend contract + backend unit | Keyboard combobox, custom-title option, route presence, catalog normalization and related suggestions |
| FR-FMEA-PROC-004/005 | Frontend contract + helper unit | Explicit selection, add-new item and stale-selection reset |
| FR-FMEA-PROC-006/007 | Frontend contract + helper unit | Required one/two-sentence description, bounded AI prompts/fallback and direct insertion into the editable field without a secondary suggestion panel |
| NFR-FMEA-PROC-001 | Static/security review | Tenant-scoped catalog query and permission checks |
| NFR-FMEA-PROC-003 | Existing autosave tests | Local/IndexedDB draft persistence and sync behavior |
| FR-FMEA-RISK-001 | Frontend contract + API review | Complete process/effect/cause/control/S/O/D/RPN/risk/action matrix |
| FR-FMEA-RISK-002 | Frontend contract | Search, filter, sort, detail, edit and confirmed-delete interactions |
| FR-FMEA-RISK-003 | Frontend contract + score-guide review | Pagination and criteria for every S/O/D score from 1 to 10 |
| FR-FMEA-RISK-004 | Frontend/backend contract + helper unit | Bounded risk-row AI suggestions with explicit accept-only behavior |
| FR-FMEA-RISK-005 | Frontend contract + backend compatibility/export tests | Panel exposes structured Excel and real Word DOCX exports; PDF compatibility route remains covered without a panel download control |
| FR-FMEA-RISK-006 | Frontend add-form contract + backend helper/unit tests | Add-row form omits manual row number/process stage; API derives sequential row number and parent assessment process context |
| FR-FMEA-RISK-007 | Frontend contract + responsive/accessibility review | Each of failure mode/effect/cause/recommendation categories renders three AI suggestions initially and exposes an independent reversible plus/minus control for additional suggestions |
| FR-FMEA-RISK-008 | Frontend contract + responsive CSS/build smoke | Add/edit score panels align S/O/D selectors, RPN preview and calculate/save action; supplied 1–10 reference criteria remain localized |
| FR-FMEA-RISK-009 | Backend parser/prompt unit + frontend contract | Risk-row AI returns bounded advisory S/O/D scores; the score suggestion appears after the panel and requires explicit apply/dismiss confirmation |
| FR-FMEA-RISK-010 | Shared-domain boundary + backend report + frontend contract + migration verification | RPN boundaries 50/51, 100/101, 200/201 and 400/401; server recalculation, score-panel badge, filters and five-level report distribution remain aligned |
| FR-FMEA-REPORT-001 | Frontend contract + backend helper unit | Report header, executive metrics, distribution and top failure-mode ranking |
| FR-FMEA-REPORT-002 | Frontend/backend contract | Suggested/manual action flow, tenant link validation and action register |
| FR-FMEA-REPORT-003 | Frontend contract + API review | Collapsible full details, save audit and no-PDF panel action set |
| FR-FMEA-WIZARD-001 | Frontend contract + production static smoke | Three localized FMEA creation-step labels: process information, review and register, and report and results; the first two states retain existing form behavior and successful registration opens the real report/results route |
| FR-FMEA-WIZARD-003 | Frontend contract + API/navigation smoke | Stage 1 advances to review/register, duplicate submission is guarded, offline/API failure keeps the draft on stage 2, and successful registration navigates to `/fmea/:id/report` as stage 3 |
| FR-FMEA-WIZARD-002 | Frontend contract + responsive CSS review + production static smoke | Assessment code and scope controls share an aligned row; the code auto-generation hint remains below its own input |
| FR-RULA-PROC-001 | Backend schema unit + frontend contract | Required activity measurements, explicit units, load context and server-side bounds |
| FR-RULA-PROC-002 | Backend security unit + frontend contract | Posture-image guidance, upload route, tenant/entity validation and file signature/size controls |
| FR-RULA-PROC-003 | Persistence/API review | Structured activity context remains available for a future AI image provider without invoking one |
| FR-RULA-PROC-004 | Backend schema unit + frontend contract | Bounded posture description, image type/size validation, preview lifecycle controls and duplicate-submit guard |
| FR-RULA-ANALYSIS-001 | Backend schema unit + frontend contract | Group A/B posture tables, angles, detection state, suggested scores and row-level edit controls |
| FR-RULA-ANALYSIS-002 | Frontend behavior contract + shared calculation review | Edited posture values flow into scoring inputs and the live RULA summary |
| FR-RULA-ANALYSIS-003 | Persistence/API review | Reviewable posture image/joint overlay extension and provenance-safe `postureAnalysis` storage |
| FR-RULA-ANALYSIS-004 | Backend schema unit + shared calculation + frontend contract | AI confirmation gate, explicit result provenance, live Group A/B totals, four action-level badges and dynamic leading-factor summary |
| FR-RULA-REPORT-001 | Backend helper + frontend contract | RULA score/risk result, neck/upper-arm/trunk factors, angles and contribution |
| FR-RULA-REPORT-002 | Backend schema/helper + frontend contract | Suggested action selection, priority, manual action entry and persisted `rulaImpact` |
| FR-RULA-REPORT-003 | Backend helper + frontend contract | Dynamic bounded prediction, removal recalculation, explicit non-definitive prediction notice and exports |
| NFR-AI-USAGE-001 | Backend provider/helper + integration + admin contract | Provider-reported token normalization, idempotent risk/chat accounting, no estimation when usage is absent, and global/organization-scoped administrator visibility |
| FR-AUTH-001 | Frontend contract | Visible personal/organization selector with malformed-draft normalization and explicit change-type access |
| FR-AUTH-002 | Frontend contract + API/auth review | Direct post-login navigation, first server-returned organization persistence and membership-checked in-panel company switching |
| FR-AUTH-003 | Frontend contract + responsive UI review | Login support message rendered as a semantic `login-art` footer with full available panel width and compact responsive spacing |
| FR-AUTH-004 | Frontend contract + responsive browser review | Localized login hero title uses a reduced responsive scale and full available measure without clipping at standard and short desktop viewport sizes |
| NFR-AUTH-001 | Static/security review | No client-supplied role assignment; backend membership remains authoritative for organization scope and effective role |
| FR-ASSESSMENT-PATH-001 | Frontend contract + responsive CSS review | Three-step assessment-path stepper, current-step numbering, removal of the redundant basic-information step and preserved FMEA/RULA entry controls |
| FR-ORG-001 | Frontend contract + API/database review | Authenticated company creation, ORG_ADMIN membership, default project and current-company management |
| FR-ORG-002 | Backend subscription unit + auth review | Independent subscription state, production payment gate, usable/canceled/expired behavior and no production local-payment bypass |
| FR-ORG-003 | Frontend contract + auth review | Membership-only top-bar/list switching and selected-company header propagation |
| NFR-ORG-001 | Security/static review + scoped route audit | Tenant filters, cross-company link rejection and organization-scoped member/settings/data access |

| FR-RULA-SCORE-004 | Shared-domain regression + frontend contract + production smoke | Applied-force choices display and contribute exactly 0/1/2/3 points to the final bounded RULA score in both live preview and server-authoritative registration/update paths |
| FR-RULA-SCORE-005 | Shared-domain regression + frontend contract + production smoke | Repetitive-muscle use opens two localized criterion options, displays the reference text and 1/0 scores, preserves the selected boolean in draft/FormData, and contributes exactly 1 or 0 to the final bounded RULA score in live preview and server-authoritative registration/update paths |

Database integration and browser end-to-end tests require a running application database and are run separately when that environment is available.

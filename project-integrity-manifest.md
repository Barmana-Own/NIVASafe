# NIVASafe Project Integrity Baseline

This lightweight baseline protects the existing product surface while focused cross-cutting changes are applied.

## Protected applications and boundaries

- `frontend/`: React/Vite application, authenticated shell, account flows, assessments, reports, files, knowledge and PWA.
- `backend/`: Fastify API, Prisma persistence, authentication, authorization, queues and provider adapters.
- `shared/domain/`: shared FMEA/RULA/business validation used by browser and API.
- `backend/prisma/` and `database/`: MySQL schema, migrations and provisioning assets.
- `docs/`, `deployment/`, `docker-compose.yml`, `.env.example`: operational and setup contracts.

## Protected user journeys

- Registration and login, password recovery and profile/member management.
- Organization/project/process/activity management.
- FMEA and RULA assessment creation, history and reports.
- FMEA process-information capture with searchable/custom job selection, user-confirmed equipment/material/control suggestions, bounded one/two-sentence activity-description assistance and offline draft recovery.
- FMEA results report with executive risk metrics, distribution/top-risk views, suggested and manual corrective actions, row-linked action tracking, collapsible full details and PDF/export summary.
- RULA process information and posture analysis with editable Group A/Group B observations, score recalculation, posture-photo review and future-ready joint overlay.
- RULA results report with score/risk, neck/upper-arm/trunk contributing factors, persisted corrective actions, manual action entry and explicitly non-definitive dynamic prediction.
- Corrective actions, files, knowledge, AI, chat, notifications and activity logging.
- Responsive navigation and PWA/offline shell.
- Dashboard KPI/risk/action/recent/quick-action widgets with user-scoped layout customization, visibility, ordering and reversible removal/restore controls.
- Global and organization administrator workspaces with separate navigation styling and centralized user-account controls.
- Administrator-managed member provisioning: organization managers submit username-based requests, Super Admins approve/reject and set an initial password, and the legacy invitation path remains available for existing accounts.
- Multi-company workspace creation and switching with independent organization memberships, per-company subscriptions and tenant-scoped operational access.

## Baseline comparison for the current change

- Local desktop behavior update 2026-10-20: per-image consent prompts and multipart fields were removed from the active FMEA/RULA image-analysis paths. Automatic analysis remains gated by the account-level image-processing preference and server-side provider privacy/vision approvals; authorization receipts are recorded before external transfer. Production configuration and existing assessment, role, route, API and data surfaces remain preserved.

- No page, route, API resource, database entity, role, permission or asset was removed.
- Existing pages, routes, assets and API contracts remain available; localization was added as a presentation-layer capability without removing the Persian defaults.
- The phone contract was tightened at shared, server and editable-client boundaries.
- Existing data is preserved; no destructive migration was introduced.
- Provider-reported AI token usage is persisted in an additive accounting table and displayed with tenant-safe administrator aggregates; prompts, responses and credentials are not included in usage reports.
- The new `/admin` route and `/admin/*` API surface are additive; global account controls are restricted to `SUPER_ADMIN`, while `ORG_ADMIN` receives a tenant-scoped administration view backed by the existing `/members` route.
- The `ASSISTANT` role and its enum migration are additive; existing roles, memberships, routes and invitation acceptance behavior remain preserved.
- Username authentication and the `MemberAccessRequest` entity/migration are additive; self-registration keeps username optional, organization provisioning requires it, existing email login/recovery contracts remain compatible, and no password plaintext is persisted.
- The former user-facing audit-events section is replaced equivalently by the detailed `/activity-log` surface; ordinary users see their own activity while organization managers see active covered members, assessment titles/codes and available AI token totals. Existing audit records and the legacy `/audit` API path remain preserved. Request context fields and lookup indexes are additive.
- Super Admin account activation, membership-role updates and replacement-password controls are additive; current passwords are never exposed and target sessions are revoked after a password reset.
- Autosave was added through reusable form infrastructure and existing protected pages/routes remain intact; password/recovery forms stay intentionally excluded from drafts.
- The FMEA report route, report/save audit endpoint and `CorrectiveAction.fmeaItemId` migration are additive; existing assessment, action, export and role boundaries remain available, and row deletion preserves linked action records by nulling the reference.
- RULA posture analysis is additive: `postureAnalysis` is nullable, validated at the API boundary, preserved in version snapshots and does not remove or invalidate existing scoring inputs.
- RULA report actions are additive: `rulaImpact` is nullable, validated at the action boundary, linked only to a tenant-owned RULA assessment, and does not alter the authoritative stored RULA score.
- Multi-company management is additive: existing organization/member/project/data paths remain present; company creation adds a separate `ORG_ADMIN` membership and localized starter project, while selection is membership-checked and each company's subscription gate is evaluated independently.
- Authenticated shell theming is additive: the existing routes, navigation, content surfaces and permissions remain present; a persisted blue/dark or white/light preference changes only shell presentation and the sidebar logo treatment.

## Production bug-fix and UI cleanup checkpoint — 2026-10-15

- The checked-in navigation module and route declaration compare byte-for-byte with the captured pre-task baseline; no navigation entry or route was added by this checkpoint.
- Existing RULA/FMEA image workflows, assessment permissions, quota checks, manual review, scoring, reports, themes, login, and administrator controls remain in the protected surface. Model routing and image-approval checks were tightened in existing modules.
- No database operation, migration, production deployment, or live provider request was performed for this checkpoint. Browser/WebKit verification and Vitest execution were unavailable; details are recorded in `docs/production-bug-fixes-ui-ux-cleanup-2026-10-15.md`.

## Final UI/UX implementation and visual acceptance — 2026-10-16

- A recoverable source/configuration snapshot was created before this phase at `C:\Users\Administrator\AppData\Local\Temp\NIVASafe-uiux-before-20261016-042111`. The working tree already contained approximately 370 modified or untracked paths; no reset, cleanup, or checkout was performed.
- Functional UI changes relative to that snapshot keep support content visible during refetch and announce successful AI-quota updates in Persian and English. Synthetic Playwright regressions were added for support replies, AI quotas, and notification inbox rendering; the notification fixture now matches the backend summary response shape.
- No protected page, route, navigation entry, endpoint, role, permission, assessment behavior, asset, or database structure was removed or replaced. The active deployment and live data were not modified.
- Local Edge Chromium acceptance exercised 38 critical synthetic states plus 44 route/viewport checks, with no whole-page overflow or runtime errors. Support/quota/theme/sidebar interactions were exercised. See `reports/final-ui-ux-validation.md` and `reports/uiux-evidence/`. Native Safari/WebKit, actual authenticated staging, and real RULA provider analysis remain unverified.
- The final focused acceptance follow-up added a semantic-token contrast fix for the RULA detected-posture toggle, with a regression test. Synthetic browser checks confirmed LEFT-side RULA detail/edit/refresh keeps the RIGHT-side score separate, FMEA mobile risk details open without overflow, and the RULA image-review failure path does not fabricate a score. The isolated frontend suite now has 322 passing tests. These fixture checks do not establish real-user authorization, provider compatibility, or database persistence.
- The route, navigation, endpoint, role, permission, and database-structure baseline remains preserved. No production files, services, configuration, accounts, uploads, or database rows changed; no deployment or restart occurred. Remaining browser/provider blockers are recorded in the final UI/UX report.


## RULA model-contract checkpoint 2026-10-18

- Source snapshot: C:\NIVASafe\.local\rula-model-contract-20261018-113940. Existing work retained; no reset/clean or old-ZIP replacement.
- Contract remains 90 frontend paths / 154 backend routes. No navigation/routes/schema/support feature removed.
- New table scoring is versioned; historical unversioned records retain legacy calculations on reads/metadata edits. No live data rescore.
- Candidate technical E2E passed; anatomical accuracy FAIL. Publication not performed; active code/config/data/services unchanged.
- Tool-only Playwright resides in .local. Evidence: C:\NIVASafe\reports\evidence\rula-model-contract-2026-10-18.


## RULA model-contract checkpoint 2026-10-18

- Source snapshot: C:\NIVASafe\.local\rula-model-contract-20261018-113940. Existing work retained; no reset/clean or old-ZIP replacement.
- Contract remains 90 frontend paths / 154 backend routes. No navigation/routes/schema/support feature removed.
- New table scoring is versioned; historical unversioned records retain legacy calculations on reads/metadata edits. No live data rescore.
- R6 server review-policy mutation checks passed with no trust in client flags. Candidate technical E2E passed; anatomical accuracy FAIL. Publication not performed; active code/config/data/services unchanged.
- Tool-only Playwright resides in .local. Evidence: C:\NIVASafe\reports\evidence\rula-review-policy-2026-10-18-r6.

## RULA anatomical recovery R7 — 2026-10-18 / 1405-07-26

- Preserved existing routes/navigation, support/FMEA/chat, data/uploads, schema/migrations and Cornell/legacy scoring. No production changes.
- Added bounded image normalization, deterministic image-plane audit/provenance, strict response/side/visibility checks and review enforcement. Removed only contradictory unvalidated image prose from display; API notes/text functionality retained.
- Frozen40 references unchanged; final21/40 numeric successes,19 abstentions; accuracy FAIL. Source/build/test/browser evidence is under reports/evidence/rula-anatomy-2026-10-18-r7.
- New dependency sharp0.35.5. Candidate file recovery119 files passed; live service/config rollback not certified.


## R8 checkpoint — 2026-10-19 / 1405-07-27

Source checkpoint: reports/evidence/rula-landmarks-r8-20261019/baseline.json (476 pre-existing Git entries). No route/page/role/table/migration/integration was removed. Provider/FMEA/chat/support/scoring-table sources preserved. Added experimental localization, analytic references, geometry repair, typed provenance and truthful RULA uncertainty wording.977 tests/build/typecheck/lint passed; accuracy FAIL; NOT DEPLOYED. Candidate190-file recovery is not operational live rollback. Reports and project-state retain INCOMPLETE.


## Controlled code release 2026-10-19

Gregorian:2026-10-19;Jalali:1405-07-27. Owner paused anatomical tuning.402 source files preserved byte-for-byte;routes90/154 retained;all unrelated features preserved. Only API boot path/non-secret version changed. New operational guard scripts and handoff/reports added. No schema/data migration or live-image activation. Deployed:release-20261019-safe-r8-uiux-handoff;runtime:C:\ProgramData\NIVASafe\releases\release-20261019-safe-r8-uiux-handoff\backend\dist\server.js;static:C:/inetpub/nivasafe/app-com;backup:C:/ProgramData/NIVASafe/backups/release-20261019-safe-r8-uiux-handoff. Code artifact/security checks passed;full-product Stage12 acceptance BLOCKED;clinical/anatomical and public image acceptance remain unaccepted/disabled.

## Desktop login correction 2026-10-19

Frontend release-login-desktop-20261019-01 deployed;single application CSS file changed only at>=901px. Existing navigation,forms,auth,backend/data/model routing,mobile rules and static custom files preserved.402source hashes reviewed;349tests,9desktop and16mobile public states verified. Backup/rollback: C:/ProgramData/NIVASafe/backups/release-login-desktop-20261019-01/frontend;evidence: C:/NIVASafe/reports/evidence/login-desktop-20261019-01. Global RULA acceptance unchanged.

## Login wordmark 2026-10-19

INTENTIONALLY_REMOVED: login typography images,explicit owner request. Brand assets and other pages preserved;icon/accessibility retained. CSS unchanged,349tests and13public Chrome states passed;frontend release-login-wordmark-20261019-01 deployed. Evidence: C:/NIVASafe/reports/evidence/login-wordmark-20261019-01.


## Static sidebar groups — 2026-10-19 / 1405-07-27

INTENTIONALLY_REMOVED: parent accordion controls and hidden-panel state, explicitly requested by the owner. REPLACED_EQUIVALENTLY: the same 10 parent sections and 3 nested sections now use small static headings with all 20 authorized leaf destinations retained. Navigation definitions/role filters, auth/session/logout/profile, backend, DB, model routing, login/mobile-login CSS, assets and existing data are preserved. Five frontend source/test paths changed; no source/test removed. release-sidebar-static-groups-20261019-01 is live;361 tests,12 isolated component browser cases and actual public authenticated 390/1280px navigation checks passed. Backup335 files and code-only rollback reconstruction/swap rehearsal passed. Whole-product RULA accuracy/privacy acceptance remains unchanged. Evidence:C:/NIVASafe/reports/evidence/sidebar-static-groups-20261019-01.


## Assessment method selection — 2026-10-19 / 1405-07-27

INTENTIONALLY_REPLACED: four sidebar labels/destinations now use generic safety/ergonomics categories and the existing authenticated /choose-path route with whitelisted category/mode queries, explicitly requested. FMEA/RULA direct new/list/report routes remain compatible; HAZOP/REBA are marked coming soon with no executable route or API. All20 sidebar entries,10 static groups,3 nested headings,role filters,auth/session/drafts,legacy chooser,login styling,backend,data,model routing and privacy controls remain. Eight scoped frontend source/test changes;190 source files checked;383 tests and24 isolated component cases passed;8 actual authenticated public selector states and2 saved views verified. Release:release-assessment-methods-20261019-01;backup:C:/ProgramData/NIVASafe/backups/release-assessment-methods-20261019-01/frontend;rollback rehearsal/hash/mtime verification passed. Full-product RULA acceptance status is unchanged. Evidence:C:/NIVASafe/reports/evidence/assessment-methods-20261019-01.


## Phone login header/background — 2026-10-19 / 1405-07-27

No page,feature,route,asset,role,test or data path removed. Only phone login-entry CSS at<=760px was appended:logo/links/appearance use one row;the original background photo uses a left-center cover crop so the person/factory remain visible. Existing CSS prefix,all188 other frontend sources,login logic,forms,registration,sidebar/method selector,backend,model routing and data preserved.383tests,112focused checks,46actual public Chrome states passed;30 tablet/desktop/form states retained their visual layout;29 images match exactly and one has8 raster-only differing pixels with maximum channel delta4. release-login-mobile-header-20261019-01 deployed with367-file verified static backup/recovery. No API restart or privacy change. Evidence:C:/NIVASafe/reports/evidence/login-mobile-header-20261019-01.


## Desktop sidebar toggle — 2026-10-19 / 1405-07-27

REPLACED_EQUIVALENTLY: the invisible collapsed branding overlay now uses a visible, focusable button in normal flow below the logo. No existing destination, group heading, role, feature, asset or data path removed. Only frontend/src/styles.css and frontend/src/styles/shell.css changed;190 frontend sources compared,188 unchanged.383 frontend tests/54files, typecheck/lint/build,90/154 contract,29 release checks,36 isolated component browser cases and13 actual public authenticated states passed. Release:release-sidebar-toggle-20261019-01;backup:C:/ProgramData/NIVASafe/backups/release-sidebar-toggle-20261019-01/frontend;383-file hash/mtime reconstruction and static swap rollback rehearsal passed. API PID11620/SYSTEM and backend version unchanged. Mobile drawer behavior, login/mobile styling, support/FMEA/chat/RULA controls and privacy gates preserved. Whole-product anatomical/privacy acceptance remains unchanged. Evidence:C:/NIVASafe/reports/evidence/sidebar-toggle-20261019-01.


## Desktop overview card density — 2026-10-19 / 1405-07-27

No content,widget,route,role,asset,test or data path removed. Only frontend/src/styles/management.css appended dashboard-scoped rules at>=1025px;wide four-column sections start at1600px. Intrinsic heights remove forced stretching;section/KPI boundary preserved;counts,percentages,report links,customization order and all mobile/tablet rules unchanged.190 source files compared,189 unchanged.383 tests/54files,typecheck/lint/build,90/154 contract,29 release checks,36 isolated cases and13 actual public cases passed.12 frozen mobile/tablet geometries unchanged. Public small height deltas are retained without exact pixel identity claims. Release:release-dashboard-desktop-20261019-01;backup:C:/ProgramData/NIVASafe/backups/release-dashboard-desktop-20261019-01/frontend;399-file verified reconstruction/swap rollback. No backend restart/schema/data/privacy change;whole-product RULA gates remain unchanged. Evidence:C:/NIVASafe/reports/evidence/dashboard-desktop-20261019-01.


## FMEA table column separators — 2026-10-19 / 1405-07-27

One CSS-only append in frontend/src/styles/assessments.css at>=761px;189 other source files unchanged. Existing RTL table grids now use a physical left edge per nonfinal cell,independent of numeric LTR content. No cell/column/content/role/route/feature/test/asset/data path removed. Mobile compact rules and all earlier dashboard/sidebar/login corrections retained.383 tests/54files,typecheck/lint/build,90/154 contract,29 release checks and29 component cases passed;8 frozen mobile states unchanged.6 actual public DOM/scroll states verified 484 internal boundaries with10 rows retained;public pixel screenshot NOT_RUN due5 CDP capture timeouts. Release:release-fmea-table-lines-20261019-01;backup:C:/ProgramData/NIVASafe/backups/release-fmea-table-lines-20261019-01/frontend;415-file hash/mtime reconstruction/swap rehearsal passed. Backend/schema/data/privacy/global RULA gates unchanged. Evidence:C:/NIVASafe/reports/evidence/fmea-table-lines-20261019-01.


## FMEA automatic corrective suggestions — 2026-10-19 / 1405-07-27

INTENTIONALLY_REMOVED by owner request: NIVASafe suffix in this panel title, manual Get AI suggestion button, below-header HSE helper and successful-AI status strip. REPLACED_EQUIVALENTLY: one bounded automatic batch per report/language visit, explicit error retry, existing role/tenant/quota guards and mandatory action registration/review retained. Compact 2x2 left controls and focus-managed full-text dialog added. No route, table, score, sidebar, login, feature, asset, permission, historical record or schema removed.193 sources compared;185 existing sources unchanged;5 existing sources and3 new files scoped.389 tests/55files,13 isolated actual-page API-boundary browser cases,4 actual public DOM cases,91/154 API contract and29 release checks passed. Release:release-fmea-auto-actions-20261019-01;backup:C:/ProgramData/NIVASafe/backups/release-fmea-auto-actions-20261019-01/frontend;431-file restore/hash/mtime and swap rollback rehearsal PASS. Backend PID11620/SYSTEM unchanged; no migration/restart/privacy/model change. Public automatic operation settled without error; no new provider-HTTP or anatomical-validation claim. Evidence:C:/NIVASafe/reports/evidence/fmea-auto-actions-20261019-01.


## Mobile login header legibility — 2026-10-19 / 1405-07-27

One CSS-only append in frontend/src/styles/authentication.css,phone intro<=760px only. No content,logo,link,theme/language control,route,auth,role,asset or data path removed. Larger11–13px type and8–12px logo gutter;Persian labels retain one line;long English labels wrap inside the navigation region only at<=480,keeping brand/navigation/appearance in one header row.193 sources compared;192 unchanged.389tests/55files,typecheck/lint/build,91/154 API contract and29release checks passed.37 real anonymous static-build browser states:14improvedphone states and23unchanged tablet/desktop/form states.3actual public states;390px font9.36->12.09px and gutter4->12px;desktop12px/76px header and mobile form16px input preserved. No console errors/warnings. Release:release-login-mobile-legibility-20261019-01;backup:C:/ProgramData/NIVASafe/backups/release-login-mobile-legibility-20261019-01/frontend;447-file verified restore/swap rollback. Backend/config/schema/privacy/model-routing unchanged. Evidence:C:/NIVASafe/reports/evidence/login-mobile-legibility-20261019-01.


## Support account roles and platform inbox — 2026-10-19 / 1405-07-27

REPLACED_EQUIVALENTLY: /support now selects requester workspace for global USER (including organization admins) or platform inbox for active global SUPER_ADMIN. INTENTIONALLY_CHANGED by explicit owner policy: every global system administrator can manage tickets across organizations without an additional operator allowlist/protection requirement; ordinary requester/tenant boundaries and private staff notes remain enforced. Bidirectional in-app notices, strict UUID ticket deep-links and refresh added. No content/route/feature/schema/model/CSS/public asset removed; prior UI/RULA/FMEA/chat retained. 186 existing frontend sources and 128 backend sources unchanged; no domain/prisma/public changes. Deployed backend changes only two of 132 compiled files. 1029 tests, type/lint/build,91/154 contract,29 release checks,65 real API/DB/rollback checks,Chrome desktop/mobile and actual public admin inbox pass. Release release-support-roles-20261019-01; active PID 8352/SYSTEM; index 0c75e6beb0837170d6e6bdf258d536a6ed9ab89fcd571373096b5947f2295164; backup C:/ProgramData/NIVASafe/backups/release-support-roles-20261019-01; rollback rehearsed. Historical RULA accuracy/privacy limitations unchanged. Evidence C:/NIVASafe/reports/evidence/support-roles-20261019-01.


## Direct account settings shortcut — 2026-10-19 / 1405-07-27

REPLACED_EQUIVALENTLY: sidebar account identity now navigates directly to the existing protected /profile route. The adjacent accessible button retains account/activity log/organization switching with keyboard/Escape support. No prior menu option, route, business logic, role, data path or feature removed. Only ProfileMenu.tsx and shell.css changed, plus2 regression cases.397 frontend tests/57files,typecheck/lint/build,91/154 API contract,29 release checks,8 real API/MariaDB/Chrome journeys (regular/system-admin,fa/en,390/1280) and actual public desktop/mobile navigation passed. Frontend release release-profile-account-shortcut-20261019-01;backend release-support-roles-20261019-01 unchanged and not restarted. Backup C:/ProgramData/NIVASafe/backups/release-profile-account-shortcut-20261019-01/frontend,479 files,hash/mtime reconstruction and static swap rollback verified. User's collapsed-sidebar preference restored after public test. Privacy/AI/DB/unrelated dirty work preserved. Evidence C:/NIVASafe/reports/evidence/profile-account-shortcut-20261019-01.


## Platform RULA image policy and per-image review — 2026-10-19 / 1405-07-27

DEPLOYED CODE ONLY: release-rula-image-autoflow-20261019-01-r2, PID2840/NT AUTHORITY\SYSTEM, module5babe27e22bf6b4c19816863a76752270da7f972570e35b732b0688d2667c604, index9eecdbd112300ab9b02ea0c907644f1477ec6dda9bceab7fc7dd2ee9707c7d8b. INTENTIONALLY_REMOVED by explicit owner instruction: large consent checkbox and global manual-score banner; REPLACED_EQUIVALENTLY with informed choose/send consent and per-image review/edit dialog. Registration is not consent. No organization allowlist; platform privacy gates remain closed. No historic test/route/data/scoring version/schema or unrelated UI/support/FMEA/chat removed.1041 application tests plus6 rollback tests; type/lint/build,91/155 API contract,29 release checks. Two-org actual manual BOTH/browser/save/PDF and current-r2 real BOTH browser in one org pass; full final-r2 all-side two-org image matrix PARTIAL.12 real ArvanCloud attempts, including1timeout and3rejected/unverified200outputs, retained honestly. Original anatomical accuracy remains unvalidated and optimization paused. Backups/reconstruction/operational rollback PASS atC:/ProgramData/NIVASafe/backups/release-rula-image-autoflow-20261019-01. No live DB migration, user/upload mutation or image permission activation. EvidenceC:/NIVASafe/reports/evidence/rula-image-autoflow-20261019-01.

## 2026-10-19 / 1405-07-27 — login-enamad-20261019-01

- Three frontend files changed: `frontend/src/features/account/AccountPages.tsx`, `frontend/src/i18n.tsx`, `frontend/src/styles/authentication.css`.
- Park mark, login/header/form, mobile/desktop navigation, RULA/FMEA/chat/support, auth, database/schema, uploads and protected settings preserved.
- Official Enamad image/link added with exact supplied public seal identifiers; safe readable link when image fails.
- 403 frontend tests; 8 candidate and 8 public browser cases; code/artifact rollback copy rehearsal PASS.
- Frontend release-login-enamad-20261019-01-r2, index 42fc4bea559a56aedbb4eb413e2678f7a048c16cdc9d99f45f410680e2e6d244; backend unchanged at release-rula-image-autoflow-20261019-01-r2, PID 2840.
- External image intermittency: 5/8 initial public views loaded a genuine PNG, 3/8 used fallback; cause UNKNOWN.
- No required element removed or silently disabled.


## 2026-10-19 / 1405-07-27 — FMEA report recovery

INTENTIONALLY_REMOVED by owner: suggestion dots button and suggestion-only show-more control. REPLACED_EQUIVALENTLY: title opens retained full-text/review dialog; five cards only; existing data and top-risk expansion retained. 15 scoped application/test files changed. 1067 tests; type/lint/build,93/155 contract,29 release checks;13 API-boundary component cases,8 real staging UI cases and final real GPT-5-Mini/DB/PDF passed. Frontend release-fmea-report-recovery-20261019-01; backend release-fmea-ai-reliability-20261019-01, PID13644; public AI NOT_RUN_PUBLIC_OWNER_SYNTHETIC_ONLY. Full backend/config backups and actual isolated old/new/old rollback passed. No schema migration, production assessment overwrite, ACL weakening, image approval change, chat-model substitution, route/permission/asset loss. Historical compiled test modules preserved outside executable graph. Whole-product RULA anatomical/privacy acceptance unchanged. Evidence: C:/NIVASafe/reports/evidence/fmea-report-recovery-20261019-01.


## 2026-10-19 / 1405-07-27 — Report chart consistency

REPLACED_EQUIVALENTLY by explicit owner request: long progress labels shortened to «درجریان» and «باقی مانده»; both report progress charts and RULA risk styling use the existing FMEA risk layout; FMEA heading includes FMEA. Nine focused frontend/test files changed; no source file, feature, route, API, score version, data path, permission or asset removed. Unique ARIA IDs and explicit localized direction preserve independent chart behavior.425 frontend tests, typecheck/lint/build,93/155 contract,29 release checks,20 synthetic component states,16 real isolated two-organization report pages and23 public document/asset checks PASS. Release release-report-chart-consistency-20261019-01; index 3ecaddc28249d61daa3c18b52fe98c9ad57a363ce6c36b92f1c8c5ace7b7d396.543-file backup and isolated rollback rehearsal PASS at C:/ProgramData/NIVASafe/backups/release-report-chart-consistency-20261019-01/frontend.559 live files verified; backend release-fmea-ai-reliability-20261019-01/PID13644 and protected config unchanged. No production DB writes, paid AI calls or privacy/image-gate activation. Private production report not reopened under owner's synthetic-only restriction. Whole-product RULA acceptance unchanged. Evidence:C:/NIVASafe/reports/evidence/report-chart-consistency-20261019-01.


## Scoped checkpoint rula-image-experience-20261019-01 — 2026-10-19 / 1405-07-27

INTENTIONALLY_REMOVED by owner: duplicate filenames, repeated verbose image status/support links and giant fallback block; REPLACED_EQUIVALENTLY by compact shared image cards, per-image editor and explicit versioned consent dialog. Existing support/manual/uncertainty/history retained.20 source/test files plus1 diagnostic probe; no source/route/feature/schema/asset/dependency removed.1092 tests,12 package checks,93/155 contract,29 release checks,16 component states,2 zero-provider report reopen browser cases,2 closed-manual browser journeys and2 public login viewports passed. Provider acceptance PARTIAL,10 attempts,3 final image successes,2 saved provider-derived assessments,failed full run preserved. Release release-rula-image-experience-20261019-01,PID8960,index 1d18d2d8266449731a5ff883705542adac5503db0ed65259b61d3294ee24bcf2. Backup C:/ProgramData/NIVASafe/backups/release-rula-image-experience-20261019-01; old/new/old operational and static rollback PASS. Privacy/vision gates remain empty; protected .env unchanged; no production records/migration/uploads touched. Whole-product/image acceptance remains BLOCKED. Evidence: C:/NIVASafe/reports/evidence/rula-image-experience-20261019-01.


## 2026-10-19 /1405-07-27 — Login Enamad size

release-login-enamad-size-20261019-01: only authentication.css changed. Official logo/link, fallback, alternative text, focus outline and image ratio preserved. Enamad outer box matches park36x36 or30x30 in short-mobile layout.435 tests/typecheck/lint/build, API contract/release verifier,8 candidate and8 public Chrome cases PASS. Verified backup/restore/swap rehearsal at C:/ProgramData/NIVASafe/backups/release-login-enamad-size-20261019-01/frontend; backend release-rula-image-experience-20261019-01 unchanged, no restart, database, model or privacy change. No required feature/route/asset removed. Evidence:C:/NIVASafe/reports/evidence/login-enamad-size-20261019-01.


## 2026-10-20 / 1405-07-28 — rula-account-consent-20261019-01

20 scoped source/test/style changes; existing source/routes/assets/schema/dependencies preserved. REPLACED_EQUIVALENTLY: per-upload consent dialog becomes optional explicit registration/account consent with durable server enforcement; image-present body panels restored. Legacy unused styles preserved byte-for-byte; active CSS verified.1102 tests/12 package checks,94/157 API contract,29 release checks, two synthetic ordinary organizations' final closed-platform UI/save/relogin/PDF, four genuine synthetic RIGHT/LEFT/BOTH calls with3 reviewed records,8 anonymous public Chrome cases, schema37tables/422columns and operational/static rollback PASS. Backend/frontend release-rula-account-consent-20261019-01,PID6608,index52a461c18eab7e44ea83dd7548597305714f32b1c4ce0b50acfdc6b9b712ff88. Backup C:/ProgramData/NIVASafe/backups/release-rula-account-consent-20261019-01. No production migration/data writes or image-gate activation. Platform authorization BLOCKED and anatomy NOT_VALIDATED; no full-product acceptance. Evidence:C:/NIVASafe/reports/evidence/rula-account-consent-20261019-01.


## 2026-10-20 / 1405-07-28 — rula-auto-banner-20261020-01

INTENTIONALLY_REMOVED: exact pending-analysis banner selected by owner. One product source fragment only; no new product copy/buttons/fields, CSS, scoring, auth, consent or backend edits. Remaining controls/fields match baseline at390/1280.438 frontend tests and4 package checks,94/157 contract,29 release gates,2 staged and2 public Chrome cases PASS. Frontend release-rula-auto-banner-20261020-01,indexfad6770ef134082073eca702f51ad77f86ce5087fe010ca8e89364798ce39f30; backend release-rula-account-consent-20261019-01/PID6608 unchanged. Backup607files and rollback PASS. Owner UI change-control rule persisted in AGENTS.md. Public image processing remains BLOCKED; no new provider calls, production data mutation or restart. Evidence:C:/NIVASafe/reports/evidence/rula-auto-banner-20261020-01.


## 2026-10-20 — local consent-gated RULA image troubleshooting

Local development only: the RULA landmark prompt now accepts clearly connected illustrated posture diagrams, treats the assessor-selected LEFT/RIGHT value as authoritative for single-side requests, and ignores instructions contained in image text. The compact landmark contract remains gated by `NODE_ENV !== production` and `RULA_LANDMARK_EXPERIMENT_V2=1`; no route, role, permission, schema, asset, or production provider setting was removed or weakened. Local policy returned `available: true`, `consentAccepted: true`, and `arvancloud`. Synthetic stick-figure RULA requests did not produce landmarks (one timeout and two `RULA_IMAGE_AI_QUALITY_REVIEW` results); no assessment scores were fabricated and no real worker photo was used. Backend tests 661/661 and frontend tests 447/447 passed; backend lint/typecheck/build, frontend build, and runtime smoke passed. Root Turbo checks were blocked before package tasks because its pnpm install aborted on `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`; all package node_modules directories remained present. Human-photo recognition and ergonomic accuracy remain unverified; production image gates were not changed.

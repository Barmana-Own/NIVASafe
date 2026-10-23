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


## RULA root repair 2026-10-21

- Source/backport: three runtime modules and image scheduler; active CSS and existing immutable assets preserved.
- Authentication, roles, quotas, tenant ownership, private images, model routing and schema preserved.
- Legacy per-image approval: REPLACED_EQUIVALENTLY by durable current account authorization, rechecked before each dispatch; account registration alone is insufficient.
- Final approval review is preserved, including nested side/image denial; drafts can persist provisional results.
- No protected page, API, database path or asset removed. No tests deleted to obtain a pass.
- Public platform privacy prerequisite remains BLOCKED and is not represented as a completed feature.


## RULA image notice checkpoint — 2026-10-22 / 1405-07-30

- INTENTIONALLY_REMOVED: explicitly requested inactive-image sentence and its duplicate English translations.
- PRESERVED: unsent photo state, genuine service errors, account-consent guidance, automatic image queue, auth/role/tenant/quota/provider dispatch guards.
- Source integrity: five frontend candidate files changed; 207 source files unchanged. No route, field, API, database path, required asset or test was removed.
- Deployment integrity: active global CSS, API process/release, protected environment and runtime configuration unchanged. Previous index retained for rollback.
- No public activation claimed: real platform processing approval remains pending.
- Evidence: reports/evidence/rula-image-notice-20261022-01/; technical checkpoint: docs/rula-image-notice-2026-10-22.md.


## Direct account consent release — 2026-10-22 / 1405-07-30

Safe code deployed as release-rula-direct-consent-20261022-01; full public image activation remains BLOCKED by actual gateway processing conditions and NIVASafe retention policy.43 scoped source files changed/added, zero removed;15runtime modules/149package source files match the tested frozen candidate. Existing FMEA/parser/schema/dependency versions, global CSS and secret .env are preserved. Legacy per-upload consent is REPLACED_EQUIVALENTLY by explicit current account consent and authenticated owner grants. Current API documentation replaces an obsolete upload-dialog contract with its prior contents retained under docs/history; prior roadmap retained as a dated history file.

715backend/471frontend tests, typecheck/lint/build,27HTTP/DB replay checks, fresh real synthetic BOTH +private result/save/PDF,3automatic +8consent +6public browser cases,14independent package checks and old/new/old recovery PASS.18compiled private test artifacts and test isolation configuration are intentional updates outside the executable production import graph; no test removed or weakened. All four task schemas have no active fixtures/reservations; owned test DB stopped and Production healthy. No owner approval per user/organization is required. Source hashes and final evidence: reports/evidence/rula-direct-consent-20261022-01/.

## Assessment image activation — 2026-10-22 / 1405-07-30

Owner-authorized operational activation is separate from unverified vendor processing guarantees. V3 consent expands the existing disclosure to RULA/FMEA; prior receipts and historical photo-owner grants remain preserved and revocable. No unrelated product page, field, button, layout, route, role, required asset or test was removed. No production mock was introduced.

Independent review verified73 compiled modules matching the frozen candidate, exactly7 changed runtime modules, no missing prior module,20 reachable static assets, unchanged schema/migration tree/private environment/dependencies/worker configuration, and preserved existing global CSS plus supplement. Private new release/backup directories are restricted to SYSTEM/Administrators. Historical releases and static assets remain available.

744backend/475frontend tests, TypeScript/lint/build,11 isolated real integration checks,5 executable-identity regression tests and live authenticated RULA/FMEA synthetic-image save/reopen/PDF checks passed. One transient live RULA failure required an explicit retry and remains documented; no automatic image transport replay was added. The version-label false positive was repaired by verifying actual PM2/OS/listener identity. Final API PID16632 executes release-assessment-image-activation-20261022-01. Only the two owner-authorized test drafts were updated during the browser test; unrelated user drafts were preserved. No release-blocking preservation regression was found. Evidence: reports/evidence/assessment-image-activation-20261022-01/.


## RULA local landmark checkpoint — 2026-10-22 / 1405-07-30

COMPLETE_SCOPED_REPAIR: rula-landmark-accuracy-20261022-01; acceptance covers landmark localization, image-frame projection and persistence only. Verified pre-fix sanitized archive backups/NIVASafe-before-landmark-fix-20261022-aee9d06.zip, SHA-256 b1581bf6a5b8fa5ab37e196ad18afc7bde4361688035738026c869b6e2ca4a00. This local backup is not evidence of a successful remote GitHub push. Existing working changes and historical checkpoints are preserved.

REPLACED_EQUIVALENTLY when explicitly enabled: generated RULA dots become native same-frame local pose evidence. Editable findings, auth/tenant/role/subscription/quota/current account and photo-owner consent, durable findings and external-transfer controls remain. Hidden/out-of-frame points are omitted, no neck is fabricated and no generated-point fallback follows local failure. One conditional RULA lightbox class and two scoped rules align image/overlay bounds. No required page, feature, route, role, schema, migration, asset, test or FMEA behavior was removed.

Frozen candidate passed793 backend and475 frontend tests, zero failed/pending, plus8 domain/backend/frontend build/type/lint checks;10 Python boundary tests passed. Independent focused54 TypeScript tests also passed (overlap with full suite). Actual dedicated offline Node-worker inference returned33 native points in11788ms with maximum delta0 against direct probe and no external provider call. Node22 isolated startup passed. Pinned model/worker/lock, protected runtime/model/release/backup ACL and exact executable outbound Block were verified.

Candidate/published source and worker/lock hashes match; exactly5 runtime modules changed or were added, none removed. Schema/migrations, Node manifests/lockfile, existing worker configuration/private environment and unrelated baseline artifacts are preserved. Existing global stylesheet and consent supplement remain; new scoped frame supplement/JS entry were added, old assets retained. Release release-rula-landmark-accuracy-20261022-01 deployed2026-10-22T18:17:29.495Z, actual PID13180/manager/OS/listener verified,4protected public401checks passed. First health timeout automatically restored previous release without data change; exact cause UNPROVEN, verified retry passed. Both outcomes retained.

Authenticated desktop landscape inline/lightbox image/SVG bounds match exactly;8 rendered points match durable analysis within1e-12. Test draftversion6saved/reopened same geometry, original user postureAnalysis hash unchanged, no final human approval performed. PDF71071/XLSX18066/DOCX7695bytes passed browser download structural/ZIP checks; user download concern resolved without edits. Independent final reviewPASS at2026-10-22T18:29:33.448Z. Mobileviewport andportrait actual-overlay visual checks NOT_RUN; clinical/population/pixel-perfect accuracy not certified.

Separate active issue: user subsequently reported first automatic image analysis can fail while manual retry succeeds. This separate reliability issue was subsequently resolved within the verified R2 first-upload scope in release-image-first-attempt-20261022-02; the point repair itself did not resolve it. No global project/all-image-processing completion is claimed. Evidence: reports/evidence/rula-landmark-accuracy-20261022-01/; aligned FA/EN scoped reports and release-manifest entry retained.


## Assessment image timeout checkpoint — 2026-10-22 / 1405-07-30

COMPLETE_SCOPED_REPAIR: image-first-attempt-20261022-01, current release release-image-first-attempt-20261022-02, deployed 2026-10-22T19:13:32.077Z, actual PID 4420/PM2/OS/listener verified. This acceptance covers approved assessment-image connection/replay/resource behavior and the two clean first-upload controls; the prior point-localization/frame/persistence repair remains preserved. No global project or universal provider/clinical success is claimed.

Reproduced TLS preconnect failures near10seconds led to image-only30second verified TLS, a four-connection/pipelining-one/60second maximum-idle singleton and at most three proven pre-HTTP attempts sharing120seconds. Fresh authorization before each, current consent/owner/role/tenant/quota/audit/model/redirect controls and no ambiguous/body/status/provider-timeout replay remain. Only ai-provider.js and image-analysis-diagnostics.js runtime modules changed; no prior module removed. Sole new dependency is exact privately copied Undici6.29.1; all other baseline dependency fields preserved.

Full R2 backend824tests, domain/backend build/type/lint and101productionNode22 provider/diagnostic tests passed. Independent130focused tests overlap. Independent preservation verified227candidate files,75compiled files,176private Undici files,242frontend source/700static files, schema/Python/model/offline-firewall/private environment/background-worker configuration and unchanged proxy/index. Frontend475prior passing tests are referenced without rerun; R2 performed no NGINX reload or migration. Private release/backup/Undici ACLs restrict SYSTEM/Administrators.

Actual RULA first upload39210ms and FMEA24967ms each used one upload/client request/authorization, zero failed requests and zero retries. RULA stored8native points before response; FMEA produced5validated image proposals with current consent, excluding text follow-ups. Assessment drafts were not saved and no final approval performed. Independent preservation and final review PASS_SCOPED; all twelve scoped stages pass.

V1 actual first-upload failure120051ms remains FAIL history, never reclassified. Its direct NGINX OpenEvent AccessDenied5 occurred before API switch; disk restoration/healthy unchanged old API were verified, then an existing verified SYSTEM task retry succeeded without permission/definition changes. The earlier point-release startup timeout retains its separate unproven cause. The rolling audit export refresh is transparently reconciled: new R2 snapshot preserved separately, historical28rows restored only after exact frozen SHA match, all21V1hashes now match and failed control evidence unchanged. All artifacts/reports and history retained under reports/evidence/image-first-attempt-20261022-01/.

## RULA connected overlay — 2026-10-22

Requested presentation change only: readable connectors between existing valid points. The frozen baseline inverse checks preserve the complete application outside one overlay block and two CSS rules. All 699 prior non-index static assets, three stylesheet links, API process/configuration, private environment and reverse proxy were preserved. No protected element was removed or disabled. Evidence: reports/evidence/rula-connected-overlay-20261022-01/preservation-review.json and final-review.json.


## Owner interface refinements — 2026-10-22

Four explicitly requested interface changes were deployed. The two RULA sections are INTENTIONALLY_HIDDEN_FRONTEND_ONLY at the owner's request; processing state, ownership and consent guards remain intact. Native/custom action fields reset only after confirmed creation of the submitted form, with assessment context and independent drafts preserved. The shared date control retains delayed autosave and native reset behavior. All action card information, filters, status editing, progress and all three register types remain available. All 715 previous non-index static files and four prior stylesheet links were preserved; API PID/configuration, environment and reverse proxy remained identical. Independent evidence: reports/evidence/owner-ui-refinements-20261022-01/final-review.json.


## Knowledge option cards — 2026-10-22

Owner-requested presentation changes affect only the seven existing knowledge creation option labels. No fields, hints, actions or native controls were removed, hidden or replaced. Five-card role-dependent forms retain their original controls. GeneralPages source and all JavaScript remain unchanged; all previous 731 non-index static files and 5 stylesheet links were retained, along with API process/configuration, private environment and reverse proxy. Only a scoped stylesheet and one index link were added. Evidence: reports/evidence/knowledge-options-polish-20261022-01/final-review.json.


## Files upload selection — 2026-10-22

Only the Files upload form gained the requested organization-image choice and reduced selection-box height. All existing local file types, optional reference, upload action, role permissions, report navigation, list, preview, download and delete capabilities remain. The shared organization picker and all backend/database/API contracts are unchanged. All 732 prior non-index assets and 6 stylesheet links were preserved; API identity, private configuration and reverse proxy remained unchanged. Final evidence: reports/evidence/files-organization-image-picker-20261022-01/final-review.json.


## Canonical organization-image reuse — 2026-10-22

Existing Attachment rows and stored objects are preserved. New assessment memberships use an additive association table; direct legacy memberships remain readable. No old duplicates were deleted or merged. Native uploads, image consent/analysis, report retrieval, role/tenant boundaries and UI design remain intact. All 749 prior non-index assets and 7 stylesheet links were preserved; unchanged route CSS was reused. The API executable/version was updated after a private database backup and the single reviewed migration; worker, private environment and reverse proxy were preserved. The unrelated historical fresh-install migration-chain failure is documented and left unchanged. Evidence: reports/evidence/organization-image-reuse-20261022-01/final-review.json.


## Compact final-report cards — 2026-10-22

Only scoped final-report layout rules were appended to the frontend stylesheet. All original report titles, type/project/code/date content, whole-card navigation, permissions, empty/loading/error states, uploader and organization-file controls remain intact. 765 previous non-index assets and seven existing stylesheet links are preserved byte-for-byte. JavaScript, API identity, backend/database, private environment and proxy were unchanged. Evidence: reports/evidence/final-report-cards-20261022-01/final-review.json.


## Checklist Add item button — 2026-10-22

Only the checklist template editor's direct secondary button receives new CSS. Existing text, plus icon, button type, row state logic, required toggles, removal guard, template save/publish actions, roles and routes remain intact. Existing Files report-card layout remains intact. 766 prior non-index assets and 8 stylesheet links were preserved byte-for-byte. JavaScript, API identity, backend/database, private environment and proxy were unchanged. Evidence: reports/evidence/checklist-add-button-20261022-01/final-review.json.


## Administrator ticket-management presentation — 2026-10-22

Only CSS under .app .support-administrator-page changed. Existing ticket text/IDs, search, four filters, pagination, refresh, status/priority/assignee edits, public replies, internal notes, conflict handling and permissions remain intact. No customer-support or shared AdminPanelPage styles changed. 767 prior non-index assets and 9 stylesheet links were retained byte-for-byte. JavaScript, API648 identity, backend/database, environment and proxy were unchanged. Evidence: reports/evidence/support-management-polish-20261022-01/final-review.json.


## Four-column member and pending-request cards — 2026-10-22

Only the two Members list/card subtrees receive new CSS. All identity text, usernames, emails, job titles, role/state/account-level badges, edit actions and pending request metadata remain intact. Tabpanel hidden states, the separate member-edit modal, request/invitation forms and global AdminPanel user/member cards are preserved. 768 prior non-index assets and 10 stylesheet links remain byte-identical. No JavaScript, API identity, authorization, backend/database, environment or proxy change. Evidence: reports/evidence/member-directory-cards-20261022-01/final-review.json.


## Duplicate admin support tab removal — 2026-10-22

INTENTIONALLY_REMOVED: owner-requested duplicate global AdminPanel support tab and embedded mounted inbox. Four exact source hunks remove its import, tab union member, tab item and panel. All remaining global-admin tabs/panels, organization-admin tabs, user and membership editors, AI controls, overview and every other page are preserved. The existing sidebar Ticket management entry, /support page, support APIs/data and customer support workflows remain intact. 769 prior non-index assets and all11 existing stylesheet links remain byte-identical. No backend, database, authorization, configuration, environment, proxy or API-process change. Evidence: reports/evidence/admin-support-dedup-20261022-01/final-review.json.


## Global administration three-column cards — 2026-10-22

Only list/card descendants in global-admin-panel-users and global-admin-panel-requests receive appended CSS. All user identity, roles, account/status/protected badges, organization chips, last-login metadata, Edit actions and request identity, role, organization, requester, date and approval/reject actions remain intact. Inline approval forms preserve conditional email/password/confirmation/cancel controls. Hidden tabpanels, the separate user editor, organization administration, Members, Files, Checklist, Support and AI/Overview are preserved. 785 prior non-index assets and 11 stylesheet links remain byte-identical. JavaScript entry, API/runtime, backend/database, environment, configuration and reverse proxy remain unchanged. Evidence: reports/evidence/admin-directory-cards-20261022-01/final-review.json.


## Temporary account image authorization UI hiding — 2026-10-22

INTENTIONALLY_HIDDEN: owner-requested account Permission to use my images section only. A single CSS selector under #image-processing-consent hides .posture-image-authorizations. Account image-processing consent, its checkbox/status/save/privacy copy, all component/API code, existing grants, server authorization and assessment use of received permissions remain intact. No grant was issued, revoked or deleted and no consent changed. All 786 prior non-index assets and 12 stylesheet links remain byte-identical; JavaScript/API process/environment/config/proxy/database are unchanged. Evidence: reports/evidence/hide-image-authorizations-20261022-01/final-review.json.


## Nested sidebar disclosures — 2026-10-22

REPLACED_EQUIVALENTLY: three existing nested static headings now contain native disclosure buttons. Their labels, heading IDs and every child remain; hidden inactive panels reopen on request. Initial active branch opens, individual toggles are independent, navigation opens the active branch, and desktop icon rail retains direct child destinations. Mobile uses disclosure behavior even with a stored collapsed desktop preference. Navigation tree, routes/query mapping, role filters, pending items, top-level headings and other navigation are byte-identical. All 787 old non-index assets and 13 stylesheet links remain intact. No API, authentication, authorization, backend, database, private configuration or proxy change. Evidence: reports/evidence/sidebar-disclosures-20261022-01/final-review.json.


## RULA photo/side values — 2026-10-22

REPLACED_EQUIVALENTLY: existing review display now exposes supported provisional suggestions independently from human confirmation. Each photograph and anatomical side retains independent observations and adjustment values through selection, late completions, manual edits, save/reopen and authoritative scoring. Camera-context response nesting is corrected with same-side validated compatibility. No existing page, route, field, control, label, asset, localization or stylesheet was removed or added. All 804 prior non-index assets and14 stylesheet links remain; all other source remains frozen. Optional JSON fields preserve historical payloads; database schema/migrations, real records, consent/tenant/subject authorization, proxy, private environment and worker/model configuration remain intact. No new production image inference was performed. Evidence: reports/evidence/rula-photo-side-values-20261022-01/final-review.json.


## AI assessment text connector — 2026-10-23

REPLACED_EQUIVALENTLY: only the approved Arvan assessment text transport now uses its own bounded certificate-verified connection pool. No page, control, route, contract, data path, permission, model, prompt, token budget, deadline or retry policy was removed. All 821 public files and private environment/proxy/image/chat/worker/model/schema/migration configuration are preserved. Independent evidence: reports/evidence/ai-text-connection-20261023-01/final-review.json.


## Corrective-action context reset — 2026-10-23

REPLACED_EQUIVALENTLY: successful submitted FMEA/RULA creation now resets its project/assessment/risk selectors. Failure, other-tab and newer changed remounted drafts, list filters, initial links and idempotency remain preserved. No JSX controls/text/styles, routes, API fields, backend, configuration or database path removed or added. All 820 prior non-index files and14stylesheet links are retained; API remains release-ai-text-connection-20261023-01. Evidence: reports/evidence/action-context-reset-20261023-01/final-review.json.


## Accessible-company cards — 2026-10-23

REPLACED_EQUIVALENTLY: only accessible-company rows become five desktop cards with responsive 4 / 3 / 2 / 1 columns. All company names, industry/employee metadata, statuses, Enter and administrator activation controls/handlers remain intact. Only scoped CSS and one link added; every original JS/CSS/static file, backend/API/auth/data path and protected configuration is preserved. Evidence: reports/evidence/company-directory-cards-20261023-01/final-review.json.


## Activity Log cards — 2026-10-23

REPLACED_EQUIVALENTLY: only registered-activity rows become four desktop cards with responsive 3 / 2 / 1 columns. Six fields, complete values, table header semantics, details expansion, search/filter/reset/retry and audit API boundaries are preserved. Only scoped CSS and one link are added; every original JavaScript, stylesheet, static file, backend/API/auth/data path and protected configuration remains intact. Evidence: reports/evidence/activity-log-cards-20261023-01/final-review.json.


## Assistant chat density — 2026-10-23

INTENTIONALLY_REMOVED_FROM_VIEW: only the header identity logo, as requested. REPLACED_EQUIVALENTLY: fixed-height composer becomes one-to-three-line autosizing; only user sent/pending bubbles receive compact spacing. All product DOM text/controls, assistant replies, history, draft storage, keyboard/send/API/auth boundaries remain intact. New module graph plus scoped CSS; all prior assets/stylesheets and protected backend/configuration/data preserved. Evidence: reports/evidence/assistant-chat-density-20261023-01/final-review.json.


## RULA cancellation button visibility — 2026-10-23

INTENTIONALLY_HIDDEN: two existing Cancel image analysis controls, explicitly requested by the owner. Styling retained for later restoration. All original DOM, cancellation/analysis/queue code, progress/error/retry/edit controls, JavaScript, APIs, authentication, data and protected configuration remain unchanged. Only one scoped CSS asset/link published. Evidence: reports/evidence/rula-cancel-hide-20261023-01/final-review.json.


## RULA review population — 2026-10-23

REPLACED_EQUIVALENTLY: only completed-AI waiting labels and the two table layouts, as explicitly requested. Original advisory proposals are displayed separately from audited/approved values; missing measurements are not fabricated. Existing consent, auth, tenant, data, final review gates, routes and prior assets preserved. Optional provenance has a prebuilt compatible rollback reader. Evidence: reports/evidence/rula-review-population-20261023-01/final-review.json.


## RULA group scores — 2026-10-23

REPLACED_EQUIVALENTLY: only the two requested group-score placeholders gain possible-score ranges when completed observations are partial. Complete exact values, every existing UI element, original observations, global score/approval, API/auth/data/styles/config and prior public/private assets are preserved. Evidence: reports/evidence/rula-group-scores-20261023-01/final-review.json.


## Desktop login branding — 2026-10-23

REPLACED_EQUIVALENTLY: desktop toolbar typography uses the two supplied original assets; mobile retains the prior icon. The existing form icon moves beside the welcome heading, and desktop header/footer marks and spacing become compact. INTENTIONALLY_REMOVED: only the desktop welcome instruction visibility and added park white frame, as requested. Mobile content/layout and all other pages, authentication handlers, APIs, data, private runtime, prior assets and nineteen prior stylesheets are preserved. Evidence: reports/evidence/login-desktop-branding-20261023-01/final-review.json.


## Mobile login branding — 2026-10-23

REPLACED_EQUIVALENTLY: only the mobile landing brand moves visually from the toolbar into its existing main area, with the original selected-locale typography below it. INTENTIONALLY_REMOVED: mobile landing toolbar-brand visibility only, as requested. The original hidden subtitle is retained. Desktop and mobile form layouts, original assets, all existing controls/content, authentication/API/data, private runtime and twenty prior stylesheets are preserved. Short landscape content remains reachable through vertical scrolling. Evidence: reports/evidence/login-mobile-branding-20261023-01/final-review.json.


## Login white typography — 2026-10-23

INTENTIONALLY_REPLACED: only dark-theme desktop/mobile typography source and former whitening filter, using the owner supplied original FA/EN PNGs. Blue assets retained for light theme; icons, layout constraints, controls, auth/API/data, all 21 prior stylesheets, all old public/private files and configuration preserved. Existing asset source contract updated without deleting tests. Evidence: reports/evidence/login-white-typography-20261023-01/final-review.json.

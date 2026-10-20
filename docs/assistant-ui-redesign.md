# Assistant UI replacement from supplied design

## Scope

Implemented the supplied `NIVASafe-UI-Desktop-Mobile.zip` visual reference in the existing `/assistant` page. Archive HTML/CSS were treated as design data; archive scripts or instructions were not installed or executed. CSS is scoped to `.assistant-page.assistant-redesign` to preserve other pages.

## Preservation baseline and result

| Protected behavior | Final result |
| --- | --- |
| `/assistant` route and existing navigation shell | PRESERVED |
| Authenticated organization-scoped conversation/message APIs | PRESERVED; no backend changes |
| Conversation titles, dates, message roles, provider labels and knowledge citations | PRESERVED |
| Existing autosave storage keys/form and failure prompt restoration | PRESERVED |
| Sending/loading, duplicate submission guard, provider/fallback status | PRESERVED |
| Message validation and 32,000 character API limit | PRESERVED; visual example's 4,000 limit does not replace the real contract |
| Previous visual layout | REPLACED_EQUIVALENTLY, explicitly requested by user |
| Production secrets, database/schema, permissions, other pages | UNCHANGED by this task |

## UI implementation

- Reference navy/amber palette, shield identity, three starting prompts, responsive composer and conversation cards.
- Search filters actual loaded conversation titles; empty and retry states use existing API results.
- Mobile history is a full view matching the reference, with return control, Escape handling and focus restoration.
- Desktop Enter submits, Shift+Enter inserts a new line; IME composition cannot inadvertently submit. Mobile Enter remains a line break.
- Connection check refreshes existing provider metadata. It does not fabricate proof of a successful external model inference.
- Transient duplicate display of a just-received response is prevented while history refreshes.
- Global label/button styling conflicts discovered during QA were resolved through scoped selectors.

## Verification

| Check | Status and evidence |
| --- | --- |
| Frontend automated tests | PASS: 206 tests, 31 files |
| Production workspace build | PASS: all 3 packages; final frontend build also PASS |
| Workspace lint/typecheck | PASS |
| Browser QA | PASS: 1440, 1024, 390, 320 widths; prompts, desktop Enter/mobile submit, response rendering, history search/selection, citations, mobile Escape |
| Horizontal overflow / runtime errors | PASS: none in four tested cases |
| Security review | PASS for changed scope: React escapes text; existing auth/org/API boundaries retained; no unsafe HTML, imported ZIP scripts, new dependencies, secrets or configuration changes |
| Regression review | PASS for baseline above; stale visual assertions updated to equivalent new layout/accessibility checks |
| Live frontend/API/database | PASS: HTTP 200, database up, published JS/CSS hashes match release |
| Actual provider inference with production data | NOT_RUN; synthetic fixtures only |

Build retains its existing non-blocking warning for a main JS chunk over 500 kB.

Evidence is under `C:/NIVASafe/backups/assistant-design-*.log`, `assistant-design-browser-evidence.json`, `assistant-{design,conversation}-*.png`, and `assistant-history-mobile.png`.

## Release

Frontend-only release on 2026-10-09, PWA cache v29. Existing backend/process manager/database remain active. Rollback frontend snapshot: `C:/NIVASafe/backups/release-assistant-design-20261009-125503/frontend`. Live asset/health evidence: `C:/NIVASafe/backups/rula-image-layout-evidence.json`.
## Search and composer cleanup — 2026-10-09

Removed the requested composer disclaimer, autosave success text and keyboard shortcut hint from the assistant UI. Automatic draft persistence and keyboard behavior remain active. Autosave errors remain visible; other forms retain the default status UI. The composer now ends within 16px of the chat panel bottom.

The search input has one containing border with a plain native input, no inner border/radius/shadow, and a visible focus-within style. An assistant-specific input ID resolves the inherited production theme selector conflict without changing other inputs.

Validation: browser assertions passed at 1440/1024/390/320 pixels for zero search input border, absent requested composer text, bottom gap <=16px, no horizontal page overflow, prompt selection, send, history search and mobile Escape. Frontend tests: 206 PASS. Existing autosave, authentication, APIs, organization boundaries, credentials and database configuration are preserved. Security review: only local presentation/state props changed; no new trust boundaries or unsafe HTML.

Evidence: `C:/NIVASafe/backups/check-assistant-cleanup.cjs`, `assistant-cleanup-*.log`, and updated assistant screenshots.
## Compact composer and system blue — 2026-10-09

The message textarea now has one visible line (28px, rows=1) and the send button shares the same 62px composer row. Multiline content remains supported through scrolling and Shift+Enter; the 32,000-character limit, desktop Enter behavior, mobile send, automatic drafts, loading states and conversation APIs remain unchanged. Send keeps a 44px touch target.

The new conversation button, assistant identity badge, risk prompt card and send button now use #143759, matching the application's dark blue topbar/menu palette. Focus uses the application's --blue token and amber accents use --amber. No other product section was removed or redesigned.

Validation: 206 frontend tests PASS, production build PASS, lint/typecheck PASS (existing bundle-size warning remains). Browser assertions at 1440/1024/390/320px confirmed a 28px input, 62px composer, matching rgb(20,55,89) backgrounds, no horizontal overflow or page errors, and successful prompt selection/send/history/search/mobile Escape. Visual screenshots were inspected. Scoped security review: presentation and rows only; React escaping, auth, organization scope, request payloads and APIs are preserved.

Frontend release: PWA v33. Rollback: C:/NIVASafe/backups/release-assistant-compact-blue-20261009-132718/frontend. Local/public frontend/API health is HTTP 200, MySQL is up and published asset hashes match the build. Browser evidence: C:/NIVASafe/backups/assistant-compact-blue-evidence.json. Regression runner: scripts/check-assistant-compact-blue.cjs. No backend restart or database migration was needed.

## Requested model name in header
Replaced the desktop/mobile connection status and manual check control with the user-requested English display label DeepSeek 4 Flash. This is a presentation label, not a provider configuration change. Removed the unused provider-status fetch and derived display state from this page; chat provider selection remains server-side. Preserved send validation, error reporting, message history, drafts and tenant/auth boundaries. Mobile label occupies its own header line to avoid overlap at narrow widths.

Verification: 211 tests passed; build and lint/typecheck passed. Edge browser verified the label and absent old controls at 1440/768/390/320px with no page overflow/errors. Existing send/history/search/mobile navigation and single-line composer suite passed at 1440/1024/390/320px using synthetic API fixtures. Scoped security review: plain escaped static display text; no change to credentials, authorization, APIs or actual model configuration. Existing bundle-size warning remains. Physical-device and production authenticated chat submission NOT_RUN.

Model-label release finalized with PWA v37. Narrow mobile layout visually verified. Public HTTP 200 health/login, MySQL up, matching deployed asset hashes and unchanged backend provider verified.

## Message and branding presentation correction
Removed the requested model display label from desktop/mobile headers. Replaced the shield with the existing system /icon-64.png logo in the header and welcome state. Messages now use restrained pale-blue outgoing and white incoming surfaces, consistent inner/outer spacing, no outer/bubble shadows, and neutral readable text. Both sent and received messages render date/time from their existing persisted createdAt timestamps using semantic time/dateTime; provider names no longer replace received-message timestamps. Pending requests retain their loading labels rather than fabricating persisted timestamps. Citations, errors, drafts, keyboard sending, history, actual provider routing and backend timestamp persistence are unchanged.

Validation: 212 tests PASS; build/lint/typecheck PASS, existing bundle warning remains. Edge at 320/390/768/1440 verified absent model name, loaded system logo, both message timestamps/dateTime values, no provider footer, zero shadows, margins >=12px, no overflow/errors, send/reply and all four resulting timestamps using synthetic API fixtures. Existing composer/send/history/search/mobile navigation regression suite PASS. Visual screenshot reviewed at 390px. Scoped security review: messages/citations remain React escaped text; logo is existing local static asset, no remote image loading, new HTML rendering, credentials, auth, API or persistence changes. Production authenticated submissions and physical-device tests NOT_RUN.

Message redesign released frontend-only with PWA v43. Public login/API health HTTP 200, MySQL up and matching deployed JS/CSS verified. Backend unchanged.

# Unified mobile assessment details

## Requested behavior
Mobile RULA corrective suggestions and final FMEA risk details now use the same `rm-detail` visual system as RULA evaluation rows: full viewport, fixed header, scrollable card body, metric tiles, status fields, fixed footer and previous/next navigation. The redundant upper corrective-suggestions heading is hidden on mobile. Desktop headings and dialogs remain unchanged.

## Data and operations preservation
- Suggestions retain factor, body side, reduction, priority, full title/description and saved status. The footer contains only the add-to-RULA action and navigation. Saved suggestions cannot be added twice; existing desktop deselection and assessment row operations remain available.
- FMEA retains process, failure mode, effect, cause, preventive/detection controls, S/O/D/RPN, risk level, recommendation and linked action statuses/priorities. Authorized edit/completion/deletion use existing handlers and safety dialogs. Existing read-only behavior is preserved.
- All dynamic content uses React escaping. Dialogs restore body scrolling/focus on close, support Escape, trap keyboard focus, close on desktop resize and reset content scroll when switching rows.

## Verification and repair evidence
- 212 tests / 33 files PASS; frontend lint/typecheck and build PASS. Existing bundle-size advisory remains.
- `scripts/check-compact-mobile-rows.cjs`: PASS at 320/390/430/768/1440px; full viewport, fixed header/footer, full details, single add action, duplicate prevention, FMEA operations, search, pagination and desktop rendering.
- `scripts/check-mobile-detail-navigation.cjs`: PASS heading deduplication, retained desktop heading, both row navigators, keyboard focus and Escape.
- `scripts/check-rula-mobile-connected.cjs`: PASS real component/synthetic API data parity, edits, failure recovery, completion/reopen/delete/undo and refresh/desktop sync; zero AI requests.
- Visual QA found missing flex layout on the native dialog; corrected before release. Keyboard QA found focus escape at the last button; explicit focus cycling repaired and reverified. The synthetic FMEA fixture used object identity for navigation; corrected to stable IDs, matching production.
- Security/regression review: existing auth and API boundaries, server validation, escaped text and operation confirmations preserved. No new endpoint, dependency or database change; no production-record mutation in testing.
- Frontend release PWA v46, with rollback backup and public asset hash verification recorded in project-state.json.

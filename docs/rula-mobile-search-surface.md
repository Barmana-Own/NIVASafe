# RULA mobile search surface repair

## Root cause and change
The shared form selector has greater specificity than the mobile search rules. It applied a 48px minimum height, rounded corners, white background and internal padding to the search input inside its 44px label. The input overflowed its parent and created a second visible surface.

Scoped mobile search overrides now preserve a 42px transparent, borderless input inside the 44px label. The icon remains inside the left edge. The label receives the visible focus outline; the input cannot create a second focus surface. Desktop forms, filters, data and API calls are unchanged.

## Evidence
- `scripts/check-rula-search-style.cjs`: PASS at 320/390/430/768px for default, hover, focus and typed states; input bounds, transparent background, zero inner border/radius/shadow, icon location, focus outline, filtering and no horizontal overflow.
- `scripts/check-rula-mobile-connected.cjs`: PASS all 23 rows, data parity, pagination, edits, completion/reopen, failed save/delete recovery, delete/undo, refresh and desktop sync. Zero AI requests.
- Frontend: 212 tests/33 files PASS; lint/typecheck and production build PASS. Existing bundle-size advisory remains.
- Security and preservation review: CSS-only search change; labels, keyboard focus, React escaping, authorization and backend contracts preserved. No production data mutations or new dependencies.
- Frontend cache version v45; deployment backup and public asset verification recorded in project-state.json.

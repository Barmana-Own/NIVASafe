# Notification feed card layout

Gregorian date: 2026-10-23

Jalali date: 1405-08-01

## Scope

The full notification page now displays four cards per row at desktop widths of 1280 pixels and above. It uses three columns from 1024 pixels, two from 640 pixels and one on smaller screens, following the existing activity-card breakpoints. Each card retains its icon, complete title, unread badge, message, timestamp, safe detail link and mark-as-read button. Long content wraps without truncation or horizontal page overflow. Card order follows the current language direction.

The production change is limited to scoped notification-list CSS in styles.css. Notification preferences, header popovers, read state, counters, event synchronization, API requests, authorization, links, persistence and other screens keep their existing implementation. No production component, route, translation, dependency, database schema or backend code is changed.

## Verification

- PASS: 557 frontend tests across 78 files, with zero failed or skipped tests.
- PASS: frontend typecheck and lint, which both use tsc -b --noEmit.
- PASS: production frontend build; the existing large-bundle warning remains.
- PASS: 24 local Edge Chromium scenarios covering Persian/English, light/dark themes and viewport widths 320, 390, 768, 1024, 1280 and 1920, including desktop sidebar space.
- PASS: expected column counts, RTL/LTR order, preserved text and timestamps, long identifiers and messages, no content clipping or horizontal overflow, and existing design-token button dimensions.
- PASS: keyboard activation of individual read controls, read-all, preference updates, unread indicators, safe internal links, escaped text, empty state, recoverable error state and retry.
- PASS: zero page errors, unexpected requests or real API calls. All 195 API calls used the local synthetic boundary.
- PASS: test-only fixture markers are absent from production JS.
- PASS: scoped security/regression review; all 1309 baseline files remain present and unrelated source/state is preserved.

The browser harness initially assumed a synchronously updated preference checkbox and a fixed 40-pixel icon button. The existing preference control updates after its API response, and desktop buttons use a 36-pixel design token. The harness now awaits the actual updated state and verifies the existing token dimensions. No production behavior was changed to satisfy these checks.

## Reproduction and delivery

Start Vite on 127.0.0.1:5189 with CI=true and VITE_API_URL=http://127.0.0.1:5189/api/v1, then run node scripts/check-notification-cards.mjs. Every API call is intercepted locally; unexpected external requests are blocked. Results and screenshots are stored under the ignored .local/notification-cards-20261023-01 directory.

GitHub delivery targets Barmana-Own/NIVASafe, branch main, with local/remote commit verification. Production deployment and live database verification: NOT_PERFORMED for this CSS-change and GitHub-push request.

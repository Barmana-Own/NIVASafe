# Assistant message composer refinement

Gregorian date: 2026-10-23

Jalali date: 1405-08-01

## Scope

The existing message placeholder is centered horizontally and vertically within the textarea. Typed content retains its original reading alignment and direction. The visible “Your message” label is hidden with the existing screen-reader utility; its translated accessible name remains associated with the textbox. The existing character counter retains its position.

Only the composer scrollbar is hidden, with standard scrollbar-width and the WebKit scrollbar pseudo-element. The existing resize function still grows the textarea through three lines and enables overflow scrolling for longer text. Mouse-wheel scrolling, keyboard navigation, Shift+Enter, Send, reset and autosave behavior are preserved. No hint, message or visible control is added. Other scrollbars, chat history, message bubbles, API contracts, authentication, persistence, dependencies and unrelated screens are unchanged.

## Validation

- PASS: all 557 frontend tests in 78 files, with no failures or skipped tests.
- PASS: frontend TypeScript checking and lint (both package scripts use tsc -b --noEmit).
- PASS: production frontend build with the existing large-bundle warning.
- PASS: 16 Edge Chromium scenarios covering Persian/English, light/dark themes and widths 320, 390, 768 and 1440.
- PASS: accessible textbox name, hidden label geometry, placeholder centering, original typing direction/alignment, one-to-three-line growth, hidden scrollbar styling, actual wheel scrolling in both directions, keyboard navigation, Shift+Enter, sending and reset.
- PASS: zero browser page errors, unexpected requests or real API requests. All 96 API calls were fulfilled locally with synthetic data.
- PASS: scoped security and regression review; no new executable rendering sink, credentials, API operation, permission, dependency or data path. Existing project files are preserved.
- PASS: synthetic composer fixture is excluded from production assets.

The initial browser assertion assumed that Control+Home produces a zero-pixel scroll offset. Native caret positioning retains font-leading offsets while displaying the first line. The harness now checks that the caret reaches the beginning, the first line is visible, and actual wheel scrolling reaches the top. Production code did not require a change for this browser behavior.

## Reproduction and delivery

Run Vite on 127.0.0.1:5189 with CI=true and VITE_API_URL=http://127.0.0.1:5189/api/v1, then run node scripts/check-assistant-composer.mjs. The browser harness intercepts every API call and blocks unexpected external requests. Results and screenshots are written to the ignored .local/assistant-composer-polish-20261023-01 directory.

GitHub delivery targets Barmana-Own/NIVASafe, branch main. Publication is verified by comparing the remote branch SHA with the local commit. Production deployment: NOT_PERFORMED for this source-change and GitHub-push request.

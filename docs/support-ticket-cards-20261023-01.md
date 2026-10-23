# Support ticket cards and selected details

Gregorian date: 2026-10-23

Jalali date: 1405-08-01

## Design and scope

The support inbox and customer request history now use compact summary cards. Desktop layouts display four cards per row from 1280 pixels, three from 1024 pixels, two from 640 pixels and one on smaller screens. Existing typography, theme tokens, status indicators and translated action labels are retained. Long subjects wrap without truncation.

The existing view-and-continue button selects a ticket. Its card expands across the full row, with an accent border, to show the ticket reference, original description and conversation. Administrative status, priority and assignee fields become available with that selected ticket. The existing close action restores the summary. No new visible control, label, translation or unrelated section is introduced. Disclosure buttons retain their expanded state and are associated with the ticket heading for assistive technology.

The UI UX Designer guidance was applied to hierarchy, card anatomy, keyboard-accessible disclosure, responsive columns, theme reuse and deliberate loading/error states. Inline expansion preserves the existing URL selection and thread components. Browser Back restores the previous selection, and switching cards preserves unsent reply and internal-note drafts. Conversation details continue to load only after selection. Deep links to tickets outside the current page remain supported.

Customer and administrator capabilities remain separate. Public replies, administrative internal notes, assignment, permitted status transitions, optimistic concurrency fields, idempotency keys, filters, pagination and request creation retain their existing API implementation. No backend, database, authentication, authorization, dependency or unrelated page is changed.

## Verification

- PASS: all 557 frontend tests across 78 files; no failures or skipped tests.
- PASS: frontend typecheck/lint (both scripts use tsc -b --noEmit) and production build. The existing large-bundle warning remains.
- PASS: 32 local Edge Chromium scenarios: 24 administrator scenarios across widths 320/390/768/1024/1280/1920 and eight customer scenarios at 390/1440; both languages and themes were covered.
- PASS: collapsed cards exclude descriptions, full identifiers, chat and management forms; no conversation detail request occurs before selection.
- PASS: keyboard selection, single active ticket, full-row expansion, closing, URL selection, Back navigation, deep-linked tickets outside the current page, preserved reply/note drafts, public replies, internal notes and priority updates.
- PASS: customer conversations exclude internal notes and administrative forms; untrusted message markup remains escaped.
- PASS: detail-load failure, retry, all column counts, RTL/LTR ordering, long subjects and absence of horizontal page overflow.
- PASS: zero page errors, unexpected requests or real API calls. All 382 API calls were intercepted with local synthetic responses.
- PASS: synthetic fixture markers are excluded from production JS.
- PASS: scoped security/integrity review; all 1313 baseline files and unrelated project state are preserved, and existing transport/permission boundaries are unchanged.

The first browser run used an incorrect Persian label for the existing high-priority option. The harness was corrected to the actual translated label, and the entire browser matrix passed. No production translation was changed.

## Reproduction and delivery

Start Vite on 127.0.0.1:5189 with CI=true and VITE_API_URL=http://127.0.0.1:5189/api/v1, then run node scripts/check-support-ticket-cards.mjs. Requests use synthetic local fixtures; unexpected external traffic is blocked. Results and screenshots are stored under the ignored .local/support-ticket-cards-20261023-01 directory.

GitHub delivery targets Barmana-Own/NIVASafe, branch main, with local/remote commit verification. Actual production deployment and live database verification: NOT_PERFORMED for this frontend-change and GitHub-push request.

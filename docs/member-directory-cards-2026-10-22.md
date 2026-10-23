# Four-column organization member and pending-request cards

## Owner scope and design

The owner requested the organization member and pending approval lists to use compact cards with four per desktop row and responsive wrapping. The implementation appends only CSS under .app .members-workspace and the existing members/requests panel IDs. It uses width-aware CSS Grid with a220px minimum and four-column cap; sparse lists retain the four-column desktop track sizing rather than stretching a single record across the page. Smaller widths reduce to three, two or one column.

Member cards show the same avatar, full name, username/email/job title, wrapped role/state/account-level badges and original Edit action. Pending request cards retain name, username/email, role/date and pending status in a vertical hierarchy. Plain identity wrappers use display:contents only for presentation; original DOM content and order remain intact. No new fields, copy, buttons, users or requests were introduced. No text is clamped or hidden and no fixed card height is imposed.

## Preservation

The MembersPage implementation and all handlers remain unchanged. Native hidden tabpanels are not restyled. The member editor is a separate modal outside the scoped list selectors. Request/invitation forms, modal/focus behavior, roles and server authorization remain unchanged. Shared AdminPanelPage cards are outside .members-workspace; unrelated dirty root AccountPages/AdminPanelPage changes were excluded by using the protected support-management-polish baseline. Only a new immutable CSS asset and one reversible index link were published.

## Executed verification

- Shared-domain build, frontend typecheck/lint, frontend compilation and production build: PASS.
- 16 isolated browser checks: PASS, covering four-column desktop capacity, multiple rows, sparse3-member/1-request lists, smaller widths, mobile320/390, RTL/LTR, white/blue themes, full identity/metadata, tabs, edit modal focus and unchanged form presentation. Existing member-edit behavior is exercised only with synthetic intercepted API data; no real account or access permission was changed.
- Support, Files and Checklist presentation remains intact; source/scoped selector checks preserve shared admin cards.
- Independent scoped security/helper/source-preservation review and deployed final gate: PASS. Existing assets, stylesheet links, JavaScript entry, API/runtime, environment and proxy remain unchanged.
- Live acceptance: read-only verification of actual members and pending requests, full text/order/edit actions, correct tab visibility and four-column tracks. No account edit, invitation, request submission or other production mutation.
- Unit/backend/dependency audits: NOT_RUN because this presentation-only change does not alter their inputs or behavior. No repository-wide security or clean-install readiness claim is made.

## Deployment and recovery

Release: release-member-directory-cards-20261022-01. Immutable CSS: /assets/member-directory-cards-df0c79453743.css. All 768 prior non-index assets and 10 old stylesheet links were preserved. The protected index transformation and its rollback bytes are hash-verified. Restore the prior index to undo presentation while retaining immutable assets. Evidence: reports/evidence/member-directory-cards-20261022-01/.

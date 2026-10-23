# Nested sidebar disclosure buttons

## Requested behavior

The owner requested the existing New assessment, Registered assessments and Workplace exposure measurements subsection headings to become buttons that expand/collapse their existing children underneath them. Top-level section headings and all destinations/content remain unchanged.

Each nested heading retains its h3 and now contains a native type=button control with aria-expanded and a stable aria-controls target. Hidden panels retain their original child DOM but remove those children from visibility and keyboard traversal. Each subsection has independent local state. Active descendants open initially and on pathname/search changes; users may close an active subsection until the next navigation. Effects depend on stable primitive values, not a recreated navigation Set.

The desktop icon rail retains its original direct child icons/destinations with headings hidden. AppLayout passes its effective desktop collapsed state, excluding mobile viewports, so a stored rail preference does not force mobile disclosure panels open. The existing mobile drawer, focus trap, Escape, leaf-navigation closing and sidebar preference behavior remain intact. Existing design tokens provide44px controls, full wrapping labels, visible focus, RTL/LTR chevrons and reduced-motion support.

## Preservation

Production changes are limited to SidebarNavigation.tsx, one AppLayout collapsed-prop hunk and an appended CSS supplement. Existing SidebarNavigation tests are updated from the superseded static/no-button contract while retaining href, role-denial, pending-content and active-route assertions. The navigation tree/routes/role filtering, page content, APIs, backend and database remain unchanged. The candidate is derived from the verified hide-image-authorizations baseline, preserving unrelated root work.

## Verification

- Navigation/sidebar and assessment-method unit suites: PASS.
- Shared-domain build, frontend typecheck/lint, TypeScript compilation and production build: PASS.
- 16 isolated browser scenarios: PASS, covering independent toggles, mouse/Enter/Space, active/new/saved/query/deep-link/history behavior, hidden child focus exclusion, mobile drawer and desktop rail behavior, responsive RTL/LTR/themes, role and pending-entry preservation and previously delivered page presentation. All data and API responses are synthetic; production writes are blocked.
- Scoped independent source/helper/security/preservation review and live read-only acceptance: PASS. No real assessment, account, consent or permission mutation was performed.
- Backend and full-repository source-contract suites: NOT_RUN because backend inputs are unchanged and the frozen frontend-only candidate excludes backend fixtures. No whole-project clean-install/security certification is claimed.

## Release and rollback

Release: release-sidebar-disclosures-20261022-01. Script: /assets/index-xrsVqMuw.js. CSS: /assets/sidebar-disclosures-f492e827441f.css. Only the validated immutable JavaScript graph and CSS supplement are published; all 787 previous non-index assets and 13 old stylesheet links remain byte-identical. The index changes only its script URL and one stylesheet link, with a verified exact inverse. Restore C:/NIVASafe/.local/sidebar-disclosures-20261022-01/index.before.html to revert this UI while retaining immutable assets. API process/version, environment/configuration, reverse proxy and database stay unchanged. Evidence: reports/evidence/sidebar-disclosures-20261022-01/.

## QA assertion correction

The initial browser attempt used an overly exact literal zero-duration check for reduced motion. Existing global reduced-motion CSS computes a negligible 0.00001-second duration. The isolated helper now verifies a maximum duration of 0.001 seconds, preserving the reduced-motion requirement and all functional assertions. No application source or CSS was changed for this test correction. Initial failure evidence is retained and the full browser matrix was rerun.

The finalization hash guard rejected the initial final-review binding after an additional readable production screenshot was added. No metadata completion write occurred. The original gate artifacts were preserved as revisions, all three screenshots and the refreshed live-evidence hash were independently verified, and the final gate was renewed before completion. No application or runtime change was required.

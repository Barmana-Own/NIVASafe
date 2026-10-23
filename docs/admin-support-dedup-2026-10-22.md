# Duplicate admin support integration removal

## Requested scope

The owner requested Support requests to be removed from the global administration panel because the existing Ticket management sidebar route is sufficient. Only the four integration hunks in AdminPanelPage.tsx change production source. Dedicated SupportPage, its sidebar link and deep links, translations, APIs, authorization and persistence remain unchanged. No new product UI or copy is added.

The removed inbox previously mounted even while its hidden tab was inactive, causing redundant support-request and support-staff API loads on /admin. Removing the component integration also removes those unnecessary loads. Global administration retains Users, Membership requests, AI and Overview. Organization administration retains its two original tabs.

## Implementation and preservation

The candidate comes from the hash-verified latest member-directory-cards frozen baseline. Unpublished root changes were excluded from publication; root AdminPanel receives only the same exact four hunks, with all unrelated bytes preserved. One regression test file is added. No styles, dependencies, backend source, schema or migrations change.

The new validated JavaScript graph is published as immutable assets; the live index transformation replaces its single script URL only. All11 production stylesheet links and 769 previous non-index assets remain intact. The rollback index is hash-bound to the previous release.

## Executed verification

-25 focused SSR/model tests pass: four global administration tabs/panels in Persian and English, unchanged organization administration, role-specific standalone support, support model behavior.
- Shared domain build, frontend typecheck/lint, TypeScript compilation and Vite production build: PASS.
-14 isolated browser scenarios pass: desktop/mobile, RTL/LTR, white/blue themes, four-tab keyboard navigation, correct active/hidden panels, absence of admin inbox fetches, sidebar navigation to standalone support, synthetic thread/reply flow, unchanged organization admin and unchanged Members/Files/Checklist fingerprints. All API fixtures are synthetic and all external/production writes are blocked.
- Scoped independent source/helper/security/preservation review: PASS. No changed trust boundary, auth rule, raw HTML sink or secret/dependency addition.
- Production read-only acceptance: PASS; four administration tabs and retained sidebar support page verified against the published script and existing styles. No account or ticket mutation was performed.
- Backend tests and database migration checks: NOT_RUN because their source/config/runtime are unchanged. Full frontend source-contract suite: NOT_RUN because this frozen frontend-only candidate excludes backend fixtures; focused relevant suites and browser flows were executed. No whole-repository or clean-install readiness claim is made.

## Deployment and rollback

Release:release-admin-support-dedup-20261022-01. Entry:/assets/index-Ck0FGPpZ.js. Previous index backup:C:/NIVASafe/.local/admin-support-dedup-20261022-01/index.before.html. Restore that verified index to revert this UI change while retaining immutable assets. API process/version, environment, config, reverse proxy and database remain unchanged. Evidence: reports/evidence/admin-support-dedup-20261022-01/.

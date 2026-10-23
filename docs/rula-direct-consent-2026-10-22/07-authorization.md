# Authorization verification

Date: 2026-10-22 / 1405-07-30.

## Implemented boundaries

- Existing JWT authentication and active-user checks remain. Organization routes retain current membership/role/subscription policies and the existing system administrator authority; no new role or tenant bypass was introduced.
- A dedicated active-account authenticator permits only the caller's global consent settings to remain reachable after organization membership changes. It grants no organization resource access.
- Image analysis requires `assessments.create`, the server-selected organization, current user AI access/quota and current V2 account consent. Direct API callers cannot substitute an upload consent boolean or choose another consent actor.
- Photo-owner grants require an authenticated owner and active owner/recipient membership in the same organization. The recipient must have assessment permission. Grants expire, are owner-revocable and bind the original owner's consent record; withdrawal followed by reacceptance does not revive them.
- Result lookup uses the original actor AND organization. Generic AI routes and queue processing cannot expose/replay private image results.
- Account updates are serialized with an existing user-row transaction lock and a monotonically increasing audit time. Every outbound image attempt checks current authorization after the mandatory transfer audit and again on any malformed-answer retry.

## Evidence and verdict

PASS for this change's authorization scope. The Stage06 authenticated HTTP replay completed 27 checks with two independent ordinary `USER` organizations, a separate owner and forbidden actors. It verifies omitted/forged/old consent, unknown/wrong-recipient/wrong-organization/revoked owner grant, post-withdrawal/reacceptance behavior, viewer/anonymous denial, quota and private result exclusion. Focused server regression tests also cover mid-request withdrawal during quota/audit and direct provider calls missing the mandatory hook.

Evidence: `reports/evidence/rula-direct-consent-20261022-01/stage06-replay-bb1f67d01451/result.json`, `stage05-candidate-focused-final.json`, and `stage05-candidate-full-restored-context.json`.

No biometric identity verification is claimed. A user's `SELF` declaration is an ownership declaration, and authenticated owner grants do not prove the authenticity of a photograph. The platform processing-terms prerequisite remains separate from these user permissions.

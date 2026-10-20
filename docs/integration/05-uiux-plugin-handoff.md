# NIVASafe UI UX Designer handoff

## Integration checkpoint

The redesigned frontend is integrated with the original full-stack workspace and its existing contracts. Public login and registration screens were reviewed in Chrome at desktop and mobile sizes. Persian RTL, English LTR, blue/dark theme and white theme were observed. Current screenshots are in `docs/integration/evidence/`.

## Follow-up visual validation

The earlier table screenshots show dense text and controls on FMEA/RULA reports and administration screens. Those routes are protected and could not be opened with real data in this task. In the separate UI UX task, validate these routes with a disposable authorized test session:

- `/fmea/:id/report` and its detailed risk/action tables.
- `/rula/:id/report`, including posture factors, corrective actions and bilateral details.
- `/admin`, including global users, organization memberships, AI usage and focused editor dialogs.

Check 390×844, 768×1024, 1024×768 and 1366×900 in both FA RTL and EN LTR, and in both blue/dark and white themes. Keep all text and data available. Wrap long labels, use responsive row/card labels where comparison does not require a conventional grid, and keep justified dense-table scrolling inside its own region. Do not shrink text until it is hard to read or clip overflowing content to create the appearance of a fit.

## Existing design system to reuse

- **Tokens:** `frontend/src/styles/tokens.css` (`--color-canvas`, `--color-surface`, `--color-raised`, `--color-ink`, `--color-secondary`, border, focus, spacing and radius values).
- **Foundations:** `frontend/src/styles/foundations.css` (form states, controls, keyboard focus, table surfaces and readable text wrapping).
- **Responsive tables:** `frontend/src/styles/responsive-tables.css` plus the route-specific rules in `styles/assessments.css`, `styles/management.css` and the legacy `styles.css`.
- **Shared components:** `TableRegion` and `StyledSelect` in `components/UI.tsx`; `WorkspaceTabs`; `ProfileMenu`; `LoadState`; `useModalFocus`; `AppearanceProvider`.
- **Style import order:** `styles.css`, `styles/enterprise.css` (tokens, foundations, shell, authentication, assessments, management, assistant), then `styles/responsive-tables.css`; feature-level assistant and RULA table styles load with their components.

## Current screenshot references

- `evidence/login-desktop-fa-blue-1366x900.png` — blue/dark Persian RTL login, 1366×900.
- `evidence/register-mobile-en-390x844.png` — white English LTR registration, 390px wide; full-page capture is 1021px tall.

These are current public-route evidence only. They do not verify protected pages, real user data, Windows rendering or production. No speculative page or workflow was added during integration.

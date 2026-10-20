# RULA evaluation row body-side labels

Body-side labels appear directly below body-part names in desktop rows, mobile rows and mobile detail views, including independent image observations. Labels derive from the active evaluated side already used for scores and angles. General corrective rows retain explicit action side, including BOTH. Existing report side switching, persistence, row operations and other layouts remain intact.

Validation: 211 frontend tests passed in 32 files; production build, lint/typecheck passed. New LEFT/RIGHT rendering regression tests cover all posture and image rows and BOTH general-action scope. Edge browser with synthetic persisted API data verified BOTH evaluation switching in 1440px desktop and 390px mobile, all row/image labels, and distinct left/right scores. The full connected mobile suite passed at 320/390/430/768px, including edit/completion/reopen/delete/undo, failure/retry and refresh parity; zero AI calls and browser errors. Existing bundle-size warning remains.

Scoped security review: labels are translated React text derived from existing enum values; no new HTML, requests, credentials, authorization, persistence or database changes. Production authenticated mutations and physical-device testing were NOT_RUN; synthetic records were used.

Released frontend only with PWA v35. Public login/API health HTTP 200, MySQL up, matching public asset hashes and unchanged backend provider verified. No migration or backend restart.

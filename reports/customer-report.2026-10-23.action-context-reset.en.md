# Corrective-action context reset — customer report

| Project | Audience | Language | Gregorian | Jalali | Frontend release |
|---|---|---|---|---|---|
| NIVASafe | Customer | English | 2026-10-23 | 1405-08-01 | release-action-context-reset-20261023-01 |

After a successful FMEA corrective-action submission, its project, FMEA assessment and linked risk selection return to their existing defaults. A successful RULA submission similarly resets its project and related RULA assessment. Failed submissions preserve entered values and retry identity. An older response does not clear a newer selected assessment or a changed draft in a remounted form. The other tab’s unsent action and the separate action-list filters remain intact. No control, label, style, route or API field was added or removed.

## Verification and delivery

510 frontend tests, 24 isolated desktop/mobile browser cases, typecheck, lint, production build and independent security review passed. The correction was published with the existing styles and backend preserved. Tests use synthetic records and do not create a production action.

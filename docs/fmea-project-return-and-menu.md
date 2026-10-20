# FMEA newly created project return and project menu repair

## Root cause and fix

The project creation page already returned the new project ID in the FMEA URL. FMEA removed that URL override before its delayed draft write completed, allowing the previous draft selection to be restored. The return handler now validates the project against loaded projects, synchronously writes the new selection, updates draft state and controlled selection, then removes the URL override. Initial selection honors the return ID while project options load. Other draft fields and existing-assessment editing remain preserved.

The shared StyledSelect menu uses a fixed minmax(0, 1fr) content track, natural option rows, consistent box sizing, reserved thin scrollbar space and a custom scrollbar thumb. FMEA grid labels no longer derive their width from option text. These changes retain keyboard controls, placement logic, native form validation and current design colors.

## Verification

The browser regression fixture mounts the actual FMEA and Projects pages with synthetic API responses and isolated test storage. It starts with a previously selected project, creates a new project through the actual form, follows the return route, verifies the new controlled select and persisted draft ID, and checks that task text is preserved. Repeated open-menu measurements at 390/768/1280/1600 pixels verify stable trigger width and styled thin scrollbars with a reserved gutter. No production customer record is created or changed.

Frontend tests, build, TypeScript-based lint and typecheck are executed before publishing. Security review: the return ID is matched to server-loaded accessible project options; existing API authorization and project creation remain unchanged. No new endpoint, redirect destination, HTML injection, credential, database or environment modification is introduced. Draft persistence remains browser-local and scoped to the current user and organization.

Evidence: C:/NIVASafe/backups/fmea-project-return-{tests,build,lint,typecheck}.log and scripts/check-fmea-project-return.cjs. Production deployment uses existing Nginx static hosting and PWA cache v25, with a rollback copy and public/local health plus artifact-hash verification. Existing bundle size warning is unchanged.

## Final validation

202 frontend tests PASS. Build, lint, typecheck and diff check PASS. Browser creation/return/draft preservation and four viewport stability checks PASS. Frontend deployed with PWA v25; local/public login and API health HTTP200, database up and published asset hashes match the source build. Rollback location is recorded in latestFmeaProjectReturnRepair in project-state.json and the production deployment manifest. Backend/database/environment were unchanged.

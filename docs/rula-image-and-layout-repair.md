# RULA image and layout repair

## Scope and preservation

Based on deployed commit c90c11a32c49d2948b417d3363df8fdd8e7fb6ce and the existing unified table patch. Preserve every assessment part, corrective action, status, edit/completion control, and body-side filter. No database schema, migration, credential, production environment, authentication, or assessment scoring change.

## Layout

The unified assessment table uses proportional columns, wrapped content and controls instead of a 1450px intrinsic minimum. Mobile card presentation remains intact. The stage-one field labels use a bounded grid column and the select fills that column independently of option text and popup state.

Real headless Edge checks cover 390, 768, 1280 and 1600px widths, action preservation, long descriptions, no document overflow, no table horizontal scrolling, and stable select width while opening and choosing every body side.

## Image integration

Live Arvan tests returned HTTP 400 (`chat completion failed`) for GPT-5-Mini with a full screenshot, a tiny base64 image, and a public image URL. Changing to max_completion_tokens and low reasoning did not recover it. The same screenshot succeeded with GPT-4o-mini. Text assessment routing remains GPT-5-Mini.

RULA image routing still tries GPT-5-Mini first. On an upstream request failure, timeout, or empty response it uses Arvan GPT-4o-mini for actual image analysis, returning its actual model and usedFallback flag. An in-process five-minute cooldown prevents every subsequent photo paying the failing primary latency. Primary image requests resume after cooldown. Authorization and quota failures do not fail over. No local generated assessment replaces the image result. Existing complete-side parser and official score calculation remain required.

## Security review

The existing authenticated assessments.create permission, multipart signature/type/10MB limits, rate limit, organization scope, safe errors, audit and usage recording remain enforced. Images go only to the already configured Arvan endpoint. Credentials and images are not logged. Output is parsed and validated; UI text remains escaped. The fallback is bounded to one real request and does not retry credential or quota failures.

## Evidence

Validation and deployment results are recorded in project-state.json and the server deployment manifest. Missing Prisma generation initially blocked backend compilation; generating the existing client repaired it without applying any migration.

## Follow-up: remove intrinsic width rules
The base 1250px and tablet 780px minimums were removed. Table cell spacing was restored to its existing rule. Desktop action controls wrap within their existing operation cell. Cache version v17 offers the corrected release through the existing user-controlled update mechanism without forcibly navigating unsaved forms. 184 frontend tests, production build, typecheck and lint passed; real Edge checks include seven widths from 390 through 1600px and the saved-report blue RTL context. All rows remained visible without horizontal scroll. Public asset hashes and health were verified after deployment.


## Corrective and FMEA table separators
Removed only the RTL scrollbar gutter/right inline padding on corrective and full FMEA report table wrappers. Restored body column borders after the RULA border reset; desktop FMEA rows retain continuous column lines. Removed the normal manual AI suggestion button; both automatic effects and the failure retry remain. Real Edge checks confirmed flush right edges and 1px separators at 768, 1024 and 1554px. 184 frontend tests, production compilation, lint and public asset/health checks passed. Authentication, persistence, safe rendering and private API cache exclusions were reviewed and preserved. Production rollback: C:/NIVASafe/backups/release-table-separators-20261008-135433.


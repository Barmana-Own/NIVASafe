# NIVASafe desktop login technical evidence

| Project | NIVASafe |
|---|---|
| Gregorian / Jalali | 2026-10-19 / 1405-07-27 |
| Frontend release | release-login-desktop-20261019-01 |
| Deployment | DEPLOYED at 2026-10-19T12:29:35.917Z |

## Root cause and bounded fix

frontend/src/styles.css assigned backdrop-filter:blur(14px) to the toolbar. The later authentication.css override made its background transparent without removing the inherited filter,blurring the split-panel seam. All9desktop header checks failed before the fix;the actual assertion exited1(regression-red.log).

Only application file frontend/src/styles/authentication.css changed. Original CSS is preserved verbatim with an appended min-width:901px query:solid76px header,both backdrop filters disabled,readable navigation colors,separate header space,1.5–2.25rem hero heading and bounded form spacing. Simple/registration forms and mobile are excluded. No TS/JS/HTML,route,form,permission,dependency or business rule changed. Hash comparison of402source files found this CSS as the sole difference.

## Executed validation

| Check | Result | Evidence |
|---|---|---|
| pnpm10.13.1 run build | exit0 | build.retry.log |
| pnpm run typecheck / lint | both exit0 | validation.json |
| pnpm run test | exit0;349/349,52files | test.retry.log |
| node scripts/check-api-contract.mjs | exit0;90/154 | contract.log |
| node scripts/verify-release.mjs | exit0;29checks | release-check.log |
| Actual Chrome 155.0.8059.80 |25public states:9desktop/16mobile;0JS errors/overflow | browser-after.json |
| Static reconstruction/swap rollback | PASS;304old files | prepared.json;backup-manifest.json |
| Security/preservation review | PASS;desktop CSS only | scope-integrity-security.json |

Desktop widths1024/1280/1440/1920 and short720px height were checked. Persian RTL,English LTR and blue/white themes were sampled;not every possible device combination. Mobile390/768 covered introduction and sign-in form. Geometry16/16identical;15/16PNGs exactly match one of two unchanged public baselines. The remaining capture differs at11raster pixels,max14/255channel(public-mobile-render-variance.json). Repeated capture of the same old build independently varied at8pixels,max1/255. These are not described as a design change or universal byte equality. Safari/WebKit and new credentialed sign-in NOT RUN;scope was the public login presentation.

## Isolated tooling failures resolved

Restricted Corepack access failed EPERM;the approved operator used the same cached pinned pnpm without changing ACLs. The first suite lacked8backend source inputs read as text by ui-rules;only those isolated test inputs were copied and unchanged tests passed(attempt1,test-context-repair.json). Initial browser measurements raced the hash/form transition;the runner now awaits the actual form class,fonts and paint,with original evidence retained. Windows absolute ESM import initially failed ERR_UNSUPPORTED_ESM_URL_SCHEME before mutation and was corrected to a file URL.

## Deployment and recovery

Only17generated files(new versioned assets and index)were published. Prior assets,sw.js,web.config,report-actions-mobile.css and brand files remain unchanged. Index switched atomically after assets. /login and its6references returned200with correct types/hashes;API stayed healthy on release-20261019-safe-r8-uiux-handoff. No backend/schema/.env/service/image gate change,restart,migration or provider request occurred.

Backup: C:/ProgramData/NIVASafe/backups/release-login-desktop-20261019-01/frontend

Stage: C:/inetpub/nivasafe/staging/release-login-desktop-20261019-01

Manifest: C:/NIVASafe/reports/evidence/login-desktop-20261019-01/backup-manifest.json

Frontend-only rollback under an authorized operator identity:

```powershell
C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\login-desktop-20261019-01\static-release.mjs rollback
```

Rollback refuses an unrelated current index;it restores only the prior index because all prior assets remain untouched. No data restore. Backend/domain suites,dependency audit and inference NOT RUN for this CSS task;their source and lockfile did not change. Final review covered preservation,mobile,auth-boundary continuity and absence of new URL/dependency/secret exposure. The twelve full-product stages were not re-executed or universally marked PASS;prior full RULA acceptance status is preserved.

## Hashes

{
  "oldIndex": "39e4cc72b24a145c52f22b2507d96ec5428947056fd8328a3441f9bcbf3c8d28",
  "newIndex": "1e5010b9d01a9710c67c482ee92fb8970d1cdf9e6c59fd31d1b7df71b64e9e93",
  "oldAssets": [
    {
      "url": "/assets/index-CZ6hxJEG.js",
      "sha256": "101a84293ed5db1bc2c8ac7971c85c6d64f91081334376c1931d645bcb04ac08"
    },
    {
      "url": "/assets/index-17Z8GZRa.css",
      "sha256": "7fa339e553da2ddf99c51de8b4295ccc511695d0e5cd95d7714ec5d382e345b7"
    }
  ],
  "newAssets": [
    {
      "path": "/assets/index-DRIFEfyU.js",
      "status": 200,
      "sha256": "07f9670f5554a759e122f1a2f1d4669a01bb2c89086cf864a95b83e8ca4a99d3",
      "contentType": "application/javascript"
    },
    {
      "path": "/assets/index-DH5Fm7ph.css",
      "status": 200,
      "sha256": "7452af985691115d827e399a48cf7030b0f22247be3a3cbd165d66566303f0a2",
      "contentType": "text/css"
    }
  ]
}

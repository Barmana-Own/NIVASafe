# Login welcome logo placement

Gregorian date: 2026-10-23

Jalali date: 1405-08-01

The existing form logo is positioned above the welcome heading on desktop, using the owner's accepted alternative. The icon retains its 48-pixel size and a 12-pixel gap above the title. Start alignment follows Persian RTL and English LTR. The change is confined to four layout properties inside the existing desktop-only rule; mobile branding, header/footer assets, other authentication pages, controls and sign-in behavior remain unchanged.

Validation: all 557 frontend tests across 78 files passed without failures or skipped tests; frontend typecheck/lint and production build passed. The existing large-bundle warning remains. Sixteen local Edge Chromium checks exercised the actual login route at widths 390/900/901/1440 in both languages and themes, including the 900/901 breakpoint, short desktop height, mobile landing/form states, logo alignment/spacing, no horizontal overflow and password visibility controls. No API request, unexpected request or page error occurred. The remote trust-seal image was blocked during local QA and used its existing fallback.

The scoped security and preservation review found no new executable rendering, credential handling, API, permission, data or dependency boundary. All 1317 baseline files and unrelated project state are preserved. Browser evidence is stored in the ignored .local/login-welcome-logo-20261023-01 directory. No new production test fixture or UI element was added.

GitHub delivery targets Barmana-Own/NIVASafe, branch main, with local/remote commit verification. Production deployment: NOT_PERFORMED for this CSS-change and GitHub-push request.

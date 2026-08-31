# PWA and offline

The web app ships a complete installable PWA: manifest metadata for desktop and mobile, a maskable icon, install shortcuts, an offline fallback and an in-app install prompt backed by the browser's native `beforeinstallprompt` flow. On iOS, the prompt explains the Share → Add to Home Screen path because Safari does not expose that event.

The service worker uses a network-first strategy for navigations and a cache-first/stale-refresh strategy for static assets. API responses, credentials and uploaded files are never cached. New service-worker versions remain waiting until the user chooses «به‌روزرسانی»; the page reloads once after activation so users never see a mixed asset version. Registration disables the browser's service-worker HTTP cache, retries update checks safely when the app becomes visible and re-opens the update banner for every new release. Production Nginx serves `sw.js` and the manifest with revalidation headers so installed clients discover updates promptly.

RULA form drafts are stored in IndexedDB and deleted after successful submission. Logout clears browser caches. The manifest includes `scope`, `id`, standalone display mode and shortcuts for Dashboard, FMEA and the assistant, so desktop and mobile installations open directly in the app shell.

# PWA and offline

The web app ships a manifest, maskable SVG icon, service worker, offline fallback and responsive installable shell. Static resources use cache-first fallback; API responses and credentials are never cached by the service worker. RULA form drafts are stored in IndexedDB and deleted after successful submission. Logout clears browser caches.

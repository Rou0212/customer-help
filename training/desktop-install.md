# Existing desktop/PWA entry

Use the existing `cat.html` install entry and `manifest.webmanifest`; do not make a separate app per animal. The explicit manifest `id` is `/customer-help/cat.html`, matching the unchanged deployed `start_url` (`./cat.html`) and prior implicit identity. Resolve `id` against the origin, not the manifest directory; `./cat.html` would incorrectly create the root `/cat.html` identity. Keep existing installation name/icons and scope stable.

## Animal selection

Open the installed app and choose 換夥伴. All five entries use the same page and query engine. The illustration, in-page title and pinned reminder name update together; `leyan-pet` in origin-local localStorage preserves selection on reload/reopen. The website index widget and installed page in the same browser profile share that preference on their next load. Separate browser profiles/private windows have separate preferences.

The OS launcher/desktop icon and installed application label remain the manifest's original cat identity; browsers/OSs control their refresh and do not reliably follow in-page animal changes. In-page selection is not an OS icon replacement and does not require reinstalling five apps. The separate Windows walking-pet PowerShell program is not the browser-installed PWA and is not modified by this change.

## Updating an existing installation

This repository registers no service worker and does not create an offline Cache Storage cache. Do not add a new cache-first worker or clear unrelated browser caches. HTML/manifest refresh remains browser/HTTP controlled. Versioned assistant CSS/JS and manifest-link query tokens load this release once the entry HTML refreshes. An already-open app keeps its currently loaded code until reloaded: close/reopen or use the app/browser reload control once after deployment if an old screen remains. A normal forced reload can bypass stale HTTP cache; no OS setting changes are required. Offline operation is not promised.

Verify the delivered HTML asset tokens, service-worker registrations/cache keys, five menu entries, dynamic header/reminder names and reload persistence in the standalone page. Where available, emulate CSS display-mode=standalone and confirm the browser reports it. Browser emulation is not a real OS install on the user's desktop; report that limitation explicitly.

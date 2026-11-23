// The old address, eddoc.adambaik39.workers.dev, after ED Doc moved to eddoc.pages.dev.
//
// Deployed as the Worker "eddoc" in place of the app:
//   CLOUDFLARE_ACCOUNT_ID=<account id> npx wrangler deploy scripts/old-address-worker.js --name eddoc --compatibility-date 2026-11-01
//
// Every page and file redirects to the same path on the new address. The one exception is
// sw.js: devices that installed ED Doc at the old address run its service worker, which
// serves the app from its cache and would never see a redirect. They check sw.js for
// updates, so sw.js is answered with a worker that clears that cache and unregisters
// itself. It waits, like any ED Doc update, until the user taps "Update now" or every tab
// is closed; the page then reloads with no service worker and lands on the redirect.
const NEW_ORIGIN = 'https://eddoc.pages.dev';

const RETIRING_SERVICE_WORKER = `
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    await self.registration.unregister();
  })());
});
`;

export default {
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/sw.js') {
      return new Response(RETIRING_SERVICE_WORKER, {
        headers: {
          'content-type': 'text/javascript; charset=utf-8',
          'cache-control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
    // 302, not 301: browsers keep a 301 for good, which would make the move hard to undo.
    return Response.redirect(NEW_ORIGIN + url.pathname + url.search, 302);
  }
};

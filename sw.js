// ED Doc service worker: the whole app from this device's cache, with or without a network.
//
// The two lines below are stamped at build/deploy time (scripts/build_dist.py for dist/,
// scripts/serve_offline.py for local use) with a content hash per file. Each file is cached
// under its own hash, so:
//   - an update downloads only the files that changed;
//   - a download that drops half way keeps what it already fetched and carries on next time;
//   - a page is only ever given files from the build it was loaded from.
// No manual version bumps, ever.
const BUILD_ID = 'dev';
const ASSET_REVISIONS = {};

// The app itself: clerking, the note, the forms and their PDFs. Installing waits for all of it.
const CORE_ASSETS = [
  './index.html',
  './schema_editor.html',
  './manifest.json',
  './assets/clinical_templates.js',
  './assets/js/00-theme-init.js',
  './assets/js/00-handover.js',
  './assets/js/00-events.js',
  './assets/js/00-schema-overrides.js',
  './assets/js/schema-editor.js',
  './assets/js/01-core.js',
  './assets/js/02-forms-shared.js',
  './assets/js/03-clinical-notes.js',
  './assets/js/04-ocr.js',
  './assets/js/05-pdf-render.js',
  './assets/js/06-form-pat301.js',
  './assets/js/07-form-ra301.js',
  './assets/js/08-form-rujukan.js',
  './assets/js/09-form-bt105.js',
  './assets/js/10-app-shell.js',
  './assets/js/11-dictation.js',
  './assets/js/12-pdf-export.js',
  './assets/js/13-exam-map.js',
  './assets/js/14-forms-menu.js',
  './assets/js/15-form-fisioterapi.js',
  './assets/js/16-case-board.js',
  './assets/js/17-session-restore.js',
  './assets/js/18-nnj.js',
  './assets/fonts/hanken-grotesk-latin-wght-normal.woff2',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/pdf-lib.min.js',
  './assets/pdf.min.js',
  './assets/pdf.worker.min.js',
  './assets/per_pat_301.pdf',
  './assets/per_ss_ra301.pdf',
  './assets/surat_rujukan.pdf',
  './assets/per_ss_bt105.pdf',
  './assets/per_fisioterapi.pdf',
];

// The scanner (about 16 MB). Fetched in the background once the app is running, so a weak
// connection cannot hold up the app. Until then scanning works online.
const OCR_ASSETS = [
  './assets/tesseract.min.js',
  './assets/worker.min.js',
  './assets/tesseract-core.wasm.js',
  './assets/eng.traineddata.gz',
];

const FILE_CACHE = 'ed-doc-files';
const ALL_ASSETS = CORE_ASSETS.concat(OCR_ASSETS);
const KNOWN_ASSETS = new Set(ALL_ASSETS);
const SCOPE_URL = new URL('./', self.location.href);

function revisionOf(path) {
  return ASSET_REVISIONS[path] || BUILD_ID;
}

// Where a file lives in the cache: its address plus the hash of its content.
function cacheKey(path) {
  const url = new URL(path, SCOPE_URL);
  url.search = `?rev=${revisionOf(path)}`;
  return url.href;
}

// Hosts redirect /index.html to / and /schema_editor.html to /schema_editor. A response that
// was redirected cannot answer a navigation, so it is rebuilt without the flag.
function cacheable(response) {
  if (!response.redirected) return response;
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

async function sha256Prefix(buffer, length) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

// A copy held by an older version of this worker is reused when its content is exactly the file
// this build expects, so moving to this worker does not download everything again.
async function adoptFromOlderCache(cache, path) {
  const revision = ASSET_REVISIONS[path];
  if (!revision) return false;
  try {
    const old = await caches.match(new URL(path, SCOPE_URL).href);
    if (!old || !old.ok) return false;
    const body = await old.clone().arrayBuffer();
    if (await sha256Prefix(body, revision.length) !== revision) return false;
    await cache.put(cacheKey(path), new Response(body, { status: 200, headers: old.headers }));
    return true;
  } catch (err) {
    return false;
  }
}

async function download(cache, path) {
  const response = await fetch(new URL(path, SCOPE_URL).href, { cache: 'reload' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  await cache.put(cacheKey(path), cacheable(response));
}

// Makes sure every listed file is in the cache. Files already there are left alone, so a run
// that failed part way resumes instead of starting over. network=false only adopts older copies.
async function ensureCached(paths, network) {
  const cache = await caches.open(FILE_CACHE);
  const queue = [];
  for (const path of paths) {
    if (!(await cache.match(cacheKey(path)))) queue.push(path);
  }
  const failures = [];
  const worker = async () => {
    while (queue.length) {
      const path = queue.shift();
      try {
        if (await adoptFromOlderCache(cache, path)) continue;
        if (network) await download(cache, path);
      } catch (err) {
        failures.push(err);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  if (failures.length) throw failures[0];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    ensureCached(CORE_ASSETS, true)
      // Costs no network: keeps the scanner files an older worker already downloaded.
      .then(() => ensureCached(OCR_ASSETS, false).catch(() => {}))
  );
});

// A new version waits here until the page says the user chose to update (or every tab is
// closed), so a note in progress is never pulled onto new code mid-way.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(FILE_CACHE);
    const wanted = new Set(ALL_ASSETS.map(cacheKey));
    const stored = await cache.keys();
    await Promise.all(stored.filter(request => !wanted.has(request.url)).map(request => cache.delete(request)));
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== FILE_CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (type === 'CACHE_OCR') {
    const reply = (message) => { if (event.source) event.source.postMessage({ type: message }); };
    event.waitUntil(ensureCached(OCR_ASSETS, true).then(() => reply('OCR_READY'), () => reply('OCR_FAILED')));
  }
});

// Which cached file answers this address, if any.
function assetPathFor(url) {
  if (!url.pathname.startsWith(SCOPE_URL.pathname)) return null;
  const relative = url.pathname.slice(SCOPE_URL.pathname.length);
  if (relative === '' || relative === 'index.html') return CORE_ASSETS[0];
  if (relative === 'schema_editor') return CORE_ASSETS[1];
  const path = `./${relative}`;
  return KNOWN_ASSETS.has(path) ? path : null;
}

// Served without the build step (no hashes stamped in), this script never changes, so nothing
// would ever tell the cache a file is stale. In that case the network is asked first.
const UNSTAMPED = BUILD_ID === 'dev';

async function serveAsset(path, request) {
  const cache = await caches.open(FILE_CACHE);
  if (UNSTAMPED) {
    try {
      const fresh = await fetch(request);
      if (fresh.ok) {
        cache.put(cacheKey(path), cacheable(fresh.clone())).catch(() => {});
        return fresh;
      }
    } catch (err) { /* offline: fall through to the cache */ }
  }
  const cached = await cache.match(cacheKey(path));
  if (cached) return cached;
  // Not downloaded yet (the scanner files, or a cache the browser evicted): use the network and keep it.
  const response = await fetch(request);
  if (response.ok) cache.put(cacheKey(path), cacheable(response.clone())).catch(() => {});
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const path = assetPathFor(url);
  if (path) {
    // Cache first, pages included. Freshness comes from the browser re-checking this script:
    // any changed file changes the hashes above, and the page then offers the update.
    event.respondWith(serveAsset(path, request));
  } else if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(cacheKey(CORE_ASSETS[0]))) || Response.error())
    );
  }
});

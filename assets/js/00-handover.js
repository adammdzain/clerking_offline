// Hands a returning device over from the previous service worker to the current one.
//
// The previous worker fetched pages from the network but served scripts from its own cache.
// So the first visit after this version went live gets this page with the old scripts: the
// two do not belong together (old scripts know nothing of the saved session, the update bar
// or the wipe that clears it). That worker cannot be changed any more, but this file is new
// to it, so it comes from the network and can end the mix: as soon as the current worker has
// finished installing it is told to take over, and the page reloads once onto matching files.
//
// The previous worker named its cache "ed-doc-v30-<build>" and the current one deletes those
// caches when it takes over, so once that has happened this file does nothing.
(function () {
  var sw = navigator.serviceWorker;
  if (!sw || !sw.controller || !window.caches) return;

  caches.keys().then(function (names) {
    var legacy = names.some(function (name) { return name.indexOf('ed-doc-v30') === 0; });
    if (!legacy) return;

    var reloading = false;
    sw.addEventListener('controllerchange', function () {
      if (reloading) return;
      reloading = true;
      // No silent restore here: the reloaded page asks before bringing back any saved patient.
      window.location.reload();
    });

    function takeOver(worker) {
      if (worker) worker.postMessage({ type: 'SKIP_WAITING' });
    }
    function watch(worker) {
      if (!worker) return;
      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed') takeOver(worker);
      });
    }

    sw.register('./sw.js').then(function (reg) {
      if (reg.waiting) takeOver(reg.waiting);
      watch(reg.installing);
      reg.addEventListener('updatefound', function () { watch(reg.installing); });
    }).catch(function () {});
  }).catch(function () {});
})();

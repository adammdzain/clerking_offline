/* =======================================================
   THEME TOGGLE (DAY / NIGHT CLINICAL MODES)
   ======================================================= */
function initTheme() {
  const savedTheme = localStorage.getItem('ed_doc_theme');
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = savedTheme || (prefersLight ? 'light' : 'dark');
  applyTheme(theme);
}

function applyTheme(theme) {
  const isLight = theme === 'light';
  document.documentElement.setAttribute('data-theme', theme);
  if (document.body) {
    document.body.classList.toggle('theme-light', isLight);
  }
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    const sunSvg = `<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonSvg = `<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    btn.innerHTML = isLight ? `<span>Night Mode</span> ${moonSvg}` : `<span>Day Mode</span> ${sunSvg}`;
    btn.title = isLight ? 'Switch to Dark Night Mode (Ctrl+Shift+L)' : 'Switch to High-Contrast Day Mode (Ctrl+Shift+L)';
  }
  const meta = document.getElementById('themeMetaColor');
  if (meta) {
    meta.setAttribute('content', isLight ? "#f1f3f6" : "#0f1114");
  }
  localStorage.setItem('ed_doc_theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast(next === 'light' ? 'High-Contrast Day Mode enabled' : 'Night Mode enabled');
}

/* =======================================================
   DIRECT CLINICAL PRINT
   ======================================================= */
function printClinicalNotes() {
  const docArea = document.getElementById('docArea');
  const hasQuick = typeof quickExamHasData === 'function' && quickExamHasData();
  if ((!docArea || !docArea.value.trim()) && !hasQuick) {
    showToast('Clinical notes are currently empty');
    return;
  }
  renderNotesPrintPages();
  window.print();
}

// Split notes at the Physical Examination heading so the figure page can be found
function splitNotesAtExam(text) {
  const lines = String(text || '').split('\n');
  let head = -1;
  lines.forEach((l, i) => { if (l.trim() === 'Physical Examination') head = i; });
  if (head < 0) return null;
  return { preExam: lines.slice(0, head).join('\n'), fromExam: lines.slice(head).join('\n') };
}

// Also cover direct Ctrl/Cmd+P: textareas clip their content when printed,
// so mirror the notes into the print-only pages before any print job starts.
window.addEventListener('beforeprint', () => renderNotesPrintPages());

/* =======================================================
   PWA INSTALLATION & SERVICE WORKER
   ======================================================= */
let deferredPWAInstallPrompt = null;

const isInstalledPWA = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
// iPadOS Safari reports itself as a Mac, so touch points tell them apart
const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// The saved profile and draft live only on this device: ask the browser not to
// evict them under storage pressure. Android grants this for installed apps.
function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

// ---- Service worker: register, look for updates, and let the user choose when to take one ----
// sw.js serves every file from the cache, pages included, so a new version never appears by itself.
// The browser re-checks sw.js; when a new one has finished downloading, the bar below offers it.
const OCR_CACHED_KEY = 'ed_doc_offline_ready';
let swUpdateRequested = false;

function showUpdateBar(onAccept) {
  const bar = document.getElementById('updateBar');
  const button = document.getElementById('updateReloadBtn');
  if (!bar || !button) return;
  button.onclick = onAccept;
  bar.hidden = false;
}

// Reloading for an update must not cost the user their work, or ask them to confirm leaving.
function reloadForUpdate() {
  if (typeof saveSessionNow === 'function') saveSessionNow();
  try { sessionStorage.setItem('ed_doc_resume_once', '1'); } catch (e) {}
  window.edDocSkipUnloadPrompt = true;
  window.location.reload();
}

function offerUpdate(reg) {
  showUpdateBar(() => {
    swUpdateRequested = true;
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    else reloadForUpdate();
  });
}

function watchServiceWorker(reg) {
  // Only an update counts: the very first install has no page to update.
  const isUpdate = () => !!navigator.serviceWorker.controller;
  if (reg.waiting && isUpdate()) offerUpdate(reg);
  reg.addEventListener('updatefound', () => {
    const incoming = reg.installing;
    if (!incoming) return;
    incoming.addEventListener('statechange', () => {
      if (incoming.state === 'installed' && isUpdate()) offerUpdate(reg);
    });
  });

  // A workstation tab can stay open for days: check when the app comes back into view and every half hour.
  const check = () => reg.update().catch(() => {});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  setInterval(check, 30 * 60 * 1000);
}

if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
  const hadController = !!navigator.serviceWorker.controller;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[PWA] Service Worker registered:', reg.scope);
        watchServiceWorker(reg);
      })
      .catch(err => console.warn('[PWA] Service Worker registration failed:', err));

    // The app is running: now fetch the scanner files in the background.
    navigator.serviceWorker.ready.then(reg => {
      if (reg.active) reg.active.postMessage({ type: 'CACHE_OCR' });
    }).catch(() => {});
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'OCR_READY') return;
    try {
      if (localStorage.getItem(OCR_CACHED_KEY)) return;
      localStorage.setItem(OCR_CACHED_KEY, '1');
    } catch (e) { return; }
    showToast('ED Doc is ready to use offline', 4000);
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // first install taking control of this page
    if (swUpdateRequested) reloadForUpdate();
    // Updated from another tab: this page is now running old code against new files.
    else showUpdateBar(reloadForUpdate);
  });
}

if (isInstalledPWA) {
  requestPersistentStorage();
} else if (isAppleMobile) {
  // iOS never fires beforeinstallprompt, so the button shows the manual steps instead
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) installBtn.style.display = 'inline-flex';
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPWAInstallPrompt = e;
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) {
    installBtn.style.display = 'inline-flex';
  }
});

window.addEventListener('appinstalled', () => {
  deferredPWAInstallPrompt = null;
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) installBtn.style.display = 'none';
  requestPersistentStorage();
  showToast('ED Doc installed successfully!');
});

function triggerPWAInstall() {
  if (deferredPWAInstallPrompt) {
    deferredPWAInstallPrompt.prompt();
    deferredPWAInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
      }
      deferredPWAInstallPrompt = null;
    });
  } else if (isAppleMobile) {
    showToast('Tap Share, then Add to Home Screen', 6000);
  } else {
    showToast('To install: use Chrome/Edge address bar icon, or Safari File -> Add to Dock');
  }
}

/* =======================================================
   GLOBAL EMERGENCY KEYBOARD SHORTCUTS
   ======================================================= */
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Shift + L -> Toggle Theme
  // Ctrl/Cmd + Shift + V -> Toggle Voice Dictation
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
    e.preventDefault();
    toggleVoiceDictation();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
    e.preventDefault();
    toggleTheme();
    return;
  }

  // Ctrl/Cmd + Enter -> Quick Copy Notes
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const anyModalActive = document.querySelector('.modal-backdrop.active');
    if (!anyModalActive) {
      e.preventDefault();
      if (typeof copyNotes === 'function') copyNotes();
      return;
    }
  }

  // Ctrl/Cmd + 1 -> Open PER. PAT 301
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '1') {
    e.preventDefault();
    if (typeof openPat301Modal === 'function') openPat301Modal();
    return;
  }

  // Ctrl/Cmd + 2 -> Open PER.SS-RA301
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '2') {
    e.preventDefault();
    if (typeof openRa301Modal === 'function') openRa301Modal();
    return;
  }

  // Ctrl/Cmd + 3 -> Open Surat Rujukan
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === '3') {
    e.preventDefault();
    if (typeof openRujukanModal === 'function') openRujukanModal();
    return;
  }
});

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
});

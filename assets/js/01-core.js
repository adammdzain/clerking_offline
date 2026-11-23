// Accordion Logic for Main Sections (only one open at a time)
document.querySelectorAll('.main-collapsible').forEach(btn => {
  btn.addEventListener('click', function () {
    const content = this.nextElementSibling;
    const isOpen = content.classList.contains('expanded');

    document.querySelectorAll('.main-collapsible').forEach(other => {
      if (other === this) return;
      other.classList.remove('active');
      other.setAttribute('aria-expanded', 'false');
      const c = other.nextElementSibling;
      if (c) c.classList.remove('expanded');
      const s = other.closest('.main-section');
      if (s) s.classList.remove('is-expanded');
    });

    content.classList.toggle('expanded', !isOpen);
    this.classList.toggle('active', !isOpen);
    this.setAttribute('aria-expanded', String(!isOpen));
    const parentSec = this.closest('.main-section');
    if (parentSec) {
      parentSec.classList.toggle('is-expanded', !isOpen);
    }
  });
});



// Tidies a typed value for the note: trims it, and turns null/undefined into ''. It does NOT make
// text safe for HTML (the note is plain text, so "<", ">" and "&" are kept as typed); use
// escapeHtml (00-html.js) for anything put into markup.
function cleanText(str) {
  if (str === null || str === undefined) return '';
  return String(str).trim();
}

// ----------------------------------------------------
// THE NOTE'S SECTIONS
// A section is a heading at the left margin and the indented lines under it. Insert
// writes a section in place: pressing it again replaces that section rather than adding
// a second copy, and a new section goes where it belongs in the clinical order, not at
// the bottom. Text with a heading the app does not know (typed notes, the timestamp)
// is never moved or changed.
// ----------------------------------------------------
function noteSectionAt(lines, start) {
  let end = start + 1;
  while (end < lines.length && /^\s+\S/.test(lines[end])) end++;
  return end; // first line after the section's indented body
}

// Each known heading's place in the note. Lower comes first.
function noteSectionRank(title) {
  const exact = { 'History of Presenting Illness': 200, 'Physical Examination': 700 };
  if (title in exact) return exact[title];
  // The trauma format: Demographics, then these two.
  const trauma = ['Primary Survey', 'Secondary Survey'];
  if (trauma.includes(title)) return 200 + trauma.indexOf(title);
  if (typeof EXAM_SYSTEMS !== 'undefined') {
    const keys = Object.keys(EXAM_SYSTEMS);
    const at = keys.findIndex(k => EXAM_SYSTEMS[k].noteHeader === title);
    if (at >= 0) return 750 + at;
  }
  const base = { 'demographic-container': 100, 'routine-container': 300, 'history-container': 400, 'vitals-container': 500, 'exam-sections-container': 710, 'impression-container': 900 };
  for (const cat of window.CLINICAL_TEMPLATES || []) {
    if (!(cat.containerId in base) || typeof submenuNoteHeader !== 'function') continue;
    const at = cat.submenus.findIndex(s => submenuNoteHeader(cat, s) === title);
    if (at >= 0) return base[cat.containerId] + at;
  }
  return null;
}

// Every section in the note: { title, start, end } with line indexes.
function readNoteSections(lines) {
  const sections = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim() || /^\s/.test(lines[i])) continue;
    const end = noteSectionAt(lines, i);
    sections.push({ title: lines[i].trim().replace(/:$/, ''), start: i, end });
    i = end - 1;
  }
  return sections;
}

// Writes one section; returns 'updated' when it replaced one already in the note.
function appendSection(title, parts) {
  if (!parts || !parts.length) return null;
  const area = document.getElementById('docArea');
  // A typed list (a plan, one item per line) sits one step further in, and blank lines
  // are dropped, since a blank line ends a section.
  const block = [title, ...parts.flatMap(part => String(part).split('\n')
    .filter(line => line.trim())
    .map((line, i) => i ? `      ${line.trim()}` : `   ${line}`))];
  const lines = area.value.replace(/\s+$/, '').split('\n');
  if (lines.length === 1 && !lines[0]) lines.pop();
  const sections = readNoteSections(lines);
  const existing = sections.find(s => s.title === title);
  let atEnd = false;

  if (existing) {
    lines.splice(existing.start, existing.end - existing.start, ...block);
  } else {
    const rank = noteSectionRank(title);
    const before = rank === null ? null : sections.find(s => {
      const r = noteSectionRank(s.title);
      return r !== null && r > rank;
    });
    if (before) {
      const gapAbove = before.start > 0 && lines[before.start - 1].trim() ? [''] : [];
      lines.splice(before.start, 0, ...gapAbove, ...block, '');
    } else {
      lines.push(...(lines.length ? [''] : []), ...block);
      atEnd = true;
    }
  }

  area.value = lines.join('\n') + '\n\n';
  if (atEnd) area.scrollTop = area.scrollHeight;
  saveDraft(area.value);
  return existing ? 'updated' : 'added';
}

// Autosave note draft to localStorage (survives tab/browser close) & warn before unload
const DRAFT_KEY = 'ed_doc_draft';
const DRAFT_TS_KEY = 'ed_doc_draft_ts';

function saveDraft(value) {
  // While the resume question is open the saved draft is still on offer: do not overwrite it.
  if (window.edDocRestorePending) return;
  try {
    if (value && value.trim()) {
      localStorage.setItem(DRAFT_KEY, value);
      localStorage.setItem(DRAFT_TS_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_TS_KEY);
    }
  } catch (e) {}
}

function wipeDraftStorage() {
  try {
    [DRAFT_KEY, DRAFT_TS_KEY].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
  } catch (e) {}
}

// Patient drafts are PHI: they are never restored after this age (a clinical shift length).
const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

// The saved draft, if there is one and it is still within its lifetime. Restoring it is
// 17-session-restore.js's job, because that asks first.
function readSavedDraft() {
  try {
    const ts = Number(localStorage.getItem(DRAFT_TS_KEY)) || 0;
    if (ts && Date.now() - ts > DRAFT_MAX_AGE_MS) {
      wipeDraftStorage();
      return null;
    }
    const text = localStorage.getItem(DRAFT_KEY) || sessionStorage.getItem(DRAFT_KEY);
    return text && text.trim() ? { text, ts: ts || Date.now() } : null;
  } catch (e) {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('docArea');
  if (area) area.addEventListener('input', () => saveDraft(area.value));
});

window.addEventListener('beforeunload', (e) => {
  // An update reload restores the work by itself, so it does not need the warning.
  if (window.edDocSkipUnloadPrompt) return;
  const area = document.getElementById('docArea');
  if (area && area.value.trim().length > 10) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ----------------------------------------------------
// MODAL ACCESSIBILITY (focus management)
// Dialogs move focus in on open, trap Tab while open, and
// restore focus to the trigger element on close.
// ----------------------------------------------------
const _modalFocusStack = [];

function getModalFocusables(modal) {
  return Array.from(modal.querySelectorAll(
    'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.disabled && el.offsetParent !== null);
}

function openModalA11y(modal) {
  if (!modal) return;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  _modalFocusStack.push({ modal, trigger: document.activeElement });
  const target = modal.querySelector('input:not([type="hidden"]), select, textarea') || getModalFocusables(modal)[0];
  if (target) setTimeout(() => target.focus(), 0);
}

function closeModalA11y(modal) {
  if (!modal) return;
  const idx = _modalFocusStack.findIndex(e => e.modal === modal);
  const entry = idx >= 0 ? _modalFocusStack.splice(idx, 1)[0] : null;
  const trigger = entry && entry.trigger;
  if (trigger && document.body.contains(trigger) && typeof trigger.focus === 'function') {
    trigger.focus();
  }
}

// Trap Tab inside whichever modal is active so keyboard users
// cannot tab into the page behind the dialog.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const modal = Array.from(document.querySelectorAll('.modal-backdrop')).find(m => m.classList.contains('active'));
  if (!modal) return;
  const focusables = getModalFocusables(modal);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (!modal.contains(active)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
});

// ----------------------------------------------------
// DYNAMIC ASSET & SCRIPT LOADERS (100% Offline Ready)
// ----------------------------------------------------
const _loadedScripts = new Set();
const _loadingScripts = new Map();
function loadScript(src) {
  if (_loadedScripts.has(src)) return Promise.resolve();
  // Dedupe in-flight loads: a second caller must wait for the first, not see a half-loaded tag and resolve early.
  if (_loadingScripts.has(src)) return _loadingScripts.get(src);
  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing && !existing.dataset.loadWatched) {
      existing.dataset.loadWatched = '1';
      existing.addEventListener('load', () => { _loadedScripts.add(src); resolve(); }, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load: ' + src)), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { _loadedScripts.add(src); resolve(); };
    s.onerror = () => reject(new Error('Failed to load: ' + src));
    document.head.appendChild(s);
  });
  _loadingScripts.set(src, promise);
  promise.catch(() => _loadingScripts.delete(src)).catch(() => {});
  return promise;
}

async function ensureOcrLibrary() {
  if (typeof Tesseract === 'undefined') {
    await loadScript('./assets/tesseract.min.js');
  }
}

async function ensurePdfLibraries() {
  const promises = [];
  if (typeof PDFLib === 'undefined') promises.push(loadScript('./assets/pdf-lib.min.js'));
  if (typeof pdfjsLib === 'undefined') promises.push(loadScript('./assets/pdf.min.js'));
  await Promise.all(promises);
  if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = './assets/pdf.worker.min.js';
  }
}

async function loadPdfTemplateBytes(pdfPath) {
  const resp = await fetch(pdfPath);
  if (!resp || !resp.ok) {
    throw new Error(`Failed to load PDF template from ${pdfPath}. Open the app via start_offline.command (http://localhost) rather than file://.`);
  }
  return new Uint8Array(await resp.arrayBuffer());
}

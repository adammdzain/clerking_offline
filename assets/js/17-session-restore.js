/* =======================================================
   SESSION SAVE AND RESUME
   The note is saved by 01-core.js. This file saves what the
   note is built from (every clerking field, the trauma and
   exam selections, the injury pins) so a reload, a tab the
   phone discarded, or an app update does not lose it.

   Nothing is restored without being asked for: on a shared
   computer the next person must not be handed the previous
   patient. Saved data follows the same rules as the draft:
   this device only, gone after 12 hours, gone on wipe.
   ======================================================= */
const SESSION_FIELDS_KEY = 'ed_doc_fields';
const SESSION_RESUME_ONCE_KEY = 'ed_doc_resume_once';
// Chips in these blocks are plain on/off buttons with no field behind them, and the markup is fixed,
// so their position is a stable name. Template chips are not listed: they follow their field's value.
const SESSION_CHIP_SCOPES = ['#Trauma', '#examQuickCard'];
const SESSION_SKIPPED_TYPES = ['hidden', 'range', 'file', 'button', 'submit', 'reset'];

let sessionSaveReady = false;
let sessionLastJson = null;

function sessionFieldElements() {
  return Array.from(document.querySelectorAll('#main-sections input[id], #main-sections textarea[id], #main-sections select[id]'))
    .filter(el => !SESSION_SKIPPED_TYPES.includes(el.type));
}

function sessionChipButtons(scope) {
  return Array.from(document.querySelectorAll(`${scope} .chip-btn`));
}

function collectSession() {
  const values = {};
  sessionFieldElements().forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (el.checked !== el.defaultChecked) values[el.id] = el.checked;
    } else if (el.tagName === 'SELECT') {
      const option = el.options[el.selectedIndex];
      if (option && !option.defaultSelected) values[el.id] = el.value;
    } else if (el.value !== el.defaultValue) {
      values[el.id] = el.value;
    }
  });

  const chips = {};
  SESSION_CHIP_SCOPES.forEach(scope => {
    const buttons = sessionChipButtons(scope);
    const on = buttons.reduce((list, b, i) => (b.classList.contains('active') ? list.concat(i) : list), []);
    if (on.length) chips[scope] = { count: buttons.length, on };
  });

  const data = { values, chips };

  const gcs = [traumaGcsE, traumaGcsV, traumaGcsM];
  const od = [traumaOdSize, traumaOdReact];
  const os = [traumaOsSize, traumaOsReact];
  const normal = Object.keys(SURVEY_NORMALS).filter(key => document.getElementById(`${key}Check`)?.textContent === '✓');
  if (gcs.concat(od, os).some(v => v !== null) || normal.length || traumaPins.length) {
    data.trauma = { gcs, od, os, normal, pins: traumaPins };
  }
  if (typeof examMapHasData === 'function' && examMapHasData()) data.exam = examMap;
  if (hopiKeyOrder.size) data.hopiOrder = Array.from(hopiKeyOrder);
  if (cbInserted.size) data.inserted = Array.from(cbInserted);
  return data;
}

function sessionIsEmpty(data) {
  return !Object.keys(data.values).length && !Object.keys(data.chips).length && !data.trauma && !data.exam;
}

function saveSessionNow() {
  if (!sessionSaveReady || window.edDocPersistenceOff) return;
  try {
    const data = collectSession();
    const json = sessionIsEmpty(data) ? '' : JSON.stringify(data);
    if (json === sessionLastJson) return;
    sessionLastJson = json;
    if (json) localStorage.setItem(SESSION_FIELDS_KEY, JSON.stringify({ ts: Date.now(), data }));
    else localStorage.removeItem(SESSION_FIELDS_KEY);
  } catch (e) {}
}

function wipeSessionStorage() {
  sessionLastJson = null;
  try { localStorage.removeItem(SESSION_FIELDS_KEY); } catch (e) {}
}

function readSavedSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_FIELDS_KEY) || 'null');
    if (!saved || typeof saved !== 'object' || !saved.data || typeof saved.data.values !== 'object') {
      if (saved) wipeSessionStorage();
      return null;
    }
    if (!saved.ts || Date.now() - saved.ts > DRAFT_MAX_AGE_MS) {
      wipeSessionStorage();
      return null;
    }
    return saved;
  } catch (e) {
    wipeSessionStorage();
    return null;
  }
}

// ---------- Putting a saved session back ----------
function sessionFire(el) {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function restoreSessionValues(values) {
  // The IC goes first: it fills in age and gender itself, and a field that already
  // holds its saved value is then left alone, so it keeps following the IC.
  const ids = Object.keys(values).sort((a, b) => (b === 'patientID') - (a === 'patientID'));
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el || !el.closest('#main-sections') || SESSION_SKIPPED_TYPES.includes(el.type)) return;
    const saved = values[id];
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (typeof saved !== 'boolean' || el.checked === saved) return;
      el.checked = saved;
    } else {
      if (typeof saved !== 'string' || el.value === saved) return;
      el.value = saved;
    }
    sessionFire(el);
  });
}

function restoreSessionPupil(eye, saved) {
  if (!Array.isArray(saved)) return;
  const size = Number.isInteger(saved[0]) && saved[0] >= 1 && saved[0] <= 8 ? saved[0] : null;
  const react = typeof saved[1] === 'string' ? saved[1] : null;
  if (eye === 'od') { traumaOdSize = size; traumaOdReact = react; }
  else { traumaOsSize = size; traumaOsReact = react; }
  const name = eye === 'od' ? 'Od' : 'Os';
  const items = document.querySelectorAll(`#trauma${name}Gauge .gauge-item`);
  items.forEach((item, i) => item.classList.toggle('active', size === i + 1));
  const readout = document.getElementById(`trauma${name}Readout`);
  if (readout) readout.textContent = `${size ? size + ' mm' : '-- mm'} • ${react || 'Unassessed'}`;
}

function restoreSessionTrauma(trauma) {
  if (!trauma || typeof trauma !== 'object') return;
  const score = (v, max) => (Number.isInteger(v) && v >= 1 && v <= max ? v : null);
  if (Array.isArray(trauma.gcs)) {
    traumaGcsE = score(trauma.gcs[0], 4);
    traumaGcsV = score(trauma.gcs[1], 5);
    traumaGcsM = score(trauma.gcs[2], 6);
    recalcTraumaGcs();
  }
  restoreSessionPupil('od', trauma.od);
  restoreSessionPupil('os', trauma.os);
  // Older saves kept only the airway tick, as airwayNormal.
  const normal = Array.isArray(trauma.normal) ? trauma.normal : (trauma.airwayNormal ? ['airway'] : []);
  Object.keys(SURVEY_NORMALS).forEach(key => {
    const check = document.getElementById(`${key}Check`);
    if (check) check.textContent = normal.includes(key) ? '✓' : '';
  });

  if (Array.isArray(trauma.pins)) {
    // Labels and colours are rebuilt from the tool table rather than trusted from storage.
    traumaPins = trauma.pins
      .filter(p => p && traumaToolMeta[p.type] && Number.isFinite(p.ix) && Number.isFinite(p.iy))
      .map((p, i) => ({
        id: i + 1,
        type: p.type,
        label: traumaToolMeta[p.type].name,
        loc: String(p.loc || ''),
        region: String(p.region || ''),
        group: String(p.group || ''),
        view: String(p.view || ''),
        side: String(p.side || ''),
        note: String(p.note || '').slice(0, 300),
        ix: p.ix,
        iy: p.iy,
        color: traumaToolMeta[p.type].color
      }));
    renderTraumaPins();
  }
}

function restoreSessionChips(chips) {
  if (!chips || typeof chips !== 'object') return;
  SESSION_CHIP_SCOPES.forEach(scope => {
    const saved = chips[scope];
    const buttons = sessionChipButtons(scope);
    // A different count means the markup changed since the save, so positions no longer name the same chips.
    if (!saved || !Array.isArray(saved.on) || saved.count !== buttons.length) return;
    saved.on.forEach(i => { if (buttons[i]) buttons[i].classList.add('active'); });
  });
}

function restoreSessionExam(exam) {
  if (!exam || typeof exam !== 'object' || typeof examMap === 'undefined') return;
  Object.keys(examMap).forEach(sys => {
    const saved = exam[sys];
    if (!saved || typeof saved !== 'object') return;
    const regions = {};
    Object.entries(saved.regions && typeof saved.regions === 'object' ? saved.regions : {}).forEach(([key, entry]) => {
      if (!entry || typeof entry !== 'object') return;
      const sel = {};
      Object.entries(entry.sel && typeof entry.sel === 'object' ? entry.sel : {}).forEach(([group, list]) => {
        if (Array.isArray(list)) sel[group] = list.filter(v => typeof v === 'string');
      });
      regions[key] = { sel, note: typeof entry.note === 'string' ? entry.note : '' };
    });
    examMap[sys].regions = regions;
    examMap[sys].pins = (Array.isArray(saved.pins) ? saved.pins : [])
      .filter(p => p && Number.isFinite(p.ix) && Number.isFinite(p.iy))
      .map(p => ({ ix: p.ix, iy: p.iy, loc: String(p.loc || ''), label: String(p.label || '') }));
  });
  if (typeof renderExamMap === 'function') renderExamMap();
}

function applySavedSession(data) {
  restoreSessionValues(data.values || {});
  restoreSessionTrauma(data.trauma);
  restoreSessionChips(data.chips);
  restoreSessionExam(data.exam);
  // Restoring fields fires input events, which would record a new key-in order: put the real one back.
  if (Array.isArray(data.hopiOrder)) {
    hopiKeyOrder.clear();
    data.hopiOrder.forEach(pair => { if (Array.isArray(pair)) hopiKeyOrder.set(pair[0], pair[1]); });
  }
  if (Array.isArray(data.inserted)) {
    cbInserted.clear();
    data.inserted.forEach(pair => { if (Array.isArray(pair)) cbInserted.set(pair[0], pair[1]); });
  }
}

// ---------- The question on load ----------
function describeSavedPatient(session) {
  const values = (session && session.data.values) || {};
  const parts = ['patientName', 'patientAge', 'patientGender', 'patientHospitalID']
    .map(id => (typeof values[id] === 'string' ? values[id].trim() : ''))
    .filter(Boolean);
  return parts.join(' · ') || 'No patient name was entered';
}

function describeSavedTime(ts) {
  const when = new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  return `Last edited ${when}`;
}

function finishSessionRestore(draft, session, message) {
  const area = document.getElementById('docArea');
  if (draft && area && !area.value.trim()) area.value = draft.text;
  if (session) {
    try { applySavedSession(session.data); } catch (e) { console.warn('[Session] Could not restore every field:', e); }
  }
  window.edDocRestorePending = false;
  sessionSaveReady = true;
  if (typeof cbRefresh === 'function') cbRefresh();
  if (message) showToast(message, 3500);
}

function initSessionRestore() {
  // Set by an update reload. Read and cleared straight away so it can only ever apply to that one reload.
  let resumeOnce = false;
  try {
    resumeOnce = sessionStorage.getItem(SESSION_RESUME_ONCE_KEY) === '1';
    sessionStorage.removeItem(SESSION_RESUME_ONCE_KEY);
  } catch (e) {}

  const draft = typeof readSavedDraft === 'function' ? readSavedDraft() : null;
  const session = readSavedSession();
  if (!draft && !session) {
    sessionSaveReady = true;
    return;
  }

  if (resumeOnce) {
    // This reload was the app updating itself in front of the same person.
    finishSessionRestore(draft, session, 'ED Doc was updated. Your work is restored.');
    return;
  }

  const modal = document.getElementById('resumeModal');
  if (!modal) {
    finishSessionRestore(draft, session, 'Draft restored');
    return;
  }
  // Nothing is saved while the question is open, or an empty page would overwrite what is being offered.
  window.edDocRestorePending = true;
  document.getElementById('resumeWho').textContent = describeSavedPatient(session);
  document.getElementById('resumeWhen').textContent = describeSavedTime(Math.max(draft ? draft.ts : 0, session ? session.ts : 0));

  const close = () => {
    modal.classList.remove('active');
    closeModalA11y(modal);
  };
  document.getElementById('resumeYes').addEventListener('click', () => {
    close();
    finishSessionRestore(draft, session, 'Restored');
  }, { once: true });
  document.getElementById('resumeNo').addEventListener('click', () => {
    close();
    wipeDraftStorage();
    wipeSessionStorage();
    window.edDocRestorePending = false;
    sessionSaveReady = true;
  }, { once: true });

  modal.classList.add('active');
  openModalA11y(modal);
}

// Registered last, so the templates are drawn and every other script has set itself up.
document.addEventListener('DOMContentLoaded', () => {
  initSessionRestore();

  ['input', 'change', 'click'].forEach(type => {
    let timer = null;
    document.addEventListener(type, () => {
      clearTimeout(timer);
      // Longer than clearSection's 150ms delay, so a cleared section is saved as cleared.
      timer = setTimeout(saveSessionNow, 400);
    });
  });
  // OCR and the template renderers fill fields without firing events.
  setInterval(() => { if (!document.hidden) saveSessionNow(); }, 3000);
  // A phone may discard the page any time after it is hidden.
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveSessionNow(); });
  window.addEventListener('pagehide', saveSessionNow);
});

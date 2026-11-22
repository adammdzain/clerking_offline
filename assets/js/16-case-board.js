/* =======================================================
   CASE BOARD (card summaries, note sheet, layout motion)
   Reads the app's fields and note; never writes to them.
   ======================================================= */
const CB_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const CB_VITALS = { vitalBP: 'BP', vitalHR: 'HR', vitalRR: 'RR', vitalTemp: 'Temp', vitalSpO2: 'SpO2' };
const CB_STATUS_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle class="ring" cx="8" cy="8" r="6.5"/><circle class="dot" cx="8" cy="8" r="3"/><path class="tick" pathLength="1" d="M4.8 8.3l2.2 2.2 4.2-4.6"/></svg>';
// Section id -> its summary at the moment it was inserted into the note.
const cbInserted = new Map();

function cbAnimate(el, frames, options) {
  if (CB_REDUCED_MOTION.matches || !el || !el.animate) return;
  el.animate(frames, Object.assign({ duration: 220, easing: 'cubic-bezier(.2, .8, .2, 1)' }, options));
}

// Wrap each flat label + chips + input run in its own box so fields can sit in columns.
// Order inside a run is untouched, so the sibling lookups in 03-clinical-notes.js still hold.
function cbGroupFields(box) {
  const startsField = el => el.tagName === 'LABEL' || el.classList.contains('vital-slider-label-row');
  const endsField = el => el.tagName === 'H4' || el.classList.contains('button-row') || el.classList.contains('ocr-zone') || el.classList.contains('grid-2') || el.classList.contains('grid-3');
  const kids = Array.from(box.children);
  if (!kids.some(startsField)) return;
  let field = null;
  kids.forEach(el => {
    if (startsField(el)) {
      field = document.createElement('div');
      field.className = 'cb-field';
      box.insertBefore(field, el);
      field.appendChild(el);
    } else if (endsField(el)) {
      field = null;
    } else if (field) {
      field.appendChild(el);
    }
  });
  box.classList.add('cb-grid');
}

function cbIsEntered(el) {
  if (el.dataset.skipExport !== undefined) return false;
  if (el.tagName === 'SELECT') {
    const option = el.options[el.selectedIndex];
    return !!option && !option.defaultSelected && !!el.value.trim();
  }
  return !!el.value.trim() && el.value !== el.defaultValue;
}

// One line of what a section holds, built only from values somebody entered.
function cbSummary(section) {
  if (section.id === 'vital-signs') {
    return Object.keys(CB_VITALS).reduce((parts, id) => {
      const el = document.getElementById(id);
      if (el && el.value.trim()) parts.push(`${CB_VITALS[id]} ${el.value.trim()}`);
      return parts;
    }, []).join(' · ');
  }
  const fields = section.querySelectorAll('input[type="text"], input[type="number"], input:not([type]), textarea, select');
  const parts = Array.from(fields).filter(cbIsEntered).map(el => el.value.trim());
  if (section.id === 'Trauma' && typeof traumaPins !== 'undefined' && traumaPins.length) {
    parts.push(`${traumaPins.length} injury ${traumaPins.length === 1 ? 'pin' : 'pins'}`);
  }
  if (section.id === 'examinations') {
    const findings = document.getElementById('examFindingCountLabel');
    if (findings && !/^0\b/.test(findings.textContent.trim())) parts.push(findings.textContent.trim());
  }
  return parts.join(' · ');
}

function cbPatientLine() {
  const parts = ['patientName', 'patientAge', 'patientGender', 'patientHospitalID'].map(id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }).filter(Boolean);
  return parts.join(' · ') || 'No patient entered';
}

function cbNoteStatus(text) {
  const headings = text.split('\n').filter(l => l.trim() && !/^\s/.test(l) && !l.startsWith('---'));
  if (!text.trim()) return 'Empty';
  if (!headings.length) return 'Has text';
  const last = headings[headings.length - 1].replace(/:$/, '');
  return `${headings.length} ${headings.length === 1 ? 'section' : 'sections'} · last: ${last}`;
}

function cbRefresh() {
  const note = document.getElementById('docArea').value;
  if (!note.trim()) cbInserted.clear();
  document.querySelectorAll('#main-sections .main-section').forEach(section => {
    const summary = cbSummary(section);
    const line = section.querySelector('.cb-summary');
    const status = section.querySelector('.cb-status');
    const done = cbInserted.has(section.id) && cbInserted.get(section.id) === summary;
    line.textContent = summary || 'Nothing entered';
    line.classList.toggle('has-data', !!summary);
    status.classList.toggle('is-done', done);
    status.classList.toggle('is-draft', !done && !!summary);
    const word = done ? 'In note' : summary ? 'Not inserted' : 'Empty';
    status.querySelector('.cb-status-text').textContent = word;
    status.setAttribute('aria-label', done ? 'In note' : summary ? 'Not inserted yet' : 'Nothing entered');
  });
  document.getElementById('cbPatient').textContent = cbPatientLine();
  document.getElementById('noteStatus').textContent = cbNoteStatus(note);
}

// Close the board's last row: the final closed card takes whatever cells are left over.
function cbFitBoard() {
  const board = document.getElementById('main-sections');
  const cards = Array.from(board.querySelectorAll('.main-section'));
  const closed = cards.filter(c => !c.classList.contains('is-expanded'));
  // Clear first: a leftover span adds an implicit column that would be counted below.
  cards.forEach(c => { c.style.gridColumn = ''; });
  const columns = getComputedStyle(board).gridTemplateColumns.split(' ').length;
  if (columns < 2 || !closed.length) return;
  closed[closed.length - 1].style.gridColumn = `span ${columns - (closed.length - 1) % columns}`;
}

function cbInitBoardMotion() {
  const board = document.getElementById('main-sections');
  let before = null;
  // Capture runs before the accordion handler in 01-core.js; bubble runs after it.
  board.addEventListener('click', e => {
    if (!e.target.closest('.main-collapsible')) return;
    before = new Map(Array.from(board.querySelectorAll('.main-section')).map(c => [c, c.getBoundingClientRect()]));
  }, true);
  board.addEventListener('click', e => {
    const button = e.target.closest('.main-collapsible');
    if (!button || !before) return;
    const opened = button.closest('.main-section');
    const first = before;
    before = null;
    cbFitBoard();
    first.forEach((a, card) => {
      const b = card.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (card === opened && card.classList.contains('is-expanded')) {
        const clip = `inset(0 ${Math.max(0, b.width - a.width)}px ${Math.max(0, b.height - a.height)}px 0 round 8px)`;
        cbAnimate(card, [{ transform: `translate(${dx}px, ${dy}px)`, clipPath: clip }, { transform: 'none', clipPath: 'inset(0 0 0 0 round 8px)' }], { duration: 320 });
        cbAnimate(card.querySelector('.main-content'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: 90, fill: 'backwards' });
      } else if (dx || dy) {
        cbAnimate(card, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 320 });
      }
    });
    if (opened.classList.contains('is-expanded')) cbRevealCard(opened);
  });
}

function cbRevealCard(card) {
  const header = document.querySelector('body > header');
  const offset = (getComputedStyle(header).position === 'sticky' ? header.offsetHeight : 0) + 12;
  const top = card.getBoundingClientRect().top;
  if (top >= offset && top <= window.innerHeight * 0.5) return;
  window.scrollTo({ top: window.scrollY + top - offset, behavior: CB_REDUCED_MOTION.matches ? 'auto' : 'smooth' });
}

// On wide screens the note is docked beside the board and always open (see the CSS of the same width).
const CB_DOCKED = window.matchMedia('screen and (min-width: 1181px)');

function setNoteSheet(open) {
  if (CB_DOCKED.matches) open = true;
  document.body.classList.toggle('note-open', open);
  document.getElementById('noteToggle').setAttribute('aria-expanded', String(open));
}

function toggleNoteSheet() {
  setNoteSheet(!document.body.classList.contains('note-open'));
}

function cbInitNoteDock() {
  const header = document.querySelector('body > header');
  const track = () => document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  track();
  new ResizeObserver(track).observe(header);
  setNoteSheet(CB_DOCKED.matches);
  CB_DOCKED.addEventListener('change', () => setNoteSheet(CB_DOCKED.matches));
}

function cbInitNoteSheet() {
  const sheet = document.querySelector('.output-container');
  const header = document.getElementById('docHeaderRow');

  // The closed sheet stays reachable: tabbing into its contents opens it.
  sheet.addEventListener('focusin', e => {
    if (!header.contains(e.target)) setNoteSheet(true);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || CB_DOCKED.matches || !document.body.classList.contains('note-open')) return;
    if (document.querySelector('.modal-backdrop.active, .forms-menu.open')) return;
    setNoteSheet(false);
    document.getElementById('noteToggle').focus();
  });
  // Dictation types into the note, so the note has to be on screen while it runs.
  new MutationObserver(() => {
    if (document.getElementById('dictateBtn').classList.contains('recording')) setNoteSheet(true);
  }).observe(document.getElementById('dictateBtn'), { attributes: true, attributeFilter: ['class'] });

  // Inserting grows the note: mark the section and nudge the sheet so the change is seen.
  document.addEventListener('click', e => {
    const section = e.target.closest('#main-sections .main-section');
    if (!section) return;
    const area = document.getElementById('docArea');
    const beforeNote = area.value;
    setTimeout(() => {
      if (area.value !== beforeNote) {
        cbInserted.set(section.id, cbSummary(section));
        cbAnimate(header, [{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 260 });
      }
      cbRefresh();
    }, 0);
  }, true);

  // Replaces the textarea's own drag handle: drag the sheet's top edge, or use the arrow keys.
  const grip = document.getElementById('noteGrip');
  const setHeight = h => {
    const height = Math.round(Math.min(window.innerHeight - 72, Math.max(200, h)));
    document.documentElement.style.setProperty('--sheet-h', `${height}px`);
  };
  grip.addEventListener('pointerdown', e => {
    grip.setPointerCapture(e.pointerId);
    document.body.classList.add('cb-dragging');
  });
  grip.addEventListener('pointermove', e => {
    if (grip.hasPointerCapture(e.pointerId)) setHeight(window.innerHeight - e.clientY);
  });
  grip.addEventListener('pointerup', () => document.body.classList.remove('cb-dragging'));
  grip.addEventListener('pointercancel', () => document.body.classList.remove('cb-dragging'));
  grip.addEventListener('keydown', e => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    setHeight(sheet.offsetHeight + (e.key === 'ArrowUp' ? 40 : -40));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.main-collapsible').forEach(button => {
    const status = document.createElement('span');
    status.className = 'cb-status';
    status.setAttribute('role', 'img');
    status.innerHTML = `${CB_STATUS_ICON}<span class="cb-status-text" aria-hidden="true"></span>`;
    const summary = document.createElement('span');
    summary.className = 'cb-summary';
    button.insertBefore(status, button.querySelector('.arrow'));
    button.appendChild(summary);
  });
  document.querySelectorAll('#patient-demographic .main-content, #medical-history .main-content, #main-sections .content').forEach(cbGroupFields);

  cbInitBoardMotion();
  cbInitNoteSheet();
  cbInitNoteDock();
  cbFitBoard();
  cbRefresh();

  ['input', 'change', 'click'].forEach(type => {
    let timer = null;
    document.addEventListener(type, () => {
      clearTimeout(timer);
      // Longer than clearSection's 150ms delay, so cleared cards update too.
      timer = setTimeout(cbRefresh, 200);
    });
  });
  // OCR, dictation and the template renderers fill fields without firing events.
  setInterval(() => { if (!document.hidden) cbRefresh(); }, 1500);
  new ResizeObserver(cbFitBoard).observe(document.getElementById('main-sections'));
});

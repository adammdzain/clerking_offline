/* =======================================================
   SYSTEMIC EXAMINATION MAP (Physical Examination tab)
   Shares the body figure + image-pixel coordinate system
   (1778 x 2025) with the trauma diagram.
   ======================================================= */
const EXAM_SYSTEMS = {
  resp: {
    title: 'Respiratory', noteHeader: 'Physical Examination - Respiratory', notesId: 'respNotes',
    color: '#0d9488', groupBy: 'finding',
    shade: r => ({ upper: '#5eead4', middle: '#14b8a6', lower: '#0f766e' })[r.name.split(' ')[0].toLowerCase()] || '#14b8a6',
    regions: [
      ['A', 'Upper zone',  'Right', 'U', '383,372 457,372 457,480 330,480'],
      ['A', 'Upper zone',  'Left',  'U', '457,372 524,372 579,480 457,480'],
      ['A', 'Middle zone', 'Right', 'M', '330,480 457,480 457,590 282,590 281,578'],
      ['A', 'Middle zone', 'Left',  'M', '457,480 579,480 629,578 630,590 457,590'],
      ['A', 'Lower zone',  'Right', 'L', '282,590 457,590 457,700 291,700 286,660 283,620'],
      ['A', 'Lower zone',  'Left',  'L', '457,590 630,590 634,620 632,660 627,700 457,700'],
      ['P', 'Upper zone',  'Left',  'U', '1218,360 1290,360 1290,475 1156,475'],
      ['P', 'Upper zone',  'Right', 'U', '1290,360 1362,360 1422,475 1290,475'],
      ['P', 'Middle zone', 'Left',  'M', '1156,475 1290,475 1290,590 1102,590 1101,578'],
      ['P', 'Middle zone', 'Right', 'M', '1290,475 1422,475 1476,578 1475,590 1290,590'],
      ['P', 'Lower zone',  'Left',  'L', '1102,590 1290,590 1290,760 1133,760 1132,740 1127,720 1121,700 1112,660 1106,620'],
      ['P', 'Lower zone',  'Right', 'L', '1290,590 1475,590 1474,620 1469,660 1463,700 1459,720 1454,740 1452,760 1290,760']
    ],
    groups: [
      { key: 'bs', label: 'Breath sounds', single: true, options: ['Vesicular breath sounds', 'Bronchial breath sounds', 'Reduced breath sounds', 'Absent breath sounds'] },
      { key: 'added', label: 'Added sounds', options: ['Fine crepitations', 'Coarse crepitations', 'Rhonchi / wheeze', 'Pleural rub'] },
      { key: 'perc', label: 'Percussion', single: true, options: ['Resonant', 'Dull to percussion', 'Stony dull', 'Hyperresonant'] },
      { key: 'other', label: 'Other', options: ['Increased vocal resonance', 'Decreased vocal resonance', 'Reduced expansion'] }
    ]
  },
  cvs: {
    title: 'Cardiovascular', noteHeader: 'Physical Examination - Cardiovascular', notesId: 'cvsNotes',
    color: '#dc2626', groupBy: 'region',
    shade: r => ({ 'Aortic area': '#f87171', 'Pulmonary area': '#fb7185', 'Tricuspid area': '#ef4444', 'Mitral / apex': '#b91c1c' })[r.name] || '#ef4444',
    regions: [
      ['A', 'Aortic area',    '', 'A', '390,425 457,425 457,515 390,515'],
      ['A', 'Pulmonary area', '', 'P', '457,425 524,425 524,515 457,515'],
      ['A', 'Tricuspid area', '', 'T', '457,535 524,535 524,630 457,630'],
      ['A', 'Mitral / apex',  '', 'M', '524,545 615,545 615,650 524,650']
    ],
    groups: [
      { key: 'hs', label: 'Heart sounds', single: true, options: ['S1 S2 normal', 'Soft heart sounds', 'Loud heart sounds'] },
      { key: 'added', label: 'Added sounds', options: ['S3', 'S4', 'Opening snap / click', 'Pericardial rub'] },
      { key: 'murmur', label: 'Murmur', single: true, options: ['Ejection systolic murmur', 'Pansystolic murmur', 'Late systolic murmur', 'Early diastolic murmur', 'Mid-diastolic murmur', 'Continuous murmur'] },
      { key: 'grade', label: 'Murmur grade', single: true, options: ['Grade 1/6', 'Grade 2/6', 'Grade 3/6', 'Grade 4/6', 'Grade 5/6', 'Grade 6/6'] },
      { key: 'rad', label: 'Radiation', options: ['Radiating to carotids', 'Radiating to axilla', 'Radiating to back'] },
      { key: 'palp', label: 'Palpation', options: ['Thrill', 'Heave'] },
      { key: 'apex', label: 'Apex beat', single: true, options: r => r.name === 'Mitral / apex' ? ['Apex non-displaced', 'Apex displaced'] : [] }
    ]
  },
  abd: {
    title: 'Abdominal', noteHeader: 'Physical Examination - Abdomen', notesId: 'abdNotes',
    color: '#ea580c', groupBy: 'region',
    shade: r => ({ Hypochondrium: '#fdba74', Epigastric: '#fdba74', 'Lumbar (flank)': '#fb923c', Umbilical: '#fb923c', 'Iliac fossa': '#ea580c', 'Hypogastric (suprapubic)': '#ea580c', 'Groin / hernial orifices': '#c2410c' })[r.name] || '#fb923c',
    regions: [
      ['A', 'Hypochondrium', 'Right', 'RH', '291,700 295,720 298,740 301,760 303,780 303,797 409,797 408,780 407,760 405,740 404,720 403,700'],
      ['A', 'Epigastric', '', 'Epi', '403,700 404,720 405,740 407,760 408,780 409,797 515,797 513,780 513,760 513,740 514,720 515,700'],
      ['A', 'Hypochondrium', 'Left', 'LH', '515,700 514,720 513,740 513,760 513,780 515,797 621,797 618,780 619,760 620,740 624,720 627,700'],
      ['A', 'Lumbar (flank)', 'Right', 'RL', '303,797 302,817 301,837 300,857 296,877 292,893 403,893 406,877 408,857 409,837 409,817 409,797'],
      ['A', 'Umbilical', '', 'Umb', '409,797 409,817 409,837 408,857 406,877 403,893 515,893 516,877 517,857 517,837 516,817 515,797'],
      ['A', 'Lumbar (flank)', 'Left', 'LL', '515,797 516,817 517,837 517,857 516,877 515,893 627,893 626,877 625,857 624,837 624,817 621,797'],
      ['A', 'Iliac fossa', 'Right', 'RIF', '292,893 289,913 288,933 286,953 284,973 283,990 404,990 403,973 403,953 402,933 402,913 403,893'],
      ['A', 'Hypogastric (suprapubic)', '', 'Hyp', '403,893 402,913 402,933 403,953 403,973 404,990 525,990 522,973 519,953 516,933 515,913 515,893'],
      ['A', 'Iliac fossa', 'Left', 'LIF', '515,893 515,913 516,933 519,953 522,973 525,990 646,990 642,973 635,953 630,933 628,913 627,893'],
      ['A', 'Groin / hernial orifices', '', 'Groin', '283,990 282,1010 279,1030 274,1050 270,1070 266,1090 264,1100 659,1100 657,1090 654,1070 652,1050 651,1030 649,1010 646,990']
    ],
    groups: [
      { key: 'tender', label: 'Tenderness', single: true, options: ['Mild tenderness', 'Moderate tenderness', 'Severe tenderness'] },
      { key: 'perit', label: 'Peritonism', options: ['Guarding', 'Rigidity', 'Rebound tenderness'] },
      { key: 'mass', label: 'Mass / organ', options: r => {
          const o = ['Palpable mass'];
          if (r.name === 'Hypochondrium' && r.side === 'Right') o.push('Hepatomegaly');
          if (r.name === 'Hypochondrium' && r.side === 'Left') o.push('Splenomegaly');
          if (r.name === 'Lumbar (flank)') o.push('Ballotable kidney');
          if (r.name === 'Hypogastric (suprapubic)') o.push('Palpable bladder');
          if (r.name === 'Groin / hernial orifices') o.push('Inguinal lymphadenopathy');
          return o;
        } },
      { key: 'perc', label: 'Percussion', options: ['Dull to percussion'] },
      { key: 'signs', label: 'Signs', options: r => {
          if (r.name === 'Hypochondrium' && r.side === 'Right') return ['Murphy sign positive'];
          if (r.name === 'Iliac fossa' && r.side === 'Right') return ['McBurney point tenderness', 'Rovsing sign positive'];
          if (r.name === 'Groin / hernial orifices') return ['Reducible hernia', 'Irreducible hernia', 'Cough impulse positive'];
          return [];
        } }
    ]
  }
};
const EXAM_SYSTEM_KEYS = ['resp', 'cvs', 'abd'];

const examMap = { resp: { regions: {}, pins: [] }, cvs: { regions: {}, pins: [] }, abd: { regions: {}, pins: [] } };
const examUndo = { resp: [], cvs: [], abd: [] };
let currentExamSystem = 'resp';
let examMode = 'region';
let examSelectedKey = null;
const examRegionCache = {};

function getExamRegions(sys) {
  if (!examRegionCache[sys]) {
    examRegionCache[sys] = EXAM_SYSTEMS[sys].regions.map(r => {
      const reg = {
        view: r[0] === 'A' ? 'anterior' : 'posterior', name: r[1], side: r[2], abbr: r[3],
        pts: r[4].split(' ').map(p => p.split(',').map(Number))
      };
      reg.key = `${reg.view}|${reg.side}|${reg.name}`;
      reg.label = (reg.side ? reg.side + ' ' : '') + reg.name;
      return reg;
    });
  }
  return examRegionCache[sys];
}
function examRegionByKey(sys, key) { return getExamRegions(sys).find(r => r.key === key) || null; }
function examRegionShortLabel(reg) {
  const n = reg.name.toLowerCase();
  return (reg.side ? reg.side[0] + ' ' : '') + n;
}
function examRegionWithView(reg, sys) {
  return examRegionShortLabel(reg) + (sys === 'resp' ? ` (${reg.view})` : '');
}

function findExamRegion(sys, ix, iy) {
  const regions = getExamRegions(sys);
  let hit = null;
  regions.forEach(r => { if (traumaPointInPoly(ix, iy, r.pts)) hit = r; });
  if (hit) return hit;
  let near = null, nearD = 45;
  regions.forEach(r => {
    const d = traumaDistToPoly(ix, iy, r.pts);
    if (d < nearD) { nearD = d; near = r; }
  });
  return near;
}

function getExamImageBox() {
  const canvas = document.getElementById('examDiagramCanvas');
  const svg = canvas && canvas.querySelector('svg.body-figure');
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const s = Math.min(r.width / 640, r.height / 729);
  const w = 640 * s, h = 729 * s;
  return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, w, h };
}

function examRegionEntry(sys, key, create) {
  const store = examMap[sys].regions;
  if (!store[key] && create) store[key] = { sel: {}, note: '' };
  return store[key] || null;
}
function examRegionFindings(entry) {
  if (!entry) return [];
  const out = [];
  Object.keys(entry.sel).forEach(k => (entry.sel[k] || []).forEach(v => out.push(v)));
  return out;
}
function examRegionHasData(entry) { return !!entry && (examRegionFindings(entry).length > 0 || !!(entry.note && entry.note.trim())); }
function examSystemHasData(sys) {
  const d = examMap[sys];
  const notes = document.getElementById(EXAM_SYSTEMS[sys].notesId);
  return Object.keys(d.regions).some(k => examRegionHasData(d.regions[k])) || d.pins.length > 0 || !!(notes && notes.value.trim());
}
function examMapHasData() { return EXAM_SYSTEM_KEYS.some(examSystemHasData); }
function examSystemCount(sys) {
  const d = examMap[sys];
  return Object.keys(d.regions).reduce((n, k) => n + examRegionFindings(d.regions[k]).length, 0) + d.pins.length;
}

function pushExamUndo(sys) {
  examUndo[sys].push(JSON.stringify(examMap[sys]));
  if (examUndo[sys].length > 40) examUndo[sys].shift();
}
function undoExamAction() {
  const snap = examUndo[currentExamSystem].pop();
  if (!snap) { showToast('Nothing to undo'); return; }
  examMap[currentExamSystem] = JSON.parse(snap);
  if (examSelectedKey && !examRegionEntry(currentExamSystem, examSelectedKey)) closeExamPanel();
  renderExamMap();
  if (examSelectedKey) openExamRegionPanel(examSelectedKey);
}

function initExamMap() {
  const canvas = document.getElementById('examDiagramCanvas');
  const overlay = document.getElementById('examRegionOverlay');
  if (!canvas || !overlay || canvas.querySelector('svg.body-figure')) return;
  const src = document.querySelector('#traumaDiagramCanvas svg.body-figure');
  if (!src) return;
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  canvas.insertBefore(clone, overlay);
  overlay.setAttribute('preserveAspectRatio', 'none');
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => positionExamOverlay()).observe(canvas);
  }
  window.addEventListener('resize', () => positionExamOverlay());
  buildExamOverlay();
  renderExamMap();
}

function positionExamOverlay() {
  const canvas = document.getElementById('examDiagramCanvas');
  const overlay = document.getElementById('examRegionOverlay');
  const box = getExamImageBox();
  if (!canvas || !overlay || !box) return;
  const cRect = canvas.getBoundingClientRect();
  overlay.style.left = (box.left - cRect.left - canvas.clientLeft) + 'px';
  overlay.style.top = (box.top - cRect.top - canvas.clientTop) + 'px';
  overlay.style.width = box.w + 'px';
  overlay.style.height = box.h + 'px';
  overlay.style.inset = 'auto';
  renderExamPins(box, cRect, canvas);
}

function buildExamOverlay() {
  const overlay = document.getElementById('examRegionOverlay');
  if (!overlay) return;
  const NS = 'http://www.w3.org/2000/svg';
  overlay.innerHTML = '';
  const sys = currentExamSystem, cfg = EXAM_SYSTEMS[sys];
  const gP = document.createElementNS(NS, 'g'), gL = document.createElementNS(NS, 'g');
  overlay.appendChild(gP); overlay.appendChild(gL);
  getExamRegions(sys).forEach(r => {
    const p = document.createElementNS(NS, 'polygon');
    p.setAttribute('points', r.pts.map(q => q.join(',')).join(' '));
    p.setAttribute('class', 'exam-region');
    p.setAttribute('fill', cfg.shade(r));
    p.dataset.key = r.key;
    const t = document.createElementNS(NS, 'title');
    t.textContent = r.label + (sys === 'resp' ? ` (${r.view})` : '');
    p.appendChild(t);
    gP.appendChild(p);
    r.el = p;

    const xs = r.pts.map(q => q[0]), ys = r.pts.map(q => q[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const tx = document.createElementNS(NS, 'text');
    tx.setAttribute('x', cx); tx.setAttribute('y', cy + 16);
    tx.setAttribute('class', 'exam-region-label');
    tx.style.fontSize = r.abbr.length > 2 ? '38px' : '48px';
    tx.textContent = r.abbr;
    gL.appendChild(tx);
  });
}

function setExamMode(mode, btn) {
  examMode = mode;
  document.querySelectorAll('.exam-mode-btn').forEach(b => b.classList.toggle('active', b === btn || b.dataset.mode === mode));
  const hint = document.getElementById('examMapHint');
  if (hint) hint.textContent = mode === 'pin'
    ? 'Click anywhere on the body to drop a free pin, then type what you found.'
    : 'Click a region on the body to record findings. Side labels are the patient\'s.';
}

function switchExamSystem(sys, btn) {
  if (!EXAM_SYSTEMS[sys]) return;
  currentExamSystem = sys;
  document.querySelectorAll('.exam-sys-btn').forEach(b => b.classList.toggle('active', b.dataset.sys === sys));
  document.querySelectorAll('.exam-notes, .exam-notes-label').forEach(el => { el.style.display = el.dataset.sys === sys ? '' : 'none'; });
  const ins = document.getElementById('examInsertSystemBtn');
  if (ins) ins.textContent = `Insert ${EXAM_SYSTEMS[sys].title}`;
  const lt = document.getElementById('examLedgerTitle');
  if (lt) lt.textContent = `RECORDED FINDINGS (${EXAM_SYSTEMS[sys].title.toUpperCase()})`;
  closeExamPanel();
  buildExamOverlay();
  renderExamMap();
}

function handleExamDiagramClick(e) {
  if (e.target && e.target.closest && e.target.closest('.injury-pin')) return;
  const box = getExamImageBox();
  if (!box) return;
  const ix = ((e.clientX - box.left) / box.w) * TRAUMA_IMG_W;
  const iy = ((e.clientY - box.top) / box.h) * TRAUMA_IMG_H;
  const sys = currentExamSystem;

  if (examMode === 'pin') {
    const anat = typeof findTraumaRegion === 'function' ? findTraumaRegion(ix, iy) : null;
    if (!anat) return;
    pushExamUndo(sys);
    const loc = (anat.side ? anat.side + ' ' : '') + anat.name + ` (${anat.view})`;
    examMap[sys].pins.push({ ix: Math.round(ix), iy: Math.round(iy), loc, label: '' });
    renderExamMap();
    openExamPinPanel(examMap[sys].pins.length - 1);
    return;
  }

  const reg = findExamRegion(sys, ix, iy);
  if (!reg) {
    showToast(`No ${EXAM_SYSTEMS[sys].title.toLowerCase()} region there`);
    return;
  }
  openExamRegionPanel(reg.key);
}

function closeExamPanel() {
  examSelectedKey = null;
  const panel = document.getElementById('examFindingPanel');
  if (panel) panel.innerHTML = '<div class="exam-panel-empty">Select a region on the figure to open its findings.</div>';
  document.querySelectorAll('#examRegionOverlay .exam-region.selected').forEach(p => p.classList.remove('selected'));
}

function openExamRegionPanel(key) {
  const sys = currentExamSystem, cfg = EXAM_SYSTEMS[sys];
  const reg = examRegionByKey(sys, key);
  const panel = document.getElementById('examFindingPanel');
  if (!reg || !panel) return;
  examSelectedKey = key;
  document.querySelectorAll('#examRegionOverlay .exam-region').forEach(p => p.classList.toggle('selected', p.dataset.key === key));
  const entry = examRegionEntry(sys, key, false) || { sel: {}, note: '' };

  panel.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'exam-panel-title';
  head.innerHTML = `<span><b>${reg.label}</b> <small>${sys === 'resp' ? reg.view + ' view · ' : ''}${cfg.title}</small></span>`;
  const headBtns = document.createElement('span');
  headBtns.style.cssText = 'display:flex; gap:4px;';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button'; clearBtn.className = 'injury-tool-btn'; clearBtn.textContent = 'Clear region';
  clearBtn.onclick = () => { pushExamUndo(sys); delete examMap[sys].regions[key]; renderExamMap(); openExamRegionPanel(key); };
  const doneBtn = document.createElement('button');
  doneBtn.type = 'button'; doneBtn.className = 'injury-tool-btn'; doneBtn.textContent = 'Done';
  doneBtn.onclick = closeExamPanel;
  headBtns.appendChild(clearBtn); headBtns.appendChild(doneBtn);
  head.appendChild(headBtns);
  panel.appendChild(head);

  cfg.groups.forEach(g => {
    const opts = typeof g.options === 'function' ? g.options(reg) : g.options;
    if (!opts || !opts.length) return;
    const lbl = document.createElement('div');
    lbl.className = 'exam-group-label'; lbl.textContent = g.label;
    panel.appendChild(lbl);
    const row = document.createElement('div');
    row.className = 'exam-chip-row';
    opts.forEach(opt => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip-btn'; b.textContent = opt;
      if ((entry.sel[g.key] || []).includes(opt)) b.classList.add('active');
      b.onclick = () => toggleExamFinding(key, g.key, opt, !!g.single);
      row.appendChild(b);
    });
    panel.appendChild(row);
  });

  const noteLbl = document.createElement('div');
  noteLbl.className = 'exam-group-label'; noteLbl.textContent = 'Region note';
  panel.appendChild(noteLbl);
  const note = document.createElement('input');
  note.type = 'text'; note.className = 'exam-region-note'; note.maxLength = 300;
  note.placeholder = 'Optional detail for this region (e.g. 4cm below costal margin, smooth edge)';
  note.value = entry.note || '';
  note.addEventListener('input', () => {
    const en = examRegionEntry(sys, key, true);
    en.note = note.value;
    renderExamMap();
  });
  panel.appendChild(note);
}

function toggleExamFinding(key, groupKey, opt, single) {
  const sys = currentExamSystem;
  pushExamUndo(sys);
  const en = examRegionEntry(sys, key, true);
  const cur = en.sel[groupKey] || [];
  if (cur.includes(opt)) {
    en.sel[groupKey] = cur.filter(v => v !== opt);
  } else {
    en.sel[groupKey] = single ? [opt] : cur.concat([opt]);
  }
  if (!en.sel[groupKey].length) delete en.sel[groupKey];
  if (!examRegionHasData(en)) delete examMap[sys].regions[key];
  renderExamMap();
  openExamRegionPanel(key);
}

function openExamPinPanel(idx) {
  const sys = currentExamSystem, cfg = EXAM_SYSTEMS[sys];
  const pin = examMap[sys].pins[idx];
  const panel = document.getElementById('examFindingPanel');
  if (!pin || !panel) return;
  examSelectedKey = null;
  document.querySelectorAll('#examRegionOverlay .exam-region.selected').forEach(p => p.classList.remove('selected'));
  panel.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'exam-panel-title';
  head.innerHTML = `<span><b>Pin P${idx + 1}</b> <small>${escapeHtml(pin.loc)} · ${cfg.title}</small></span>`;
  const doneBtn = document.createElement('button');
  doneBtn.type = 'button'; doneBtn.className = 'injury-tool-btn'; doneBtn.textContent = 'Done';
  doneBtn.onclick = closeExamPanel;
  head.appendChild(doneBtn);
  panel.appendChild(head);
  const lbl = document.createElement('div');
  lbl.className = 'exam-group-label'; lbl.textContent = 'Finding';
  panel.appendChild(lbl);
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'exam-region-note'; inp.maxLength = 200;
  inp.placeholder = 'e.g. JVP raised 4cm, stridor, surgical scar, sacral oedema';
  inp.value = pin.label || '';
  inp.addEventListener('input', () => { pin.label = inp.value; renderExamMap(); });
  inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') closeExamPanel(); });
  panel.appendChild(inp);
  setTimeout(() => inp.focus(), 0);
}

function removeExamPin(idx) {
  const sys = currentExamSystem;
  pushExamUndo(sys);
  examMap[sys].pins.splice(idx, 1);
  closeExamPanel();
  renderExamMap();
}
function removeExamRegion(key) {
  const sys = currentExamSystem;
  pushExamUndo(sys);
  delete examMap[sys].regions[key];
  if (examSelectedKey === key) closeExamPanel();
  renderExamMap();
}

function renderExamPins(box, cRect, canvas) {
  const container = document.getElementById('examPinsContainer');
  if (!container) return;
  container.innerHTML = '';
  if (!box) return;
  const sys = currentExamSystem, cfg = EXAM_SYSTEMS[sys];
  examMap[sys].pins.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'injury-pin exam-pin';
    el.style.left = (box.left - cRect.left - canvas.clientLeft + (p.ix / TRAUMA_IMG_W) * box.w) + 'px';
    el.style.top = (box.top - cRect.top - canvas.clientTop + (p.iy / TRAUMA_IMG_H) * box.h) + 'px';
    el.style.background = cfg.color;
    el.textContent = `P${i + 1}`;
    el.title = (p.label || 'Pin') + ' - ' + p.loc;
    el.onclick = ev => { ev.stopPropagation(); openExamPinPanel(i); };
    container.appendChild(el);
  });
}

function renderExamMap() {
  const sys = currentExamSystem, cfg = EXAM_SYSTEMS[sys], data = examMap[sys];
  getExamRegions(sys).forEach(r => {
    if (r.el) r.el.classList.toggle('has-findings', examRegionHasData(data.regions[r.key]));
  });
  positionExamOverlay();

  const ledger = document.getElementById('examLedgerList');
  if (ledger) {
    ledger.innerHTML = '';
    const keys = Object.keys(data.regions).filter(k => examRegionHasData(data.regions[k]));
    if (!keys.length && !data.pins.length) {
      ledger.innerHTML = `<div style="color:var(--muted); font-size:12px; font-style:italic; padding:8px 0; text-align:center;">No ${cfg.title.toLowerCase()} findings recorded. Only what you mark here will be documented.</div>`;
    }
    keys.forEach(k => {
      const reg = examRegionByKey(sys, k);
      if (!reg) return;
      const en = data.regions[k];
      const item = document.createElement('div');
      item.className = 'injury-item exam-ledger-item';
      const f = examRegionFindings(en).join(', ');
      item.innerHTML = `<span class="exam-swatch" style="background:${cfg.shade(reg)}"></span>` +
        `<span class="exam-ledger-text"><b>${reg.label}${sys === 'resp' ? ' (' + reg.view + ')' : ''}</b>: ${escapeHtml(f) || '-'}${en.note ? ' <em>- ' + escapeHtml(en.note) + '</em>' : ''}</span>`;
      const rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'exam-ledger-remove'; rm.title = 'Remove'; rm.textContent = '\u00d7';
      rm.onclick = () => removeExamRegion(k);
      item.appendChild(rm);
      item.addEventListener('click', ev => { if (ev.target !== rm) openExamRegionPanel(k); });
      ledger.appendChild(item);
    });
    data.pins.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'injury-item exam-ledger-item';
      item.innerHTML = `<span class="exam-swatch" style="background:transparent; border:2px solid ${cfg.color}"></span>` +
        `<span class="exam-ledger-text"><b>P${i + 1} ${escapeHtml(p.loc)}</b>: ${p.label ? escapeHtml(p.label) : '<em>no label yet</em>'}</span>`;
      const rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'exam-ledger-remove'; rm.title = 'Remove'; rm.textContent = '\u00d7';
      rm.onclick = () => removeExamPin(i);
      item.appendChild(rm);
      item.addEventListener('click', ev => { if (ev.target !== rm) openExamPinPanel(i); });
      ledger.appendChild(item);
    });
  }

  const countEl = document.getElementById('examFindingCountLabel');
  if (countEl) {
    const total = EXAM_SYSTEM_KEYS.reduce((n, k) => n + examSystemCount(k), 0);
    countEl.textContent = `${total} finding${total === 1 ? '' : 's'} \u00b7 Resp ${examSystemCount('resp')} \u00b7 CVS ${examSystemCount('cvs')} \u00b7 Abd ${examSystemCount('abd')}`;
  }
}

// Builds the note lines for one system (blank-by-default: nothing marked = nothing written)
function buildExamSystemLines(sys) {
  const cfg = EXAM_SYSTEMS[sys], data = examMap[sys];
  const lines = [];
  const keys = Object.keys(data.regions).filter(k => examRegionHasData(data.regions[k]));
  const regs = keys.map(k => ({ reg: examRegionByKey(sys, k), en: data.regions[k] })).filter(x => x.reg);

  if (cfg.groupBy === 'finding') {
    const byFinding = new Map();
    regs.forEach(({ reg, en }) => {
      examRegionFindings(en).forEach(f => {
        if (!byFinding.has(f)) byFinding.set(f, []);
        byFinding.get(f).push(reg);
      });
    });
    byFinding.forEach((list, finding) => {
      const byNameView = new Map();
      list.forEach(r => {
        const k = `${r.name}|${r.view}`;
        if (!byNameView.has(k)) byNameView.set(k, { name: r.name, view: r.view, sides: new Set() });
        byNameView.get(k).sides.add(r.side || '');
      });
      const locs = [];
      byNameView.forEach(v => {
        const n = v.name.toLowerCase();
        if (v.sides.has('Right') && v.sides.has('Left')) locs.push(`bilateral ${n}s (${v.view})`);
        else v.sides.forEach(s => locs.push(`${s ? s[0] + ' ' : ''}${n} (${v.view})`));
      });
      lines.push(`${finding}: ${locs.join('; ')}`);
    });
    regs.forEach(({ reg, en }) => {
      if (en.note && en.note.trim()) lines.push(`Note (${examRegionWithView(reg, sys)}): ${en.note.trim()}`);
    });
  } else {
    regs.forEach(({ reg, en }) => {
      const f = examRegionFindings(en);
      const txt = f.join(', ') + (en.note && en.note.trim() ? (f.length ? ' - ' : '') + en.note.trim() : '');
      lines.push(`${reg.label}: ${txt}`);
    });
  }

  if (data.pins.length) {
    lines.push('Pins: ' + data.pins.map((p, i) => `P${i + 1} ${p.loc} - ${p.label && p.label.trim() ? p.label.trim() : 'unlabelled'}`).join('; '));
  }
  const notes = document.getElementById(cfg.notesId);
  if (notes && notes.value.trim()) lines.push(`Notes: ${notes.value.trim()}`);
  return lines;
}

function insertExamSystem() {
  const sys = currentExamSystem, cfg = EXAM_SYSTEMS[sys];
  const lines = buildExamSystemLines(sys);
  if (!lines.length) { showToast(`No ${cfg.title.toLowerCase()} findings recorded yet`); return; }
  if (!medicalNoteGuard()) return;
  appendSection(cfg.noteHeader, lines);
  showToast(`${cfg.title} examination inserted`);
}

function insertAllExamSystems() {
  if (!EXAM_SYSTEM_KEYS.some(sys => buildExamSystemLines(sys).length)) { showToast('No examination findings recorded yet'); return; }
  if (!medicalNoteGuard()) return;
  let n = 0;
  EXAM_SYSTEM_KEYS.forEach(sys => {
    const lines = buildExamSystemLines(sys);
    if (!lines.length) return;
    appendSection(EXAM_SYSTEMS[sys].noteHeader, lines);
    n++;
  });
  showToast(n ? `${n} examination system${n === 1 ? '' : 's'} inserted` : 'No examination findings recorded yet');
}

function clearExamSystem() {
  const sys = currentExamSystem;
  pushExamUndo(sys);
  examMap[sys] = { regions: {}, pins: [] };
  const notes = document.getElementById(EXAM_SYSTEMS[sys].notesId);
  if (notes) notes.value = '';
  closeExamPanel();
  renderExamMap();
}

function clearAllExamSystems() {
  if (!confirm('Clear all respiratory, cardiovascular and abdominal examination findings?')) return;
  EXAM_SYSTEM_KEYS.forEach(sys => {
    pushExamUndo(sys);
    examMap[sys] = { regions: {}, pins: [] };
    const notes = document.getElementById(EXAM_SYSTEMS[sys].notesId);
    if (notes) notes.value = '';
  });
  closeExamPanel();
  renderExamMap();
  showToast('Examination map cleared');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExamMap);
} else {
  initExamMap();
}

/* =======================================================
   QUICK (DEFAULT) PHYSICAL EXAMINATION FORMAT
   Typing-only sections modelled on the paper sheet; blank
   body figure for hand annotation on the printed output.
   ======================================================= */
const QUICK_EXAM_SECTIONS = [
  { id: 'qeGeneral',     label: 'General Examination',       short: 'General' },
  { id: 'qeHead',        label: 'Head',                      short: 'Head' },
  { id: 'qeNeck',        label: 'Neck',                      short: 'Neck' },
  { id: 'qeChest',       label: 'Chest',                     short: 'Chest' },
  { id: 'qeAbdomen',     label: 'Abdomen',                   short: 'Abdomen' },
  { id: 'qePelvicGU',    label: 'Pelvic and Genito-Urinary', short: 'Pelvic and Genito-Urinary' },
  { id: 'qeExtremities', label: 'Extremities',               short: 'Extremities' },
  { id: 'qeNeuro',       label: 'Neurological',              short: 'Neurological' }
];
let currentExamFormat = 'quick';

function quickExamValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
// GCS sits at the top of the Neurological findings.
function getQuickExamLines() {
  const lines = [];
  const gcs = gcsText(quickExamValue(GCS_FIELD_ID));
  QUICK_EXAM_SECTIONS.forEach(s => {
    const v = quickExamValue(s.id);
    const extra = s.id === 'qeNeuro' && gcs ? [`GCS: ${gcs}`] : [];
    if (!v && !extra.length) return;
    lines.push(`${s.short}:`);
    extra.concat(v ? [v] : []).forEach(line => lines.push(`   ${line}`));
  });
  return lines;
}
function quickExamHasData() { return QUICK_EXAM_SECTIONS.some(s => quickExamValue(s.id)) || !!quickExamValue(GCS_FIELD_ID); }

function clearQuickExamFields() {
  QUICK_EXAM_SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) el.value = ''; });
  document.querySelectorAll('#examQuickCard .chip-btn.active').forEach(b => b.classList.remove('active'));
}

function toggleQeChip(btn, targetId) {
  btn.classList.toggle('active');

  const chips = [...btn.parentElement.querySelectorAll('.chip-btn.active')];
  const selectedLabels = chips.map(c => c.dataset.qe);

  const input = document.getElementById(targetId);
  let remainder = input.value;

  // Strip every chip label (selected or previously inserted) to recover manually typed text
  const allLabels = [...btn.parentElement.querySelectorAll('.chip-btn')].map(c => c.dataset.qe);
  for (const label of allLabels) {
    remainder = remainder.split(label).join(',');
  }
  remainder = remainder.split(',').map(s => s.trim()).filter(Boolean).join(', ');

  const parts = [];
  if (selectedLabels.length) parts.push(selectedLabels.join(', '));
  if (remainder) parts.push(remainder);
  input.value = parts.join(', ');
}

function initQuickExam() {
  const canvas = document.getElementById('examQuickCanvas');
  if (canvas && !canvas.querySelector('svg.body-figure')) {
    const src = document.querySelector('#traumaDiagramCanvas svg.body-figure');
    if (src) {
      const clone = src.cloneNode(true);
      clone.removeAttribute('id');
      canvas.appendChild(clone);
    }
  }
  clearQuickExamFields();
  switchExamFormat('quick');
}

function switchExamFormat(fmt, btn) {
  currentExamFormat = fmt === 'map' ? 'map' : 'quick';
  document.querySelectorAll('.exam-format-btn').forEach(b => b.classList.toggle('active', b.dataset.format === currentExamFormat));
  const quick = document.getElementById('examQuickCard');
  const exp = document.getElementById('examExperimentWrap');
  if (quick) quick.style.display = currentExamFormat === 'quick' ? '' : 'none';
  if (exp) exp.style.display = currentExamFormat === 'map' ? '' : 'none';
  placeGcsField();
  if (currentExamFormat === 'map' && typeof positionExamOverlay === 'function') {
    requestAnimationFrame(() => positionExamOverlay());
  }
}

// One GCS picker for both exam formats: it is moved to the format on show, so the value,
// its buttons and everything listening to it stay the same element.
const GCS_FIELD_ID = 'vitalGCS';
function placeGcsField() {
  const field = document.getElementById(`${GCS_FIELD_ID}Field`);
  const slot = document.getElementById('qeGcsSlot');
  const home = document.getElementById(`${GCS_FIELD_ID}Home`);
  if (!field || !slot || !home) return;
  if (currentExamFormat === 'quick') slot.appendChild(field);
  else home.after(field);
}

function insertQuickExam() {
  const lines = getQuickExamLines();
  if (!lines.length) { showToast('No examination findings typed yet'); return; }
  if (!medicalNoteGuard()) return;
  appendSection('Physical Examination', lines);
  showToast('Physical examination inserted');
}

function clearQuickExam() {
  clearQuickExamFields();
  showToast('Physical examination cleared');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQuickExam);
} else {
  initQuickExam();
}

function switchTraumaView(mode, btn) {
  document.querySelectorAll('.trauma-nav-tabs .trauma-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const left = document.getElementById('traumaLeftCol');
  const right = document.getElementById('traumaRightCol');
  const pVitals = document.getElementById('panelTraumaVitals');
  const pAirway = document.getElementById('panelTraumaAirway');
  const pBreathing = document.getElementById('panelTraumaBreathing');
  const pCirculation = document.getElementById('panelTraumaCirculation');
  const pDisability = document.getElementById('panelTraumaDisability');
  const pSecondary = document.getElementById('panelTraumaSecondary');

  if (mode === 'all') {
    if (left) left.style.display = 'flex';
    if (right) right.style.display = 'flex';
    [pVitals, pAirway, pBreathing, pCirculation, pDisability, pSecondary].forEach(p => { if (p) p.style.display = 'flex'; });
  } else if (mode === 'primary') {
    if (left) left.style.display = 'flex';
    if (right) right.style.display = 'none';
    [pVitals, pAirway, pBreathing, pCirculation, pDisability].forEach(p => { if (p) p.style.display = 'flex'; });
    if (pSecondary) pSecondary.style.display = 'none';
  } else if (mode === 'secondary') {
    if (left) left.style.display = 'flex';
    if (right) right.style.display = 'none';
    [pVitals, pAirway, pBreathing, pCirculation, pDisability].forEach(p => { if (p) p.style.display = 'none'; });
    if (pSecondary) pSecondary.style.display = 'flex';
  } else if (mode === 'body') {
    if (left) left.style.display = 'none';
    if (right) right.style.display = 'flex';
  }
}

// One reading of the trauma form, shared by the note and the clerking sheet.
// A blank value means "not recorded": nothing here fills in a default, so neither
// output can state a finding (Nil, None, NKDA...) that nobody entered.
// Vitals and AMPLE history belong to the patient and are keyed once, in the Vital Signs
// and Medical History tabs, so they are read from there.
function collectTrauma() {
  const val = id => (document.getElementById(id)?.value || '').trim();
  const withUnit = (v, unit) => (v && !v.toLowerCase().includes(unit.trim().toLowerCase()) ? v + unit : v);
  const row = (label, value) => ({ label, value });

  // A GCS is only a score once all three parts are chosen; a part-filled one is shown as it stands.
  let [e, v, m] = [traumaGcsE, traumaGcsV, traumaGcsM];
  if (e === null && v === null && m === null) {
    const code = val('vitalGCS');
    const part = (letter, max) => { const x = code.match(new RegExp(`${letter}([1-${max}])`, 'i')); return x ? +x[1] : null; };
    [e, v, m] = [part('E', 4), part('V', 5), part('M', 6)];
  }
  const gcsCode = `E${e ?? '_'}V${v ?? '_'}M${m ?? '_'}`;
  const gcs = [e, v, m].some(x => x !== null) ? gcsText(gcsCode) : '';

  const pupil = (size, react) => [size ? `${size}mm` : '', react || ''].filter(Boolean).join(' ');
  const pupils = [['Right', pupil(traumaOdSize, traumaOdReact)], ['Left', pupil(traumaOsSize, traumaOsReact)]]
    .filter(p => p[1]).map(p => p.join(' ')).join(', ');

  return {
    sections: [
      {
        title: 'Primary Survey',
        items: [
          { label: 'Vitals', inline: true, rows: [
            row('BP', withUnit(val('vitalBP'), ' mmHg')),
            row('HR', withUnit(val('vitalHR'), ' bpm')),
            row('RR', withUnit(val('vitalRR'), ' /min')),
            row('Temp', withUnit(val('vitalTemp'), '°C')),
            row('SpO2', withUnit(val('vitalSpO2'), '%'))
          ] },
          { label: 'Airway', rows: [
            row('Patency', val('traumaAirwayPatency')),
            row('C-spine / trachea', val('traumaAirwayCSpine')),
            row('Interventions', val('traumaAirwayIntervention'))
          ] },
          { label: 'Breathing', rows: [
            row('Inspection', val('traumaRespInspection')),
            row('Palpation', val('traumaRespPalpation')),
            row('Percussion', val('traumaRespPercussion')),
            row('Auscultation', val('traumaRespAuscultation')),
            row('Interventions', val('traumaRespIntervention'))
          ] },
          { label: 'Circulation', rows: [
            row('CCTVR', val('traumaCircCctvr')),
            row('External hemorrhage', val('traumaCircHemorrhage')),
            row('Interventions', val('traumaCircIntervention'))
          ] },
          { label: 'Disability', rows: [row('GCS', gcs), row('Pupils', pupils)] }
        ]
      },
      {
        title: 'Secondary Survey',
        items: [
          row('Allergies', val('historyAllergy')),
          row('Medications', val('historyMedication')),
          row('Past medical history', val('historyUnderlying')),
          row('Surgical history', val('historySurgical')),
          row('Obstetric history', val('historyGynaecological')),
          row('Last meal', val('traumaMeal')),
          row('Mechanism of injury', val('traumaMOI')),
          { label: 'Regional examination', rows: [
            row('Head', val('traumaRegHead')),
            row('Neck', val('traumaRegNeck')),
            row('Chest', val('traumaRegChest')),
            row('Abdomen', val('traumaRegAbd')),
            row('Pelvis / G-U', val('traumaRegPelvis')),
            row('Extremities', val('traumaRegExtremities'))
          ] }
        ]
      }
    ],
    pins: traumaPins.map(p => ({
      injury: p.label,
      region: p.region + (p.view ? ` (${p.view} view)` : ''),
      note: (p.note || '').trim()
    }))
  };
}

// Note lines for one section: only what was recorded, one finding per line.
function traumaNoteLines(items) {
  const lines = [];
  items.forEach(item => {
    if (!item.rows) {
      if (item.value) lines.push(`${item.label}: ${item.value}`);
      return;
    }
    const filled = item.rows.filter(r => r.value);
    if (!filled.length) return;
    if (item.inline) {
      lines.push(`${item.label}: ${filled.map(r => `${r.label} ${r.value}`).join(', ')}`);
      return;
    }
    lines.push(`${item.label}:`);
    filled.forEach(r => lines.push(`   ${r.label}: ${r.value}`));
  });
  return lines;
}

/* ---------- Note formats ----------
   Medical is the default. Entering anything on the trauma tab other than the Disability
   GCS (which it shares with the neurological exam) makes it a trauma case. A case
   with both trauma findings and HOPI cannot be written automatically: the clinician
   decides which is the main issue and writes that note by hand. */
const TRAUMA_ONLY_FIELDS = [
  'traumaAirwayPatency', 'traumaAirwayCSpine', 'traumaAirwayIntervention',
  'traumaRespInspection', 'traumaRespPalpation', 'traumaRespPercussion', 'traumaRespAuscultation', 'traumaRespIntervention',
  'traumaCircCctvr', 'traumaCircHemorrhage', 'traumaCircIntervention', 'traumaMOI', 'traumaMeal',
  'traumaRegHead', 'traumaRegNeck', 'traumaRegChest', 'traumaRegAbd', 'traumaRegPelvis', 'traumaRegExtremities'
];

function traumaHasData() {
  return TRAUMA_ONLY_FIELDS.some(id => (document.getElementById(id)?.value || '').trim()) ||
    [traumaOdSize, traumaOdReact, traumaOsSize, traumaOsReact].some(x => x !== null) ||
    traumaPins.length > 0;
}

function currentNoteFormat() {
  const trauma = traumaHasData();
  const hopi = collectHopiSections().length > 0;
  if (trauma && hopi) return 'clash';
  return trauma ? 'trauma' : 'medical';
}

function warnFormatClash() {
  alert('Both the Trauma tab and History of Presenting Illness have entries.\n\n' +
    'A trauma note and a medical note have different layouts, so no text was written to the note.\n\n' +
    'Decide whether trauma or the medical illness is the main issue, then arrange and write the note yourself, ' +
    'or clear the tab that does not apply.');
}

// Patient Demographics heads every format.
function writeDemographicsSection() {
  const match = findTemplateSubmenu('demographic-section');
  if (!match) return null;
  return appendSection(submenuNoteHeader(match.category, match.submenu), collectTemplateParts(match.submenu));
}

// The trauma document: Demographics, Primary Survey (A-E, with Exposure as the mapped
// injuries), Secondary Survey (AMPLE, then the regional examination).
// Impression and Plan ends every note format. Written only when something is entered.
const IMPRESSION_SECTION = 'impression-section';
function writeImpressionSection() {
  const match = findTemplateSubmenu(IMPRESSION_SECTION);
  if (!match) return null;
  return appendSection(submenuNoteHeader(match.category, match.submenu), collectTemplateParts(match.submenu));
}

function writeTraumaDocument() {
  const trauma = collectTrauma();
  const primary = traumaNoteLines(trauma.sections[0].items);
  if (trauma.pins.length) {
    primary.push('Exposure:');
    trauma.pins.forEach((p, i) => primary.push(`   ${i + 1}. ${p.injury} over ${p.region}${p.note ? ' - ' + p.note : ''}`));
  }
  const secondary = traumaNoteLines(trauma.sections[1].items);
  writeDemographicsSection();
  const a = appendSection('Primary Survey', primary);
  const b = appendSection('Secondary Survey', secondary);
  writeImpressionSection();
  return a === 'updated' || b === 'updated' ? 'updated' : (a || b);
}

// Run before writing any medical-format section. False when it must not be written.
function medicalNoteGuard() {
  const format = currentNoteFormat();
  if (format === 'clash') { warnFormatClash(); return false; }
  if (format === 'trauma') {
    showToast('Trauma case: this section is not part of the trauma note. Use Insert on the Trauma tab.');
    return false;
  }
  writeDemographicsSection();
  return true;
}

function insertTraumaNote() {
  const format = currentNoteFormat();
  if (format === 'clash') { warnFormatClash(); return; }
  if (format !== 'trauma') { showToast('No trauma findings recorded yet'); return; }
  const result = writeTraumaDocument();
  showToast(result === 'updated' ? 'Trauma note updated' : 'Trauma note written');
}

function clearTraumaSection() {
  if (confirm('Clear all trauma assessment inputs, selections, and pins?')) {
    clearTraumaPins();
    ['traumaAirwayPatency', 'traumaAirwayCSpine', 'traumaAirwayIntervention',
     'traumaRespInspection', 'traumaRespPalpation', 'traumaRespPercussion', 'traumaRespAuscultation', 'traumaRespIntervention',
     'traumaCircCctvr', 'traumaCircHemorrhage', 'traumaCircIntervention',
     'traumaMOI', 'traumaMeal',
     'traumaRegHead', 'traumaRegNeck', 'traumaRegChest', 'traumaRegAbd', 'traumaRegPelvis', 'traumaRegExtremities',
     'traumaInjuries', 'traumaImpression', 'traumaGCS'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Reset Airway checkmark & all chips
    Object.keys(SURVEY_NORMALS).forEach(key => {
      const chk = document.getElementById(`${key}Check`);
      if (chk) chk.textContent = '';
    });
    document.querySelectorAll('#Trauma .chip-btn.active').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#Trauma .gauge-item.active').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#Trauma .injury-tool-btn.active').forEach(b => b.classList.remove('active'));

    // Reset GCS
    traumaGcsE = null; traumaGcsV = null; traumaGcsM = null;
    recalcTraumaGcs();

    // Reset Pupils
    traumaOdSize = null; traumaOdReact = null;
    traumaOsSize = null; traumaOsReact = null;
    const odR = document.getElementById('traumaOdReadout'); if (odR) odR.textContent = '-- mm • Unassessed';
    const osR = document.getElementById('traumaOsReadout'); if (osR) osR.textContent = '-- mm • Unassessed';

    if (typeof showToast === 'function') showToast('Trauma evaluation cleared');
  }
}

// Tagged-template helper for the ATLS print sheet: every interpolated value is HTML-escaped
// unless it was explicitly wrapped with rawHtml() (trusted markup built by this file).
function rawHtml(html) { return { __rawHtml: html }; }
function htmlSafe(strings, ...vals) {
  let out = '';
  strings.forEach((str, i) => {
    out += str;
    if (i < vals.length) {
      const v = vals[i];
      out += (v && typeof v === 'object' && '__rawHtml' in v) ? v.__rawHtml : escapeHtml(v);
    }
  });
  return out;
}

// Clerking sheet rows. Unlike the note, the sheet keeps every label and leaves the
// value empty when nothing was recorded, the way a paper form shows a blank line.
function traumaSheetItemsHtml(items) {
  return items.map(item => {
    if (!item.rows) return htmlSafe`<div><strong>${item.label}:</strong> ${item.value}</div>`;
    const rows = item.rows.map(r => htmlSafe`<span><strong>${r.label}:</strong> ${r.value}</span>`);
    if (item.inline) return `<div class="row">${rows.join('')}</div>`;
    return htmlSafe`<div class="group">${item.label}</div>` + rows.map(r => `<div class="sub">${r}</div>`).join('');
  }).join('');
}

function exportTraumaClerkingPdf() {
  const val = id => (document.getElementById(id)?.value || '').trim();
  const pName = val('patientName');
  const ageGender = [val('patientAge'), val('patientGender')].filter(Boolean).join(' / ');
  const trauma = collectTrauma();

  const sectionsHtml = trauma.sections.map(s =>
    htmlSafe`<div class="box"><div class="subtitle">${s.title.toUpperCase()}</div>${rawHtml(traumaSheetItemsHtml(s.items))}</div>`
  ).join('');
  const pinRowsHtml = trauma.pins.length
    ? trauma.pins.map((p, i) => htmlSafe`<tr><td>${i + 1}</td><td><strong>${p.injury}</strong></td><td>${p.region}</td><td>${p.note}</td></tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center; font-style:italic;">None plotted on the body diagram</td></tr>';

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Please allow popups to open the ATLS Clerking Sheet.');
    return;
  }

  printWin.document.write(htmlSafe`<!DOCTYPE html>
<html>
<head>
  <title>${'ATLS Trauma Clerking Sheet' + (pName ? ' - ' + pName : '')}</title>
  <style>
@page { size: A4 portrait; margin: 10mm; }
body { font-family: "Times New Roman", serif; font-size: 9pt; line-height: 1.25; color: #000; margin: 0; }
.box { border: 1px solid #000; padding: 6px; margin-bottom: 6px; }
.title { font-size: 13pt; font-weight: bold; text-align: center; margin-bottom: 4px; }
.subtitle { font-size: 10pt; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #000; }
.row { display: flex; justify-content: space-between; margin-bottom: 3px; }
.group { font-weight: bold; text-transform: uppercase; margin-top: 4px; }
.sub { padding-left: 12px; }
.table { width: 100%; border-collapse: collapse; margin-top: 4px; }
.table th, .table td { border: 1px solid #000; padding: 3px 5px; text-align: left; font-size: 8.5pt; }
  </style>
</head>
<body>
  <div class="title">JABATAN KECEMASAN &amp; TRAUMA</div>
  <div style="text-align:center; font-weight:bold; margin-bottom:8px;">PRIMARY &amp; SECONDARY SURVEY (ATLS PROTOCOL)</div>

  <div class="box">
<div class="row">
  <span><strong>Nama:</strong> ${pName}</span>
  <span><strong>No. K/P:</strong> ${val('patientID')}</span>
  <span><strong>Umur/Jantina:</strong> ${ageGender}</span>
</div>
  </div>

  ${rawHtml(sectionsHtml)}

  <div class="box">
<div class="subtitle">MAPPED TRAUMA INJURIES (${trauma.pins.length} PLOTTED)</div>
<table class="table">
  <thead><tr><th>#</th><th>Injury</th><th>Anatomical Region</th><th>Detail</th></tr></thead>
  <tbody>
    ${rawHtml(pinRowsHtml)}
  </tbody>
</table>
  </div>

  <div style="margin-top:20px; display:flex; justify-content:space-between; font-size:8.5pt;">
<div>Tandatangan Pegawai Perubatan: ________________________</div>
<div>Tarikh: ${new Date().toLocaleDateString('en-GB')}</div>
  </div>

</body>
</html>`);
  printWin.document.close();
  // Print from the opener instead of an inline script in the sheet (keeps the page CSP strict)
  setTimeout(() => { try { printWin.focus(); printWin.print(); } catch (e) {} }, 400);
}

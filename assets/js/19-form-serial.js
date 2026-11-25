/* =======================================================
   SERIAL CHART FOR ROUTINE INVESTIGATIONS (BOR.HDU.SEJ/09)
   Results come from eHIS ("Events in 24 Hrs" of the newest chart) through the
   work PC's helper (eddoc-ehis://labs/<nonce> -> clipboard "EHIS-LABS:{json}"),
   are kept per patient (RN) on this device for 72 hours after the last change, and
   are stamped onto the blank A4 form (11 result columns per page).
   ======================================================= */
const SERIAL_PREFIX = 'ed_serial_';
const SERIAL_TTL_MS = 72 * 3600 * 1000;   // long enough to span an ED stay or boarding, then gone
const SERIAL_COLS_PER_PAGE = 11;

// Form rows top to bottom: [key, label on the form, group]
const SERIAL_ROWS = [
  ['TWC', 'TWC', 'FBC'], ['NEU', 'NEU', 'FBC'], ['LYMP', 'LYMP', 'FBC'], ['HB', 'HB', 'FBC'],
  ['MCV', 'MCV', 'FBC'], ['MCH', 'MCH', 'FBC'], ['HCT', 'HCT', 'FBC'], ['PLT', 'PLT', 'FBC'],
  ['CRP', 'CRP', 'FBC'], ['ESR', 'ESR', 'FBC'], ['RETICS', 'RETICS', 'FBC'],
  ['NA', 'NA', 'RP'], ['K', 'K', 'RP'], ['CL', 'CHLORIDE', 'RP'], ['UREA', 'UREA', 'RP'],
  ['CREAT', 'CREAT', 'RP'], ['URIC', 'URIC ACID', 'RP'], ['CA', 'CA', 'RP'], ['PHOS', 'PHOS', 'RP'], ['MG', 'MG', 'RP'],
  ['FBS', 'FBS', 'GLU'], ['RBS', 'RBS', 'GLU'], ['HBA1C', 'HBA1c', 'GLU'],
  ['TB', 'TB', 'LFT'], ['DB', 'DB', 'LFT'], ['ALT', 'ALT', 'LFT'], ['ALP', 'ALP', 'LFT'],
  ['ALBGLO', 'ALB / GLO', 'LFT'], ['AMYLASE', 'AMYLASE', 'LFT'],
  ['TG', 'TG', 'LIPID'], ['TC', 'TC', 'LIPID'], ['HDL', 'HDL', 'LIPID'], ['LDL', 'LDL', 'LIPID'],
  ['AST', 'AST', 'CE'], ['LDH', 'LDH', 'CE'], ['CK', 'CK', 'CE'],
  ['PT', 'PT', 'COAG'], ['PTT', 'PTT', 'COAG'], ['INR', 'INR', 'COAG'],
  ['BGTIME', 'TIME', 'BG'], ['BGPH', 'PH', 'BG'], ['PCO2', 'PCO2', 'BG'], ['PO2', 'PO2', 'BG'],
  ['HCO3', 'HCO3', 'BG'], ['BGGLU', 'GLU', 'BG'], ['LAC', 'LAC', 'BG'],
  ['UPH', 'PH', 'URINE'], ['ULEU', 'LEU', 'URINE'], ['UNIT', 'NIT', 'URINE'], ['UPROT', 'PROT', 'URINE'],
  ['UGLU', 'GLU', 'URINE'], ['UKET', 'KETONE', 'URINE'], ['UERY', 'ERYTH', 'URINE'], ['UCS', 'C&S', 'URINE']
];

// eHIS label -> [key, part]. eHIS truncates labels ("White Cell Coun"), so match the start.
// Urine dipstick labels (TP, Blood, Ph...) only count inside a urine panel.
const SERIAL_MAP = [
  [/^white cell/i, 'TWC'], [/^neutrophil coun/i, 'NEU', 'abs'], [/^neutrophil %/i, 'NEU', 'pct'],
  [/^lymphocyte coun/i, 'LYMP', 'abs'], [/^lymphocyte %/i, 'LYMP', 'pct'],
  [/^hba1c/i, 'HBA1C'], [/^(hb|haemoglobin|hemoglobin)\b/i, 'HB'], [/^mcv$/i, 'MCV'], [/^mch$/i, 'MCH'],
  [/^(haematocrit|hematocrit|hct)$/i, 'HCT'], [/^(plt|platelet)/i, 'PLT'], [/^crp/i, 'CRP'], [/^esr/i, 'ESR'],
  [/^retic/i, 'RETICS'], [/^(na\+?|sodium)$/i, 'NA'], [/^(k\+?|potassium)$/i, 'K'], [/^(cl-?|chloride)$/i, 'CL'],
  [/^urea$/i, 'UREA'], [/^creat(inine)?$/i, 'CREAT'], [/^uric/i, 'URIC'], [/^(ca|calcium)$/i, 'CA'],
  [/^(po4|phos)/i, 'PHOS'], [/^(mg|magnesium)$/i, 'MG'], [/^(fbs|fasting)/i, 'FBS'], [/^(rbs|random)/i, 'RBS'],
  [/^(bilirubin tot|total bilirubin|tb$)/i, 'TB'], [/^(bilirubin dir|direct bilirubin|db$)/i, 'DB'],
  [/^alt$/i, 'ALT'], [/^alp$/i, 'ALP'], [/^albumin$/i, 'ALBGLO', 'a'], [/^globulin$/i, 'ALBGLO', 'b'],
  [/^amy/i, 'AMYLASE'], [/^(tg|trigly)/i, 'TG'], [/^(tc$|total chol|cholesterol)/i, 'TC'], [/^hdl/i, 'HDL'],
  [/^ldl/i, 'LDL'], [/^ast$/i, 'AST'], [/^ldh$/i, 'LDH'], [/^(ck|creatine kinase)$/i, 'CK'],
  [/^pt$/i, 'PT'], [/^a?ptt$/i, 'PTT'], [/^inr$/i, 'INR']
];
const SERIAL_URINE_MAP = [
  [/^ph/i, 'UPH'], [/^leuc/i, 'ULEU'], [/^nitrite/i, 'UNIT'], [/^(tp|protein)/i, 'UPROT'],
  [/^gluc/i, 'UGLU'], [/^ketone/i, 'UKET'], [/^(blood|ery)/i, 'UERY']
];

function serialKeyFor(label, panel) {
  const map = /urine|feme/i.test(panel) ? SERIAL_URINE_MAP : SERIAL_MAP;
  for (const [re, key, part] of map) if (re.test(label)) return { key, part: part || '' };
  return null;
}

// "12.06 X10^9/L (4~10) Abnormal" -> "12.06"; "Light Yellow" stays; "> 90 (~)" -> ">90"
function serialValue(raw) {
  const v = String(raw || '').replace(/\s*Abnormal\s*$/i, '').replace(/\s*\([^)]*~[^)]*\)\s*$/, '').trim();
  const m = /^([<>]=?)?\s*(-?\d+(?:\.\d+)?)(?:\s|$)/.exec(v);
  return m ? (m[1] || '') + m[2] : v;
}

function serialPad(n) { return String(n).padStart(2, '0'); }
function serialStamp(d) { return `${d.getFullYear()}-${serialPad(d.getMonth() + 1)}-${serialPad(d.getDate())}T${serialPad(d.getHours())}:${serialPad(d.getMinutes())}`; }
function serialParse(at) {
  const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(at || '');
  return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) : null;
}
function serialDateText(at) { const d = serialParse(at); return d ? `${serialPad(d.getDate())}/${serialPad(d.getMonth() + 1)}/${d.getFullYear()}` : ''; }
function serialTimeText(at) { return (at || '').slice(11, 16); }

// Rows from the helper -> [{at, key, value}] (mapped, parts merged) + [{at, label, value}] (not on the form).
// Rows are the page's table cells: ["06:31"] time, ["Haematology"] / ["FBC"] headings, ["", label, value] results.
// Times carry no date: a time later than the PC's clock ("now") is from yesterday.
function parseSerialRows(rows, now) {
  const nowD = serialParse(now) || new Date();
  const parts = new Map();
  const others = [];
  let at = '', panel = '';
  for (const rawCells of rows || []) {
    if (!Array.isArray(rawCells)) continue;
    // the helper strips tags only: eHIS writes "&nbsp&nbsp;" (no semicolon) and "&amp;"
    const cells = rawCells.map(c => String(c || '').replace(/&nbsp;?/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim());
    const filled = cells.filter(c => c);
    if (filled.length === 1 && cells.length <= 2) {
      const t = /^(\d{1,2}):(\d\d)$/.exec(filled[0]);
      if (t) {
        const d = new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate(), +t[1], +t[2]);
        if (d > nowD) d.setDate(d.getDate() - 1);
        at = serialStamp(d); panel = '';
      } else panel = filled[0];
      continue;
    }
    if (cells.length < 3 || !at) continue;
    const label = cells[1], raw = cells.slice(2).join(' ').trim();
    if (!label || !raw || /^result text/i.test(raw)) continue;   // e.g. VBGC: "Refer to Gem Web Plus"
    const value = serialValue(raw);
    const hit = serialKeyFor(label, panel);
    if (!hit) { others.push({ at, label, value }); continue; }
    const id = at + '|' + hit.key;
    if (!parts.has(id)) parts.set(id, { at, key: hit.key, p: {} });
    parts.get(id).p[hit.part] = value;
  }
  const results = [...parts.values()].map(({ at, key, p }) => {
    let value = p[''] || '';
    if (key === 'NEU' || key === 'LYMP') value = p.abs && p.pct ? `${p.abs} (${p.pct}%)` : (p.abs || (p.pct ? p.pct + '%' : ''));
    if (key === 'ALBGLO') value = `${p.a || ''}/${p.b || ''}`;
    return { at, key, value };
  });
  return { results, others };
}

// Place results into columns. A result joins the first column that started at most 24 h
// before it and has no value for that test yet; a repeat of the same test opens a new
// column (with the repeat's own date/time on top). Already imported results are skipped.
function mergeSerialResults(cols, results) {
  let added = 0, skipped = 0;
  const sorted = [...results].sort((a, b) => a.at.localeCompare(b.at));
  for (const r of sorted) {
    if (cols.some(c => c.src && c.src[r.key] === r.at)) { skipped++; continue; }
    const t = serialParse(r.at);
    let col = cols.find(c => {
      const s = serialParse(c.at);
      return s && t >= s && t - s < 24 * 3600 * 1000 && !c.cells[r.key];
    });
    if (!col) {
      col = { at: r.at, date: serialDateText(r.at), time: serialTimeText(r.at), cells: {}, src: {} };
      cols.push(col);
    }
    col.cells[r.key] = r.value;
    col.src[r.key] = r.at;
    added++;
  }
  cols.sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  return { added, skipped };
}

// ---- Storage: one record per patient RN, dropped 72 hours after its last change ----
let serialState = null;

function serialStorageKey(rn) { return SERIAL_PREFIX + (rn || '_').replace(/\s+/g, '').toUpperCase(); }

function loadSerialChart(rn) {
  try {
    const s = JSON.parse(storageGet(serialStorageKey(rn)) || 'null');
    if (s && Array.isArray(s.cols)) return s;
  } catch (e) { /* unreadable record: start fresh */ }
  return null;
}

function saveSerialChart() {
  if (!serialState) return;
  const key = serialStorageKey(serialState.rn);
  if (serialState.storedAs && serialState.storedAs !== key) {
    try { localStorage.removeItem(serialState.storedAs); } catch (e) {}
  }
  serialState.savedAt = Date.now();
  serialState.storedAs = key;
  storageSet(key, JSON.stringify(serialState));
}

// Runs on load, when the form opens, every minute and when the tab comes back into view,
// so an expired chart goes even from a tab left open, not only when ED Doc is reopened.
function purgeOldSerialCharts() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith(SERIAL_PREFIX)).forEach(k => {
      let s = null;
      try { s = JSON.parse(localStorage.getItem(k)); } catch (e) {}
      if (!s || !(Date.now() - (s.savedAt || 0) < SERIAL_TTL_MS)) localStorage.removeItem(k);
    });
  } catch (e) { /* storage blocked: nothing kept anyway */ }
  // The chart held in memory expires with its record: it must not be shown or saved back.
  if (serialState && serialState.savedAt && !(Date.now() - serialState.savedAt < SERIAL_TTL_MS)) {
    serialState = null;
    const modal = document.getElementById('serialModal');
    if (modal && modal.classList.contains('active')) closeSerialModal();
  }
}

function wipeSerialCharts() {
  try { Object.keys(localStorage).filter(k => k.startsWith(SERIAL_PREFIX)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  serialState = null;
}

function newSerialState(rn, name, ic) { return { rn: rn || '', name: name || '', ic: ic || '', cols: [], others: [] }; }

// ---- Modal ----
function openSerialModal() {
  ensurePdfLibraries();
  purgeOldSerialCharts();
  const rn = document.getElementById('patientHospitalID')?.value.trim() || '';
  const name = document.getElementById('patientName')?.value.trim() || '';
  const ic = document.getElementById('patientID')?.value.trim() || '';
  if (!serialState || (rn && serialStorageKey(rn) !== serialStorageKey(serialState.rn))) {
    serialState = (rn && loadSerialChart(rn)) || newSerialState(rn, name, ic);
  }
  renderSerialForm();
  refreshSerialPreview();
  const modal = document.getElementById('serialModal');
  modal.classList.add('active');
  openModalA11y(modal);
}

function closeSerialModal() {
  const modal = document.getElementById('serialModal');
  modal.classList.remove('active');
  closeModalA11y(modal);
}

function renderSerialForm() {
  const s = serialState;
  document.getElementById('serial_name').value = s.name || '';
  document.getElementById('serial_rn').value = s.rn || '';
  document.getElementById('serial_ic').value = s.ic || '';
  const cols = s.cols;
  let html = '<thead><tr><th class="serial-rowhead">IX</th>';
  cols.forEach((c, i) => {
    html += `<th><input data-col="${i}" data-field="date" value="${escapeHtml(c.date)}" aria-label="Column ${i + 1} date" placeholder="DD/MM/YYYY">` +
      `<input data-col="${i}" data-field="time" value="${escapeHtml(c.time)}" aria-label="Column ${i + 1} time" placeholder="HH:MM">` +
      `<button type="button" class="serial-del" data-del="${i}" aria-label="Delete column ${i + 1}">&times;</button></th>`;
  });
  html += '</tr></thead><tbody>';
  let group = '';
  for (const [key, label, g] of SERIAL_ROWS) {
    const first = g !== group; group = g;
    html += `<tr${first ? ' class="serial-group"' : ''}><th class="serial-rowhead">${first ? `<b>${escapeHtml(g)}</b> ` : ''}${escapeHtml(label)}</th>`;
    cols.forEach((c, i) => {
      html += `<td><input data-col="${i}" data-key="${key}" value="${escapeHtml(c.cells[key] || '')}" aria-label="${escapeHtml(g + ' ' + label)} column ${i + 1}"></td>`;
    });
    html += '</tr>';
  }
  html += '</tbody>';
  // every value from eHIS or storage went through escapeHtml; keys and indexes are our own constants
  document.getElementById('serialGrid').innerHTML = html;
  document.getElementById('serialEmpty').style.display = cols.length ? 'none' : '';
  const pages = Math.max(1, Math.ceil(cols.length / SERIAL_COLS_PER_PAGE));
  document.getElementById('serialCount').textContent = `${cols.length} column${cols.length === 1 ? '' : 's'} \u2022 ${pages} page${pages === 1 ? '' : 's'}`;
  const others = s.others || [];
  const box = document.getElementById('serialOthers');
  box.style.display = others.length ? '' : 'none';
  document.getElementById('serialOthersCount').textContent = others.length;
  document.getElementById('serialOthersList').innerHTML = others
    .map(o => `<li>${escapeHtml(serialDateText(o.at) + ' ' + serialTimeText(o.at))} \u2014 ${escapeHtml(o.label)}: <b>${escapeHtml(o.value)}</b></li>`).join('');
}

function onSerialGridInput(e) {
  const el = e.target;
  if (!serialState || !el.dataset || el.dataset.col === undefined) return;
  const col = serialState.cols[+el.dataset.col];
  if (!col) return;
  if (el.dataset.key) {
    const v = el.value.trim();
    if (v) col.cells[el.dataset.key] = v; else delete col.cells[el.dataset.key];
    delete col.src[el.dataset.key];   // typed by hand: a later import of that result goes to a new column
  } else if (el.dataset.field) {
    col[el.dataset.field] = el.value.trim();
    const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(col.date || ''), t = /^(\d{1,2}):(\d\d)$/.exec(col.time || '');
    if (d && t) col.at = serialStamp(new Date(+d[3], d[2] - 1, +d[1], +t[1], +t[2]));
  }
  saveSerialChart();
  debouncedSerialRefresh();
}

function onSerialParticulars() {
  if (!serialState) return;
  serialState.name = document.getElementById('serial_name').value.trim();
  serialState.rn = document.getElementById('serial_rn').value.trim();
  serialState.ic = document.getElementById('serial_ic').value.trim();
  saveSerialChart();
  debouncedSerialRefresh();
}

function addSerialColumn() {
  if (!serialState) serialState = newSerialState();
  const at = serialStamp(new Date());
  serialState.cols.push({ at, date: serialDateText(at), time: serialTimeText(at), cells: {}, src: {} });
  saveSerialChart();
  renderSerialForm();
  refreshSerialPreview();
}

function deleteSerialColumn(i) {
  const col = serialState && serialState.cols[i];
  if (!col) return;
  if (Object.keys(col.cells).length && !confirm(`Delete the ${col.date} ${col.time} column and its results?`)) return;
  serialState.cols.splice(i, 1);
  saveSerialChart();
  renderSerialForm();
  refreshSerialPreview();
}

function clearSerialPatient() {
  if (!serialState) return;
  if (!confirm('Delete this patient\'s serial chart from this device?')) return;
  try { localStorage.removeItem(serialState.storedAs || serialStorageKey(serialState.rn)); } catch (e) {}
  serialState = newSerialState();
  renderSerialForm();
  refreshSerialPreview();
  showToast('Serial chart cleared.', 3000);
}

function getSerialLabs() {
  return ehisRequest('labs', document.getElementById('btnSerialLabs'), 'Get labs from eHIS', applyEhisLabs);
}

// Results always belong to the chart they came from: the eHIS patient (name, IC, RN)
// replaces whoever the form showed, and that patient's saved chart is continued.
function applyEhisLabs(d) {
  const rn = d.hospitalId || '';
  if (!serialState || serialStorageKey(rn) !== serialStorageKey(serialState.rn)) {
    serialState = loadSerialChart(rn) || newSerialState(rn);
  }
  serialState.rn = rn;
  serialState.name = d.name || serialState.name;
  serialState.ic = d.nric || d.altId || serialState.ic;
  const { results, others } = parseSerialRows(d.rows, d.now);
  const { added, skipped } = mergeSerialResults(serialState.cols, results);
  const seen = new Set((serialState.others || []).map(o => o.at + '|' + o.label));
  serialState.others = (serialState.others || []).concat(others.filter(o => !seen.has(o.at + '|' + o.label)));
  saveSerialChart();
  renderSerialForm();
  refreshSerialPreview();
  showToast(results.length || others.length
    ? `${d.name || rn}: ${added} result${added === 1 ? '' : 's'} added${skipped ? `, ${skipped} already on the chart` : ''}.`
    : `${d.name || rn}: no lab results in the last 24 hours.`, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
  purgeOldSerialCharts();
  setInterval(purgeOldSerialCharts, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) purgeOldSerialCharts(); });
  const modal = document.getElementById('serialModal');
  if (!modal) return;
  bindBackdropClose(modal, closeSerialModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active') && !isTypingInField()) closeSerialModal();
  });
  const grid = document.getElementById('serialGrid');
  grid.addEventListener('input', onSerialGridInput);
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (b) deleteSerialColumn(+b.dataset.del);
  });
  ['serial_name', 'serial_rn', 'serial_ic'].forEach(id => document.getElementById(id).addEventListener('input', onSerialParticulars));
});

function getSerialFormData() {
  const s = serialState || newSerialState();
  return { name: s.name, rn: s.rn, ic: s.ic, cols: s.cols.map(c => ({ date: c.date, time: c.time, cells: { ...c.cells } })) };
}

async function generateSerialPdfBlob(data) {
  await ensurePdfLibraries();
  const templateBytes = await loadPdfTemplateBytes('./assets/serial_chart.pdf');
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const template = await PDFDocument.load(templateBytes);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const darkNavy = rgb(0.02, 0.08, 0.4);
  const warnings = [];
  // cleanFormDataForPdf turns arrays into index-keyed objects
  const cols = Object.values(data.cols || {});
  const pages = Math.max(1, Math.ceil(cols.length / SERIAL_COLS_PER_PAGE));

  // Grid from the template's vector lines (PyMuPDF): row tops (DATE, blank, TIME, then
  // the 54 test rows) and the 11 equal result columns (template edited so they are all 38.1pt;
  // the original had a narrow first one). Values too wide at 6pt go on two lines (see put).
  const ROW_TOP = [113.4, 125.6, 137.8, 149.9, 162.1, 174.3, 186.5, 198.7, 210.9, 223.0, 235.2, 247.4, 259.6, 271.8,
    284.0, 296.1, 308.3, 320.5, 332.7, 344.9, 357.1, 369.2, 381.4, 393.6, 405.8, 418.0, 430.2, 442.4, 454.5,
    466.7, 478.9, 491.1, 503.3, 515.5, 527.6, 539.8, 552.0, 564.2, 576.4, 588.6, 600.7, 612.9, 625.1, 637.3,
    649.5, 661.7, 673.8, 686.0, 698.2, 710.4, 722.6, 734.8, 747.0, 759.1, 771.3, 783.5, 795.7];
  const COL_X = [147.4016, 185.5405, 223.6793, 261.8182, 299.9571, 338.0959, 376.2348, 414.3736, 452.5125, 490.6514, 528.7902, 566.9291];

  for (let p = 0; p < pages; p++) {
    const [page] = await pdfDoc.copyPages(template, [0]);
    pdfDoc.addPage(page);
    const { height } = page.getSize();
    const put = (text, x, fitzY, size, maxWidth, center, label) => {
      if (!text) return;
      let s = String(text);
      const full = s;
      // a centred cell value too wide even at 6pt: two lines, split at a space ("7.7 (64.2%)")
      // or before the year of a date ("25/11/" + "2026"), whichever leaves the narrower line
      if (center === true && font.widthOfTextAtSize(s, 6) > maxWidth) {
        const cuts = [];
        for (let i = 1; i < s.length; i++) if (s[i - 1] === ' ' || (s[i - 1] === '/' && s.indexOf('/', i) < 0)) cuts.push(i);
        let best = null;
        for (const i of cuts) {
          const a = s.slice(0, i).trim(), b = s.slice(i).trim();
          const w = Math.max(font.widthOfTextAtSize(a, 6), font.widthOfTextAtSize(b, 6));
          if (!best || w < best.w) best = { a, b, w };
        }
        if (best) {
          let sz = 6;
          while (sz > 4.5 && Math.max(font.widthOfTextAtSize(best.a, sz), font.widthOfTextAtSize(best.b, sz)) > maxWidth) sz -= 0.25;
          const top = fitzY - 8.9;   // row top; rows are 12.2pt tall
          [[best.a, top + 5.4], [best.b, top + 10.9]].forEach(([line, y]) => put(line, x, y, sz, maxWidth, 'line', label));   // 'line': centred, never split again
          return;
        }
      }
      while (size > 5 && font.widthOfTextAtSize(s, size) > maxWidth) size -= 0.25;
      while (s.length > 1 && font.widthOfTextAtSize(s, size) > maxWidth) s = s.slice(0, -1);
      if (s !== full) warnings.push(pdfCutWarning(`${label} "${full}"`));
      const w = font.widthOfTextAtSize(s, size);
      page.drawText(s, { x: center ? x + (maxWidth - w) / 2 : x, y: height - fitzY, size, font, color: darkNavy });
    };
    put((data.name || '').toUpperCase(), 69, 90, 9, 212, false, 'Name');
    put(data.rn || '', 334, 84.3, 9, 230, false, 'RN');
    put(data.ic || '', 330, 101.3, 9, 234, false, 'IC');
    if (pages > 1) put(`Page ${p + 1} of ${pages}`, 34, 811 + 8, 7, 100, false, 'Page');

    cols.slice(p * SERIAL_COLS_PER_PAGE, (p + 1) * SERIAL_COLS_PER_PAGE).forEach((c, i) => {
      const x = COL_X[i] + 1, w = COL_X[i + 1] - COL_X[i] - 2;
      put(c.date, x, ROW_TOP[0] + 8.9, 7, w, true, 'Date');
      put(c.time, x, ROW_TOP[2] + 8.9, 7, w, true, 'Time');
      const cells = c.cells || {};
      SERIAL_ROWS.forEach(([key, label], r) => put(cells[key], x, ROW_TOP[3 + r] + 8.9, 7, w, true, label));
    });
  }

  const finalBytes = await pdfDoc.save();
  const blob = new Blob([finalBytes], { type: 'application/pdf' });
  return { blob, url: URL.createObjectURL(blob), pdfBytes: finalBytes, warnings };
}

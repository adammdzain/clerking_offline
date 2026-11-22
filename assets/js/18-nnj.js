/* =======================================================
   NEONATAL JAUNDICE (Routine cases > NNJ)
   Widgets the NNJ card asks for in clinical_templates.js:
   - bind-score:      the BIND score, one tap per row.
   - nnj-age, nnj-ga, nnj-neuro, nnj-thresholds, nnj-calc:
     hours of life, gestation, neurotoxicity risk factors, the
     phototherapy and exchange thresholds, and the TSB with what
     the protocol says to do. Each writes its own line of the note.
   Thresholds: Paediatric Protocols for Malaysian Hospitals,
   5th ed., ch. 21 (AAP 2022 for >= 35 weeks, NICE for <= 34).
   ======================================================= */

// ---------- Threshold tables (µmol/L) ----------
// AAP: rows at these hours of life; flat after 120 h.
const NNJ_AAP_HOURS = [6, 12, 24, 48, 72, 96, 120];
const NNJ_AAP = {
  noRisk: {
    38: { pt: [101, 121, 159, 222, 270, 303, 306], et: [321, 337, 366, 410, 443, 462, 462] },
    37: { pt: [94, 113, 149, 212, 258, 291, 294], et: [304, 320, 347, 395, 431, 455, 456] },
    36: { pt: [84, 103, 140, 202, 248, 279, 280], et: [285, 299, 327, 374, 412, 436, 439] },
    35: { pt: [58, 94, 130, 191, 236, 267, 268], et: [266, 280, 306, 354, 391, 419, 422] },
  },
  risk: {
    38: { pt: [74, 94, 128, 188, 232, 260, 260], et: [265, 279, 303, 344, 378, 402, 402] },
    37: { pt: [67, 85, 120, 180, 224, 255, 256], et: [256, 268, 294, 337, 371, 395, 397] },
    36: { pt: [56, 75, 109, 167, 212, 239, 241], et: [246, 260, 284, 327, 357, 378, 381] },
    35: { pt: [48, 67, 101, 157, 198, 224, 227], et: [236, 250, 275, 316, 344, 361, 364] },
  },
};
// NICE, preterm <= 34 weeks: rows at these hours; flat from 72 h.
const NNJ_NICE_HOURS = [6, 12, 24, 48, 72, 96];
const NNJ_NICE = {
  23: { pt: [45, 55, 70, 100, 130, 130], et: [90, 105, 130, 180, 230, 230] },
  24: { pt: [45, 60, 70, 110, 140, 140], et: [90, 110, 135, 185, 240, 240] },
  25: { pt: [50, 60, 80, 110, 150, 150], et: [100, 110, 140, 190, 250, 250] },
  26: { pt: [50, 60, 80, 120, 160, 160], et: [100, 110, 140, 200, 260, 260] },
  27: { pt: [50, 60, 80, 130, 170, 170], et: [100, 110, 140, 205, 270, 270] },
  28: { pt: [50, 60, 90, 130, 180, 180], et: [100, 110, 150, 210, 280, 280] },
  29: { pt: [50, 65, 90, 140, 190, 190], et: [100, 115, 150, 220, 290, 290] },
  30: { pt: [50, 65, 95, 145, 200, 200], et: [100, 115, 150, 220, 300, 300] },
  31: { pt: [50, 70, 100, 155, 210, 210], et: [100, 120, 155, 230, 310, 310] },
  32: { pt: [50, 70, 100, 160, 220, 220], et: [100, 120, 160, 240, 320, 320] },
  33: { pt: [50, 70, 100, 170, 230, 230], et: [100, 120, 160, 245, 330, 330] },
  34: { pt: [50, 70, 110, 170, 240, 240], et: [100, 120, 170, 250, 340, 340] },
};
const NNJ_ESCALATION_GAP = 34;   // escalation of care starts 34 below the ET threshold
const NNJ_INTENSIVE_GAP = 51;    // intensive phototherapy starts 51 above the PT threshold

// Straight line between the two table rows either side of this hour. Before the first row, the first row.
function nnjInterpolate(hours, rows, values) {
  if (hours <= rows[0]) return { value: values[0], from: rows[0], to: rows[0] };
  for (let i = 1; i < rows.length; i++) {
    if (hours <= rows[i]) {
      const t = (hours - rows[i - 1]) / (rows[i] - rows[i - 1]);
      return { value: Math.round(values[i - 1] + t * (values[i] - values[i - 1])), from: rows[i - 1], to: rows[i] };
    }
  }
  const last = rows[rows.length - 1];
  return { value: values[values.length - 1], from: last, to: last };
}

// The thresholds for this baby, or null when no table covers the gestation.
function nnjThresholds(gaWeeks, hours, neuroRisk) {
  if (gaWeeks >= 35) {
    const week = Math.min(38, gaWeeks);
    const set = NNJ_AAP[neuroRisk ? 'risk' : 'noRisk'][week];
    const pt = nnjInterpolate(hours, NNJ_AAP_HOURS, set.pt);
    const et = nnjInterpolate(hours, NNJ_AAP_HOURS, set.et);
    return {
      source: 'aap', pt: pt.value, et: et.value, rows: [pt.from, pt.to],
      table: `${week === 38 ? '≥38' : week} wk, ${neuroRisk ? 'with' : 'no'} neurotoxicity risk factor (AAP)`,
    };
  }
  if (gaWeeks >= 23) {
    const set = NNJ_NICE[gaWeeks];
    const pt = nnjInterpolate(hours, NNJ_NICE_HOURS, set.pt);
    const et = nnjInterpolate(hours, NNJ_NICE_HOURS, set.et);
    return { source: 'nice', pt: pt.value, et: et.value, rows: [pt.from, pt.to], table: `${gaWeeks} wk preterm (NICE)` };
  }
  return null;
}

// ---------- Small helpers ----------
function nnjEl(id) { return document.getElementById(id); }
function nnjNum(id) {
  const el = nnjEl(id);
  if (!el) return null;
  const n = parseFloat(String(el.value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function nnjTime(id) {
  const el = nnjEl(id);
  if (!el || !el.value) return null;
  const t = new Date(el.value).getTime();
  return Number.isFinite(t) ? t : null;
}
function nnjStamp(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function nnjLocalValue(ms) {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}
function nnjKg(value) {
  // Grams typed by habit (e.g. 3100) are read as grams.
  return value === null ? null : value > 100 ? value / 1000 : value;
}

function nnjLabeled(labelText, input) {
  const cell = document.createElement('div');
  const label = document.createElement('label');
  label.htmlFor = input.id;
  label.textContent = labelText;
  cell.append(label, input);
  return cell;
}
function nnjInput(id, type, attrs = {}) {
  const input = document.createElement('input');
  input.id = id;
  input.type = type;
  input.autocomplete = 'off';
  input.dataset.skipExport = 'true';
  Object.entries(attrs).forEach(([k, v]) => input.setAttribute(k, v));
  return input;
}

// ---------- BIND score ----------
const NNJ_BIND_ROWS = [
  { key: 'MS', name: 'Mental status', options: ['Normal', 'Sleepy but arousable; decreased feeding', 'Lethargy, poor suck and/or irritable/jittery with strong suck', 'Semi-coma, apnoea, unable to feed, seizures, coma'] },
  { key: 'T', name: 'Muscle tone', options: ['Normal', 'Persistent mild to moderate hypotonia', 'Hypertonia alternating with hypotonia, beginning arching of neck and trunk', 'Persistent retrocollis and opisthotonus, bicycling or twitching'] },
  { key: 'C', name: 'Cry', options: ['Normal', 'High pitched when aroused', 'Shrill, difficult to console', 'Inconsolable, or weak or absent cry'] },
];

function nnjBindBand(total) {
  if (total === 0) return 'no signs of ABE';
  if (total <= 3) return 'mild ABE';
  if (total <= 6) return 'moderate ABE, urgent bilirubin reduction';
  return 'advanced ABE, urgent bilirubin reduction';
}

// The total from the note text, e.g. "4/9 (MS2 T1 C1) ...", or null when not all three rows are scored.
function nnjBindTotal() {
  const m = String(nnjEl('nnjBindScore')?.value || '').match(/MS([0-3])\s*T([0-3])\s*C([0-3])/);
  return m ? +m[1] + +m[2] + +m[3] : null;
}

function renderBindField(container, field) {
  const label = document.createElement('label');
  label.htmlFor = field.id;
  label.textContent = field.label;
  const wrap = document.createElement('div');
  wrap.className = 'nnj-bind';
  const picked = { MS: null, T: null, C: null };

  NNJ_BIND_ROWS.forEach(row => {
    const line = document.createElement('div');
    line.className = 'nnj-bind-row';
    const name = document.createElement('span');
    name.className = 'nnj-bind-name';
    name.textContent = row.name;
    const chips = document.createElement('div');
    chips.className = 'chip-container';
    row.options.forEach((text, score) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn';
      btn.dataset.row = row.key;
      btn.dataset.score = String(score);
      btn.textContent = `${score} · ${text}`;
      chips.appendChild(btn);
    });
    line.append(name, chips);
    wrap.appendChild(line);
  });

  const input = document.createElement('input');
  input.type = 'text';
  input.id = field.id;
  input.readOnly = true;
  input.placeholder = field.placeholder || '';

  const paint = () => wrap.querySelectorAll('.chip-btn').forEach(b => {
    b.classList.toggle('active', picked[b.dataset.row] === +b.dataset.score);
  });
  const write = () => {
    const done = Object.values(picked).every(v => v !== null);
    const any = Object.values(picked).some(v => v !== null);
    const tag = `MS${picked.MS ?? '_'} T${picked.T ?? '_'} C${picked.C ?? '_'}`;
    if (done) {
      const total = picked.MS + picked.T + picked.C;
      input.value = `${total}/9 (${tag}), ${nnjBindBand(total)}`;
    } else {
      input.value = any ? `${tag} (incomplete)` : '';
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  wrap.addEventListener('click', e => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    const score = +btn.dataset.score;
    picked[btn.dataset.row] = picked[btn.dataset.row] === score ? null : score;
    paint();
    write();
  });
  // A restored session sets the text; the buttons follow it.
  input.addEventListener('input', e => {
    if (!e.isTrusted) {
      const m = input.value.match(/MS([0-3_])\s*T([0-3_])\s*C([0-3_])/);
      ['MS', 'T', 'C'].forEach((k, i) => { picked[k] = m && m[i + 1] !== '_' ? +m[i + 1] : null; });
      paint();
    }
  });
  input._resetGCS = () => { picked.MS = picked.T = picked.C = null; paint(); };

  container.append(label, wrap, input);
}


// ---------- The calculator, split so each part writes its own line of the note ----------
// Each widget keeps its note text in a hidden input with the field's id, so the note
// follows the field order in clinical_templates.js:
//   nnj-age        Age           hours of life at the time of the TSB
//   nnj-ga         Born at       gestation
//   nnj-neuro      Neurotoxicity risk factors
//   nnj-thresholds Thresholds    PT and ET for this baby
//   nnj-calc       Bilirubin     the TSB and what the protocol says to do
function nnjHidden(field) {
  const out = document.createElement('input');
  out.type = 'hidden';
  out.id = field.id;
  return out;
}
function nnjBox(wide) {
  const box = document.createElement('div');
  box.className = 'nnj-box' + (wide ? ' nnj-wide' : '');
  return box;
}
function nnjHeading(field) {
  const label = document.createElement('label');
  label.textContent = field.label;
  return label;
}
function nnjReadout(id) {
  const div = document.createElement('div');
  div.id = id;
  div.className = 'nnj-readout';
  div.setAttribute('aria-live', 'polite');
  return div;
}

function renderNnjAgeField(container, field) {
  const box = nnjBox(true);
  const times = document.createElement('div');
  times.className = 'grid-2';
  const sample = nnjInput('nnjSampleTime', 'datetime-local');
  const sampleCell = nnjLabeled('TSB taken at', sample);
  const now = document.createElement('button');
  now.type = 'button';
  now.className = 'chip-btn nnj-now';
  now.textContent = 'Now';
  now.addEventListener('click', () => {
    sample.value = nnjLocalValue(Date.now());
    sample.dispatchEvent(new Event('input', { bubbles: true }));
  });
  sampleCell.appendChild(now);
  times.append(nnjLabeled('Date & time of birth', nnjInput('nnjBirthTime', 'datetime-local')), sampleCell);
  box.append(times, nnjReadout('nnjAgeReadout'), nnjHidden(field));
  container.append(nnjHeading(field), box);
}

function renderNnjGaField(container, field) {
  const box = nnjBox(false);
  const nums = document.createElement('div');
  nums.className = 'nnj-ga';
  nums.append(
    nnjLabeled('Weeks', nnjInput('nnjGaWeeks', 'number', { min: '22', max: '44', step: '1', inputmode: 'numeric', placeholder: 'e.g., 38' })),
    nnjLabeled('+ days', nnjInput('nnjGaDays', 'number', { min: '0', max: '6', step: '1', inputmode: 'numeric', placeholder: '0' })),
  );
  box.append(nums, nnjHidden(field));
  container.append(nnjHeading(field), box);
}

const NNJ_NEURO_RISKS = [
  ['nnjNtHaemolysis', 'Isoimmune haemolysis, G6PD deficiency or other haemolysis', 'haemolysis/G6PD deficiency'],
  ['nnjNtSepsis', 'Sepsis', 'sepsis'],
  ['nnjNtUnstable', 'Significant clinical instability in the last 24 h', 'clinical instability in last 24 h'],
  ['nnjNtAlbumin', 'Albumin < 30 g/L', 'albumin < 30 g/L'],
];

function renderNnjNeuroField(container, field) {
  const box = nnjBox(true);
  const risks = document.createElement('div');
  risks.className = 'nnj-risks';
  NNJ_NEURO_RISKS.forEach(([id, text]) => {
    const row = document.createElement('label');
    row.className = 'nnj-check';
    row.append(nnjInput(id, 'checkbox'), document.createTextNode(' ' + text));
    risks.appendChild(row);
  });
  const hint = document.createElement('p');
  hint.className = 'nnj-hint';
  hint.textContent = 'For 35 weeks and above: any tick switches to the lower AAP table.';
  box.append(risks, hint, nnjHidden(field));
  container.append(nnjHeading(field), box);
}

function renderNnjThresholdsField(container, field) {
  const box = nnjBox(true);
  box.append(nnjReadout('nnjThresholdReadout'), nnjHidden(field));
  container.append(nnjHeading(field), box);
}

function renderNnjCalcField(container, field) {
  const box = nnjBox(true);
  const tsb = nnjLabeled('TSB (µmol/L)', nnjInput('nnjTsb', 'number', { min: '0', step: '1', inputmode: 'numeric', placeholder: 'e.g., 250' }));
  tsb.className = 'nnj-tsb';
  const result = document.createElement('div');
  result.id = 'nnjResult';
  result.className = 'nnj-result';
  result.setAttribute('aria-live', 'polite');
  const out = nnjHidden(field);
  // Clear empties every box; the readouts and advice then have to go too.
  out._resetGCS = () => setTimeout(() => {
    delete nnjEl('nnjWeightLoss')?.dataset.auto;
    updateNnjCalc();
  }, 0);
  box.append(tsb, result, out);
  container.append(nnjHeading(field), box);
}

function nnjRiskList() {
  return NNJ_NEURO_RISKS.filter(([id]) => nnjEl(id)?.checked).map(([, , note]) => note);
}

function nnjSetOut(id, value) {
  const el = nnjEl(id);
  if (el) el.value = value || '';
}
function nnjSetReadout(id, text, level) {
  const el = nnjEl(id);
  if (!el) return;
  el.textContent = text || '';
  el.className = 'nnj-readout' + (level ? ` is-${level}` : '');
}

// Works out every line from the boxes and writes them, with the advice on screen.
function updateNnjCalc() {
  if (!nnjEl('nnjResult')) return;

  const birth = nnjTime('nnjBirthTime');
  const sample = nnjTime('nnjSampleTime');
  const weeks = nnjNum('nnjGaWeeks');
  const days = nnjNum('nnjGaDays') ?? 0;
  const tsb = nnjNum('nnjTsb');
  const bind = nnjBindTotal();
  const risks = nnjRiskList();
  const g6pdDeficient = /deficien/i.test(nnjEl('nnjG6PD')?.value || '');
  const wk = weeks === null ? null : Math.floor(weeks);

  // Age
  let hours = null;
  if (birth !== null && sample !== null) {
    const h = (sample - birth) / 3600000;
    if (h < 0) {
      nnjSetOut('nnjAge', '');
      nnjSetReadout('nnjAgeReadout', 'TSB time is before the time of birth. Check both times.', 'warn');
    } else {
      hours = h;
      const age = `${Math.floor(h)} h (day ${Math.floor(h / 24) + 1}) of life`;
      nnjSetOut('nnjAge', `${age} at time of TSB (born ${nnjStamp(birth)}, TSB taken ${nnjStamp(sample)})`);
      nnjSetReadout('nnjAgeReadout', `${age} at time of TSB`);
    }
  } else {
    nnjSetOut('nnjAge', '');
    nnjSetReadout('nnjAgeReadout', '');
  }

  // Born at
  nnjSetOut('nnjBornAt', wk === null ? '' : `${wk}+${days} weeks`);

  // Neurotoxicity risk factors: written once the gestation is in, or as soon as one is ticked.
  nnjSetOut('nnjNeuroRisk', risks.length ? risks.join(', ') : wk !== null && wk >= 35 ? 'None' : '');

  // Thresholds
  let th = null;
  if (hours === null || wk === null) {
    nnjSetOut('nnjThresholds', '');
    const need = [];
    if (birth === null) need.push('time of birth');
    if (sample === null) need.push('time TSB taken');
    if (wk === null) need.push('gestation');
    nnjSetReadout('nnjThresholdReadout', need.length ? `Needs ${need.join(', ')}.` : '', 'muted');
  } else {
    th = nnjThresholds(wk, hours, risks.length > 0);
    if (!th) {
      nnjSetOut('nnjThresholds', `no protocol table for ${wk} weeks`);
      nnjSetReadout('nnjThresholdReadout', `No protocol table for ${wk} weeks. Discuss with the paediatric team.`, 'warn');
    } else {
      let text = `PT ${th.pt}, ET ${th.et} µmol/L`;
      if (th.source === 'aap') text += ` (intensive PT ${th.pt + NNJ_INTENSIVE_GAP}, escalation ${th.et - NNJ_ESCALATION_GAP})`;
      const table = th.source === 'aap'
        ? `AAP table ${wk >= 38 ? '≥38' : wk} wk, ${risks.length ? 'with' : 'no'} neurotoxicity risk factor`
        : `NICE table ${wk} wk preterm`;
      nnjSetOut('nnjThresholds', `${text}; ${table}`);
      nnjSetReadout('nnjThresholdReadout', `${text}. ${table}.`);
    }
  }

  // Bilirubin and advice
  const advice = [];   // { level, text }
  const add = (level, text) => advice.push({ level, text });
  if (tsb !== null && th) {
    const toPt = tsb - th.pt;
    const vsPt = toPt >= 0 ? `${toPt} above PT threshold` : `${-toPt} below PT threshold`;
    if (tsb >= th.et) {
      add('urgent', 'At or above ET threshold: urgent exchange transfusion. Escalate care (NICU directly), intensive phototherapy, PO + IV hydration.');
    } else if (th.source === 'aap' && tsb >= th.et - NNJ_ESCALATION_GAP) {
      add('urgent', `Escalation of care (within ${NNJ_ESCALATION_GAP} of ET threshold): admit to NICU directly, intensive phototherapy, PO + IV hydration, STAT total & direct SB, FBC, electrolytes, GXM, notify blood bank, TSB every 2-3 h.`);
    } else if (th.source === 'aap' && tsb >= th.pt + NNJ_INTENSIVE_GAP) {
      add('high', `${vsPt}: intensive phototherapy (≥ ${NNJ_INTENSIVE_GAP} above PT threshold).`);
    } else if (tsb >= th.pt) {
      add('high', `${vsPt}: start phototherapy.`);
    } else if (-toPt <= 50) {
      add('warn', `${vsPt}: within 50 of the PT threshold.`);
    } else {
      add('ok', `${vsPt}.`);
    }
    if (hours < 6) add('warn', 'Under 6 h of life: the table starts at 6 h, so the 6 h row is used.');
  }
  if (hours !== null && hours < 24) add('warn', 'Jaundice in the first 24 h is abnormal: G6PD, mother & baby blood group, DAT, FBC ± PBF, reticulocyte count; septic workup if infection suspected.');
  if (tsb !== null && tsb > 342) add('warn', 'TSB > 342: ABR hearing test within the first 3 months.');
  if (bind !== null && bind >= 4) add('urgent', `BIND ${bind}/9 (${nnjBindBand(bind)}): urgent exchange transfusion and escalation of care.`);
  if (g6pdDeficient) add('warn', 'G6PD deficient: admit and monitor for NNJ until day 5 (term, BW > 2.5 kg may go home on day 4 if TSB < 160).');
  const bw = nnjKg(nnjNum('nnjBirthWeight'));
  const cw = nnjKg(nnjNum('nnjWeight'));
  if (bw && cw && cw < bw && (bw - cw) / bw > 0.07) add('warn', 'Weight loss > 7%: refer for further evaluation and watch closely for jaundice.');

  nnjSetOut('nnjCalc', tsb === null ? '' : [`TSB ${tsb} µmol/L.`, ...advice.map(a => a.text)].join(' '));

  const result = nnjEl('nnjResult');
  const order = ['ok', 'warn', 'high', 'urgent'];
  const worst = advice.reduce((w, a) => (order.indexOf(a.level) > order.indexOf(w) ? a.level : w), advice.length ? 'ok' : '');
  result.className = 'nnj-result' + (worst ? ` is-${worst}` : '');
  result.replaceChildren();
  if (tsb !== null && !th && hours !== null && wk !== null) {
    // No table: the thresholds readout already says so.
  } else if (tsb !== null && !th) {
    const p = document.createElement('p');
    p.className = 'nnj-missing';
    p.textContent = 'Fill in the age and gestation above to compare with the thresholds.';
    result.appendChild(p);
  }
  advice.forEach(a => {
    const p = document.createElement('p');
    p.className = `nnj-advice is-${a.level}`;
    p.textContent = a.text;
    result.appendChild(p);
  });
}

function updateNnjWeightLoss() {
  const loss = nnjEl('nnjWeightLoss');
  if (!loss || (loss.value && !loss.dataset.auto)) return;
  const bw = nnjKg(nnjNum('nnjBirthWeight'));
  const cw = nnjKg(nnjNum('nnjWeight'));
  if (bw && cw) {
    const pct = ((bw - cw) / bw) * 100;
    loss.value = pct >= 0 ? `${pct.toFixed(1)}%` : `gained ${(-pct).toFixed(1)}%`;
    loss.dataset.auto = 'true';
  } else if (loss.dataset.auto) {
    loss.value = '';
    delete loss.dataset.auto;
  }
}


const NNJ_OUTPUT_IDS = ['nnjAge', 'nnjBornAt', 'nnjNeuroRisk', 'nnjThresholds', 'nnjCalc'];

document.addEventListener('input', e => {
  const el = e.target;
  if (!el || !el.closest || !el.closest('#nnj-section')) return;
  if (el.id === 'nnjWeightLoss') { delete el.dataset.auto; return; }
  if (el.id === 'nnjBirthWeight' || el.id === 'nnjWeight') updateNnjWeightLoss();
  // G6PD deficiency is a neurotoxicity risk factor: tick it, never untick it.
  if (el.id === 'nnjG6PD' && /deficien/i.test(el.value)) {
    const cb = nnjEl('nnjNtHaemolysis');
    if (cb) cb.checked = true;
  }
  if (!NNJ_OUTPUT_IDS.includes(el.id)) updateNnjCalc();
});
document.addEventListener('change', e => {
  if (e.target && e.target.closest && e.target.closest('#nnj-section')) updateNnjCalc();
});

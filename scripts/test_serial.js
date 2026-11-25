// Self-check for Serial Chart parsing/merging (synthetic data). Run: node scripts/test_serial.js
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = { console, document: { addEventListener() {} }, localStorage: {}, Date, Map, Set, JSON, Math, String, Array, Object };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../assets/js/19-form-serial.js', 'utf8') + '\nthis.T={parseSerialRows,mergeSerialResults,serialValue};', ctx);
const { parseSerialRows, mergeSerialResults, serialValue } = ctx.T;

assert.strictEqual(serialValue('12.06 X10^9/L (4~10) Abnormal'), '12.06');
assert.strictEqual(serialValue('> 90 (~)'), '>90');
assert.strictEqual(serialValue('Light Yellow'), 'Light Yellow');
assert.strictEqual(serialValue('0.92 Number (1~1.5) Abnormal'), '0.92');

const R = (l, v) => ['&nbsp', l, v];   // first cell as the real helper sends it
const rows = [
  ['06:31'], ['Laboratory'], ['Chemical Path'], R('VBGC', 'Result Text:'),
  ['05:43'], ['Laboratory'], ['Chemical Path'], ['Urine FEME'], R('Ph Urine', '6.5 (5~8)'), R('TP', 'Negative'),
  R('Blood', 'Trace'), R('GLUC_URINE', 'Negative'), R('Color', 'Light Yellow'),
  ['05:26'], ['Chemical Path'], ['LFT'], R('Total Protein', '92 g/l (64~83) Abnormal'), R('Albumin', '48 g/l (35~50)'), R('Globulin', '44 g/l (20~35) Abnormal'),
  ['05:26'], ['RP'], R('Na+', '137 mmol/l (136~145)'), R('Creat', '62 umol/l (44~106)'), R('Creatine Kinase', '123 U/L (1~145)'), R('CRP', '7 mg/l Abnormal'),
  ['23:40'], ['Laboratory'], ['Haematology'], ['FBC'], R('HB concentrate', '11.0 g/dL (12~15)'),   // yesterday
  ['04:39'], ['Laboratory'], ['Haematology'], ['FBC'], R('White Cell Coun', '12.06 X10^9/L (4~10) Abnormal'),
  R('HB concentrate', '14.5 g/dL (12~15)'), R('Neutrophil %', '64.2 % (40~80)'), R('Neutrophil Coun', '7.7 X10^9/L (2~7) Abnormal'),
  R('Lymphocyte %', '28 % (1~3)'), R('MCHC', '32.3 g/dL'), R('HbA1c', '6.1 %'),
  ['More..(dtl)']
];
const { results, others } = parseSerialRows(rows, '2026-11-25T07:00');
const get = (k, at) => results.find(r => r.key === k && (!at || r.at === at));
assert.strictEqual(get('NEU').value, '7.7 (64.2%)');
assert.strictEqual(get('LYMP').value, '28%');
assert.strictEqual(get('ALBGLO').value, '48/44');
assert.strictEqual(get('UPROT').value, 'Negative');
assert.strictEqual(get('UERY').value, 'Trace');
assert.strictEqual(get('UPH').value, '6.5');
assert.strictEqual(get('CK').value, '123');
assert.strictEqual(get('CREAT').value, '62');
assert.strictEqual(get('HBA1C').value, '6.1');
assert.strictEqual(get('HB', '2026-11-24T23:40').value, '11.0', 'time after now = yesterday');
assert.strictEqual(get('HB', '2026-11-25T04:39').value, '14.5');
assert.ok(!results.some(r => r.key === 'TP'), 'LFT Total Protein is not urine TP');
assert.strictEqual(others.map(o => o.label).sort().join(), 'Color,MCHC,Total Protein');

const cols = [];
let m = mergeSerialResults(cols, results);
assert.strictEqual(m.added, results.length);
assert.strictEqual(cols.length, 2, 'repeat HB opens a second column');
assert.strictEqual(cols[0].at, '2026-11-24T23:40');
assert.strictEqual(cols[0].cells.HB, '11.0');
assert.strictEqual(cols[0].cells.TWC, '12.06', 'everything else joins the first 24 h column');
assert.strictEqual(cols[1].cells.HB, '14.5');
assert.strictEqual(cols[1].time, '04:39');
assert.strictEqual(Object.keys(cols[1].cells).length, 1);

m = mergeSerialResults(cols, results);   // same click again
assert.strictEqual([m.added, m.skipped, cols.length].join(), [0, results.length, 2].join());

// next day: new results more than 24 h after the first column start a new column
const next = parseSerialRows([['08:00'], ['FBC'], R('HB concentrate', '13.9 g/dL')], '2026-11-26T09:00').results;
mergeSerialResults(cols, next);
assert.strictEqual(cols.length, 3);
assert.strictEqual(cols[2].date, '26/11/2026');
console.log('serial chart self-check: all passed');

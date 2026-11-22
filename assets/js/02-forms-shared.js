// ----------------------------------------------------
// CONSOLIDATED CLINICAL PROFILE MANAGER
// ----------------------------------------------------
const CLINICAL_PROFILE_KEY = 'ed_doc_profile';

function getClinicalProfile() {
  let profile = {};
  try {
    const raw = localStorage.getItem(CLINICAL_PROFILE_KEY);
    if (raw) profile = JSON.parse(raw);
  } catch (e) {}

  // Older builds defaulted to HKL / Zon Kuning; migrate saved values
  const norm = v => v === 'HOSPITAL KUALA LUMPUR' ? 'HOSPITAL LAHAD DATU'
    : (v === 'ED / ZON KUNING' || v === 'ZON KUNING') ? 'ED' : v;

  return {
    hospital: norm(profile.hospital || localStorage.getItem('ra301_hospital') || localStorage.getItem('pat301_hospital') || localStorage.getItem('rujukan_hospital') || localStorage.getItem('bt105_hospital') || ''),
    wad: norm(profile.wad || localStorage.getItem('ra301_wad') || localStorage.getItem('pat301_wad') || localStorage.getItem('bt105_wad') || ''),
    doctorName: profile.doctorName || localStorage.getItem('ra301_doctor_name') || localStorage.getItem('pat301_doctor_name') || localStorage.getItem('rujukan_doctor_name') || localStorage.getItem('bt105_doctor_name') || '',
    disiplin: profile.disiplin || localStorage.getItem('ra301_disiplin') || '',
    jawatan: profile.jawatan || localStorage.getItem('rujukan_jawatan') || '',
    unit: profile.unit || localStorage.getItem('bt105_unit') || '',
    consultant: profile.consultant || localStorage.getItem('bt105_consultant') || ''
  };
}

function saveClinicalProfile(updates) {
  const current = getClinicalProfile();
  const merged = { ...current, ...updates };
  try {
    localStorage.setItem(CLINICAL_PROFILE_KEY, JSON.stringify(merged));
  } catch (e) {}

  // Keep legacy keys synced for backward compatibility
  if (merged.hospital) {
    localStorage.setItem('pat301_hospital', merged.hospital);
    localStorage.setItem('ra301_hospital', merged.hospital);
    localStorage.setItem('rujukan_hospital', merged.hospital);
    localStorage.setItem('bt105_hospital', merged.hospital);
  }
  if (merged.wad) {
    localStorage.setItem('pat301_wad', merged.wad);
    localStorage.setItem('ra301_wad', merged.wad);
    localStorage.setItem('bt105_wad', merged.wad);
  }
  if (merged.doctorName) {
    localStorage.setItem('pat301_doctor_name', merged.doctorName);
    localStorage.setItem('ra301_doctor_name', merged.doctorName);
    localStorage.setItem('rujukan_doctor_name', merged.doctorName);
    localStorage.setItem('bt105_doctor_name', merged.doctorName);
  }
  if (merged.disiplin) localStorage.setItem('ra301_disiplin', merged.disiplin);
  if (merged.jawatan) localStorage.setItem('rujukan_jawatan', merged.jawatan);
  if (merged.unit) localStorage.setItem('bt105_unit', merged.unit);
  if (merged.consultant) localStorage.setItem('bt105_consultant', merged.consultant);
}

// ----------------------------------------------------
// PATIENT GENDER (never assumed)
// Clerking value first, then a valid IC. Unknown stays '' so forms leave it blank.
// ----------------------------------------------------
function resolvePatientGender(genderRaw, ic) {
  const g = String(genderRaw || '').trim().toLowerCase();
  if (g.includes('perempuan') || g === 'female' || g === 'f') return 'female';
  if (g.includes('lelaki') || g === 'male' || g === 'm') return 'male';
  const fromIc = calculateAgeFromIC(ic);
  return fromIc && fromIc.gender ? fromIc.gender.toLowerCase() : '';
}

// Fill a form field from the clerking without carrying data across patients.
// A value this put in earlier is replaced (or cleared) when the clerking changes;
// a value the user typed into the form is left alone.
function autofillFormField(el, value) {
  if (!el) return;
  const prev = el.dataset.autofilled;
  if (!el.value.trim() || (prev !== undefined && el.value === prev)) {
    el.value = value || '';
    el.dataset.autofilled = el.value;
  }
}

function setGenderRadios(prefix, gender) {
  document.getElementById(`${prefix}_gender_f`).checked = gender === 'female';
  document.getElementById(`${prefix}_gender_m`).checked = gender === 'male';
}

function getGenderRadios(prefix, maleLabel, femaleLabel) {
  if (document.getElementById(`${prefix}_gender_f`)?.checked) return femaleLabel;
  if (document.getElementById(`${prefix}_gender_m`)?.checked) return maleLabel;
  return '';
}

// ----------------------------------------------------
// THE CLINICAL RECORD (one reading for every form)
// The PAT301 and RA301 summaries and the referral letter all write from this, so a
// fact entered anywhere in the clerking reaches every form. It reads through the same
// functions the note's Insert buttons use. Blank means not recorded: nothing here
// fills in a default.
// ----------------------------------------------------
function recordValue(id) {
  return (document.getElementById(id)?.value || '').trim();
}

// Adds the unit unless the value already carries it ("96% RA" stays as it is).
function recordWithUnit(value, unit) {
  return value && !value.toLowerCase().includes(unit.trim().toLowerCase()) ? value + unit : value;
}

// Filled sections of one template card, worded as the Template Editor sets them.
// The GCS is left out here: the exam reading puts it first, once.
function recordTemplateSections(containerId) {
  const cat = (window.CLINICAL_TEMPLATES || []).find(c => c.containerId === containerId);
  if (!cat || typeof collectTemplateParts !== 'function') return [];
  return cat.submenus
    .map(s => ({ ...s, fields: s.fields.filter(f => f.customInput !== 'gcs-evm') }))
    .map(s => ({ header: s.noteHeader || s.title, title: s.title, parts: collectTemplateParts(s) }))
    .filter(s => s.parts.length);
}

function readRecordVitals() {
  return [
    { label: 'BP', value: recordWithUnit(recordValue('vitalBP'), ' mmHg') },
    { label: 'HR', value: recordWithUnit(recordValue('vitalHR'), ' bpm') },
    { label: 'RR', value: recordWithUnit(recordValue('vitalRR'), ' /min') },
    { label: 'Temp', value: recordWithUnit(recordValue('vitalTemp'), '°C') },
    { label: 'SpO2', value: recordWithUnit(recordValue('vitalSpO2'), '%') }
  ].filter(v => v.value);
}

// The examination for the case's format: a medical case reads the exam tabs (template
// exam cards, the typed exam, the body map); a trauma case reads the primary survey,
// the regional examination and the injury pins.
function readRecordExam(format) {
  const exam = [];
  if (format === 'trauma') {
    const trauma = collectTrauma();
    const [primary, secondary] = trauma.sections;
    primary.items.forEach(item => {
      // The vitals are written with the vitals; GCS stays in Disability, part of the exam.
      const rows = item.rows.filter(r => r.value && item.label !== 'Vitals');
      if (rows.length) exam.push({ label: item.label, text: rows.map(r => `${r.label} - ${r.value}`).join('; ') });
    });
    const regional = secondary.items.find(i => i.label === 'Regional examination');
    regional.rows.filter(r => r.value).forEach(r => exam.push({ label: r.label, text: r.value }));
    if (trauma.pins.length) {
      exam.push({
        label: 'Injuries',
        text: trauma.pins.map((p, i) => `${i + 1}. ${p.injury} over ${p.region}${p.note ? ' - ' + p.note : ''}`).join('; ')
      });
    }
    return exam;
  }

  // GCS opens the examination, whichever exam format it was entered in.
  const gcs = gcsText(recordValue('vitalGCS'));
  if (gcs) exam.push({ label: 'GCS', text: gcs });
  recordTemplateSections('exam-sections-container')
    .forEach(s => exam.push({ label: s.title, text: s.parts.join('; ') }));
  if (typeof QUICK_EXAM_SECTIONS !== 'undefined') {
    QUICK_EXAM_SECTIONS.forEach(s => {
      const text = recordValue(s.id);
      if (text) exam.push({ label: s.short, text });
    });
  }
  if (typeof EXAM_SYSTEM_KEYS !== 'undefined') {
    EXAM_SYSTEM_KEYS.forEach(sys => {
      const lines = buildExamSystemLines(sys);
      if (lines.length) exam.push({ label: EXAM_SYSTEMS[sys].title, text: lines.join('; ') });
    });
  }
  return exam;
}

// The working diagnosis, from the Impression and Plan card. Every form reads it here.
function readRecordDiagnosis() {
  return recordValue('finalDiagnosis');
}

// format is 'medical', 'trauma' or 'clash' (trauma and HOPI both filled). A clash has
// no automatic summary: the forms take the note the clinician wrote by hand.
function readClinicalRecord() {
  const format = typeof currentNoteFormat === 'function' ? currentNoteFormat() : 'medical';
  const trauma = format === 'trauma';
  return {
    format,
    presenting: trauma ? [] : (typeof collectHopiSections === 'function' ? collectHopiSections() : [])
      .concat(recordTemplateSections('routine-container')),
    mechanism: trauma ? recordValue('traumaMOI') : '',
    history: {
      underlying: recordValue('historyUnderlying'),
      allergy: recordValue('historyAllergy'),
      medication: recordValue('historyMedication'),
      surgical: recordValue('historySurgical')
    },
    vitals: readRecordVitals(),
    exam: readRecordExam(format),
    diagnosis: readRecordDiagnosis(),
    differentials: recordValue('impressionDifferentials'),
    plan: recordValue('impressionPlan')
  };
}

// ----------------------------------------------------
// PDF TEXT SAFETY
// Standard PDF fonts only cover Western characters; anything else aborts the
// whole PDF. Clinical symbols are spelled out, and characters with no
// equivalent become '?' with a visible warning.
// ----------------------------------------------------
const PDF_CHAR_MAP = {
  '\t': '    ', '≥': '>=', '≤': '<=', '≠': '!=', '≈': '~',
  '→': '->', '←': '<-', '↑': 'up ', '↓': 'down ', '−': '-',
  '‐': '-', '‑': '-', '–': '-', '—': '-', '‘': "'", '’': "'",
  '“': '"', '”': '"', '•': '*', '…': '...',
  'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'Δ': 'delta',
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
};

function pdfSafeText(value, onUnprintable) {
  return String(value == null ? '' : value)
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/([↑↓]) +/g, '$1')
    .replace(/[µμ]g\b/g, 'mcg')
    .replace(/[µμ]/g, 'u')
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/gu, ch => {
      if (ch in PDF_CHAR_MAP) return PDF_CHAR_MAP[ch];
      if (onUnprintable) onUnprintable(ch);
      return '?';
    });
}

function cleanFormDataForPdf(formData) {
  const unprintable = new Set();
  const walk = v => {
    if (typeof v === 'string') return pdfSafeText(v, ch => unprintable.add(ch));
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  const data = walk(formData);
  const warnings = unprintable.size
    ? [`These characters cannot print and show as "?": ${[...unprintable].join(' ')}. Write them by hand.`]
    : [];
  return { data, warnings };
}

function pdfCutWarning(label) {
  return `${label}: text does not fit on the form and was cut. Shorten it or write the rest by hand.`;
}

// ----------------------------------------------------
// SHARED PDF FORM UTILITIES & PREVIEW CONTROLLER
// ----------------------------------------------------
function wrapPdfLines(text, maxWidth, size) {
  const lines = [];
  const paragraphs = (text || '').split('\n');
  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const approxWidth = testLine.length * (size * 0.5);
      if (approxWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

function toggleMobilePane(prefix, view, onShowPreview) {
  const formPane = document.getElementById(`${prefix}FormPane`);
  const prevPane = document.getElementById(`${prefix}PreviewPane`) || document.getElementById(`${prefix}PrevPane`);
  const formBtn = document.getElementById(`${prefix}MobileFormBtn`);
  const prevBtn = document.getElementById(`${prefix}MobilePrevBtn`);
  if (view === 'preview') {
    if (formPane) formPane.classList.add('mobile-hidden');
    if (prevPane) prevPane.classList.add('mobile-visible');
    if (formBtn) formBtn.classList.remove('active');
    if (prevBtn) prevBtn.classList.add('active');
    if (onShowPreview) onShowPreview();
  } else {
    if (formPane) formPane.classList.remove('mobile-hidden');
    if (prevPane) prevPane.classList.remove('mobile-visible');
    if (formBtn) formBtn.classList.add('active');
    if (prevBtn) prevBtn.classList.remove('active');
  }
}

class FormPreviewManager {
  constructor({ loadingId, canvasContainerId, frameId, filenamePrefix, getFormData, generatePdfBlob, generatePreviewPdfBlob }) {
    this.loadingId = loadingId;
    this.canvasContainerId = canvasContainerId;
    this.frameId = frameId;
    this.filenamePrefix = filenamePrefix;
    this.getFormData = getFormData;
    this.generatePdfBlob = generatePdfBlob;
    this.generatePreviewPdfBlob = generatePreviewPdfBlob;
    this.debounceTimer = null;
    this.currentBlobUrl = null;
    this.currentPdfBytes = null;
  }

  debounceRefresh(delay = 350) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.refresh(), delay);
  }

  // Every PDF goes through here so text is made printable and problems reach the user.
  async build(generate) {
    await ensurePdfLibraries();
    const { data, warnings: textWarnings } = cleanFormDataForPdf(this.getFormData());
    const res = await generate(data);
    this.currentPdfBytes = res.pdfBytes;
    const warnings = textWarnings.concat(res.warnings || []);
    this.showWarnings(warnings);
    return { data, res, warnings };
  }

  showWarnings(warnings) {
    const container = document.getElementById(this.canvasContainerId);
    if (!container || !container.parentElement) return;
    let banner = container.parentElement.querySelector('.pdf-warning-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'pdf-warning-banner';
      banner.setAttribute('role', 'alert');
      container.parentElement.insertBefore(banner, container);
    }
    banner.textContent = '';
    banner.hidden = !warnings.length;
    warnings.forEach(w => {
      const line = document.createElement('div');
      line.textContent = w;
      banner.appendChild(line);
    });
  }

  toastFirstWarning(warnings) {
    if (warnings.length) showToast('Check before filing: ' + warnings[0], 7000);
  }

  async refresh() {
    const loading = document.getElementById(this.loadingId);
    const container = document.getElementById(this.canvasContainerId);
    const frame = document.getElementById(this.frameId);
    if (loading) loading.classList.add('active');

    try {
      const { res } = await this.build(this.generatePreviewPdfBlob || this.generatePdfBlob);

      if (this.currentBlobUrl) {
        URL.revokeObjectURL(this.currentBlobUrl);
      }
      this.currentBlobUrl = res.url;

      const rendered = await renderPdfToCanvasContainer(res.pdfBytes, container, frame);
      if (!rendered && frame) {
        frame.src = res.url;
      }
    } catch (err) {
      console.error('Failed to generate PDF preview:', err);
      showToast('Error generating PDF: ' + err.message);
    } finally {
      if (loading) loading.classList.remove('active');
    }
  }

  getSafeFilename(data) {
    const safeName = (data.patientName || 'PATIENT').replace(/[^a-zA-Z0-9]/g, '_');
    const safeRN = (data.patientHospitalID || 'RN').replace(/[^a-zA-Z0-9]/g, '_');
    return `${this.filenamePrefix}_${safeName}_${safeRN}.pdf`;
  }

  async download() {
    try {
      showToast(`Generating ${this.filenamePrefix} PDF...`);
      const { data, res, warnings } = await this.build(this.generatePdfBlob);
      const filename = this.getSafeFilename(data);
      downloadPdfFile(res.pdfBytes, filename);
      this.toastFirstWarning(warnings);
    } catch (err) {
      console.error('Download error:', err);
      showToast('Download error: ' + err.message);
    }
  }

  async shareOrOpen() {
    try {
      showToast(`Opening ${this.filenamePrefix} PDF...`);
      const { data, res, warnings } = await this.build(this.generatePdfBlob);
      const filename = this.getSafeFilename(data);
      await shareOrOpenPdf(res.pdfBytes, filename);
      this.toastFirstWarning(warnings);
    } catch (err) {
      console.error('Share/Open error:', err);
      showToast('Error: ' + err.message);
    }
  }

  async print() {
    try {
      const { data, res, warnings } = await this.build(this.generatePdfBlob);
      const filename = this.getSafeFilename(data);
      await printPdfFile(res.pdfBytes, filename, this.frameId);
      this.toastFirstWarning(warnings);
    } catch (err) {
      console.error('Print error:', err);
      showToast('Print error: ' + err.message);
    }
  }
}

let pat301Manager, ra301Manager, rujukanManager, bt105Manager;

function getPat301Manager() {
  if (!pat301Manager) {
    pat301Manager = new FormPreviewManager({
      loadingId: 'pat301PreviewLoading',
      canvasContainerId: 'pat301CanvasContainer',
      frameId: 'pat301PreviewFrame',
      filenamePrefix: 'PER_PAT_301',
      getFormData: getPat301FormData,
      generatePdfBlob: generatePat301PdfBlob
    });
  }
  return pat301Manager;
}

function getRa301Manager() {
  if (!ra301Manager) {
    ra301Manager = new FormPreviewManager({
      loadingId: 'ra301PreviewLoading',
      canvasContainerId: 'ra301CanvasContainer',
      frameId: 'ra301PreviewFrame',
      filenamePrefix: 'PER_SS_RA301',
      getFormData: getRa301FormData,
      generatePdfBlob: generateRa301PdfBlob
    });
  }
  return ra301Manager;
}

function getRujukanManager() {
  if (!rujukanManager) {
    rujukanManager = new FormPreviewManager({
      loadingId: 'rujukanPreviewLoading',
      canvasContainerId: 'rujukanCanvasContainer',
      frameId: 'rujukanPreviewFrame',
      filenamePrefix: 'Surat_Rujukan',
      getFormData: getRujukanFormData,
      generatePdfBlob: generateRujukanPdfBlob
    });
  }
  return rujukanManager;
}

// Public wrappers preserving existing function APIs
function refreshPat301Preview() { return getPat301Manager().refresh(); }
function debouncedPat301Refresh() { return getPat301Manager().debounceRefresh(); }
function downloadPat301Pdf() { return getPat301Manager().download(); }
function openOrSharePat301Pdf() { return getPat301Manager().shareOrOpen(); }
function printPat301Pdf() { return getPat301Manager().print(); }
function togglePat301MobileView(view) { return toggleMobilePane('pat301', view, refreshPat301Preview); }

function refreshRa301Preview() { return getRa301Manager().refresh(); }
function debouncedRa301Refresh() { return getRa301Manager().debounceRefresh(); }
function downloadRa301Pdf() { return getRa301Manager().download(); }
function openOrShareRa301Pdf() { return getRa301Manager().shareOrOpen(); }
function printRa301Pdf() { return getRa301Manager().print(); }
function toggleRa301MobileView(view) { return toggleMobilePane('ra301', view, refreshRa301Preview); }

function refreshRujukanPreview() { return getRujukanManager().refresh(); }
function debouncedRujukanRefresh() { return getRujukanManager().debounceRefresh(); }
function downloadRujukanPdf() { return getRujukanManager().download(); }
function openOrShareRujukanPdf() { return getRujukanManager().shareOrOpen(); }
function printRujukanPdf() { return getRujukanManager().print(); }
function toggleRujukanMobileView(view) { return toggleMobilePane('rujukan', view, refreshRujukanPreview); }

function getBt105Manager() {
  if (!bt105Manager) {
    bt105Manager = new FormPreviewManager({
      loadingId: 'bt105PreviewLoading',
      canvasContainerId: 'bt105CanvasContainer',
      frameId: 'bt105PreviewFrame',
      filenamePrefix: 'PER_SS_BT105',
      getFormData: getBt105FormData,
      generatePdfBlob: generateBt105PdfBlob,
      generatePreviewPdfBlob: (data) => generateBt105PdfBlob(data, { underlay: true })
    });
  }
  return bt105Manager;
}

function refreshBt105Preview() { return getBt105Manager().refresh(); }
function debouncedBt105Refresh() { return getBt105Manager().debounceRefresh(); }
function downloadBt105Pdf() { return getBt105Manager().download(); }
function openOrShareBt105Pdf() { return getBt105Manager().shareOrOpen(); }
function printBt105Pdf() { return getBt105Manager().print(); }
function toggleBt105MobileView(view) { return toggleMobilePane('bt105', view, refreshBt105Preview); }

let fisioterapiManager;

function getFisioterapiManager() {
  if (!fisioterapiManager) {
    fisioterapiManager = new FormPreviewManager({
      loadingId: 'fisioPreviewLoading',
      canvasContainerId: 'fisioCanvasContainer',
      frameId: 'fisioPreviewFrame',
      filenamePrefix: 'Physiotherapy_Referral',
      getFormData: getFisioterapiFormData,
      generatePdfBlob: generateFisioterapiPdfBlob
    });
  }
  return fisioterapiManager;
}

function refreshFisioterapiPreview() { return getFisioterapiManager().refresh(); }
function debouncedFisioterapiRefresh() { return getFisioterapiManager().debounceRefresh(); }
function downloadFisioterapiPdf() { return getFisioterapiManager().download(); }
function openOrShareFisioterapiPdf() { return getFisioterapiManager().shareOrOpen(); }
function printFisioterapiPdf() { return getFisioterapiManager().print(); }
function toggleFisioterapiMobileView(view) { return toggleMobilePane('fisio', view, refreshFisioterapiPreview); }

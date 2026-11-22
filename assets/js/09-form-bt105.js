/* =======================================================
   PER.SS-BT 105 (BLOOD TRANSFUSION REQUEST) JAVASCRIPT LOGIC
   Data-only overlay for the pre-printed special paper:
   - Print / Download / Share output a blank A4 with ONLY the data
   - Live preview adds a faint form underlay for alignment checking
   Coordinates calibrated against PER-SS-BT 105 (Pind. 1/2016)
   via tools/export_bt105.py
   ======================================================= */
function openBt105Modal() {
  ensurePdfLibraries();

  // 1. Gather values from parent form
  const name = document.getElementById('patientName')?.value.trim() || '';
  const ic = document.getElementById('patientID')?.value.trim() || '';
  let age = document.getElementById('patientAge')?.value.trim() || '';
  if (!age && document.getElementById('ageYears')) {
    const y = document.getElementById('ageYears').value.trim();
    if (y) age = `${y}y`;
  }
  const genderRaw = (document.getElementById('patientGender')?.value.trim() || '').toLowerCase();
  const rn = document.getElementById('patientHospitalID')?.value.trim() || '';
  const diag = readRecordDiagnosis();

  // Populate Modal Fields
  document.getElementById('bt105_patientName').value = name;
  document.getElementById('bt105_patientID').value = ic;
  document.getElementById('bt105_patientAge').value = age;
  document.getElementById('bt105_patientHospitalID').value = rn;
  document.getElementById('bt105_diagnosa').value = diag;

  setGenderRadios('bt105', resolvePatientGender(genderRaw, ic));

  // Saved Hospital / Wad / Unit / Consultant / Doctor defaults
  const profile = getClinicalProfile();
  document.getElementById('bt105_hospital').value = profile.hospital || 'HOSPITAL LAHAD DATU';
  document.getElementById('bt105_wad').value = profile.wad || '';
  document.getElementById('bt105_unit').value = profile.unit || '';
  if (profile.consultant) document.getElementById('bt105_pakarPerunding').value = profile.consultant;
  if (profile.doctorName) document.getElementById('bt105_sampelLabelBy').value = profile.doctorName;

  // Timestamp: sampling date (DD/MM/YYYY) & time (24h HH:MM), editable
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  document.getElementById('bt105_tarikh').value = `${dd}/${mm}/${yyyy}`;
  document.getElementById('bt105_waktu').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  refreshBt105Preview();

  // Show modal
  document.getElementById('bt105Modal').classList.add('active');
  openModalA11y(document.getElementById('bt105Modal'));
}

function closeBt105Modal() {
  document.getElementById('bt105Modal').classList.remove('active');
  closeModalA11y(document.getElementById('bt105Modal'));
}

function saveBt105Defaults() {
  const hosp = document.getElementById('bt105_hospital')?.value.trim();
  const wad = document.getElementById('bt105_wad')?.value.trim();
  const unit = document.getElementById('bt105_unit')?.value.trim();
  const consultant = document.getElementById('bt105_pakarPerunding')?.value.trim();

  saveClinicalProfile({ hospital: hosp, wad: wad, unit: unit, consultant: consultant });
  showToast('Transfusion form defaults saved to local storage!');
}

function getBt105FormData() {
  const checkedBekalan = document.querySelector('input[name="bt105_bekalan"]:checked');

  return {
    hospital: document.getElementById('bt105_hospital')?.value.trim() || '',
    unit: document.getElementById('bt105_unit')?.value.trim() || '',
    wad: document.getElementById('bt105_wad')?.value.trim() || '',
    patientName: document.getElementById('bt105_patientName')?.value.trim() || '',
    patientID: document.getElementById('bt105_patientID')?.value.trim() || '',
    patientHospitalID: document.getElementById('bt105_patientHospitalID')?.value.trim() || '',
    patientAge: document.getElementById('bt105_patientAge')?.value.trim() || '',
    patientGender: getGenderRadios('bt105', 'LELAKI', 'PEREMPUAN'),
    pakarPerunding: document.getElementById('bt105_pakarPerunding')?.value.trim() || '',
    hb: document.getElementById('bt105_hb')?.value.trim() || '',
    diagnosa: document.getElementById('bt105_diagnosa')?.value.trim() || '',
    sebabTransfusi: document.getElementById('bt105_sebabTransfusi')?.value.trim() || '',
    units: {
      wholeBlood: document.getElementById('bt105_qty_wholeBlood')?.value.trim() || '',
      packedCells: document.getElementById('bt105_qty_packedCells')?.value.trim() || '',
      paedipack: document.getElementById('bt105_qty_paedipack')?.value.trim() || '',
      plateletConcentrate: document.getElementById('bt105_qty_plateletConcentrate')?.value.trim() || '',
      cryoprecipitate: document.getElementById('bt105_qty_cryoprecipitate')?.value.trim() || '',
      ffp: document.getElementById('bt105_qty_ffp')?.value.trim() || '',
      cryosupernatant: document.getElementById('bt105_qty_cryosupernatant')?.value.trim() || ''
    },
    special: {
      washed: document.getElementById('bt105_sp_washed')?.checked || false,
      filtered: document.getElementById('bt105_sp_filtered')?.checked || false,
      irradiated: document.getElementById('bt105_sp_irradiated')?.checked || false,
      others: document.getElementById('bt105_sp_others')?.checked || false,
      othersText: document.getElementById('bt105_sp_othersText')?.value.trim() || ''
    },
    groupScreenHold: document.getElementById('bt105_gsh')?.checked || false,
    bekalan: checkedBekalan ? checkedBekalan.value : '',
    bekalanJam: document.getElementById('bt105_bekalanJam')?.value.trim() || '',
    bekalanMinit: document.getElementById('bt105_bekalanMinit')?.value.trim() || '',
    sampelLabelBy: document.getElementById('bt105_sampelLabelBy')?.value.trim() || '',
    tarikh: document.getElementById('bt105_tarikh')?.value.trim() || '',
    waktu: document.getElementById('bt105_waktu')?.value.trim() || ''
  };
}

async function generateBt105PdfBlob(data, opts = {}) {
  await ensurePdfLibraries();
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const pdfDoc = await PDFDocument.create();
  const W = 595.28, H = 841.89;
  const page = pdfDoc.addPage([W, H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const darkNavy = rgb(0.02, 0.08, 0.4);
  const warnings = [];

  // Faint form underlay (live preview only; never included in print/download output)
  if (opts.underlay) {
    try {
      const bytes = await loadPdfTemplateBytes('./assets/per_ss_bt105.pdf');
      const srcDoc = await PDFDocument.load(bytes);
      const srcPage = srcDoc.getPage(0);
      const { width: sw, height: sh } = srcPage.getSize();
      const [embedded] = await pdfDoc.embedPdf(bytes, [0]);
      page.drawPage(embedded, { x: 0, y: 0, xScale: W / sw, yScale: H / sh, opacity: 0.22 });
    } catch (e) {
      console.warn('BT105 underlay unavailable, continuing data-only:', e);
    }
  }

  // All coordinates are top-down points (baseline y) on the A4 page
  function drawText(text, x, fitzY, size = 8, bold = false, maxWidth) {
    if (!text) return;
    let s = String(text);
    if (maxWidth) {
      const f = bold ? fontBold : font;
      const full = s;
      while (s.length > 1 && f.widthOfTextAtSize(s, size) > maxWidth) s = s.slice(0, -1);
      if (s !== full) warnings.push(pdfCutWarning(`"${full}"`));
    }
    page.drawText(s, { x, y: H - fitzY, size, font: bold ? fontBold : font, color: darkNavy });
  }

  function drawCenteredText(text, cx, fitzY, size = 8) {
    if (!text) return;
    const w = font.widthOfTextAtSize(String(text), size);
    drawText(text, cx - w / 2, fitzY, size);
  }

  function drawTick(cx, cyTopDown, half = 3.4) {
    const cy = H - cyTopDown;
    page.drawLine({ start: { x: cx - half, y: cy + 1.0 }, end: { x: cx - 1.0, y: cy - 2.5 }, thickness: 1.1, color: darkNavy });
    page.drawLine({ start: { x: cx - 1.0, y: cy - 2.5 }, end: { x: cx + half + 0.4, y: cy + 2.8 }, thickness: 1.1, color: darkNavy });
  }

  function wrapLines(text, maxWidth, size) {
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
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);
        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  }

  // ---- Row 1: Nama | No. Kad Pengenalan (12 boxes) | No. Daftar ----
  drawText((data.patientName || '').toUpperCase(), 36, 108, 8.5, true, 238);
  const digits = String(data.patientID || '').replace(/[^0-9]/g, '');
  const icBoxCenters = [291.9, 307.15, 322.4, 337.6, 352.9, 368.2, 383.45, 398.7, 413.95, 429.2, 444.4, 459.65];
  if (digits.length >= 12) {
    for (let i = 0; i < 12; i++) {
      drawCenteredText(digits[i], icBoxCenters[i], 107.5, 8);
    }
  } else {
    drawText(digits, 286, 107.5, 8);
  }
  drawText(data.patientHospitalID || '', 477, 108, 8.5, false, 100);

  // ---- Row 2: Hospital | Unit | Wad | Umur | Jantina ----
  drawText(data.hospital || '', 36, 126.5, 7.5, false, 112);
  drawText(data.unit || '', 158.3, 126.5, 7.5, false, 62);
  drawText(data.wad || '', 230.3, 126.5, 7.5, false, 80);
  drawText(data.patientAge || '', 414, 126.5, 8, false, 54);
  drawText(data.patientGender || '', 477, 126.5, 7.5, false, 100);

  // ---- Row 3: Pakar Perunding ----
  drawText(data.pakarPerunding || '', 320.3, 144, 7.5, false, 145);

  // ---- Row 4: Diagnosa | Sebab transfusi | Hb % ----
  function drawCellText(label, text, x, width) {
    if (!text) return;
    let lines = wrapLines(text, width, 7);
    if (lines.length > 1) {
      lines = wrapLines(text, width, 6);
      if (lines.length > 2) warnings.push(pdfCutWarning(label));
      drawText(lines[0], x, 159.5, 6);
      drawText(lines[1], x, 165.5, 6);
    } else {
      drawText(lines[0], x, 163.5, 7);
    }
  }
  drawCellText('Diagnosa', data.diagnosa, 36, 182);
  drawCellText('Sebab transfusi', data.sebabTransfusi, 230.3, 162);
  drawText(data.hb || '', 402.8, 163.5, 7.5, false, 176);

  // ---- Sampel darah diambil dan dilabel oleh: ----
  drawText(data.sampelLabelBy || '', 170, 219.5, 8, false, 92);

  // ---- Tarikh / Waktu (declaration dotted line) ----
  // Line at y 333.2-340.8: "Tarikh" ends x~56.5, dots to "Waktu" at x~123;
  // "Waktu" ends x~144.5, dots to "pagi/petang" at x~194.9. Baseline ~339.
  drawText(data.tarikh || '', 59, 339, 7, false, 60);
  drawText(data.waktu || '', 147, 339, 7, false, 44);

  // ---- Units / mls: quantity on dotted leader + tick in checkbox ----
  const qtyAnchors = {
    wholeBlood: [356, 244.5],
    packedCells: [356, 260.5],
    paedipack: [345, 276.5],
    plateletConcentrate: [396, 292.5],
    cryoprecipitate: [370, 310],
    ffp: [388, 327],
    cryosupernatant: [356, 344.5]
  };
  const qtyTickAnchors = {
    wholeBlood: [284.0, 238.9],
    packedCells: [284.0, 256.9],
    paedipack: [283.8, 271.1],
    plateletConcentrate: [284.0, 288.7],
    cryoprecipitate: [283.8, 305.7],
    ffp: [284.0, 323.3],
    cryosupernatant: [284.0, 341.3]
  };
  for (const [key, coords] of Object.entries(qtyAnchors)) {
    const val = (data.units || {})[key];
    if (val) {
      drawText(val, coords[0], coords[1], 8, false, 72);
      drawTick(qtyTickAnchors[key][0], qtyTickAnchors[key][1]);
    }
  }

  // ---- Special Requirement & Group, Screen & Hold ----
  const sp = data.special || {};
  if (sp.washed) drawTick(454.2, 250.8);
  if (sp.filtered) drawTick(454.2, 268.8);
  if (sp.irradiated) drawTick(454.2, 285.3);
  if (sp.others || sp.othersText) {
    drawTick(454.2, 304.4);
    drawText(sp.othersText || '', 506, 306.5, 7.5, false, 38);
  }
  if (data.groupScreenHold) drawTick(454.2, 344.0);

  // ---- Bekalan diperlukan (a)-(d) ----
  const bekalan = String(data.bekalan || '').toLowerCase();
  if (bekalan === 'a') {
    drawTick(527.9, 396.7);
  } else if (bekalan === 'b') {
    drawTick(527.9, 422.0);
  } else if (bekalan === 'c') {
    drawTick(527.9, 438.9);
    drawText(data.bekalanJam || '', 336.5, 441.8, 7.5, false, 24);
    drawText(data.bekalanMinit || '', 378, 441.8, 7.5, false, 30);
  } else if (bekalan === 'd') {
    drawTick(527.9, 464.2);
  }

  const finalBytes = await pdfDoc.save();
  const blob = new Blob([finalBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  return { blob, url, pdfBytes: finalBytes, warnings };
}

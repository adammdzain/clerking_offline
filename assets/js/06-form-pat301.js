// =======================================================
// PER. PAT 301 PDF Form Generator Logic
// =======================================================
function setPat301Diagnosis(diag) {
  document.getElementById('pat301_diagnosis').value = diag;
  debouncedPat301Refresh();
}

function setAllBpTidak() {
  ['jaundice', 'lymph', 'hepato', 'spleno', 'bleed', 'transfuse'].forEach(key => {
    const el = document.getElementById(`pat301_bp_${key}_tidak`);
    if (el) el.checked = true;
  });
  debouncedPat301Refresh();
}

function setPat301TimeToNow() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');

  document.getElementById('pat301_tarikhSpesimen').value = `${dd}${mm}${yy}`;
  document.getElementById('pat301_masaSpesimen').value = `${hh}${min}`;
  document.getElementById('pat301_tarikhPermohonan').value = `${dd}/${mm}/${now.getFullYear()}`;
  debouncedPat301Refresh();
}

function savePat301Defaults() {
  const hosp = document.getElementById('pat301_hospital')?.value.trim();
  const wad = document.getElementById('pat301_wadKlinik')?.value.trim();
  const doc = document.getElementById('pat301_namaDoktor')?.value.trim();
  saveClinicalProfile({ hospital: hosp, wad: wad, doctorName: doc });
  showToast('Doctor & Hospital preferences saved!');
}

// The PAT301 / RA301 clinical summary: a few short lines, written from the shared record.
function generateClinicalSummaryFromClerking() {
  const record = readClinicalRecord();
  if (record.format === 'clash') return document.getElementById('docArea')?.value?.trim() || '';
  const parts = [];

  // Background first, then what brought the patient in. Allergies are only stated when
  // recorded; a blank field proves nothing.
  const h = record.history;
  if (h.underlying) parts.push(`Underlying: ${h.underlying}.`);
  if (h.allergy) parts.push(`Allergy: ${h.allergy}.`);
  if (h.medication) parts.push(`Medications: ${h.medication}.`);

  const presenting = record.presenting.map(s => `${s.header} (${s.parts.join('; ')})`);
  if (presenting.length) parts.push(`Presenting with: ${presenting.join(', ')}.`);
  if (record.mechanism) parts.push(`Mechanism of injury: ${record.mechanism}.`);

  if (record.vitals.length) parts.push(`Vitals: ${record.vitals.map(v => `${v.label} ${v.value}`).join(', ')}.`);
  if (record.exam.length) parts.push(`O/E: ${record.exam.map(e => `${e.label}: ${e.text}`).join('; ')}.`);

  if (parts.length === 0) {
    return document.getElementById('docArea')?.value?.trim() || '';
  }
  return parts.join('\n');
}

function regenPat301Summary() {
  document.getElementById('pat301_ringkasanKlinikal').value = generateClinicalSummaryFromClerking();
  debouncedPat301Refresh();
}

function copyFromDocAreaToPat301() {
  const docArea = document.getElementById('docArea')?.value?.trim();
  if (docArea) {
    document.getElementById('pat301_ringkasanKlinikal').value = docArea;
    debouncedPat301Refresh();
    showToast('Clinical notes copied into summary!');
  } else {
    showToast('Output notes area is currently empty');
  }
}

function togglePat301LainChip(btn) {
  btn.classList.toggle('active');

  const chips = [...btn.parentElement.querySelectorAll('.chip-btn.active')];
  const selectedLabels = chips.map(c => c.dataset.lain);

  const input = document.getElementById('pat301_test_lainLain');
  let remainder = input.value;

  // Strip every chip label (selected or previously inserted) to recover manually typed text
  const allLabels = [...btn.parentElement.querySelectorAll('.chip-btn')].map(c => c.dataset.lain);
  for (const label of allLabels) {
    remainder = remainder.split(label).join(',');
  }
  remainder = remainder.split(',').map(s => s.trim()).filter(Boolean).join(', ');

  const parts = [];
  if (selectedLabels.length) parts.push(selectedLabels.join(', '));
  if (remainder) parts.push(remainder);
  input.value = parts.join(', ');

  debouncedPat301Refresh();
}

function getPat301FormData() {
  const isBayar = document.getElementById('pat301_bayar_bayar')?.checked;

  // Butiran Penting: 'ya', 'tidak', or '' when unanswered (left blank on the form)
  const bpAnswer = key => {
    if (document.getElementById(`pat301_bp_${key}_ya`)?.checked) return 'ya';
    if (document.getElementById(`pat301_bp_${key}_tidak`)?.checked) return 'tidak';
    return '';
  };
  const bp = {
    jaundice: bpAnswer('jaundice'),
    lymphadenopathy: bpAnswer('lymph'),
    hepatomegaly: bpAnswer('hepato'),
    splenomegaly: bpAnswer('spleno'),
    bleedingTendency: bpAnswer('bleed'),
    transfusion: bpAnswer('transfuse')
  };

  const tests = {
    bSugar: document.getElementById('pat301_test_bSugar')?.checked,
    bUrea: document.getElementById('pat301_test_bUrea')?.checked,
    sElec: document.getElementById('pat301_test_sElec')?.checked,
    bGases: document.getElementById('pat301_test_bGases')?.checked,
    sBillirubin: document.getElementById('pat301_test_sBillirubin')?.checked,
    lft: document.getElementById('pat301_test_lft')?.checked,
    seCreatinine: document.getElementById('pat301_test_seCreatinine')?.checked,
    bldCount: document.getElementById('pat301_test_bldCount')?.checked,
    esr: document.getElementById('pat301_test_esr')?.checked,
    bfmp: document.getElementById('pat301_test_bfmp')?.checked,
    uSugar: document.getElementById('pat301_test_uSugar')?.checked,
    uAlb: document.getElementById('pat301_test_uAlb')?.checked,
    uMe: document.getElementById('pat301_test_uMe')?.checked,
    stoolMe: document.getElementById('pat301_test_stoolMe')?.checked,
    fbp: document.getElementById('pat301_test_fbp')?.checked,
    bmAsp: document.getElementById('pat301_test_bmAsp')?.checked,
    hbAnalysis: document.getElementById('pat301_test_hbAnalysis')?.checked,
    coagulation: document.getElementById('pat301_test_coagulation')?.checked,
    histoSpesimen: document.getElementById('pat301_test_histoSpesimen')?.value.trim(),
    mikroSpesimen: document.getElementById('pat301_test_mikroSpesimen')?.value.trim(),
    mikroUjian: document.getElementById('pat301_test_mikroUjian')?.value.trim(),
    lainLain: document.getElementById('pat301_test_lainLain')?.value.trim()
  };

  return {
    hospital: document.getElementById('pat301_hospital')?.value.trim() || 'HOSPITAL LAHAD DATU',
    wadKlinik: document.getElementById('pat301_wadKlinik')?.value.trim() || 'ED',
    patientName: document.getElementById('pat301_patientName')?.value.trim() || '',
    patientHospitalID: document.getElementById('pat301_patientHospitalID')?.value.trim() || '',
    patientID: document.getElementById('pat301_patientID')?.value.trim() || '',
    patientGender: getGenderRadios('pat301', 'Lelaki', 'Perempuan'),
    patientAge: document.getElementById('pat301_patientAge')?.value.trim() || '',
    keturunan: document.getElementById('pat301_keturunan')?.value.trim() || '',
    tarikhMasuk: document.getElementById('pat301_tarikhMasuk')?.value.trim() || '',
    pekerjaan: document.getElementById('pat301_pekerjaan')?.value.trim() || '',
    tarafPerkahwinan: document.getElementById('pat301_tarafPerkahwinan')?.value.trim() || '',
    bayar: isBayar,
    noLaporanDahulu: document.getElementById('pat301_noLaporanDahulu')?.value.trim() || '',
    ringkasanKlinikal: document.getElementById('pat301_ringkasanKlinikal')?.value.trim() || '',
    diagnosis: document.getElementById('pat301_diagnosis')?.value.trim() || '',
    butiranPenting: bp,
    haematinics: document.getElementById('pat301_haematinics')?.value.trim() || '',
    drugHistory: document.getElementById('pat301_drugHistory')?.value.trim() || '',
    labHb: document.getElementById('pat301_labHb')?.value.trim() || '',
    labPlatelet: document.getElementById('pat301_labPlatelet')?.value.trim() || '',
    labTWDC: document.getElementById('pat301_labTWDC')?.value.trim() || '',
    tests: tests,
    tarikhSpesimen: document.getElementById('pat301_tarikhSpesimen')?.value.trim() || '',
    masaSpesimen: document.getElementById('pat301_masaSpesimen')?.value.trim() || '',
    namaDoktor: document.getElementById('pat301_namaDoktor')?.value.trim() || '',
    tarikhPermohonan: document.getElementById('pat301_tarikhPermohonan')?.value.trim() || ''
  };
}

async function generatePat301PdfBlob(data) {
  await ensurePdfLibraries();
  const pdfBytes = await loadPdfTemplateBytes('./assets/per_pat_301.pdf');

  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];
  const { height } = page.getSize();
  const darkNavy = rgb(0.02, 0.08, 0.4);
  const warnings = [];

  function drawText(text, x, fitzY, size = 8.5, bold = false) {
    if (!text) return;
    page.drawText(String(text), {
      x: x,
      y: height - fitzY,
      size: size,
      font: bold ? fontBold : font,
      color: darkNavy
    });
  }

  function drawCheck(fitzX, fitzY) {
    page.drawText('X', {
      x: fitzX,
      y: height - fitzY,
      size: 9.5,
      font: fontBold,
      color: darkNavy
    });
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

  // Hospital Header
  drawText(data.hospital || 'HOSPITAL LAHAD DATU', 272, 91, 9, true);

  // 1. Nama & 2. No Pendaftaran (RN)
  drawText((data.patientName || '').toUpperCase(), 70, 123, 9, true);
  drawText(data.patientHospitalID || '', 435, 123, 9, true);

  // 3. No K/P & 4. Jantina
  drawText(data.patientID || '', 75, 143, 9, true);
  const gender = (data.patientGender || '').toLowerCase();
  if (gender.includes('lelaki') || gender === 'male' || gender === 'm') {
    drawCheck(420, 144);
  } else if (gender.includes('perempuan') || gender === 'female' || gender === 'f') {
    drawCheck(499, 144);
  }

  // 5. Umur, 6. Keturunan, 7. Wad/Klinik
  drawText(data.patientAge || '', 65, 163, 9);
  drawText(data.keturunan || '', 215, 163, 8.5);
  drawText(data.wadKlinik || 'ED', 405, 163, 9, true);

  // 8. Tarikh Masuk, 9. Pekerjaan, 10. Taraf Perkahwinan, 11. Bayar/Percuma
  drawText(data.tarikhMasuk || '', 25, 196, 8.5);
  drawText(data.pekerjaan || '', 215, 190, 8.5);
  drawText(data.tarafPerkahwinan || '', 348, 195, 8);
  if (data.bayar) {
    drawCheck(485, 181.5);
  } else {
    drawCheck(485, 199); // Percuma
  }

  // 12. No Laporan Dahulu
  drawText(data.noLaporanDahulu || '', 130, 220, 8.5);

  // 13. Butiran Penting
  const bpList = [
    { key: 'jaundice', y: 249 },
    { key: 'lymphadenopathy', y: 263 },
    { key: 'hepatomegaly', y: 277 },
    { key: 'splenomegaly', y: 291 },
    { key: 'bleedingTendency', y: 305 },
    { key: 'transfusion', y: 319 }
  ];
  bpList.forEach(item => {
    const answer = (data.butiranPenting || {})[item.key];
    if (answer === 'ya') {
      drawCheck(485, item.y);
    } else if (answer === 'tidak') {
      drawCheck(521.5, item.y);
    }
  });

  // Haematinics
  drawText(data.haematinics, 408, 355, 8);

  // Drug History (two dotted lines on the form)
  if (data.drugHistory) {
    let drugSize = 7.5;
    let drugLines = wrapLines(data.drugHistory, 215, drugSize);
    if (drugLines.length > 2) {
      drugSize = 6.5;
      drugLines = wrapLines(data.drugHistory, 215, drugSize);
    }
    if (drugLines.length > 2) warnings.push(pdfCutWarning('Drug / Chemical History'));
    if (drugLines[0]) drawText(drugLines[0], 355, 430, drugSize);
    if (drugLines[1]) drawText(drugLines[1], 355, 445, drugSize);
  }

  // Data Makmal Terdahulu
  if (data.labHb) drawText(data.labHb, 380, 502, 8);
  if (data.labPlatelet) drawText(data.labPlatelet, 395, 518, 8);
  if (data.labTWDC) drawText(data.labTWDC, 390, 532, 8);

  // 14. Ringkasan Klinikal
  if (data.ringkasanKlinikal) {
    let size = 7.5;
    let lineHeight = 9.5;
    let lines = wrapLines(data.ringkasanKlinikal, 305, size);
    if (lines.length * lineHeight > 265) {
      size = 6.5;
      lineHeight = 8.2;
      lines = wrapLines(data.ringkasanKlinikal, 305, size);
    }
    let curY = 265;
    for (const line of lines) {
      if (curY > 528) {
        warnings.push(pdfCutWarning('14. Ringkasan Klinikal'));
        break;
      }
      drawText(line, 25, curY, size);
      curY += lineHeight;
    }
  }

  // 15. Diagnosis: the box ends at x=335, so longer text drops to two smaller lines
  if (data.diagnosis) {
    if (fontBold.widthOfTextAtSize(data.diagnosis, 8.5) <= 245) {
      drawText(data.diagnosis, 85, 553, 8.5, true);
    } else {
      const diagLines = wrapLines(data.diagnosis, 245, 7.5);
      if (diagLines.length > 2) warnings.push(pdfCutWarning('15. Diagnosis'));
      drawText(diagLines[0], 85, 549, 7.5);
      if (diagLines[1]) drawText(diagLines[1], 85, 559, 7.5);
    }
  }

  // 16. Kategori Permohonan / Jenis Ujian
  const tests = data.tests || {};
  // Patologi Kimia
  if (tests.bSugar) drawCheck(109.5, 608);
  if (tests.bUrea) drawCheck(109.5, 620);
  if (tests.sElec) drawCheck(109.5, 632);
  if (tests.bGases) drawCheck(109.5, 644);
  if (tests.sBillirubin) drawCheck(109.5, 656);
  if (tests.lft) drawCheck(109.5, 669);
  if (tests.seCreatinine) drawCheck(109.5, 681);

  // Klinikal
  if (tests.bldCount) drawCheck(205.5, 608);
  if (tests.esr) drawCheck(205.5, 620);
  if (tests.bfmp) drawCheck(205.5, 632);
  if (tests.uSugar) drawCheck(205.5, 644);
  if (tests.uAlb) drawCheck(205.5, 656);
  if (tests.uMe) drawCheck(205.5, 669);
  if (tests.stoolMe) drawCheck(205.5, 681);

  // Hematologi
  if (tests.fbp) drawCheck(304.5, 608);
  if (tests.bmAsp) drawCheck(304.5, 620);
  if (tests.hbAnalysis) drawCheck(304.5, 632);
  if (tests.coagulation) drawCheck(304.5, 644);

  // Histo & Mikro
  if (tests.histoSpesimen) drawText(tests.histoSpesimen, 330, 622, 7.5);
  if (tests.mikroSpesimen) drawText(tests.mikroSpesimen, 423, 622, 7.5);
  if (tests.mikroUjian) drawText(tests.mikroUjian, 485, 622, 7.5);

  // Lain-lain
  if (tests.lainLain) {
    const lainLines = wrapLines(tests.lainLain, 500, 8);
    if (lainLines.length > 3) warnings.push(pdfCutWarning('Lain-lain'));
    if (lainLines[0]) drawText(lainLines[0], 70, 701, 8);
    if (lainLines[1]) drawText(lainLines[1], 25, 716, 8);
    if (lainLines[2]) drawText(lainLines[2], 25, 731, 8);
  }

  // 17. Pengambilan Spesimen
  const tarikhDigits = (data.tarikhSpesimen || '').replace(/[^0-9]/g, '').slice(0, 6);
  const tarikhXs = [218.5, 233.0, 247.0, 261.5, 276.0, 290.0];
  for (let i = 0; i < tarikhDigits.length && i < tarikhXs.length; i++) {
    drawText(tarikhDigits[i], tarikhXs[i], 752.5, 8.5, true);
  }

  const masaDigits = (data.masaSpesimen || '').replace(/[^0-9]/g, '').slice(0, 4);
  const masaXs = [410.0, 424.5, 439.0, 453.0];
  for (let i = 0; i < masaDigits.length && i < masaXs.length; i++) {
    drawText(masaDigits[i], masaXs[i], 752.5, 8.5, true);
  }

  // 18. Nama Doktor
  drawText(data.namaDoktor || '', 90, 772, 8.5, true);

  // 19. Tarikh
  drawText(data.tarikhPermohonan || '', 65, 797, 8.5);

  const finalBytes = await pdfDoc.save();
  const blob = new Blob([finalBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  return { blob, url, pdfBytes: finalBytes, warnings };
}

function openPat301Modal() {
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
  const meds = document.getElementById('historyMedication')?.value.trim() || '';
  const allergy = document.getElementById('historyAllergy')?.value.trim() || '';

  // Drug history string: allergy first, because the form only has two lines
  let drugHist = meds;
  if (allergy) {
    drugHist = drugHist ? `Allergy: ${allergy}. ${drugHist}` : `Allergy: ${allergy}`;
  }

  // Populate Modal Fields
  document.getElementById('pat301_patientName').value = name;
  document.getElementById('pat301_patientID').value = ic;
  document.getElementById('pat301_patientAge').value = age;
  document.getElementById('pat301_patientHospitalID').value = rn;
  const dhEl = document.getElementById('pat301_drugHistory');
  if (dhEl) dhEl.value = drugHist;

  setGenderRadios('pat301', resolvePatientGender(genderRaw, ic));

  // Saved Hospital / Wad / Doctor defaults
  const profile = getClinicalProfile();
  document.getElementById('pat301_hospital').value = profile.hospital || 'HOSPITAL LAHAD DATU';
  document.getElementById('pat301_wadKlinik').value = profile.wad || 'ED';
  if (profile.doctorName) document.getElementById('pat301_namaDoktor').value = profile.doctorName;

  // Dates & Times
  setPat301TimeToNow();

  // Clinical Summary
  const summary = generateClinicalSummaryFromClerking();
  document.getElementById('pat301_ringkasanKlinikal').value = summary;

  // Auto-detect Butiran Penting (section removed from UI; guard for absent fields)
  const setBpRadio = (key, on) => {
    const el = document.getElementById(`pat301_bp_${key}_${on ? 'ya' : 'tidak'}`);
    if (el) el.checked = true;
  };
  const nnjLevel = document.getElementById('nnjJaundiceLevel')?.value.trim();
  setBpRadio('jaundice', !!(nnjLevel && nnjLevel !== 'None') || /jaundice|icteric/i.test(summary));
  setBpRadio('bleed', /bleeding|petechiae|purpura|epistaxis/i.test(summary));
  setBpRadio('hepato', /hepatomegaly/i.test(summary));
  setBpRadio('spleno', /splenomegaly/i.test(summary));

  refreshPat301Preview();

  // Show modal
  document.getElementById('pat301Modal').classList.add('active');
  openModalA11y(document.getElementById('pat301Modal'));
}

function closePat301Modal() {
  document.getElementById('pat301Modal').classList.remove('active');
  closeModalA11y(document.getElementById('pat301Modal'));
}

// Close a form modal only when the press AND the release both happen on its
// dimmed backdrop. A text selection dragged out of the dialog fires a click on
// the backdrop (common ancestor of mousedown/mouseup), which used to close it.
function bindBackdropClose(backdrop, closeFn) {
  let pressedOnBackdrop = false;
  backdrop.addEventListener('mousedown', (e) => { pressedOnBackdrop = e.target === backdrop; });
  backdrop.addEventListener('click', (e) => {
    if (pressedOnBackdrop && e.target === backdrop) closeFn();
    pressedOnBackdrop = false;
  });
}

// Escape should not dismiss a form while the user is typing/reading in a field.
function isTypingInField() {
  const a = document.activeElement;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
}

// Attach listeners for live preview updates
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('pat301Modal');
  if (!modal) return;

  // Close on backdrop click
  bindBackdropClose(modal, closePat301Modal);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active') && !isTypingInField()) {
      closePat301Modal();
    }
  });

  // Realtime update on modal inputs
  
  // Attach listeners for RA301 modal live preview updates
  
  // Attach listeners for Surat Rujukan modal live preview updates
  const rujModal = document.getElementById('rujukanModal');
  if (rujModal) {
    bindBackdropClose(rujModal, closeRujukanModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && rujModal.classList.contains('active') && !isTypingInField()) {
        closeRujukanModal();
      }
    });

    rujModal.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('input', debouncedRujukanRefresh);
      el.addEventListener('change', debouncedRujukanRefresh);
    });
  }

  const bt105ModalEl = document.getElementById('bt105Modal');
  if (bt105ModalEl) {
    bindBackdropClose(bt105ModalEl, closeBt105Modal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && bt105ModalEl.classList.contains('active') && !isTypingInField()) {
        closeBt105Modal();
      }
    });

    bt105ModalEl.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('input', debouncedBt105Refresh);
      el.addEventListener('change', debouncedBt105Refresh);
    });
  }

  const raModal = document.getElementById('ra301Modal');
  if (raModal) {
    bindBackdropClose(raModal, closeRa301Modal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && raModal.classList.contains('active') && !isTypingInField()) {
        closeRa301Modal();
      }
    });

    raModal.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('input', debouncedRa301Refresh);
      el.addEventListener('change', debouncedRa301Refresh);
    });
  }

  modal.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', debouncedPat301Refresh);
    el.addEventListener('change', () => {
      if (el.type === 'checkbox') {
        const parent = el.closest('.test-check-item');
        if (parent) parent.classList.toggle('active', el.checked);
      }
      debouncedPat301Refresh();
    });
  });
});

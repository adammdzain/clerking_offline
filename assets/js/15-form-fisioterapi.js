/* =======================================================
   PHYSIOTHERAPY REFERRAL FORM (BORANG RUJUKAN PERKHIDMATAN
   FISIOTERAPI, Fisio/b.ruj/hosp/2015) JAVASCRIPT LOGIC
   Template-overlay export: official 1-page form with data
   stamped on. Coordinates extracted from the source PDF
   (612x792pt, Letter) via PyMuPDF word/drawing boxes.
   ======================================================= */
function openFisioterapiModal() {
  ensurePdfLibraries();

  // 1. Gather values from parent form (demographics only)
  const name = document.getElementById('patientName')?.value.trim() || '';
  const ic = document.getElementById('patientID')?.value.trim() || '';
  let age = document.getElementById('patientAge')?.value.trim() || '';
  if (!age && document.getElementById('ageYears')) {
    const y = document.getElementById('ageYears').value.trim();
    if (y) age = `${y}y`;
  }
  const rn = document.getElementById('patientHospitalID')?.value.trim() || '';
  const phone = document.getElementById('patientPhone')?.value.trim() || '';
  const address = document.getElementById('patientAddress')?.value.trim() || '';
  const genderRaw = (document.getElementById('patientGender')?.value.trim() || '').toLowerCase();

  // Populate Modal Fields
  document.getElementById('fisio_patientName').value = name;
  document.getElementById('fisio_patientID').value = ic;
  document.getElementById('fisio_patientAge').value = age;
  document.getElementById('fisio_patientHospitalID').value = rn;
  document.getElementById('fisio_patientPhone').value = phone;
  document.getElementById('fisio_patientAddress').value = address;
  autofillFormField(document.getElementById('fisio_patientDOB'), extractDobFromIc(ic, '/'));

  setGenderRadios('fisio', resolvePatientGender(genderRaw, ic));

  refreshFisioterapiPreview();

  // Show modal
  document.getElementById('fisioterapiModal').classList.add('active');
  openModalA11y(document.getElementById('fisioterapiModal'));
}

function closeFisioterapiModal() {
  document.getElementById('fisioterapiModal').classList.remove('active');
  closeModalA11y(document.getElementById('fisioterapiModal'));
}

// Same behaviour as the other forms: live preview while typing, Escape and backdrop close
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('fisioterapiModal');
  if (!modal) return;
  bindBackdropClose(modal, closeFisioterapiModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active') && !isTypingInField()) {
      closeFisioterapiModal();
    }
  });
  modal.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', debouncedFisioterapiRefresh);
    el.addEventListener('change', debouncedFisioterapiRefresh);
  });
});

function getFisioterapiFormData() {
  const interventions = {};
  document.querySelectorAll('#fisioInterventions input[type="checkbox"]:checked').forEach(cb => {
    interventions[cb.value] = true;
  });
  return {
    patientName: document.getElementById('fisio_patientName')?.value.trim() || '',
    patientID: document.getElementById('fisio_patientID')?.value.trim() || '',
    patientHospitalID: document.getElementById('fisio_patientHospitalID')?.value.trim() || '',
    patientAge: document.getElementById('fisio_patientAge')?.value.trim() || '',
    patientDOB: document.getElementById('fisio_patientDOB')?.value.trim() || '',
    patientGender: getGenderRadios('fisio', 'Male', 'Female'),
    patientRace: document.getElementById('fisio_patientRace')?.value.trim() || '',
    clinicWard: document.getElementById('fisio_clinicWard')?.value.trim() || '',
    patientPhone: document.getElementById('fisio_patientPhone')?.value.trim() || '',
    patientAddress: document.getElementById('fisio_patientAddress')?.value.trim() || '',
    historyDiagnosis: document.getElementById('fisio_historyDiagnosis')?.value.trim() || '',
    investigations: document.getElementById('fisio_investigations')?.value.trim() || '',
    precautions: document.getElementById('fisio_precautions')?.value.trim() || '',
    interventions,
    othersText: document.getElementById('fisio_othersText')?.value.trim() || ''
  };
}

async function generateFisioterapiPdfBlob(data) {
  await ensurePdfLibraries();
  const pdfBytes = await loadPdfTemplateBytes('./assets/per_fisioterapi.pdf');

  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.getPages()[0];
  const { height } = page.getSize();
  const darkNavy = rgb(0.02, 0.08, 0.4);
  const warnings = [];

  // All coordinates are top-down points (baseline y) on the 612x792 page
  function drawText(text, x, fitzY, size = 8.5, maxWidth) {
    if (!text) return;
    let s = String(text);
    // Narrow underlines: shrink to fit before truncating (floor 6pt)
    if (maxWidth) {
      const full = s;
      while (size > 6 && font.widthOfTextAtSize(s, size) > maxWidth) size -= 0.25;
      while (s.length > 1 && font.widthOfTextAtSize(s, size) > maxWidth) s = s.slice(0, -1);
      if (s !== full) warnings.push(pdfCutWarning(`"${full}"`));
    }
    page.drawText(s, { x, y: height - fitzY, size, font, color: darkNavy });
  }

  function wrapLines(text, maxWidth, size) {
    const lines = [];
    for (const para of (text || '').split('\n')) {
      if (!para.trim()) { lines.push(''); continue; }
      let currentLine = '';
      for (const word of para.split(' ')) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
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

  function drawWrapped(label, text, x, firstBaselineY, maxLines, size, maxWidth, lineGap) {
    if (!text) return;
    const lines = wrapLines(text, maxWidth, size);
    if (lines.length > maxLines) warnings.push(pdfCutWarning(label));
    lines.slice(0, maxLines).forEach((line, i) => drawText(line, x, firstBaselineY + i * lineGap, size));
  }

  function drawTick(cx, cyTopDown, half = 3.4) {
    const cy = height - cyTopDown;
    page.drawLine({ start: { x: cx - half, y: cy + 1.0 }, end: { x: cx - 1.0, y: cy - 2.5 }, thickness: 1.1, color: darkNavy });
    page.drawLine({ start: { x: cx - 1.0, y: cy - 2.5 }, end: { x: cx + half + 0.4, y: cy + 2.8 }, thickness: 1.1, color: darkNavy });
  }

  // ---- Patient particulars (label underlines) ----
  drawText((data.patientName || '').toUpperCase(), 112, 145.5, 8.5, 200);
  drawText(data.clinicWard || '', 409, 145.5, 8, 33);
  drawText(data.patientHospitalID || '', 487, 145.5, 7.5, 45);
  // The AGE line is narrow: drop the smallest units ("36y 10m 4d" -> "36y 10m" -> "36y")
  // rather than cutting a number in half
  const ageParts = String(data.patientAge || '').trim().split(/\s+/);
  while (ageParts.length > 1 && font.widthOfTextAtSize(ageParts.join(' '), 6) > 22) ageParts.pop();
  drawText(ageParts.join(' '), 103, 164.5, 8, 22);
  drawText(data.patientDOB || '', 199, 164.5, 8, 112);
  drawText(data.patientGender || '', 364, 164.5, 8, 42);
  drawText((data.patientRace || '').toUpperCase(), 445, 164.5, 8, 80);
  drawText(data.patientID || '', 158, 183.5, 8, 100);
  drawText(data.patientPhone || '', 356, 183.5, 8, 165);
  drawText((data.patientAddress || '').replace(/\n/g, ', '), 126, 202, 7.5, 395);

  // ---- Free-text clinical sections (2 lines max each, space-limited) ----
  drawWrapped('History / Diagnosis', data.historyDiagnosis, 70, 261, 2, 8, 480, 9.5);
  drawWrapped('Investigations', data.investigations, 70, 296.5, 2, 8, 480, 9.5);
  drawWrapped('Precautions', data.precautions, 70, 327, 1, 7.5, 480, 8);

  // ---- Interventions checkboxes (centers from source PDF vector boxes) ----
  const tickAnchors = {
    chestPhysiotherapy: [77.6, 353.1],
    therapeuticExercises: [77.6, 370.4],
    painManagement: [77.6, 389.3],
    electricalModalities: [77.6, 407.6],
    electricalStimulation: [77.6, 425.7],
    manualTherapy: [77.6, 445.5],
    hotPackWaxBath: [77.6, 465.4],
    cryotherapy: [77.6, 483.5],
    hydrotherapy: [77.6, 503.5],
    tappingStrapping: [77.6, 524.9],
    palliativeCare: [77.6, 542.6],
    sportInjuries: [77.6, 560.5],
    ambulation: [227.9, 354.3],
    gaitTraining: [227.9, 371.6],
    balanceTraining: [227.9, 390.8],
    lymphoedemaTherapy: [227.9, 409.4],
    compressionBandaging: [227.9, 427.8],
    continenceTherapy: [227.9, 447.9],
    phototherapy: [227.9, 468.0],
    earlyInterventionProgram: [227.9, 486.3],
    neuroDevelopmentalTherapy: [227.9, 506.5],
    obesityProgramme: [227.9, 528.2],
    dryNeedling: [227.9, 544.7],
    arthritisExercise: [227.9, 560.5],
    cardiacRehabilitation: [384.7, 355.5],
    neuroRehabilitation: [384.7, 372.7],
    vestibularRehabilitation: [384.7, 391.6],
    burnRehabilitation: [384.7, 410.0],
    spinalRehabilitation: [384.7, 428.1],
    handRehabilitation: [384.7, 448.0],
    amputeeRehabilitation: [384.7, 467.9],
    educationalClass: [384.7, 486.0],
    hemophiliaRehabilitation: [384.7, 505.8],
    pulmonaryRehabilitation: [384.7, 527.3],
    others: [384.7, 544.7]
  };
  const iv = data.interventions || {};
  for (const [key, coords] of Object.entries(tickAnchors)) {
    if (iv[key]) drawTick(coords[0], coords[1]);
  }
  if (iv.others || data.othersText) {
    drawText(data.othersText || '', 500, 546.5, 7, 48);
  }

  const finalBytes = await pdfDoc.save();
  const blob = new Blob([finalBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  return { blob, url, pdfBytes: finalBytes, warnings };
}

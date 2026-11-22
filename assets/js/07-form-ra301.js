/* =======================================================
   PER.SS-RA301 (RADIOLOGY) JAVASCRIPT LOGIC
   ======================================================= */
function setRa301TimeToNow() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  let hours = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = `${d}/${m}/${y} ${hours}:${mins} ${ampm}`;
  const el = document.getElementById('ra301_tarikhMasa');
  if (el) el.value = strTime;
}

function copyFromDocAreaToRa301() {
  const docArea = document.getElementById('docArea')?.value?.trim();
  if (docArea) {
    document.getElementById('ra301_ringkasanKlinikal').value = docArea;
    debouncedRa301Refresh();
    showToast('Clinical notes copied into summary!');
  } else {
    showToast('Output notes area is currently empty');
  }
}

function regenRa301Summary() {
  const summary = generateClinicalSummaryFromClerking();
  const diag = readRecordDiagnosis();

  let fullSummary = summary;
  if (diag) {
    fullSummary += `\nImpression: ${diag}.`;
  }
  const bahagian = document.getElementById('ra301_bahagianPemeriksaan')?.value?.trim() || '';
  if (bahagian) {
    fullSummary += `\nQuestion: Rule out acute pathology / fracture / consolidation / effusion.`;
  }
  document.getElementById('ra301_ringkasanKlinikal').value = fullSummary;
  debouncedRa301Refresh();
  showToast('Summary re-generated!');
}

// DOB as DDMMYYYY (the RA301 date boxes), or DD/MM/YYYY with a separator.
// Uses the same parser as the age calculation: passports give '' rather than a date
// made up from the passport's digits, and the century matches the calculated age.
function extractDobFromIc(ic, sep = '') {
  const dob = dobFromIC(ic);
  if (!dob) return '';
  const dd = String(dob.getDate()).padStart(2, '0');
  const mm = String(dob.getMonth() + 1).padStart(2, '0');
  return [dd, mm, dob.getFullYear()].join(sep);
}

function saveRa301Defaults() {
  const hosp = document.getElementById('ra301_hospital')?.value.trim();
  const wad = document.getElementById('ra301_wadKlinik')?.value.trim();
  const dis = document.getElementById('ra301_disiplin')?.value.trim();
  const doc = document.getElementById('ra301_namaDoktor')?.value.trim();

  saveClinicalProfile({ hospital: hosp, wad: wad, disiplin: dis, doctorName: doc });
  showToast('Radiology defaults saved to local storage!');
}

function openRa301Modal() {
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

  // Populate Modal Fields
  document.getElementById('ra301_patientName').value = name;
  document.getElementById('ra301_patientID').value = ic;
  document.getElementById('ra301_patientAge').value = age;
  document.getElementById('ra301_patientHospitalID').value = rn;

  // DOB from the IC, phone and address from the clerking. These follow the current
  // patient, so a previous patient's details are never left on the form.
  autofillFormField(document.getElementById('ra301_tarikhLahir'), extractDobFromIc(ic));
  autofillFormField(document.getElementById('ra301_patientPhone'), document.getElementById('patientPhone')?.value.trim());
  autofillFormField(document.getElementById('ra301_patientAddress'), document.getElementById('patientAddress')?.value.trim());

  setGenderRadios('ra301', resolvePatientGender(genderRaw, ic));

  // Field 14 asks about contrast reactions, so carry any recorded allergy across
  const allergy = document.getElementById('historyAllergy')?.value.trim();
  autofillFormField(document.getElementById('ra301_asmaAlahan'), allergy ? `Allergy: ${allergy}` : '');

  // Saved Hospital / Wad / Disiplin / Doctor defaults
  const profile = getClinicalProfile();
  document.getElementById('ra301_hospital').value = profile.hospital || 'HOSPITAL LAHAD DATU';
  document.getElementById('ra301_wadKlinik').value = profile.wad || 'ED';
  document.getElementById('ra301_disiplin').value = profile.disiplin || 'KECEMASAN';
  if (profile.doctorName) document.getElementById('ra301_namaDoktor').value = profile.doctorName;

  // Dates & Times
  setRa301TimeToNow();

  refreshRa301Preview();

  // Show modal
  document.getElementById('ra301Modal').classList.add('active');
  openModalA11y(document.getElementById('ra301Modal'));
}

function closeRa301Modal() {
  document.getElementById('ra301Modal').classList.remove('active');
  closeModalA11y(document.getElementById('ra301Modal'));
}

function getRa301FormData() {
  const mengandung = document.getElementById('ra301_mengandung_ya')?.checked ? 'ya'
    : document.getElementById('ra301_mengandung_tidak')?.checked ? 'tidak' : '';
  const isMobile = document.getElementById('ra301_mobile_ya')?.checked;
  const isWarga = document.getElementById('ra301_warga_ya')?.checked;
  const isPenjawat = document.getElementById('ra301_penjawat_ya')?.checked;
  const isFpp = document.getElementById('ra301_fpp_ya')?.checked;

  let modality = 'xray';
  const checkedMod = document.querySelector('input[name="ra301_modality"]:checked');
  if (checkedMod) modality = checkedMod.value;

  return {
    hospital: document.getElementById('ra301_hospital')?.value.trim() || 'HOSPITAL LAHAD DATU',
    wadKlinik: document.getElementById('ra301_wadKlinik')?.value.trim() || 'ED',
    disiplin: document.getElementById('ra301_disiplin')?.value.trim() || 'KECEMASAN',
    patientName: document.getElementById('ra301_patientName')?.value.trim() || '',
    patientHospitalID: document.getElementById('ra301_patientHospitalID')?.value.trim() || '',
    patientID: document.getElementById('ra301_patientID')?.value.trim() || '',
    tarikhLahir: document.getElementById('ra301_tarikhLahir')?.value.trim() || '',
    patientGender: getGenderRadios('ra301', 'Lelaki', 'Perempuan'),
    patientPhone: document.getElementById('ra301_patientPhone')?.value.trim() || '',
    keturunan: document.getElementById('ra301_keturunan')?.value.trim() || '',
    patientAge: document.getElementById('ra301_patientAge')?.value.trim() || '',
    patientAddress: document.getElementById('ra301_patientAddress')?.value.trim() || '',
    lmp: document.getElementById('ra301_lmp')?.value.trim() || '',
    mengandung,
    asmaAlahan: document.getElementById('ra301_asmaAlahan')?.value.trim() || '',
    mobile: isMobile,
    warganegara: isWarga,
    penjawatAwam: isPenjawat,
    fpp: isFpp,
    renalDate: document.getElementById('ra301_renalDate')?.value.trim() || '',
    renalCreatinine: document.getElementById('ra301_renalCreatinine')?.value.trim() || '',
    renalEGFR: document.getElementById('ra301_renalEGFR')?.value.trim() || '',
    modality: modality,
    bahagianPemeriksaan: document.getElementById('ra301_bahagianPemeriksaan')?.value.trim() || '',
    komen: document.getElementById('ra301_komen')?.value.trim() || '',
    kontrasJenama: document.getElementById('ra301_kontrasJenama')?.value.trim() || '',
    kontrasIsipadu: document.getElementById('ra301_kontrasIsipadu')?.value.trim() || '',
    ringkasanKlinikal: document.getElementById('ra301_ringkasanKlinikal')?.value.trim() || '',
    namaDoktor: document.getElementById('ra301_namaDoktor')?.value.trim() || '',
    tarikhMasa: document.getElementById('ra301_tarikhMasa')?.value.trim() || ''
  };
}

async function generateRa301PdfBlob(data) {
  await ensurePdfLibraries();
  const pdfBytes = await loadPdfTemplateBytes('./assets/per_ss_ra301.pdf');

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

  function drawOval(cx, cy, rx, ry) {
    page.drawEllipse({
      x: cx,
      y: height - cy,
      xScale: rx,
      yScale: ry,
      borderColor: darkNavy,
      borderWidth: 1.2
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

  // One line when it fits, otherwise two smaller lines centred on the same spot
  function drawUpToTwoLines(label, text, x, oneLineY, maxWidth, size, bold = false) {
    if (!text) return;
    const flat = text.replace(/\n/g, ' ');
    if ((bold ? fontBold : font).widthOfTextAtSize(flat, size) <= maxWidth) {
      drawText(flat, x, oneLineY, size, bold);
      return;
    }
    const lines = wrapLines(flat, maxWidth, size - 1);
    if (lines.length > 2) warnings.push(pdfCutWarning(label));
    drawText(lines[0], x, oneLineY - 5, size - 1);
    if (lines[1]) drawText(lines[1], x, oneLineY + 4, size - 1);
  }

  // Hospital Header
  drawText(data.hospital || 'HOSPITAL LAHAD DATU', 340, 64, 8.5);

  // 1. Nama Penuh
  drawText((data.patientName || '').toUpperCase(), 135, 122, 8.5, true);

  // 2. No. Kad Pengenalan / Pasport
  drawText(data.patientID || '', 305, 128, 8.5);

  // 3. Alamat Kediaman (up to 2 lines)
  if (data.patientAddress) {
    const addrLines = wrapLines(data.patientAddress, 160, 7.5);
    if (addrLines.length > 2) warnings.push(pdfCutWarning('3. Alamat'));
    if (addrLines[0]) drawText(addrLines[0], 135, 155, 7.5);
    if (addrLines[1]) drawText(addrLines[1], 135, 168, 7.5);
  }

  // 4. Tarikh Lahir (8 individual digits for DD MM YYYY)
  const dob = String(data.tarikhLahir || '').replace(/[^0-9]/g, '');
  if (dob.length >= 8) {
    const dobXs = [307, 318, 341, 352, 375, 386, 397, 408];
    for (let i = 0; i < 8; i++) {
      drawText(dob[i], dobXs[i], 163, 8);
    }
  }

  // 5. Jantina: L at (394.8, 186.3), P at (407.9, 186.3)
  const gender = (data.patientGender || '').toLowerCase();
  if (gender.includes('perempuan') || gender === 'female' || gender === 'f') {
    drawOval(407.9, 186.3, 7.5, 6.0); // P
  } else if (gender.includes('lelaki') || gender === 'male' || gender === 'm') {
    drawOval(394.8, 186.3, 7.5, 6.0); // L
  }

  // 6. No. Telefon, 7. Etnik, 8. Umur
  drawText(data.patientPhone || '', 132, 206, 8);
  drawText(data.keturunan || '', 242, 206, 8);
  drawText(data.patientAge || '', 378, 206, 8);

  // 9. RN, 10. Wad, 11. Disiplin
  drawText(data.patientHospitalID || '', 132, 228, 8);
  drawText(data.wadKlinik || 'ED', 241, 228, 7.0);
  drawText(data.disiplin || 'KECEMASAN', 378, 228, 8);

  // 12. LMP, 13. Mengandung
  drawText(data.lmp || '', 145, 250, 8);
  if (data.mengandung === 'ya') {
    drawOval(388.4, 249.1, 8.0, 6.0); // Ya
  } else if (data.mengandung === 'tidak') {
    drawOval(410.1, 249.1, 10.0, 6.0); // Tidak
  } else if (!gender.includes('lelaki')) {
    warnings.push('13. Mengandung is not answered. Confirm pregnancy status before filing.');
  }

  // 14. Asma / Alahan
  drawUpToTwoLines('14. Asma / Alahan', data.asmaAlahan, 133, 274, 158, 7.5);

  // 15. Mobile
  if (data.mobile) {
    drawOval(388.4, 271.2, 8.0, 6.0); // Ya
  } else {
    drawOval(410.1, 271.2, 10.0, 6.0); // Tidak
  }

  // 16. Status Bayaran: Warganegara, Penjawat Awam, FPP
  if (data.warganegara) {
    drawOval(193.0, 293.0, 8.0, 6.0); // Ya
  } else {
    drawOval(214.6, 293.0, 10.0, 6.0); // Tidak
  }

  if (data.penjawatAwam) {
    drawOval(309.5, 293.0, 8.0, 6.0); // Ya
  } else {
    drawOval(327.5, 293.0, 10.0, 6.0); // Tidak
  }

  if (data.fpp) {
    drawOval(388.4, 293.0, 8.0, 6.0); // Ya
  } else {
    drawOval(410.1, 293.0, 10.0, 6.0); // Tidak
  }

  // 17. Renal Function
  if (data.renalDate) drawText(data.renalDate, 170, 316, 7.5);
  if (data.renalCreatinine) drawText(data.renalCreatinine, 275, 316, 7.5);
  if (data.renalEGFR) drawText(data.renalEGFR, 375, 316, 7.5);

  // 18. Perkhidmatan (Modality)
  const modalityCoords = {
    'xray': [63.6, 365.0, 16.0, 10.0],
    'ct': [91.5, 365.0, 10.0, 10.0],
    'mri': [115.5, 365.0, 12.0, 10.0],
    'us': [145.3, 365.0, 16.0, 10.0],
    'fluoro': [177.6, 365.0, 14.0, 10.0],
    'angio': [208.5, 365.0, 14.0, 10.0],
    'ir': [238.5, 365.0, 13.0, 10.0],
    'mmg': [266.9, 365.0, 13.0, 10.0],
    'bmd': [294.8, 365.0, 13.0, 10.0]
  };
  const chosenMod = String(data.modality || 'xray').toLowerCase();
  for (const [modKey, coords] of Object.entries(modalityCoords)) {
    if (chosenMod.includes(modKey)) {
      drawOval(coords[0], coords[1], coords[2], coords[3]);
      break;
    }
  }

  // 22. Media Kontras
  if (data.kontrasJenama) drawText(data.kontrasJenama, 465, 366, 7.5);
  if (data.kontrasIsipadu) drawText(data.kontrasIsipadu, 525, 382, 7.5);

  // Bahagian Pemeriksaan & Komen
  drawUpToTwoLines('Bahagian Pemeriksaan', data.bahagianPemeriksaan, 52, 412, 372, 9, true);
  drawUpToTwoLines('Komen', data.komen, 435, 412, 132, 8);

  // Ringkasan Klinikal
  if (data.ringkasanKlinikal) {
    let size = 7.5;
    let lineHeight = 9.5;
    let lines = wrapLines(data.ringkasanKlinikal, 345, size);
    if (lines.length * lineHeight > 100) {
      size = 6.5;
      lineHeight = 8.2;
      lines = wrapLines(data.ringkasanKlinikal, 345, size);
    }
    let curY = 444;
    for (const line of lines) {
      if (curY > 542) {
        warnings.push(pdfCutWarning('Ringkasan Klinikal'));
        break;
      }
      drawText(line, 52, curY, size);
      curY += lineHeight;
    }
  }

  // Tandatangan Doktor & Tarikh/Masa
  drawText(data.namaDoktor || '', 410, 520, 7.5);
  drawText(data.tarikhMasa || '', 465, 544, 7.5);

  // Request form only: the template's Page 2 (Laporan Radiologi) is not wanted
  if (pdfDoc.getPageCount() > 1) {
    pdfDoc.removePage(1);
  }

  const finalBytes = await pdfDoc.save();
  const blob = new Blob([finalBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  return { blob, url, pdfBytes: finalBytes, warnings };
}

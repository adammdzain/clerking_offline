/* =======================================================
   SURAT RUJUKAN (REFERRAL LETTER) JAVASCRIPT LOGIC
   ======================================================= */
function setRujukanTimeToNow() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  let hours = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  const elDate = document.getElementById('rujukan_tarikh');
  const elMasa = document.getElementById('rujukan_masa');
  if (elDate) elDate.value = `${d}/${m}/${y}`;
  if (elMasa) elMasa.value = `${hours}:${mins} ${ampm}`;
}

function copyFromDocAreaToRujukan() {
  const docArea = document.getElementById('docArea')?.value?.trim();
  if (docArea) {
    document.getElementById('rujukan_kandungan').value = `Tuan / Puan,\n\nMerujuk kepada perkara di atas, pesakit tersebut dirujuk kepada pihak tuan untuk penilaian dan pengurusan lanjut.\n\n${docArea}\n\nSekian, terima kasih.`;
    debouncedRujukanRefresh();
    showToast('Clinical notes copied into referral letter!');
  } else {
    showToast('Output notes area is currently empty');
  }
}

// The referral letter body, written from the shared record.
function generateRujukanContentFromClerking() {
  const record = readClinicalRecord();
  const parts = [];
  if (record.format === 'clash') {
    const docArea = document.getElementById('docArea')?.value?.trim() || '';
    return `Tuan / Puan,\n\nMerujuk kepada perkara di atas, pesakit tersebut dirujuk kepada pihak tuan untuk penilaian dan pengurusan lanjut.\n\n${docArea}\n\nSekian, terima kasih.`;
  }
  parts.push("Tuan / Puan,\n\nMerujuk kepada perkara di atas, pesakit tersebut dirujuk kepada pihak tuan untuk penilaian dan pengurusan lanjut.\n");

  const hopi = record.presenting.map(s => `${s.header} - ${s.parts.join('; ')}`);
  if (record.mechanism) hopi.push(`Mechanism of injury - ${record.mechanism}`);
  if (hopi.length > 0) {
    parts.push("SEJARAH PENYAKIT (HOPI):");
    parts.push(hopi.join("\n"));
  }

  const h = record.history;
  const histList = [];
  if (h.underlying) histList.push(`Penyakit sedia ada: ${h.underlying}`);
  if (h.surgical) histList.push(`Sejarah pembedahan: ${h.surgical}`);
  if (h.medication) histList.push(`Ubat-ubatan semasa: ${h.medication}`);
  if (h.allergy) histList.push(`Alahan / Allergy: ${h.allergy}`);
  else histList.push(`Alahan: Tidak direkodkan (sila sahkan)`);
  parts.push("\nLATAR BELAKANG PERUBATAN & ALAHAN:");
  parts.push(histList.join("\n"));

  if (record.vitals.length > 0) {
    parts.push("\nTANDA-TANDA VITAL (VITALS):");
    parts.push(record.vitals.map(v => `${v.label} ${v.value}`).join(", ") + ".");
  }

  if (record.exam.length > 0) {
    parts.push("\nPEMERIKSAAN FIZIKAL (EXAMINATION):");
    parts.push(record.exam.map(e => `${e.label}: ${e.text}`).join("\n"));
  }

  if (record.diagnosis) {
    parts.push("\nDIAGNOSIS SEMENTARA:");
    parts.push(record.diagnosis);
  }
  if (record.differentials) {
    parts.push("\nDIAGNOSIS PEMBEZA (DIFFERENTIALS):");
    parts.push(record.differentials);
  }
  if (record.plan) {
    parts.push("\nPENGURUSAN & PELAN (PLAN):");
    parts.push(record.plan.split('\n').map(l => l.trim()).filter(Boolean).join("\n"));
  }

  // Nothing clinical was recorded (only the unrecorded-allergy line): send the note instead.
  const clinical = hopi.length || histList.length > 1 || record.vitals.length || record.exam.length || record.diagnosis || record.plan;
  if (!clinical) {
    const docArea = document.getElementById('docArea')?.value?.trim();
    if (docArea) {
      return `Tuan / Puan,\n\nMerujuk kepada perkara di atas, pesakit tersebut dirujuk kepada pihak tuan untuk penilaian dan pengurusan lanjut.\n\n${docArea}\n\nSekian, terima kasih.`;
    }
  }

  parts.push("\nTUJUAN RUJUKAN:");
  parts.push("Pesakit dirujuk kepada pihak tuan untuk penilaian lanjut, kemasukan ke wad dan pengurusan seterusnya.");
  parts.push("\nSekian, terima kasih.");
  return parts.join("\n");
}

function regenRujukanLetter() {
  const letter = generateRujukanContentFromClerking();
  document.getElementById('rujukan_kandungan').value = letter;
  
  const diag = readRecordDiagnosis();
  if (diag && !document.getElementById('rujukan_tajuk').value.trim()) {
    document.getElementById('rujukan_tajuk').value = `${diag.toUpperCase()} FOR FURTHER ASSESSMENT`;
  }

  debouncedRujukanRefresh();
  showToast('Referral letter regenerated!');
}

function saveRujukanDefaults() {
  const hosp = document.getElementById('rujukan_hospital')?.value.trim();
  const doc = document.getElementById('rujukan_namaDoktor')?.value.trim();
  const jawatan = document.getElementById('rujukan_jawatan')?.value.trim();

  saveClinicalProfile({ hospital: hosp, doctorName: doc, jawatan: jawatan });
  showToast('Referral letter defaults saved to local storage!');
}

function openRujukanModal() {
  ensurePdfLibraries();

  // 1. Gather values from clerking form
  const name = document.getElementById('patientName')?.value.trim() || '';
  const ic = document.getElementById('patientID')?.value.trim() || '';
  let age = document.getElementById('patientAge')?.value.trim() || '';
  if (!age && document.getElementById('ageYears')) {
    const y = document.getElementById('ageYears').value.trim();
    if (y) age = `${y}y`;
  }
  const genderRaw = (document.getElementById('patientGender')?.value.trim() || '').toLowerCase();
  const rn = document.getElementById('patientHospitalID')?.value.trim() || '';

  const gender = resolvePatientGender(genderRaw, ic);
  const genderStr = gender === 'female' ? 'Perempuan' : gender === 'male' ? 'Lelaki' : '';

  // Populate Modal Fields
  document.getElementById('rujukan_patientName').value = name;
  document.getElementById('rujukan_patientID').value = ic;
  document.getElementById('rujukan_patientAge').value = age;
  document.getElementById('rujukan_patientGender').value = genderStr;
  document.getElementById('rujukan_patientHospitalID').value = rn;
  document.getElementById('rujukan_noRujukanTuan').value = 'NIL';

  // Saved Hospital / Doctor defaults
  const profile = getClinicalProfile();
  document.getElementById('rujukan_hospital').value = profile.hospital || 'HOSPITAL LAHAD DATU';
  if (profile.doctorName) document.getElementById('rujukan_namaDoktor').value = profile.doctorName;
  if (profile.jawatan) document.getElementById('rujukan_jawatan').value = profile.jawatan;

  // Dates & Times
  setRujukanTimeToNow();

  refreshRujukanPreview();

  // Show modal
  document.getElementById('rujukanModal').classList.add('active');
  openModalA11y(document.getElementById('rujukanModal'));
}

function closeRujukanModal() {
  document.getElementById('rujukanModal').classList.remove('active');
  closeModalA11y(document.getElementById('rujukanModal'));
}

function getRujukanFormData() {
  return {
    hospital: document.getElementById('rujukan_hospital')?.value.trim() || 'HOSPITAL LAHAD DATU',
    tarikhTemujanji: document.getElementById('rujukan_tarikhTemujanji')?.value.trim() || '',
    kepada: document.getElementById('rujukan_kepada')?.value.trim() || '',
    jabatanUnit: document.getElementById('rujukan_jabatanUnit')?.value.trim() || '',
    tarikh: document.getElementById('rujukan_tarikh')?.value.trim() || '',
    masa: document.getElementById('rujukan_masa')?.value.trim() || '',
    patientName: document.getElementById('rujukan_patientName')?.value.trim() || '',
    patientAge: document.getElementById('rujukan_patientAge')?.value.trim() || '',
    patientID: document.getElementById('rujukan_patientID')?.value.trim() || '',
    patientGender: document.getElementById('rujukan_patientGender')?.value.trim() || '',
    noRujukanTuan: document.getElementById('rujukan_noRujukanTuan')?.value.trim() || 'NIL',
    patientHospitalID: document.getElementById('rujukan_patientHospitalID')?.value.trim() || '',
    tajukRujukan: document.getElementById('rujukan_tajuk')?.value.trim() || '',
    kandunganRujukan: document.getElementById('rujukan_kandungan')?.value.trim() || '',
    namaDoktor: document.getElementById('rujukan_namaDoktor')?.value.trim() || 'DR. PEGAWAI PERUBATAN',
    jawatanDoktor: document.getElementById('rujukan_jawatan')?.value.trim() || 'Pegawai Perubatan (Medical Officer)'
  };
}

async function generateRujukanPdfBlob(data) {
  await ensurePdfLibraries();
  const pdfBytes = await loadPdfTemplateBytes('./assets/surat_rujukan.pdf');

  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();
  const darkNavy = rgb(0.02, 0.08, 0.4);
  const warnings = [];

  function drawText(p, text, x, fitzY, size = 8.5, bold = false) {
    if (!text) return;
    p.drawText(String(text), {
      x: x,
      y: height - fitzY,
      size: size,
      font: bold ? fontBold : font,
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
  drawText(page, (data.hospital || 'HOSPITAL LAHAD DATU').toUpperCase(), 272, 144, 9, true);

  // Tarikh Temujanji
  if (data.tarikhTemujanji) {
    drawText(page, data.tarikhTemujanji, 450, 126, 8, true);
  }

  // Table Row 1
  drawText(page, data.kepada || '', 162, 185, 8.5);
  drawText(page, data.jabatanUnit || '', 415, 185, 8.5);

  // Table Row 2
  drawText(page, data.tarikh || '', 162, 204, 8.5);
  drawText(page, data.masa || '', 415, 204, 8.5);

  // Table Row 3
  drawText(page, (data.patientName || '').toUpperCase(), 162, 223, 8.5, true);
  drawText(page, data.patientAge || '', 415, 223, 8.5);

  // Table Row 4
  drawText(page, data.patientID || '', 162, 242, 8.5);
  drawText(page, data.patientGender, 415, 242, 8.5);

  // Table Row 5
  drawText(page, data.noRujukanTuan || 'NIL', 196, 261, 8.5);
  drawText(page, data.patientHospitalID || '', 448, 261, 8.5);

  // Tajuk Rujukan
  let curY = 290;
  if (data.tajukRujukan) {
    drawText(page, `RUJUKAN KES: ${data.tajukRujukan.toUpperCase()}`, 76, 290, 9.0, true);
    curY = 310;
  }

  // Referral Body Text
  let fontSize = 8.0;
  let lineHeight = 10.5;
  let lines = wrapLines(data.kandunganRujukan || '', 462, fontSize);

  const pageBottomLimit = 715;
  const overflowLines = [];

  for (const line of lines) {
    if (curY <= pageBottomLimit) {
      drawText(page, line, 76, curY, fontSize);
      curY += lineHeight;
    } else {
      overflowLines.push(line);
    }
  }

  // Sign-off Block on Page 1 (if no overflow)
  if (overflowLines.length === 0) {
    let signY = Math.max(curY + 12, 730);
    drawText(page, 'Yang benar,', 76, signY, 8.5);
    signY += 24;
    drawText(page, '................................................................', 76, signY, 8.5);
    signY += 11;
    drawText(page, `( ${(data.namaDoktor || '').toUpperCase()} )`, 76, signY, 8.5, true);
    signY += 10;
    drawText(page, data.jawatanDoktor || 'Pegawai Perubatan', 76, signY, 7.5);
    signY += 10;
    drawText(page, `Jabatan Kecemasan & Trauma, ${data.hospital || 'Hospital'}`, 76, signY, 7.5);
  } else {
    // Page 2 for overflow content
    const page2 = pdfDoc.addPage([595.32, 842.04]);
    const p2Height = 842.04;

    function drawTextP2(text, x, fitzY, size = 8.5, bold = false) {
      if (!text) return;
      page2.drawText(String(text), {
        x: x,
        y: p2Height - fitzY,
        size: size,
        font: bold ? fontBold : font,
        color: darkNavy
      });
    }

    drawTextP2(`SURAT RUJUKAN (SAMBUNGAN) - ${(data.patientName || '').toUpperCase()} (${data.patientHospitalID || ''})`, 76, 50, 8.5, true);
    
    let p2Y = 75;
    for (const oLine of overflowLines) {
      if (p2Y > 715) {
        warnings.push(pdfCutWarning('Referral letter (2 pages maximum)'));
        break;
      }
      drawTextP2(oLine, 76, p2Y, fontSize);
      p2Y += lineHeight;
    }

    let signY = Math.max(p2Y + 14, 730);
    drawTextP2('Yang benar,', 76, signY, 8.5);
    signY += 24;
    drawTextP2('................................................................', 76, signY, 8.5);
    signY += 11;
    drawTextP2(`( ${(data.namaDoktor || '').toUpperCase()} )`, 76, signY, 8.5, true);
    signY += 10;
    drawTextP2(data.jawatanDoktor || 'Pegawai Perubatan', 76, signY, 7.5);
    signY += 10;
    drawTextP2(`Jabatan Kecemasan & Trauma, ${data.hospital || 'Hospital'}`, 76, signY, 7.5);
  }

  const finalBytes = await pdfDoc.save();
  const blob = new Blob([finalBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  return { blob, url, pdfBytes: finalBytes, warnings };
}

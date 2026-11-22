// --- OCR Logic ---
const ocrZone = document.getElementById('ocrZone');
const ocrInput = document.getElementById('ocrInput');
const ocrInputCamera = document.getElementById('ocrInputCamera');
const btnOcrCamera = document.getElementById('btnOcrCamera');
const btnOcrGallery = document.getElementById('btnOcrGallery');
const ocrProgress = document.getElementById('ocrProgress');
const ocrProgressText = document.getElementById('ocrProgressText');
const ocrProgressBar = document.getElementById('ocrProgressBar');
const ocrContent = document.getElementById('ocrContent');

// --- Webcam OCR Controller ---
let webcamStream = null;
let webcamVideoDevices = [];
let currentCameraIndex = 0;

async function openWebcamModal() {
  // Check if getUserMedia is available in this browser & security context
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Webcam not supported in this browser context. Opening camera/file picker...');
    if (ocrInputCamera) ocrInputCamera.click();
    return;
  }

  const modal = document.getElementById('webcamModal');
  const video = document.getElementById('webcamVideo');
  const statusMsg = document.getElementById('webcamStatus');
  const switchBtn = document.getElementById('btnWebcamSwitch');

  if (!modal || !video) return;

  modal.classList.add('active');
  openModalA11y(modal);
  if (statusMsg) statusMsg.style.display = 'none';

  try {
    // Enumerate video devices to see if multiple cameras (e.g. back/front or external USB) exist
    webcamVideoDevices = [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      webcamVideoDevices = devices.filter(d => d.kind === 'videoinput');
    } catch (e) {
      console.warn('Could not enumerate media devices:', e);
    }

    if (switchBtn) {
      switchBtn.style.display = (webcamVideoDevices.length > 1) ? 'inline-flex' : 'none';
    }

    await startWebcamStream();
  } catch (err) {
    console.error('Camera initialization error:', err);
    showWebcamError(err);
  }
}

async function startWebcamStream(deviceId = null) {
  const video = document.getElementById('webcamVideo');
  const statusMsg = document.getElementById('webcamStatus');

  // Stop previous stream tracks if active
  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }

  // High-resolution constraints for sharp text OCR (1080p ideal)
  const constraints = {
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      facingMode: { ideal: 'environment' }
    },
    audio: false
  };

  if (deviceId) {
    constraints.video.deviceId = { exact: deviceId };
    delete constraints.video.facingMode;
  }

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = webcamStream;
    await video.play();
    if (statusMsg) statusMsg.style.display = 'none';
  } catch (err) {
    // Fallback to simpler constraints if ideal resolution failed
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false
      });
      video.srcObject = webcamStream;
      await video.play();
      if (statusMsg) statusMsg.style.display = 'none';
    } catch (fallbackErr) {
      throw fallbackErr;
    }
  }
}

function showWebcamError(err) {
  const statusMsg = document.getElementById('webcamStatus');
  if (!statusMsg) return;

  let msgText = 'Unable to access camera: ' + (err.message || 'Unknown error');
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    msgText = 'Camera permission was denied. Please grant camera access in browser permissions, or select an image file.';
  } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    msgText = 'No camera device found on this system. You can choose a photo file instead.';
  }

  statusMsg.innerHTML = `
    <div style="font-size: 28px;">📷</div>
    <div style="font-weight: 600; font-size: 15px; color: #fca5a5;">Camera Unavailable</div>
    <div style="max-width: 360px; line-height: 1.4; color: #cbd5e1; font-size: 13px;">${escapeExamHtml(msgText)}</div>
    <div style="display:flex; gap:8px; margin-top:10px;">
      <button type="button" class="btn-primary" id="btnWebcamErrorFallback" style="font-size:12px; padding:8px 14px;">
        Choose Image File
      </button>
      <button type="button" class="btn-secondary" id="btnWebcamErrorClose" style="font-size:12px; padding:8px 14px;">
        Cancel
      </button>
    </div>
  `;
  statusMsg.style.display = 'flex';

  const fallbackBtn = document.getElementById('btnWebcamErrorFallback');
  if (fallbackBtn) {
    fallbackBtn.onclick = () => {
      closeWebcamModal();
      if (ocrInput) ocrInput.click();
    };
  }
  const closeBtn = document.getElementById('btnWebcamErrorClose');
  if (closeBtn) {
    closeBtn.onclick = closeWebcamModal;
  }
}

function closeWebcamModal() {
  const modal = document.getElementById('webcamModal');
  const video = document.getElementById('webcamVideo');
  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }
  if (video) {
    video.srcObject = null;
  }
  if (modal) {
    modal.classList.remove('active');
    closeModalA11y(modal);
  }
}

async function switchWebcam() {
  if (webcamVideoDevices.length <= 1) return;
  currentCameraIndex = (currentCameraIndex + 1) % webcamVideoDevices.length;
  const targetDevice = webcamVideoDevices[currentCameraIndex];
  try {
    await startWebcamStream(targetDevice.deviceId);
  } catch (err) {
    console.error('Failed to switch camera:', err);
    showToast('Failed to switch camera: ' + err.message);
  }
}

function captureWebcamPhoto() {
  const video = document.getElementById('webcamVideo');
  if (!video || !video.videoWidth || !video.videoHeight) {
    showToast('Camera feed is not ready yet.');
    return;
  }

  // Render video frame onto offscreen canvas at native video resolution
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Stop stream and close modal immediately
  closeWebcamModal();

  // Convert canvas to Blob and feed directly into existing OCR pipeline
  canvas.toBlob((blob) => {
    if (blob) {
      processImage(blob);
    } else {
      showToast('Failed to capture snapshot from camera.');
    }
  }, 'image/jpeg', 0.95);
}

// Click camera button
if (btnOcrCamera) {
  btnOcrCamera.addEventListener('click', (e) => {
    e.stopPropagation();
    // Check if device is mobile (touchscreen phone/tablet)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.matchMedia && window.matchMedia('(max-width: 768px)').matches && 'ontouchstart' in window);

    if (isMobile && ocrInputCamera) {
      // On mobile phones, directly trigger native camera shutter with auto-focus & full sensor resolution
      ocrInputCamera.click();
    } else {
      // On desktop, open live webcam modal if getUserMedia is supported, otherwise trigger camera/file input
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        openWebcamModal();
      } else if (ocrInputCamera) {
        ocrInputCamera.click();
      }
    }
  });
}

// Modal controls
const btnWebcamClose = document.getElementById('btnWebcamClose');
if (btnWebcamClose) btnWebcamClose.addEventListener('click', closeWebcamModal);

const btnWebcamCancel = document.getElementById('btnWebcamCancel');
if (btnWebcamCancel) btnWebcamCancel.addEventListener('click', closeWebcamModal);

const btnWebcamCapture = document.getElementById('btnWebcamCapture');
if (btnWebcamCapture) btnWebcamCapture.addEventListener('click', captureWebcamPhoto);

const btnWebcamSwitch = document.getElementById('btnWebcamSwitch');
if (btnWebcamSwitch) btnWebcamSwitch.addEventListener('click', switchWebcam);

const webcamModal = document.getElementById('webcamModal');
if (webcamModal) {
  webcamModal.addEventListener('click', (e) => {
    if (e.target === webcamModal) closeWebcamModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && webcamModal && webcamModal.classList.contains('active')) {
    closeWebcamModal();
  }
});

// --- Screen / browser-tab capture ---
// Grabs one frame from a shared screen, window or tab, lets the user drag a region, then runs OCR on it.
async function captureScreenForOCR() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    showToast('Screen capture is not supported in this browser. Use paste (Cmd/Ctrl+V) instead.', 6000);
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  } catch (err) {
    if (err && err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
      showToast('Screen capture failed: ' + (err.message || err.name));
    }
    return;
  }

  let frame;
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    // Give the compositor a moment so the first frame is not blank
    await new Promise(r => setTimeout(r, 400));
    frame = document.createElement('canvas');
    frame.width = video.videoWidth;
    frame.height = video.videoHeight;
    frame.getContext('2d').drawImage(video, 0, 0);
  } catch (err) {
    showToast('Could not grab a frame from the shared screen.');
    return;
  } finally {
    stream.getTracks().forEach(t => t.stop());
  }

  if (!frame.width || !frame.height) {
    showToast('Could not grab a frame from the shared screen.');
    return;
  }

  const blob = await selectScreenRegion(frame);
  if (blob) processImage(blob);
}

// Full-screen overlay showing the captured frame; drag to choose the area to scan.
function selectScreenRegion(frame) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;';

    const hint = document.createElement('div');
    hint.style.cssText = 'color:#e2e8f0;font:600 14px system-ui,sans-serif;text-align:center;';
    hint.textContent = 'Drag to select the patient details, then press Scan (Enter). Esc to cancel.';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;line-height:0;max-width:100%;max-height:calc(100vh - 120px);';
    const view = document.createElement('canvas');
    view.width = frame.width;
    view.height = frame.height;
    view.getContext('2d').drawImage(frame, 0, 0);
    view.style.cssText = 'max-width:100%;max-height:calc(100vh - 120px);cursor:crosshair;touch-action:none;border-radius:6px;';
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;border:2px dashed #3b82f6;background:rgba(59,130,246,.18);display:none;pointer-events:none;';
    wrap.append(view, box);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;';
    const mk = (label, cls) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.textContent = label;
      b.style.cssText = 'font-size:13px;padding:8px 16px;';
      return b;
    };
    const btnScan = mk('Scan selection', 'btn-primary');
    const btnAll = mk('Scan whole screen', 'btn-secondary');
    const btnCancel = mk('Cancel', 'btn-secondary');
    row.append(btnScan, btnAll, btnCancel);
    overlay.append(hint, wrap, row);
    document.body.appendChild(overlay);

    let start = null, sel = null;
    const toCanvas = e => {
      const r = view.getBoundingClientRect();
      return {
        x: Math.min(Math.max((e.clientX - r.left) * (view.width / r.width), 0), view.width),
        y: Math.min(Math.max((e.clientY - r.top) * (view.height / r.height), 0), view.height)
      };
    };
    const drawBox = () => {
      if (!sel) { box.style.display = 'none'; return; }
      const r = view.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      const kx = r.width / view.width, ky = r.height / view.height;
      box.style.display = 'block';
      box.style.left = (r.left - w.left + sel.x * kx) + 'px';
      box.style.top = (r.top - w.top + sel.y * ky) + 'px';
      box.style.width = (sel.w * kx) + 'px';
      box.style.height = (sel.h * ky) + 'px';
    };

    view.addEventListener('pointerdown', e => {
      view.setPointerCapture(e.pointerId);
      start = toCanvas(e);
      sel = null;
      drawBox();
    });
    view.addEventListener('pointermove', e => {
      if (!start) return;
      const p = toCanvas(e);
      sel = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
      drawBox();
    });
    view.addEventListener('pointerup', () => { start = null; });

    const finish = region => {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (!region) return resolve(null);
      const out = document.createElement('canvas');
      out.width = Math.round(region.w);
      out.height = Math.round(region.h);
      out.getContext('2d').drawImage(frame, region.x, region.y, region.w, region.h, 0, 0, out.width, out.height);
      out.toBlob(b => resolve(b), 'image/png');
    };
    const scanSelection = () => {
      if (!sel || sel.w < 20 || sel.h < 20) {
        showToast('Drag a larger area first, or choose "Scan whole screen".');
        return;
      }
      finish(sel);
    };
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); finish(null); }
      else if (e.key === 'Enter') { e.stopPropagation(); scanSelection(); }
    };
    document.addEventListener('keydown', onKey, true);
    btnScan.addEventListener('click', scanSelection);
    btnAll.addEventListener('click', () => finish({ x: 0, y: 0, w: frame.width, h: frame.height }));
    btnCancel.addEventListener('click', () => finish(null));
  });
}

const btnOcrScreen = document.getElementById('btnOcrScreen');
const btnEhisPaste = document.getElementById('btnEhisPaste');
if (btnEhisPaste) {
  btnEhisPaste.addEventListener('click', (e) => {
    e.stopPropagation();   // the zone's own click opens the file picker
    getFromEhis();
  });
}
const btnEhisOpen = document.getElementById('btnEhisOpen');
if (btnEhisOpen) {
  btnEhisOpen.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = 'eddoc-ehis://login';   // PC helper runs the eHIS auto-login; nothing comes back
    showToast('Opening eHIS... (only on PCs with the eHIS helper)', 4000);
  });
}
if (btnOcrScreen) {
  btnOcrScreen.addEventListener('click', (e) => {
    e.stopPropagation();
    captureScreenForOCR();
  });
}

// Click file/gallery button triggers gallery directly
if (btnOcrGallery && ocrInput) {
  btnOcrGallery.addEventListener('click', (e) => {
    e.stopPropagation();
    ocrInput.click();
  });
}

// Click anywhere on dashed dropzone (outside buttons) opens gallery
if (ocrZone && ocrInput) {
  ocrZone.addEventListener('click', (e) => {
    if (e.target.closest('#btnOcrCamera') || e.target.closest('#btnOcrGallery') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }
    ocrInput.click();
  });
}

// Handle file selection
function handleFileSelection(e) {
  if (e.target.files && e.target.files[0]) {
    processImage(e.target.files[0]);
  }
}

if (ocrInput) {
  ocrInput.addEventListener('click', (e) => e.stopPropagation());
  ocrInput.addEventListener('change', handleFileSelection);
}

if (ocrInputCamera) {
  ocrInputCamera.addEventListener('click', (e) => e.stopPropagation());
  ocrInputCamera.addEventListener('change', handleFileSelection);
}

// Paste image from clipboard
document.addEventListener('paste', (e) => {
  const cd = e.clipboardData || e.originalEvent.clipboardData;
  // eHIS data works wherever the cursor is (it is never text to keep as typed)
  if (applyEhisDemographics(cd.getData('text/plain'))) { e.preventDefault(); return; }
  // Only process paste if we are not focused on a text input, to prevent capturing normal text pasting
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    return;
  }

  const items = cd.items;
  for (let item of items) {
    if (item.type.indexOf('image') === 0) {
      const blob = item.getAsFile();
      processImage(blob);
      break;
    }
  }
});

// --- eHIS import ---
// The work PC's helper (ehis-to-eddoc.ps1) copies the open patient's eHIS Demographics
// as 'EHIS-DEMO:{json}'. Exact values, so no OCR guessing. Returns true if it was one.
// It runs from the desktop shortcut (then Ctrl+V here) or from getFromEhis() below.
function applyEhisDemographics(text) {
  if (!text || !text.startsWith('EHIS-DEMO:')) return false;
  let d;
  try { d = JSON.parse(text.slice(10)); } catch (err) { showToast('eHIS data could not be read: ' + err.message, 5000); return true; }
  fillEhisDemographics(d);
  return true;
}

function fillEhisDemographics(d) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = v || '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('patientName', d.name);
  set('patientHospitalID', d.hospitalId);
  const g = document.getElementById('patientGender');
  if (g) { g.value = ''; delete g.dataset.fromIc; g.dispatchEvent(new Event('input', { bubbles: true })); }   // a new patient: drop the previous one's gender
  set('patientID', d.nric || d.altId);   // an IC fills age + gender itself (handleICInput)
  if (!calculateAgeFromIC(d.nric || d.altId)) {
    const part = u => ((d.age || '').match(new RegExp('(\\d+)\\s*' + u, 'i')) || [])[1] || '';
    ['ageYears', 'ageMonths', 'ageDays', 'ageHours'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; delete el.dataset.fromIc; }
    });
    document.getElementById('ageYears').value = part('Y');
    document.getElementById('ageMonths').value = part('M');
    document.getElementById('ageDays').value = part('D');
    updateAge();
  }
  // eHIS's registered gender wins over the IC guess
  if (g && /^(male|female)$/i.test(d.gender || '')) {
    g.value = d.gender[0].toUpperCase() + d.gender.slice(1).toLowerCase();
    delete g.dataset.fromIc;
    g.dispatchEvent(new Event('input', { bubbles: true }));
  }
  showToast('Imported from eHIS: ' + (d.name || '') + ' (' + (d.hospitalId || '') + ')', 4000);
}

// One click: opens eddoc-ehis://get/<nonce>, a link type the work PC's helper
// registers, then watches the clipboard for the answer carrying that nonce, so an
// older copy (e.g. another patient's) is never taken. PCs without the helper: timeout.
let ehisFetchActive = false;
async function getFromEhis() {
  if (ehisFetchActive) return;
  ehisFetchActive = true;
  const btn = document.getElementById('btnEhisPaste');
  const label = btn && btn.querySelector('span');
  if (label) label.textContent = 'Getting from eHIS...';
  // Ask for clipboard access now, while the click still counts as the user's gesture:
  // Chrome only shows its one-time permission question then, not during the polling.
  try { await navigator.clipboard.readText(); } catch (err) { /* denied or unfocused: polling reports it */ }
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
  window.location.href = 'eddoc-ehis://get/' + nonce;   // external link type: the page stays put
  const started = Date.now();
  const until = started + 45000;   // first use includes Chrome's "Open ...?" question
  let done = false, hinted = false;
  let wake = null;
  const onFocus = () => wake && wake();   // read at once when ED Doc gets focus back
  window.addEventListener('focus', onFocus);
  try {
    while (!done && Date.now() < until) {
      await new Promise(r => { wake = r; setTimeout(r, 500); });
      wake = null;
      let text = '';
      try { text = await navigator.clipboard.readText(); } catch (err) {
        // Chrome reads the clipboard only while this page has focus
        if (!hinted && Date.now() - started > 6000 && !document.hasFocus()) {
          hinted = true;
          showToast('Almost there - click anywhere on ED Doc to finish.', 6000);
        }
        continue;
      }
      const m = /^EHIS-(DEMO|ERR):(.*)$/s.exec(text || '');
      if (!m) continue;
      let d;
      try { d = JSON.parse(m[2]); } catch (err) { continue; }
      if (d.nonce !== nonce) continue;   // an older copy, e.g. another patient's
      done = true;
      try { await navigator.clipboard.writeText(''); } catch (err) { /* the helper clears it after 60 s anyway */ }
      if (m[1] === 'ERR') showToast('eHIS: ' + d.error, 6000);
      else fillEhisDemographics(d);
    }
    if (!done) showToast('No answer from eHIS. Is the eHIS helper installed on this PC and a patient chart open?', 7000);
  } finally {
    window.removeEventListener('focus', onFocus);
    if (label) label.textContent = 'Get from eHIS';
    ehisFetchActive = false;
  }
}

function updateOCRProgress(status, pct) {
  if (!ocrContent || !ocrProgress) return;
  ocrContent.style.display = 'none';
  ocrProgress.classList.add('active');
  ocrProgressText.textContent = `${status} ${Math.round(pct * 100)}%`;
  ocrProgressBar.style.background = `linear-gradient(to right, var(--accent) ${pct * 100}%, var(--border) ${pct * 100}%)`;
}

// Downscale huge smartphone camera photos (e.g. 12-48MP)
// to prevent mobile browser memory exhaustion (OOM) and speed up OCR significantly
function optimizeImageForOCR(file, maxDimension = 1600) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        return resolve(file);
      }

      // If image is already within bounds, keep original
      if (width <= maxDimension && height <= maxDimension) {
        return resolve(file);
      }

      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(file);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        resolve(blob || file);
      }, 'image/jpeg', 0.88);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

// Load an image (EXIF-aware) and draw it on a canvas whose longest side is `target` px.
// Mode 'adaptive' = grayscale + local-mean binarisation (removes shadows, watermarks, paper tint).
// Mode 'gray' = plain grayscale (safer for coloured cards such as MyKad).
function prepareImageForOCR(file, mode, target = 1900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      if (!iw || !ih) return reject(new Error('Invalid image'));
      const k = target / Math.max(iw, ih);
      const W = Math.round(iw * k), H = Math.round(ih * k);
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, W, H);

      const data = ctx.getImageData(0, 0, W, H);
      const px = data.data, n = W * H;
      const gray = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        gray[i] = (px[i * 4] * 299 + px[i * 4 + 1] * 587 + px[i * 4 + 2] * 114) / 1000;
      }

      let out = gray;
      if (mode === 'adaptive') {
        // Integral image for fast local mean
        const stride = W + 1;
        const integral = new Int32Array(stride * (H + 1));
        for (let y = 0; y < H; y++) {
          let row = 0;
          for (let x = 0; x < W; x++) {
            row += gray[y * W + x];
            integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
          }
        }
        const r = Math.max(8, Math.round(Math.min(W, H) / 16));
        out = new Uint8Array(n);
        for (let y = 0; y < H; y++) {
          const y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
          for (let x = 0; x < W; x++) {
            const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1);
            const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0];
            const mean = sum / ((x1 - x0) * (y1 - y0));
            out[y * W + x] = gray[y * W + x] < mean * 0.85 ? 0 : 255;
          }
        }
      }
      for (let i = 0; i < n; i++) {
        px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = out[i];
        px[i * 4 + 3] = 255;
      }
      ctx.putImageData(data, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

// --- Shared OCR worker: created once, reused for every scan, released after idle ---
let ocrWorkerPromise = null;
let ocrIdleTimer = null;
let ocrBusy = false;
let ocrProgressHandler = null;
const OCR_IDLE_MS = 120000;

function getOcrWorker() {
  if (!ocrWorkerPromise) {
    // Blob-based workers cannot resolve relative URLs, so use absolute ones
    const abs = p => new URL(p, location.href).href;
    ocrWorkerPromise = Tesseract.createWorker('eng', 1, {
      workerPath: abs('./assets/worker.min.js'),
      corePath: abs('./assets/tesseract-core.wasm.js'),
      langPath: abs('./assets'),
      logger: m => { if (ocrProgressHandler) ocrProgressHandler(m); }
    }).then(async worker => {
      // PSM 4 (single column of variable-size text) suits stickers and ID cards
      await worker.setParameters({ tessedit_pageseg_mode: '4', user_defined_dpi: '300' });
      return worker;
    }).catch(err => { ocrWorkerPromise = null; throw err; });
  }
  return ocrWorkerPromise;
}

async function releaseOcrWorker() {
  clearTimeout(ocrIdleTimer);
  const pending = ocrWorkerPromise;
  ocrWorkerPromise = null;
  if (pending) {
    try { (await pending).terminate(); } catch (e) { /* already gone */ }
  }
}

async function processImage(file) {
  if (ocrBusy) {
    showToast('A scan is already in progress...');
    return;
  }
  if (location.protocol === 'file:') {
    // Browsers block Web Workers and model fetches from file:// pages, so OCR cannot run here
    showToast('OCR needs the local server: double-click start_offline.command and use http://localhost:8080', 8000);
    console.error('OCR unavailable on file:// - open via http://localhost:8080 (start_offline.command)');
    return;
  }
  ocrBusy = true;
  clearTimeout(ocrIdleTimer);
  try {
    updateOCRProgress('Loading OCR engine...', 0.05);
    await ensureOcrLibrary();

    updateOCRProgress('Preparing photo...', 0.1);
    const cleaned = await prepareImageForOCR(file, 'adaptive');

    updateOCRProgress('Starting OCR...', 0.15);
    const worker = await getOcrWorker();
    ocrProgressHandler = m => {
      if (m.status === 'recognizing text') updateOCRProgress('Scanning...', 0.2 + m.progress * 0.7);
      else updateOCRProgress(m.status, m.progress || 0);
    };

    let ret = await worker.recognize(cleaned);

    // Binarisation can hurt coloured cards (MyKad); retry on plain grayscale and keep the better read
    if (ret.data.confidence < 70) {
      updateOCRProgress('Re-checking...', 0.9);
      const gray = await prepareImageForOCR(file, 'gray');
      const retry = await worker.recognize(gray);
      if (retry.data.confidence > ret.data.confidence) ret = retry;
    }
    ocrProgressHandler = null;

    // Reset UI
    if (ocrProgress) ocrProgress.classList.remove('active');
    if (ocrContent) ocrContent.style.display = 'flex';
    if (ocrInput) ocrInput.value = '';
    if (ocrInputCamera) ocrInputCamera.value = '';

    console.log('OCR confidence:', ret.data.confidence, '\nOCR raw text:', ret.data.text);
    parseOCRText(ret.data.text);
  } catch (err) {
    console.error('OCR Error:', err);
    showToast('Failed to process image: ' + (err && err.message ? err.message : String(err)));
    if (ocrProgress) ocrProgress.classList.remove('active');
    if (ocrContent) ocrContent.style.display = 'flex';
    await releaseOcrWorker();
  } finally {
    ocrProgressHandler = null;
    ocrBusy = false;
    clearTimeout(ocrIdleTimer);
    if (ocrWorkerPromise) ocrIdleTimer = setTimeout(releaseOcrWorker, OCR_IDLE_MS);
  }
}

function parseOCRText(text) {
  let icParsed = false;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. IC Number
  // STRICT regex to prevent matching Encounter IDs. First 6 digits must form a valid YYMMDD date.
  // Month: 01-12, Day: 01-31.
  const icMatch = text.match(/\b(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[\s\-]?\d{2}[\s\-]?\d{4})\b/);
  if (icMatch) {
    const icInput = document.getElementById('patientID');
    icInput.value = icMatch[1].replace(/[\s\-]/g, '');
    // Trigger the existing IC processing logic to auto-calculate age & gender
    handleICInput();
    icParsed = true;
  } else {
    // Fallback: Check for Birth Cert, Passport, etc.
    const altIdMatch = text.match(/\b(?:Birth\s*Cert|Passport|Pasport)[ \t]*[\:\#][ \t]*([A-Z0-9]+)/i);
    if (altIdMatch) {
      document.getElementById('patientID').value = altIdMatch[1].trim();
      // Clears an age/gender the previous IC filled in (a passport carries neither)
      handleICInput();
      icParsed = true;
    }
  }

  // 1.5 Parse Gender and Age from sticker explicitly (Useful when IC is missing, e.g., Birth Cert cases)
  const genderMatch = text.match(/(?:Gender|Sex)\s*[\:\#]\s*(Male|Female|Lelaki|Perempuan)/i);
  if (genderMatch) {
    const gInput = document.getElementById('patientGender');
    const gVal = genderMatch[1].toLowerCase();
    if ((gVal === 'male' || gVal === 'lelaki') && !gInput.value) gInput.value = 'Male';
    if ((gVal === 'female' || gVal === 'perempuan') && !gInput.value) gInput.value = 'Female';
  }

  const ageMatch = text.match(/(?:Age|Umur)\s*[\:\#]\s*(\d+)\s*(Y|M|D)?/i);
  if (ageMatch && !document.getElementById('ageYears').value) {
    const ageVal = parseInt(ageMatch[1], 10);
    const unit = (ageMatch[2] || 'Y').toUpperCase();
    if (unit === 'Y') document.getElementById('ageYears').value = ageVal;
    else if (unit === 'M') document.getElementById('ageMonths').value = ageVal;
    else if (unit === 'D') document.getElementById('ageDays').value = ageVal;

    if (typeof updateAge === 'function') updateAge();
  }

  // 1.6 DOB fallback (e.g. no IC): compute age from DOB when age was not read
  const dobMatch = text.match(/DOB[ \t]*[\:\#]?[ \t]*(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/i);
  if (dobMatch && !document.getElementById('ageYears').value && !document.getElementById('ageMonths').value && !document.getElementById('ageDays').value) {
    const dd = +dobMatch[1], mm = +dobMatch[2], yy = +dobMatch[3];
    const dobDate = new Date(yy, mm - 1, dd);
    const now = new Date();
    if (dobDate.getDate() === dd && dobDate.getMonth() === mm - 1 && dobDate <= now) {
      let years = now.getFullYear() - yy;
      if (now.getMonth() < mm - 1 || (now.getMonth() === mm - 1 && now.getDate() < dd)) years--;
      document.getElementById('ageYears').value = years;
      if (typeof updateAge === 'function') updateAge();
    }
  }

  // 2. Hospital RN (Supports RN, MRN, PID)
  // Sticker PIDs look like "LD" + 8 digits; OCR often confuses 0/O and 1/I/l in the digit part.
  const fixDigits = str => str.toUpperCase().replace(/[OQD]/g, '0').replace(/[ILB|]/g, m => m === 'B' ? '8' : '1');
  const pidMatch = text.match(/\bPID[ \t]*[\:\#]?[ \t]*([A-Z]{2})[ \t]*([A-Z0-9]{8,10})\b/i);
  const rnMatch = text.match(/(?:\bRN|\bMRN|NO\.?\s*PENDAFTARAN)[ \t\:\#]*([A-Z0-9\-\/]+)/i);
  if (pidMatch) {
    document.getElementById('patientHospitalID').value = pidMatch[1].toUpperCase() + (() => {
      let d = fixDigits(pidMatch[2]);
      // OCR sometimes doubles a zero; PIDs have 8 digits, so trim surplus leading zeros
      while (d.length > 8 && d[0] === '0') d = d.slice(1);
      return d;
    })();
  } else if (rnMatch) {
    document.getElementById('patientHospitalID').value = rnMatch[1];
  } else {
    const loosePid = text.match(/\bPID[ \t]*[\:\#]?[ \t]*([A-Z0-9\-\/]+)/i);
    if (loosePid) document.getElementById('patientHospitalID').value = loosePid[1];
  }

  // 3. Name
  let nameFound = false;

  // Try finding explicit name fields (e.g. from Hospital Stickers "Patient Name : ...")
  // We process line-by-line to prevent matching text that belongs to the next line.
  for (let line of lines) {
    const explicitNameMatch = line.match(/(?:Patient\s*Name|Name|Nama)\s*[\:\#]\s*(.+)/i);
    if (explicitNameMatch) {
      let cleanedName = explicitNameMatch[1];

      // Clean up titles (e.g., ", Puan", " Encik") even if the comma is missing
      cleanedName = cleanedName.replace(/\s*,?\s*(?:Puan|Encik|Cik|Tuan|Mr|Mrs|Ms|Miss|Mdm|Madam|Master|Baby|Datin|Dato|Dr)(?:\b|NRIC|MyKad|DOB).*$/i, '');

      // If OCR accidentally merged the next line (like NRIC/MyKad) into the same line, strip it out
      cleanedName = cleanedName.replace(/(?:NRIC|MyKad|DOB|Age).*$/i, '');

      // Clean up any trailing punctuation/whitespace
      cleanedName = cleanedName.replace(/[\,\:\-\/]+$/, '').trim();

      document.getElementById('patientName').value = cleanedName;
      nameFound = true;
      break;
    }
  }

  // Fallback Heuristic for MyKad: Usually all caps, >5 chars, ignore common non-name ID keywords
  if (!nameFound) {
    for (let line of lines) {
      // Clean non-alphabet chars (keep spaces, slashes, apostrophes)
      const cleanLine = line.replace(/[^A-Za-z\s\@\/\']/g, '').trim();

      if (cleanLine.length > 5 && cleanLine === cleanLine.toUpperCase()) {
        if (!cleanLine.includes('KAD PENGENALAN') &&
          !cleanLine.includes('MALAYSIA') &&
          !cleanLine.includes('WARGANEGARA') &&
          !cleanLine.includes('ISLAM') &&
          !cleanLine.includes('PID') &&
          !cleanLine.includes('ENCOUNTER')) {

          // Likely a name if it contains BIN/BINTI/A/L/A/P or has multiple words
          if (/BIN|BINTI|A\/L|A\/P|ANAK/.test(cleanLine) || cleanLine.split(' ').length >= 2) {
            if (!nameFound) {
              document.getElementById('patientName').value = line;
              nameFound = true;
            }
          }
        }
      }
    }
  }

  // 4. Address
  // Heuristic: Contains common address keywords
  const addressLines = lines.filter(l => /(JALAN|JLN|TAMAN|TMN|LORONG|KAMPUNG|KG|NO\.|PT\s|LOT\s|BUKIT|BKT|APARTMENT|CONDO|TINGKAT|BLOK)/i.test(l));
  if (addressLines.length > 0) {
    // MyKad addresses usually span a few lines before the postcode
    const addrIndex = lines.indexOf(addressLines[0]);
    let addr = addressLines[0];

    // Try to grab the next line if it looks like part of the address (e.g. starts with postcode)
    if (lines[addrIndex + 1] && /^\d{5}\s/.test(lines[addrIndex + 1])) {
      addr += ', ' + lines[addrIndex + 1];
    }
    document.getElementById('patientAddress').value = addr;
  }

  showToast(icParsed ? 'Demographics Extracted from Image!' : 'OCR Complete. Please review fields.');
}
  

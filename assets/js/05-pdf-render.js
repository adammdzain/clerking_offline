// =======================================================
// SHARED PDF.JS CANVAS RENDERER & MOBILE EXPORT HELPERS
// =======================================================
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = './assets/pdf.worker.min.js';
}

async function renderPdfToCanvasContainer(pdfBytes, containerEl, iframeFallbackEl) {
  if (!containerEl) return false;
  const renderSeq = (containerEl._renderSeq || 0) + 1;
  containerEl._renderSeq = renderSeq;

  if (typeof pdfjsLib !== 'undefined') {
    try {
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = './assets/pdf.worker.min.js';
      }
      // isEvalSupported: false stops pdf.js 3.x compiling font code with new Function
      // (CVE-2024-4367, crafted-font code execution), whatever PDF is shown.
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes, isEvalSupported: false });
      const pdfDoc = await loadingTask.promise;

      if (containerEl._renderSeq !== renderSeq) return false;

      containerEl.innerHTML = '';
      containerEl.style.display = 'flex';
      if (iframeFallbackEl) iframeFallbackEl.style.display = 'none';

      const containerWidth = containerEl.clientWidth || 550;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        if (containerEl._renderSeq !== renderSeq) return false;

        const page = await pdfDoc.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        const targetWidth = Math.max(260, containerWidth - 24);
        const displayScale = targetWidth / unscaledViewport.width;
        const renderViewport = page.getViewport({ scale: displayScale * dpr });

        const pageCard = document.createElement('div');
        pageCard.className = 'pdf-page-card';

        if (pdfDoc.numPages > 1) {
          const badge = document.createElement('div');
          badge.style.cssText = 'position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.65); color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; z-index:2; pointer-events:none;';
          badge.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;
          pageCard.appendChild(badge);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(unscaledViewport.width * displayScale)}px`;
        canvas.style.height = `${Math.floor(unscaledViewport.height * displayScale)}px`;

        const ctx = canvas.getContext('2d');
        await page.render({
          canvasContext: ctx,
          viewport: renderViewport
        }).promise;

        if (containerEl._renderSeq !== renderSeq) return false;

        pageCard.appendChild(canvas);
        containerEl.appendChild(pageCard);
      }
      return true;
    } catch (err) {
      console.warn('PDF.js render failed, falling back to iframe:', err);
    }
  }

  if (iframeFallbackEl) {
    containerEl.style.display = 'none';
    iframeFallbackEl.style.display = 'block';
  }
  return false;
}

async function shareOrOpenPdf(pdfBytes, filename) {
  if (!pdfBytes) {
    showToast('Please wait for PDF to finish generating.');
    return;
  }
  const file = new File([pdfBytes], filename, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: filename
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('navigator.share failed, fallback:', err);
    }
  }

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    downloadPdfFile(pdfBytes, filename);
    showToast('PDF downloaded to phone storage!');
    return;
  }
  const url = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
  const win = window.open(url, '_blank');
  if (!win) {
    URL.revokeObjectURL(url);
    downloadPdfFile(pdfBytes, filename);
    return;
  }
  // The new tab has read the PDF well before this; releasing it frees the patient's copy here.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function downloadPdfFile(pdfBytes, filename) {
  if (!pdfBytes) {
    showToast('Please wait for PDF to finish generating.');
    return;
  }
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
  showToast('PDF downloaded: ' + filename);
}

async function printPdfFile(pdfBytes, filename, frameId) {
  if (!pdfBytes) {
    showToast('Please wait for PDF to finish generating.');
    return;
  }
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    const file = new File([pdfBytes], filename, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Print ' + filename
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
  }

  // The live preview iframe must not be used for printing: pdf.js renders
  // the preview onto a canvas and the iframe never receives the fresh
  // bytes, so printing it produces blank/stale output. Print the freshly
  // generated bytes via a dedicated off-screen iframe instead.
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const printFrame = document.createElement('iframe');
  printFrame.style.cssText = 'position:fixed; right:0; bottom:0; width:1px; height:1px; opacity:0; border:0;';
  printFrame.setAttribute('aria-hidden', 'true');
  printFrame.src = url;
  document.body.appendChild(printFrame);

  await new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) { settled = true; resolve(); }
    };
    printFrame.addEventListener('load', () => setTimeout(done, 300));
    setTimeout(done, 3000);
  });

  try {
    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();
    setTimeout(() => {
      printFrame.remove();
      URL.revokeObjectURL(url);
    }, 60000);
  } catch (e) {
    console.warn('Frame print failed, opening window:', e);
    printFrame.remove();
    const printWin = window.open(url, '_blank');
    if (printWin) {
      printWin.focus();
    } else {
      downloadPdfFile(pdfBytes, filename);
    }
  }
}

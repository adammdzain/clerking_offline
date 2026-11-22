/* =======================================================
   PDF EXPORT WITH TRAUMA DIAGRAM (session only, offline)
   ======================================================= */
async function captureTraumaDiagram() {
  return captureBodyDiagram({ pins: traumaPins.map((p, i) => ({ ix: p.ix, iy: p.iy, color: p.color || '#ef4444', text: String(i + 1) })) });
}

// Shared rasteriser for the body figure: optional filled regions + numbered pins.
async function captureBodyDiagram({ pins = [], regions = [] } = {}) {
  const src = document.querySelector('#traumaDiagramCanvas svg.body-figure');
  if (!src) throw new Error('Body diagram not found');
  const NS = 'http://www.w3.org/2000/svg';
  const svg = src.cloneNode(true);
  svg.removeAttribute('style');
  svg.removeAttribute('class');
  svg.setAttribute('xmlns', NS);
  svg.setAttribute('width', '1280');
  svg.setAttribute('height', '1458');
  const mk = (tag, attrs, txt) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (txt != null) el.textContent = txt;
    return el;
  };
  svg.insertBefore(mk('rect', { x: 0, y: 0, width: 640, height: 729, fill: '#ffffff' }), svg.firstChild);
  const sx = 640 / TRAUMA_IMG_W, sy = 729 / TRAUMA_IMG_H;
  svg.appendChild(mk('text', { x: 457 * sx, y: 30 * sy, 'text-anchor': 'middle', 'font-family': 'Helvetica, Arial, sans-serif', 'font-weight': 'bold', 'font-size': 9, fill: '#334155' }, 'ANTERIOR'));
  svg.appendChild(mk('text', { x: 1290 * sx, y: 30 * sy, 'text-anchor': 'middle', 'font-family': 'Helvetica, Arial, sans-serif', 'font-weight': 'bold', 'font-size': 9, fill: '#334155' }, 'POSTERIOR'));
  regions.forEach(r => {
    svg.appendChild(mk('polygon', {
      points: r.pts.map(q => (q[0] * sx).toFixed(2) + ',' + (q[1] * sy).toFixed(2)).join(' '),
      fill: r.color, 'fill-opacity': r.opacity != null ? r.opacity : 0.55, stroke: '#111827', 'stroke-width': 0.6
    }));
    if (r.text) {
      const xs = r.pts.map(q => q[0]), ys = r.pts.map(q => q[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2 * sx, cy = (Math.min(...ys) + Math.max(...ys)) / 2 * sy;
      svg.appendChild(mk('text', { x: cx, y: cy + 2.6, 'text-anchor': 'middle', 'font-family': 'Helvetica, Arial, sans-serif', 'font-weight': 'bold', 'font-size': 7, fill: '#111827' }, r.text));
    }
  });
  pins.forEach(p => {
    const x = p.ix * sx, y = p.iy * sy, r = 6.5;
    svg.appendChild(mk('circle', { cx: x, cy: y, r: r + 0.9, fill: 'none', stroke: '#111827', 'stroke-width': 0.7 }));
    svg.appendChild(mk('circle', { cx: x, cy: y, r: r, fill: p.color || '#ef4444', stroke: '#ffffff', 'stroke-width': 1.2 }));
    svg.appendChild(mk('text', { x: x, y: y + 2.4, 'text-anchor': 'middle', 'font-family': 'Helvetica, Arial, sans-serif', 'font-weight': 'bold', 'font-size': p.text && p.text.length > 1 ? 5.5 : 7, fill: '#ffffff' }, p.text || ''));
  });
  return rasterizeSvg(svg, 1280, 1458);
}

async function rasterizeSvg(svg, width, height) {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Could not rasterize body diagram'));
    im.src = url;
  });
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/png');
}

// One view of the body figure on its own. The SVG holds posterior then anterior as separate paths.
function bodyViewSvg(side) {
  const src = document.querySelector('#traumaDiagramCanvas svg.body-figure');
  if (!src) throw new Error('Body diagram not found');
  const svg = src.cloneNode(true);
  ['class', 'style', 'id', 'width', 'height'].forEach(a => svg.removeAttribute(a));
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const anterior = side === 'anterior';
  svg.querySelectorAll('path')[anterior ? 0 : 1].remove();
  svg.setAttribute('viewBox', `${anterior ? 13.5 : 311.5} 15 310 700`);
  return svg;
}

/* Page geometry and pagination shared by the PDF export and Print Notes, in points. */
const NOTE_PAGE = {
  W: 595.28, H: 841.89, M: 44, LH: 13, SIZE: 9.5,
  TEXT_TOP: 58,                                   // title and Clinical Notes heading on page 1
  COL_W: 303, RULE_X: 361,                        // notes column and divider on the figure page
  FIG_X: 375, FIG_W: 176, FIG_LABEL: 14,          // figure column
  FIG_IMG_W: 142.6, FIG_IMG_H: 322, FIG_ROW: 342  // each view; the second starts FIG_ROW lower
};
const notePageTop = p => NOTE_PAGE.M + (p ? 0 : NOTE_PAGE.TEXT_TOP);

// maxW is a width, or a function of the line index (counted from start) for mixed columns
function wrapText(text, measure, maxW, start = 0) {
  const out = [];
  const limit = () => (typeof maxW === 'function' ? maxW(start + out.length) : maxW);
  text.split('\n').forEach(raw => {
    if (!raw.trim()) { out.push(''); return; }
    const lead = (raw.match(/^\s*/) || [''])[0];
    let line = lead;
    raw.trim().split(/\s+/).forEach(word => {
      while (measure(word) > limit()) {
        let cut = word.length - 1;
        while (cut > 1 && measure(word.slice(0, cut)) > limit()) cut--;
        if (line.trim()) { out.push(line); line = lead; }
        out.push(word.slice(0, cut)); word = word.slice(cut);
      }
      const trial = line.trim() ? line + ' ' + word : line + word;
      if (measure(trial) > limit() && line.trim()) { out.push(line); line = lead + word; }
      else line = trial;
    });
    out.push(line);
  });
  return out;
}

// Pages of wrapped note lines. The page holding Physical Examination carries the figure column,
// so its text runs in the left column; every other page stays full width.
function layoutNotePages(notes, hasFigure, measure) {
  const { H, W, M, LH, TEXT_TOP, COL_W } = NOTE_PAGE;
  const fullW = W - 2 * M;
  const first = Math.floor((H - 2 * M - TEXT_TOP) / LH), rest = Math.floor((H - 2 * M) / LH);
  const pageOf = i => (i < first ? 0 : 1 + Math.floor((i - first) / rest));
  const pageStart = p => (p ? first + (p - 1) * rest : 0);

  const split = hasFigure ? splitNotesAtExam(notes) : null;
  const pre = split ? split.preExam : notes;
  let lines = wrapText(pre, measure, fullW);
  let figPage = -1;
  if (hasFigure) {
    // The heading and two lines of findings stay with the figure
    const keep = split ? 2 : -1;
    figPage = pageOf(lines.length + keep);
    const width = i => (pageOf(i) === figPage ? COL_W : fullW);
    const fitted = wrapText(pre, measure, width);
    const moved = pageOf(lines.length) < figPage;
    if (!moved && pageOf(fitted.length + keep) === figPage) lines = fitted;
    else {
      if (!moved) figPage++;
      while (lines.length < pageStart(figPage)) lines.push('');
    }
    if (split) lines = lines.concat(wrapText(split.fromExam, measure, width, lines.length));
  }

  const pages = [];
  const last = Math.max(pageOf(lines.length - 1), figPage);
  for (let p = 0; p <= last; p++) {
    pages.push({ lines: lines.slice(pageStart(p), pageStart(p + 1)), figure: p === figPage });
  }
  return pages;
}

// Print Notes draws the same pages as the PDF. Runs in beforeprint, so it has to stay synchronous.
function renderNotesPrintPages() {
  const host = document.getElementById('notesPrintPages');
  if (!host) return;
  host.innerHTML = '';
  const area = document.getElementById('docArea');
  const notes = (area && area.value || '').trim();
  const hasFigure = typeof quickExamHasData === 'function' && quickExamHasData();
  if (!notes && !hasFigure) return;

  const { M, LH, SIZE, RULE_X, FIG_X, FIG_W, FIG_LABEL, FIG_IMG_W, FIG_ROW, H } = NOTE_PAGE;
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${SIZE}pt Helvetica, Arial, sans-serif`;
  const measure = t => ctx.measureText(t).width * 0.75;
  const place = (parent, tag, cls, left, top, text) => {
    const el = document.createElement(tag);
    el.className = cls;
    el.style.left = left + 'pt';
    el.style.top = top + 'pt';
    if (text != null) el.textContent = text;
    parent.appendChild(el);
    return el;
  };

  layoutNotePages(notes, hasFigure, measure).forEach((pg, n) => {
    const sheet = document.createElement('section');
    sheet.className = 'print-page';
    const top = notePageTop(n);
    if (n === 0) {
      place(sheet, 'div', 'print-title', M, M, 'Clinical Documentation');
      place(sheet, 'div', 'print-date', NOTE_PAGE.W - M - 150, M + 5, new Date().toLocaleString());
      place(sheet, 'div', 'print-heading', M, M + 34, 'Clinical Notes');
      place(sheet, 'div', 'print-rule', M, M + 50);
    }
    pg.lines.forEach((l, k) => { if (l) place(sheet, 'div', 'print-line', M, top + k * LH, l); });
    if (pg.figure) {
      place(sheet, 'div', 'print-divider', RULE_X, top).style.height = (H - M - top) + 'pt';
      ['anterior', 'posterior'].forEach((side, v) => {
        const y = top + v * FIG_ROW;
        place(sheet, 'div', 'print-fig-label', FIG_X, y, side.toUpperCase());
        const svg = bodyViewSvg(side);
        svg.style.left = (FIG_X + (FIG_W - FIG_IMG_W) / 2) + 'pt';
        svg.style.top = (y + FIG_LABEL) + 'pt';
        sheet.appendChild(svg);
      });
    }
    host.appendChild(sheet);
  });
}

async function downloadNotesPdf() {
  const area = document.getElementById('docArea');
  const notes = (area && area.value || '').trim();
  const hasExamMap = typeof examMapHasData === 'function' && examMapHasData();
  const hasQuickExam = typeof quickExamHasData === 'function' && quickExamHasData();
  if (!notes && traumaPins.length === 0 && !hasExamMap && !hasQuickExam) {
    showToast('Nothing to export yet.');
    return;
  }
  if (typeof ensurePdfLibraries === 'function') {
    await ensurePdfLibraries();
  }
  if (typeof PDFLib === 'undefined') {
    showToast('PDF library not loaded.');
    return;
  }
  try {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const { W, H, M, LH, SIZE } = NOTE_PAGE;
    const unprintable = new Set();
    const clean = t => pdfSafeText(t, ch => unprintable.add(ch));
    const wrap = (text, f, size, maxW) => wrapText(clean(text), t => f.widthOfTextAtSize(t, size), maxW);

    let page, y;
    const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
    const need = h => { if (y - h < M) newPage(); };
    const heading = t => {
      need(30);
      page.drawText(clean(t), { x: M, y: y - 12, size: 12, font: bold, color: rgb(0.1, 0.2, 0.4) });
      y -= 16;
      page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: rgb(0.75, 0.78, 0.82) });
      y -= 8;
    };

    newPage();
    page.drawText('Clinical Documentation', { x: M, y: y - 16, size: 17, font: bold, color: rgb(0.05, 0.1, 0.2) });
    page.drawText(clean(new Date().toLocaleString()), { x: W - M - 150, y: y - 14, size: 9, font, color: rgb(0.4, 0.4, 0.45) });
    y -= 34;

    if (notes || hasQuickExam) {
      const { RULE_X, FIG_X, FIG_W, FIG_LABEL, FIG_IMG_W, FIG_IMG_H, FIG_ROW } = NOTE_PAGE;
      heading('Clinical Notes');
      const pages = layoutNotePages(clean(notes), hasQuickExam, t => font.widthOfTextAtSize(t, SIZE));
      for (let n = 0; n < pages.length; n++) {
        if (n) newPage();
        const top = y;
        pages[n].lines.forEach((l, k) => {
          if (l) page.drawText(l, { x: M, y: top - 10 - k * LH, size: SIZE, font, color: rgb(0.1, 0.1, 0.12) });
        });
        y -= pages[n].lines.length * LH + 8;
        if (!pages[n].figure) continue;
        page.drawLine({ start: { x: RULE_X, y: top }, end: { x: RULE_X, y: M }, thickness: 0.7, color: rgb(0.75, 0.78, 0.82) });
        for (const [v, side] of ['anterior', 'posterior'].entries()) {
          const figTop = top - v * FIG_ROW;
          const label = side.toUpperCase();
          page.drawText(label, { x: FIG_X + (FIG_W - bold.widthOfTextAtSize(label, 9)) / 2, y: figTop - 11, size: 9, font: bold, color: rgb(0.2, 0.25, 0.33) });
          const svg = bodyViewSvg(side);
          svg.setAttribute('width', FIG_IMG_W * 4);
          svg.setAttribute('height', FIG_IMG_H * 4);
          const png = await pdf.embedPng(await rasterizeSvg(svg, FIG_IMG_W * 4, FIG_IMG_H * 4));
          page.drawImage(png, { x: FIG_X + (FIG_W - FIG_IMG_W) / 2, y: figTop - FIG_LABEL - FIG_IMG_H, width: FIG_IMG_W, height: FIG_IMG_H });
        }
        // Later sections need the full width, so they start after the figure page
        if (n === pages.length - 1) y = M;
      }
    }

    if (traumaPins.length > 0) {
      const dataUrl = await captureTraumaDiagram();
      const png = await pdf.embedPng(dataUrl);
      const maxW = W - 2 * M, maxH = 360;
      const sc = Math.min(maxW / png.width, maxH / png.height);
      const iw = png.width * sc, ih = png.height * sc;
      need(ih + 40);
      if (y - ih - 40 < M) newPage();
      heading('Trauma Body Diagram');
      page.drawImage(png, { x: (W - iw) / 2, y: y - ih, width: iw, height: ih });
      y -= ih + 14;

      heading('Injury Legend');
      traumaPins.forEach((p, i) => {
        const text = `${p.label} - ${p.loc}` + (p.note ? `  |  Detail: ${p.note}` : '');
        const lines = wrap(text, font, 9.5, W - 2 * M - 30);
        need(lines.length * LH + 6);
        const cy = y - 8;
        page.drawCircle({ x: M + 8, y: cy, size: 7.5, color: rgb(0.85, 0.2, 0.2) });
        const num = String(i + 1);
        page.drawText(num, { x: M + 8 - bold.widthOfTextAtSize(num, 8) / 2, y: cy - 3, size: 8, font: bold, color: rgb(1, 1, 1) });
        lines.forEach((l, k) => {
          page.drawText(l, { x: M + 24, y: y - 10 - k * LH, size: 9.5, font: k === 0 ? bold : font, color: rgb(0.1, 0.1, 0.12) });
        });
        y -= lines.length * LH + 6;
      });
    }

    if (hasExamMap) {
      const regions = [], pins = [];
      EXAM_SYSTEM_KEYS.forEach(sys => {
        const cfg = EXAM_SYSTEMS[sys], data = examMap[sys];
        Object.keys(data.regions).forEach(k => {
          if (!examRegionHasData(data.regions[k])) return;
          const reg = examRegionByKey(sys, k);
          if (reg) regions.push({ pts: reg.pts, color: cfg.shade(reg), text: reg.abbr });
        });
        data.pins.forEach((p, i) => pins.push({ ix: p.ix, iy: p.iy, color: cfg.color, text: 'P' + (i + 1) }));
      });
      const dataUrl = await captureBodyDiagram({ regions, pins });
      const png = await pdf.embedPng(dataUrl);
      const maxW = W - 2 * M, maxH = 360;
      const sc = Math.min(maxW / png.width, maxH / png.height);
      const iw = png.width * sc, ih = png.height * sc;
      if (y - ih - 40 < M) newPage();
      heading('Systemic Examination Diagram');
      page.drawImage(png, { x: (W - iw) / 2, y: y - ih, width: iw, height: ih });
      y -= ih + 14;

      const hex = h => { const n = parseInt(h.slice(1), 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
      EXAM_SYSTEM_KEYS.forEach(sys => {
        const cfg = EXAM_SYSTEMS[sys];
        const lines = buildExamSystemLines(sys);
        if (!lines.length) return;
        need(22);
        page.drawRectangle({ x: M, y: y - 11, width: 9, height: 9, color: hex(cfg.color) });
        page.drawText(clean(cfg.title), { x: M + 14, y: y - 10, size: 10.5, font: bold, color: rgb(0.1, 0.1, 0.12) });
        y -= 16;
        lines.forEach(t => {
          const wl = wrap(t, font, 9.5, W - 2 * M - 24);
          need(wl.length * LH + 2);
          wl.forEach((l, k) => page.drawText(l, { x: M + 14, y: y - 10 - k * LH, size: 9.5, font, color: rgb(0.1, 0.1, 0.12) }));
          y -= wl.length * LH + 2;
        });
        y -= 6;
      });
    }

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ED_Note_${localDateStamp()}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
    if (unprintable.size) {
      showToast(`PDF downloaded, but these show as "?": ${[...unprintable].join(' ')}`, 7000);
    } else {
      showToast('PDF downloaded!');
    }
  } catch (err) {
    console.error(err);
    showToast('PDF export failed: ' + (err && err.message ? err.message : err));
  }
}

function undoTraumaPin() {
  if (traumaPins.length > 0) {
    traumaPins.pop();
    renderTraumaPins();
  }
}

function clearTraumaPins() {
  traumaPins = [];
  renderTraumaPins();
}

function renderTraumaPins() {
  const container = document.getElementById('traumaPinsContainer');
  const ledger = document.getElementById('traumaLedgerList');
  if (!container || !ledger) return;

  container.innerHTML = '';
  ledger.innerHTML = '';

  const countEl = document.getElementById('traumaPinCountLabel');
  if (countEl) countEl.textContent = `● ${traumaPins.length} Injuries Plotted`;

  if (traumaPins.length === 0) {
    ledger.innerHTML = '<div style="color:var(--muted); font-size:12px; font-style:italic; padding:10px 0; text-align:center;">No injuries plotted yet. Select an injury tool and click on the body diagram to place a marker.</div>';
    const hiddenInjuries = document.getElementById('traumaInjuries');
    if (hiddenInjuries) hiddenInjuries.value = '';
    return;
  }

  const injuriesSummary = [];
  const canvasEl = document.getElementById('traumaDiagramCanvas');
  const cRect = canvasEl.getBoundingClientRect();
  const box = getTraumaImageBox();

  traumaPins.forEach((p, idx) => {
    const pinEl = document.createElement('div');
    pinEl.className = 'injury-pin';
    if (box) {
      pinEl.style.left = (box.left - cRect.left - canvasEl.clientLeft + (p.ix / TRAUMA_IMG_W) * box.w) + 'px';
      pinEl.style.top = (box.top - cRect.top - canvasEl.clientTop + (p.iy / TRAUMA_IMG_H) * box.h) + 'px';
    }
    pinEl.style.background = p.color;
    pinEl.textContent = `${p.type}${idx + 1}`;
    pinEl.title = `${p.label} - ${p.region}`;
    container.appendChild(pinEl);

    const itemEl = document.createElement('div');
    itemEl.className = 'injury-item';
    itemEl.innerHTML = `
      <span style="display:flex; align-items:center; gap:6px;">
        <span style="width:16px; height:16px; border-radius:50%; background:${p.color}; color:#fff; font-size:9px; font-weight:bold; display:inline-flex; align-items:center; justify-content:center;">${p.type}${idx + 1}</span>
        <strong>${escapeExamHtml(p.label)}</strong> &mdash; ${escapeExamHtml(p.loc)}
      </span>
      <span style="color:var(--muted); font-size:10px;">${escapeExamHtml(p.region)}</span>
    `;
    itemEl.style.flexWrap = 'wrap';
    const noteEl = document.createElement('input');
    noteEl.type = 'text';
    noteEl.className = 'trauma-pin-note';
    noteEl.maxLength = 300;
    noteEl.placeholder = 'Add detail (size, depth, treatment...)';
    noteEl.value = p.note || '';
    noteEl.setAttribute('aria-label', `Extra detail for injury ${idx + 1}`);
    noteEl.style.cssText = 'flex:1 1 100%; margin-top:4px; padding:5px 8px; font-size:12px; border-radius:6px; border:1px solid var(--border, rgba(255,255,255,.15)); background:transparent; color:inherit;';
    noteEl.addEventListener('input', () => { p.note = noteEl.value; });
    noteEl.addEventListener('click', ev => ev.stopPropagation());
    itemEl.appendChild(noteEl);
    ledger.appendChild(itemEl);

    injuriesSummary.push(`[${p.type}${idx + 1}] ${p.label} (${p.region})`);
  });

  const hiddenInjuries = document.getElementById('traumaInjuries');
  if (hiddenInjuries) {
    hiddenInjuries.value = injuriesSummary.join(', ');
  }
}

(function () {
  const canvas = document.getElementById('traumaDiagramCanvas');
  if (canvas && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { if (traumaPins.length) renderTraumaPins(); }).observe(canvas);
  }
  window.addEventListener('resize', () => { if (traumaPins.length) renderTraumaPins(); });
})();

// ------- Age Formatting -------
function formatAgeParts(y, m, d, h) {
  const out = [];
  if (y) out.push(`${y}y`);
  if (m) out.push(`${m}m`);
  if (d) out.push(`${d}d`);
  if (h) out.push(`${h}h`);
  return out.join(' ');
}

function clamp(n, min, max) {
  if (n == null || isNaN(n)) return null;
  if (max != null) n = Math.min(n, max);
  if (min != null) n = Math.max(n, min);
  return n;
}

function updateAge() {
  const y = clamp(parseInt(document.getElementById('ageYears')?.value, 10), 0);
  const m = clamp(parseInt(document.getElementById('ageMonths')?.value, 10), 0, 11);
  const d = clamp(parseInt(document.getElementById('ageDays')?.value, 10), 0, 31);
  const h = clamp(parseInt(document.getElementById('ageHours')?.value, 10), 0, 23);
  const ageStr = formatAgeParts(y, m, d, h);
  const out = document.getElementById('patientAge');
  if (out) out.value = ageStr || '';
}

// The demographic fields are drawn from the templates after this script runs, so listen on the document.
const AGE_FIELD_IDS = ['ageYears', 'ageMonths', 'ageDays', 'ageHours'];
document.addEventListener('input', e => {
  if (!AGE_FIELD_IDS.includes(e.target.id)) return;
  // Typing an age by hand makes it the user's own, so a later IC change leaves it alone
  AGE_FIELD_IDS.forEach(k => { const f = document.getElementById(k); if (f) delete f.dataset.fromIc; });
  updateAge();
});
document.addEventListener('change', e => {
  if (AGE_FIELD_IDS.includes(e.target.id)) updateAge();
});

// ------- Automatic Age Calculation from Malaysian IC -------
// Date of birth from a Malaysian IC (YYMMDD...). Passports and impossible dates give null.
// Every form that needs a date of birth uses this, so they all agree with the calculated age.
function dobFromIC(icString) {
  if (!icString) return null;
  // Passports typically start with or contain letters - do not auto-calculate for passports
  if (/[a-zA-Z]/.test(icString)) return null;

  // Extract numeric digits
  const clean = String(icString).replace(/\D/g, '');
  // Malaysian IC requires at least first 6 digits (YYMMDD)
  if (clean.length < 6) return null;

  const yy = parseInt(clean.slice(0, 2), 10);
  const mm = parseInt(clean.slice(2, 4), 10);
  const dd = parseInt(clean.slice(4, 6), 10);

  if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const now = new Date();
  const cur2Digit = now.getFullYear() % 100;

  // Determine century: if yy <= current 2-digit year (e.g. 26 in 2026), default to 2000s, else 1900s
  let birthYear = (yy <= cur2Digit) ? (2000 + yy) : (1900 + yy);
  let dob = new Date(birthYear, mm - 1, dd);

  // If calculated dob is in the future (e.g., later month in current year), shift to 1900s
  if (dob > now) {
    birthYear -= 100;
    dob = new Date(birthYear, mm - 1, dd);
  }

  // Verify date validity (guards against rollover like Feb 31 -> March)
  if (dob.getMonth() !== mm - 1 || dob.getDate() !== dd) return null;
  return dob;
}

function calculateAgeFromIC(icString) {
  const dob = dobFromIC(icString);
  if (!dob) return null;
  const clean = String(icString).replace(/\D/g, '');
  const now = new Date();

  // Exact age calculation
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  let days = now.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0 || years > 125) return null;

  // Gender detection from 12th digit (Odd = Male, Even = Female)
  let gender = null;
  if (clean.length >= 12) {
    const lastDigit = parseInt(clean.slice(11, 12), 10);
    if (!isNaN(lastDigit)) {
      gender = (lastDigit % 2 !== 0) ? 'Male' : 'Female';
    }
  }

  return { years, months, days, gender };
}

function handleICInput() {
  const icInput = document.getElementById('patientID');
  if (!icInput) return;
  const res = calculateAgeFromIC(icInput.value);
  const ageFields = AGE_FIELD_IDS.map(id => document.getElementById(id)).filter(Boolean);
  if (res) {
    document.getElementById('ageYears').value = res.years;
    document.getElementById('ageMonths').value = res.months;
    document.getElementById('ageDays').value = res.days;
    document.getElementById('ageHours').value = '';
    ageFields.forEach(f => { f.dataset.fromIc = 'true'; });
    updateAge();
  } else if (ageFields.some(f => f.dataset.fromIc === 'true')) {
    // No usable IC any more (e.g. replaced by a passport): the age it filled in belonged to that IC
    ageFields.forEach(f => { f.value = ''; delete f.dataset.fromIc; });
    updateAge();
  }

  // Fill gender from the IC, and keep following the IC if it changes.
  // A gender the user picked by hand is left alone.
  const genderSelect = document.getElementById('patientGender');
  const icGender = res && res.gender;
  if (genderSelect && icGender && (!genderSelect.value || genderSelect.dataset.fromIc === 'true')) {
    genderSelect.value = icGender;
    genderSelect.dataset.fromIc = 'true';
    genderSelect.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (genderSelect && !icGender && genderSelect.dataset.fromIc === 'true') {
    genderSelect.value = '';
    delete genderSelect.dataset.fromIc;
    genderSelect.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

['input', 'change'].forEach(type => {
  document.addEventListener(type, e => {
    if (e.target.id === 'patientID') handleICInput();
  });
});

document.addEventListener('change', e => {
  if (e.target.id === 'patientGender') delete e.target.dataset.fromIc;
});

function renderSliderField(container, field) {
  const slider = field.slider;
  const isDual = slider.type === 'dual';
  const isReversed = slider.reversed !== false;
  const step = slider.step || 1;
  const isFloat = step < 1 || (step % 1 !== 0);
  const midRaw = (slider.max + slider.min) / 2;
  const midVal = isFloat ? midRaw.toFixed(1) : Math.round(midRaw);

  const labelRow = document.createElement('div');
  labelRow.className = 'vital-slider-label-row';

  const lbl = document.createElement('label');
  lbl.htmlFor = field.id;
  lbl.textContent = field.label;

  const readout = document.createElement('span');
  readout.className = 'vital-slider-readout';
  readout.id = `${field.id}_readout`;
  readout.textContent = '—';

  labelRow.appendChild(lbl);
  labelRow.appendChild(readout);
  container.appendChild(labelRow);

  const widget = document.createElement('div');
  widget.className = 'vital-slider-widget';
  widget.id = `${field.id}_slider_widget`;

  const trackWrap = document.createElement('div');
  trackWrap.className = 'vital-slider-track-wrap';
  trackWrap.id = `${field.id}_track_wrap`;

  const track = document.createElement('div');
  track.className = 'vital-slider-track';
  track.id = `${field.id}_track`;

  const fill = document.createElement('div');
  fill.className = 'vital-slider-fill';
  fill.id = `${field.id}_fill`;
  track.appendChild(fill);

  if (isDual) {
    const thumbSys = document.createElement('div');
    thumbSys.className = 'vital-slider-thumb thumb-sys';
    thumbSys.id = `${field.id}_thumb_sys`;
    thumbSys.setAttribute('role', 'slider');
    thumbSys.setAttribute('tabindex', '0');
    thumbSys.setAttribute('aria-label', `${field.label} Systolic (Upper limit)`);
    thumbSys.setAttribute('aria-valuemin', slider.min);
    thumbSys.setAttribute('aria-valuemax', slider.max);
    thumbSys.innerHTML = '<span class="vital-thumb-tag">S</span>';
    track.appendChild(thumbSys);

    const thumbDia = document.createElement('div');
    thumbDia.className = 'vital-slider-thumb thumb-dia';
    thumbDia.id = `${field.id}_thumb_dia`;
    thumbDia.setAttribute('role', 'slider');
    thumbDia.setAttribute('tabindex', '0');
    thumbDia.setAttribute('aria-label', `${field.label} Diastolic (Lower limit)`);
    thumbDia.setAttribute('aria-valuemin', slider.min);
    thumbDia.setAttribute('aria-valuemax', slider.max);
    thumbDia.innerHTML = '<span class="vital-thumb-tag">D</span>';
    track.appendChild(thumbDia);
  } else {
    const thumb = document.createElement('div');
    thumb.className = 'vital-slider-thumb thumb-single';
    thumb.id = `${field.id}_thumb`;
    thumb.setAttribute('role', 'slider');
    thumb.setAttribute('tabindex', '0');
    thumb.setAttribute('aria-label', field.label);
    thumb.setAttribute('aria-valuemin', slider.min);
    thumb.setAttribute('aria-valuemax', slider.max);
    thumb.innerHTML = '<span class="vital-thumb-tag">●</span>';
    track.appendChild(thumb);
  }

  trackWrap.appendChild(track);
  widget.appendChild(trackWrap);

  const scale = document.createElement('div');
  scale.className = 'vital-slider-scale';
  const leftLabel = isReversed ? slider.max : slider.min;
  const rightLabel = isReversed ? slider.min : slider.max;
  scale.innerHTML = `
    <span class="scale-max">${isFloat ? Number(leftLabel).toFixed(1) : leftLabel}</span>
    <span class="scale-mid">${midVal}</span>
    <span class="scale-min">${isFloat ? Number(rightLabel).toFixed(1) : rightLabel}</span>
  `;
  widget.appendChild(scale);
  container.appendChild(widget);

  const input = document.createElement('input');
  input.autocomplete = 'off';
  input.autocorrect = 'off';
  input.spellcheck = false;
  input.type = 'text';
  input.id = field.id;
  input.placeholder = field.placeholder || '';
  container.appendChild(input);

  initVitalSlider(field, input, container);
}

function initVitalSlider(field, input, container) {
  const sliderConf = field.slider;
  if (!sliderConf) return;

  const isDual = sliderConf.type === 'dual';
  const isReversed = sliderConf.reversed !== false;
  const step = sliderConf.step || 1;
  const isFloat = step < 1 || (step % 1 !== 0);
  const minVal = sliderConf.min;
  const maxVal = sliderConf.max;
  const span = maxVal - minVal;
  const unit = sliderConf.unit ? (sliderConf.unit === '%' ? '%' : ' ' + sliderConf.unit) : '';

  const readoutEl = container.querySelector(`#${field.id}_readout`) || container.querySelector('#traumaBpReadout') || container.querySelector('.vital-slider-readout');
  const trackWrap = container.querySelector(`#${field.id}_track_wrap`) || container.querySelector('.vital-slider-track-wrap');
  const trackEl = container.querySelector(`#${field.id}_track`) || container.querySelector('.vital-slider-track');
  const fillEl = container.querySelector(`#${field.id}_fill`) || container.querySelector('.vital-slider-fill');

  const thumbSys = isDual ? (container.querySelector(`#${field.id}_thumb_sys`) || container.querySelector('.thumb-sys')) : null;
  const thumbDia = isDual ? (container.querySelector(`#${field.id}_thumb_dia`) || container.querySelector('.thumb-dia')) : null;
  const thumbSingle = !isDual ? (container.querySelector(`#${field.id}_thumb`) || container.querySelector('.thumb-single')) : null;

  let isSet = false;
  let currentSys = sliderConf.defaultSys || 120;
  let currentDia = sliderConf.defaultDia || 80;
  let currentVal = sliderConf.defaultVal !== undefined ? sliderConf.defaultVal : (isDual ? 120 : 80);

  function formatVal(v) {
    return isFloat ? v.toFixed(1) : String(Math.round(v));
  }

  function valToPercent(v) {
    const clamped = Math.max(minVal, Math.min(maxVal, v));
    if (isReversed) {
      return ((maxVal - clamped) / span) * 100;
    } else {
      return ((clamped - minVal) / span) * 100;
    }
  }

  function xToVal(clientX) {
    const rect = trackEl.getBoundingClientRect();
    if (rect.width <= 0) return isDual ? currentSys : currentVal;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let rawVal;
    if (isReversed) {
      rawVal = maxVal - ratio * span;
    } else {
      rawVal = minVal + ratio * span;
    }
    let snapped = Math.round((rawVal - minVal) / step) * step + minVal;
    snapped = Math.max(minVal, Math.min(maxVal, snapped));
    return isFloat ? parseFloat(snapped.toFixed(1)) : Math.round(snapped);
  }

  function updateUI() {
    // Until a value is entered the thumb only marks where dragging starts, so it is drawn hollow.
    const widgetEl = trackEl && trackEl.closest('.vital-slider-widget');
    if (widgetEl) widgetEl.classList.toggle('is-unset', !isSet);
    if (isDual) {
      const sysPercent = valToPercent(currentSys);
      const diaPercent = valToPercent(currentDia);

      thumbSys.style.left = `${sysPercent}%`;
      thumbDia.style.left = `${diaPercent}%`;

      const fillLeft = Math.min(sysPercent, diaPercent);
      const fillWidth = Math.abs(diaPercent - sysPercent);
      fillEl.style.left = `${fillLeft}%`;
      fillEl.style.width = `${fillWidth}%`;

      thumbSys.setAttribute('aria-valuenow', currentSys);
      thumbDia.setAttribute('aria-valuenow', currentDia);

      if (isSet) {
        readoutEl.textContent = `${formatVal(currentSys)}/${formatVal(currentDia)}${unit}`;
        readoutEl.classList.add('is-active');
        fillEl.classList.add('is-active');
      } else {
        readoutEl.textContent = field.cleanSlateText || '—';
        readoutEl.classList.remove('is-active');
        fillEl.classList.remove('is-active');
      }
    } else {
      const valPercent = valToPercent(currentVal);
      thumbSingle.style.left = `${valPercent}%`;

      if (isReversed) {
        fillEl.style.left = `${valPercent}%`;
        fillEl.style.width = `${100 - valPercent}%`;
      } else {
        fillEl.style.left = `0%`;
        fillEl.style.width = `${valPercent}%`;
      }

      thumbSingle.setAttribute('aria-valuenow', currentVal);

      if (isSet) {
        readoutEl.textContent = `${formatVal(currentVal)}${unit}`;
        readoutEl.classList.add('is-active');
        fillEl.classList.add('is-active');
      } else {
        readoutEl.textContent = field.cleanSlateText || '—';
        readoutEl.classList.remove('is-active');
        fillEl.classList.remove('is-active');
      }
    }
  }

  function syncToInput() {
    isSet = true;
    if (isDual) {
      input.value = `${formatVal(currentSys)}/${formatVal(currentDia)}`;
    } else {
      if (sliderConf.unit === '%') {
        input.value = `${formatVal(currentVal)}%`;
      } else {
        input.value = `${formatVal(currentVal)}`;
      }
    }
    updateUI();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  let activeDragThumb = null;

  function onPointerDown(e) {
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    const clientX = e.clientX;
    const v = xToVal(clientX);

    if (isDual) {
      if (e.target.closest(`#${field.id}_thumb_sys`)) {
        activeDragThumb = 'sys';
      } else if (e.target.closest(`#${field.id}_thumb_dia`)) {
        activeDragThumb = 'dia';
      } else {
        if (v >= currentSys) activeDragThumb = 'sys';
        else if (v <= currentDia) activeDragThumb = 'dia';
        else activeDragThumb = (Math.abs(v - currentSys) <= Math.abs(v - currentDia)) ? 'sys' : 'dia';
      }

      if (activeDragThumb === 'sys') {
        currentSys = Math.max(currentDia, Math.min(maxVal, v));
        thumbSys.classList.add('is-dragging');
      } else {
        currentDia = Math.max(minVal, Math.min(currentSys, v));
        thumbDia.classList.add('is-dragging');
      }
    } else {
      activeDragThumb = 'single';
      currentVal = Math.max(minVal, Math.min(maxVal, v));
      thumbSingle.classList.add('is-dragging');
    }

    try { trackWrap.setPointerCapture(e.pointerId); } catch (_) {}
    syncToInput();
  }

  function onPointerMove(e) {
    if (!activeDragThumb) return;
    const v = xToVal(e.clientX);

    if (isDual) {
      if (activeDragThumb === 'sys') {
        currentSys = Math.max(currentDia, Math.min(maxVal, v));
      } else if (activeDragThumb === 'dia') {
        currentDia = Math.max(minVal, Math.min(currentSys, v));
      }
    } else {
      currentVal = Math.max(minVal, Math.min(maxVal, v));
    }

    syncToInput();
  }

  function onPointerUp(e) {
    if (!activeDragThumb) return;
    try { trackWrap.releasePointerCapture(e.pointerId); } catch (_) {}
    if (isDual) {
      thumbSys.classList.remove('is-dragging');
      thumbDia.classList.remove('is-dragging');
    } else {
      thumbSingle.classList.remove('is-dragging');
    }
    activeDragThumb = null;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  trackWrap.addEventListener('pointerdown', onPointerDown);
  trackWrap.addEventListener('pointermove', onPointerMove);
  trackWrap.addEventListener('pointerup', onPointerUp);
  trackWrap.addEventListener('pointercancel', onPointerUp);

  function handleKey(e, targetType) {
    let keyStep = e.shiftKey ? (step * 5) : step;
    let delta = 0;
    if (isReversed) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') delta = keyStep;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') delta = -keyStep;
    } else {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = keyStep;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -keyStep;
    }
    if (e.key === 'PageUp') delta = keyStep * 10;
    else if (e.key === 'PageDown') delta = -keyStep * 10;
    else if (e.key === 'Home') delta = (isReversed ? 1000 : -1000);
    else if (e.key === 'End') delta = (isReversed ? -1000 : 1000);
    else if (!delta) return;

    e.preventDefault();
    if (isDual) {
      if (targetType === 'sys') {
        currentSys = Math.max(currentDia, Math.min(maxVal, currentSys + delta));
        if (isFloat) currentSys = parseFloat(currentSys.toFixed(1));
      } else {
        currentDia = Math.max(minVal, Math.min(currentSys, currentDia + delta));
        if (isFloat) currentDia = parseFloat(currentDia.toFixed(1));
      }
    } else {
      currentVal = Math.max(minVal, Math.min(maxVal, currentVal + delta));
      if (isFloat) currentVal = parseFloat(currentVal.toFixed(1));
    }
    syncToInput();
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (isDual) {
    thumbSys.addEventListener('keydown', (e) => handleKey(e, 'sys'));
    thumbDia.addEventListener('keydown', (e) => handleKey(e, 'dia'));
  } else {
    thumbSingle.addEventListener('keydown', (e) => handleKey(e, 'single'));
  }

  input.addEventListener('input', () => {
    const raw = input.value.trim();
    if (!raw) {
      isSet = false;
      updateUI();
      return;
    }

    if (isDual) {
      const parts = raw.split(/[\/\-,\s]+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
      if (parts.length >= 2) {
        const s = Math.max(minVal, Math.min(maxVal, parts[0]));
        const d = Math.max(minVal, Math.min(maxVal, parts[1]));
        if (s >= d) {
          currentSys = isFloat ? parseFloat(s.toFixed(1)) : Math.round(s);
          currentDia = isFloat ? parseFloat(d.toFixed(1)) : Math.round(d);
          isSet = true;
          updateUI();
        }
      } else if (parts.length === 1) {
        const s = Math.max(minVal, Math.min(maxVal, parts[0]));
        if (s >= currentDia) {
          currentSys = isFloat ? parseFloat(s.toFixed(1)) : Math.round(s);
          isSet = true;
          updateUI();
        }
      }
    } else {
      const numMatch = raw.match(/[-+]?[0-9]*\.?[0-9]+/);
      if (numMatch) {
        const n = parseFloat(numMatch[0]);
        if (!isNaN(n)) {
          currentVal = Math.max(minVal, Math.min(maxVal, n));
          if (isFloat) currentVal = parseFloat(currentVal.toFixed(1));
          else currentVal = Math.round(currentVal);
          isSet = true;
          updateUI();
        }
      }
    }
  });

  input._resetSlider = function() {
    isSet = false;
    currentSys = sliderConf.defaultSys || 120;
    currentDia = sliderConf.defaultDia || 80;
    currentVal = sliderConf.defaultVal !== undefined ? sliderConf.defaultVal : (isDual ? 120 : 80);
    updateUI();
  };

  if (input.value && input.value.trim()) {
    input.dispatchEvent(new Event('input', { bubbles: false }));
  } else {
    updateUI();
  }
}

function renderGCSField(container, field) {
  const labelRow = document.createElement('div');
  labelRow.className = 'vital-slider-label-row';

  const lbl = document.createElement('label');
  lbl.htmlFor = field.id;
  lbl.textContent = field.label;

  const readout = document.createElement('span');
  readout.className = 'vital-slider-readout';
  readout.id = `${field.id}_readout`;
  readout.textContent = '—';

  labelRow.appendChild(lbl);
  labelRow.appendChild(readout);
  container.appendChild(labelRow);

  const widget = document.createElement('div');
  widget.className = 'vital-gcs-widget';
  widget.id = `${field.id}_widget`;

  const gcsComponents = [
    {
      key: 'E',
      label: 'E',
      aria: 'Eye opening',
      count: 4,
      titles: [
        '1 - No eye opening',
        '2 - To pain / pressure',
        '3 - To sound / speech',
        '4 - Spontaneous'
      ]
    },
    {
      key: 'V',
      label: 'V',
      aria: 'Verbal response',
      count: 5,
      titles: [
        '1 - None',
        '2 - Incomprehensible sounds',
        '3 - Inappropriate words',
        '4 - Confused',
        '5 - Oriented'
      ]
    },
    {
      key: 'M',
      label: 'M',
      aria: 'Motor response',
      count: 6,
      titles: [
        '1 - None',
        '2 - Extension to pain (decerebrate)',
        '3 - Abnormal flexion to pain (decorticate)',
        '4 - Normal flexion / withdrawal',
        '5 - Localizes to pain',
        '6 - Obeys commands'
      ]
    }
  ];

  gcsComponents.forEach(comp => {
    const row = document.createElement('div');
    row.className = 'gcs-row';
    row.dataset.component = comp.key;

    const badge = document.createElement('div');
    badge.className = 'gcs-cat-badge';
    badge.textContent = comp.label;
    row.appendChild(badge);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'gcs-btn-group';
    btnGroup.setAttribute('role', 'group');
    btnGroup.setAttribute('aria-label', `GCS ${comp.aria} (${comp.key})`);

    for (let num = 1; num <= comp.count; num++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gcs-btn';
      btn.dataset.val = String(num);
      btn.dataset.component = comp.key;
      btn.title = comp.titles[num - 1] || `${comp.key}${num}`;
      btn.textContent = String(num);
      btnGroup.appendChild(btn);
    }

    row.appendChild(btnGroup);
    widget.appendChild(row);
  });

  container.appendChild(widget);

  const input = document.createElement('input');
  input.autocomplete = 'off';
  input.autocorrect = 'off';
  input.spellcheck = false;
  input.type = 'text';
  input.id = field.id;
  input.placeholder = field.placeholder || 'e.g., E4V5M6';
  container.appendChild(input);

  initGCSWidget(field, input, container, widget, readout);
}

function initGCSWidget(field, input, container, widget, readout) {
  if (!input || !widget || !readout) return;

  const selected = { E: null, V: null, M: null };

  function updateReadoutAndInput(fromUserTyping = false) {
    const hasAny = selected.E !== null || selected.V !== null || selected.M !== null;

    if (!fromUserTyping) {
      if (hasAny) {
        let val = '';
        if (selected.E !== null) val += 'E' + selected.E;
        if (selected.V !== null) val += 'V' + selected.V;
        if (selected.M !== null) val += 'M' + selected.M;
        input.value = val;
      } else {
        input.value = '';
      }
    }

    // Highlight active buttons
    ['E', 'V', 'M'].forEach(compKey => {
      const curVal = selected[compKey];
      widget.querySelectorAll(`.gcs-btn[data-component="${compKey}"]`).forEach(btn => {
        const btnVal = parseInt(btn.dataset.val, 10);
        btn.classList.toggle('active', btnVal === curVal);
      });
    });

    // Update readout badge
    if (hasAny) {
      const total = (selected.E || 0) + (selected.V || 0) + (selected.M || 0);
      let code = '';
      if (selected.E !== null) code += 'E' + selected.E;
      if (selected.V !== null) code += 'V' + selected.V;
      if (selected.M !== null) code += 'M' + selected.M;
      readout.textContent = `${code} (${total}/15)`;
      readout.classList.add('is-active');
    } else if (input.value.trim()) {
      readout.textContent = input.value.trim();
      readout.classList.add('is-active');
    } else {
      readout.textContent = '—';
      readout.classList.remove('is-active');
    }
  }

  // Button click handler
  widget.addEventListener('click', (e) => {
    const btn = e.target.closest('.gcs-btn');
    if (!btn) return;
    const comp = btn.dataset.component;
    const val = parseInt(btn.dataset.val, 10);
    if (!comp || isNaN(val)) return;

    if (selected[comp] === val) {
      selected[comp] = null; // Toggle off
    } else {
      selected[comp] = val; // Select
    }

    updateReadoutAndInput(false);
    // Tell listeners the value changed, as typing would (the trauma GCS follows this field).
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Two-way sync: user typing in text input
  function syncFromInput() {
    const text = input.value.trim();
    const mE = text.match(/E([1-4])/i);
    const mV = text.match(/V([1-5])/i);
    const mM = text.match(/M([1-6])/i);

    selected.E = mE ? parseInt(mE[1], 10) : null;
    selected.V = mV ? parseInt(mV[1], 10) : null;
    selected.M = mM ? parseInt(mM[1], 10) : null;

    updateReadoutAndInput(true);
  }

  input.addEventListener('input', syncFromInput);
  input.addEventListener('change', syncFromInput);

  // Reset handler for clearSection()
  input._resetGCS = function() {
    selected.E = null;
    selected.V = null;
    selected.M = null;
    widget.querySelectorAll('.gcs-btn').forEach(b => b.classList.remove('active'));
    readout.textContent = '—';
    readout.classList.remove('is-active');
  };

  // Initial sync if input already has a prefilled value
  if (input.value) {
    syncFromInput();
  }
}

// The age boxes fill the calculated age; only the calculated age goes into the note.
function renderAgeField(container, field) {
  const heading = document.createElement('label');
  heading.textContent = 'Age';
  const hint = document.createElement('span');
  hint.className = 'label-hint';
  hint.textContent = 'auto-filled from IC';
  heading.appendChild(hint);
  const grid = document.createElement('div');
  grid.className = 'grid-4';
  grid.id = 'ageFields';
  [['ageYears', 'Years'], ['ageMonths', 'Months', 11], ['ageDays', 'Days', 31], ['ageHours', 'Hours', 23]].forEach(([id, text, max]) => {
    const cell = document.createElement('div');
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = text;
    const input = document.createElement('input');
    input.type = 'number';
    input.id = id;
    input.min = '0';
    if (max) input.max = String(max);
    input.step = '1';
    input.placeholder = '0';
    input.autocomplete = 'off';
    input.dataset.skipExport = 'true';
    cell.append(label, input);
    grid.appendChild(cell);
  });

  const label = document.createElement('label');
  label.htmlFor = field.id;
  label.textContent = field.label;
  const output = document.createElement('input');
  output.type = 'text';
  output.id = field.id;
  output.placeholder = field.placeholder || '';
  output.readOnly = true;
  output.autocomplete = 'off';
  output.spellcheck = false;
  container.append(heading, grid, label, output);
}

function renderPlainField(container, field) {
  const label = document.createElement('label');
  label.htmlFor = field.id;
  label.textContent = field.label;
  container.appendChild(label);

  if (field.chips && field.chips.length) {
    const chipWrap = document.createElement('div');
    chipWrap.className = 'chip-container';
    chipWrap.dataset.target = field.id;
    if (field.multi) chipWrap.dataset.multi = 'true';
    // A pick-several text box: one button per row, each written as its own numbered line.
    if (field.multi && field.long) chipWrap.classList.add('chip-lines');
    field.chips.forEach(chip => {
      const chipBtn = document.createElement('button');
      chipBtn.type = 'button';
      chipBtn.className = 'chip-btn';
      chipBtn.dataset.target = field.id;
      chipBtn.dataset.output = chipOutput(chip);
      chipBtn.textContent = chipLabel(chip);
      chipBtn.onclick = function() {
        if (field.multi) toggleMultiChip(this, field.id);
        else toggleSingleChip(this, field.id);
      };
      chipWrap.appendChild(chipBtn);
    });
    container.appendChild(chipWrap);
  }

  const input = document.createElement(field.long ? 'textarea' : 'input');
  input.autocomplete = 'off';
  input.autocorrect = 'off';
  input.spellcheck = false;
  if (field.long) input.rows = 3;
  else input.type = 'text';
  input.id = field.id;
  input.placeholder = field.placeholder || '';
  container.appendChild(input);
}

// The GCS as the note writes it: "13/15 (E3V4M6)" once all three parts are chosen.
function gcsText(code) {
  const text = String(code || '').trim();
  const part = (letter, max) => { const m = text.match(new RegExp(`${letter}([1-${max}])`, 'i')); return m ? +m[1] : null; };
  const [e, v, m] = [part('E', 4), part('V', 5), part('M', 6)];
  const tag = `E${e ?? '_'}V${v ?? '_'}M${m ?? '_'}`;
  if ([e, v, m].every(x => x !== null)) return `${e + v + m}/15 (${tag})`;
  if ([e, v, m].some(x => x !== null)) return `${tag} (incomplete)`;
  return text;
}

function renderTemplateField(container, field) {
  if (field.slider) renderSliderField(container, field);
  else if (field.customInput === 'gcs-evm') {
    // Wrapped, with a marker for its home, so the exam formats can move it as one piece.
    const home = document.createElement('span');
    home.id = `${field.id}Home`;
    home.hidden = true;
    const wrap = document.createElement('div');
    wrap.id = `${field.id}Field`;
    wrap.className = 'gcs-field';
    renderGCSField(wrap, field);
    container.append(home, wrap);
  }
  else if (field.customInput === 'age-builder') renderAgeField(container, field);
  else if (field.customInput === 'bind-score' && typeof renderBindField === 'function') renderBindField(container, field);
  else if (field.customInput === 'nnj-age' && typeof renderNnjAgeField === 'function') renderNnjAgeField(container, field);
  else if (field.customInput === 'nnj-ga' && typeof renderNnjGaField === 'function') renderNnjGaField(container, field);
  else if (field.customInput === 'nnj-neuro' && typeof renderNnjNeuroField === 'function') renderNnjNeuroField(container, field);
  else if (field.customInput === 'nnj-thresholds' && typeof renderNnjThresholdsField === 'function') renderNnjThresholdsField(container, field);
  else if (field.customInput === 'nnj-calc' && typeof renderNnjCalcField === 'function') renderNnjCalcField(container, field);
  else renderPlainField(container, field);
}

function renderSubmenuFields(contentDiv, fields) {
  let i = 0;
  while (i < fields.length) {
    const field = fields[i];

    if (field.sectionHeader) {
      const h4 = document.createElement('h4');
      h4.style.cssText = 'margin:12px 0 4px; border-bottom:1px solid var(--border); padding-bottom:4px;';
      h4.textContent = field.sectionHeader;
      contentDiv.appendChild(h4);
    }

    if (field.grid) {
      const gridClass = field.grid;
      const gridDiv = document.createElement('div');
      gridDiv.className = gridClass;

      while (i < fields.length && fields[i].grid === gridClass) {
        if (fields[i].sectionHeader && fields[i] !== field) break;
        const cell = document.createElement('div');
        renderTemplateField(cell, fields[i]);
        gridDiv.appendChild(cell);
        i++;
      }
      contentDiv.appendChild(gridDiv);
    } else {
      renderTemplateField(contentDiv, field);
      i++;
    }
  }
}

function templateButtonRow(submenu) {
  const btnRow = document.createElement('div');
  btnRow.className = 'button-row';
  const insert = document.createElement('button');
  insert.type = 'button';
  insert.dataset.onClick = 'insertTemplateSection';
  insert.dataset.args = JSON.stringify([submenu.id]);
  insert.textContent = submenu.insertLabel || 'Insert';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'clear-btn';
  clear.dataset.onClick = 'clearSection';
  clear.dataset.args = JSON.stringify([submenu.id]);
  clear.textContent = submenu.clearLabel || 'Clear';
  btnRow.append(insert, clear);
  return btnRow;
}

// Exclusive accordion for dynamically rendered sub-tab containers
// (HOPI, Routine, Examination): opening one sub-tab collapses its siblings
function bindExclusiveAccordion(container) {
  if (!container || container.dataset.exclusiveBound === 'true') return;
  container.dataset.exclusiveBound = 'true';
  container.addEventListener('click', e => {
    const btn = e.target.closest('.collapsible');
    if (!btn || !container.contains(btn)) return;
    const target = btn.nextElementSibling;
    const wasOpen = target.classList.contains('expanded');
    container.querySelectorAll('.content').forEach(c => c.classList.remove('expanded'));
    container.querySelectorAll('.collapsible').forEach(b => b.classList.remove('active'));
    if (!wasOpen) {
      btn.classList.add('active');
      target.classList.add('expanded');
    }
  });
}

function renderClinicalTemplates() {
  if (!window.CLINICAL_TEMPLATES || !Array.isArray(window.CLINICAL_TEMPLATES)) return;

  window.CLINICAL_TEMPLATES.forEach(category => {
    if (category.containerId === 'trauma-container') return;
    const container = document.getElementById(category.containerId);
    if (!container) return;

    // Keep the static exam map card alive across re-renders
    const keepCard = container.querySelector('#examMapCard');
    if (keepCard) container.parentNode.insertBefore(keepCard, container.nextSibling);
    container.innerHTML = '';

    category.submenus.forEach(submenu => {
      if (category.noAccordion) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content expanded';
        contentDiv.id = submenu.id;
        contentDiv.style.display = 'block';

        renderSubmenuFields(contentDiv, submenu.fields);
        contentDiv.appendChild(templateButtonRow(submenu));
        container.appendChild(contentDiv);
      } else {
        const secDiv = document.createElement('div');
        secDiv.className = 'section';

        const collBtn = document.createElement('button');
        collBtn.type = 'button';
        collBtn.className = 'collapsible';
        collBtn.textContent = submenu.title;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        contentDiv.id = submenu.id;

        renderSubmenuFields(contentDiv, submenu.fields);
        contentDiv.appendChild(templateButtonRow(submenu));

        secDiv.appendChild(collBtn);
        secDiv.appendChild(contentDiv);
        container.appendChild(secDiv);
      }
    });

    bindExclusiveAccordion(container);

    // Physical Examination: place the systemic exam map between General and Neurological
    if (category.containerId === 'exam-sections-container') {
      const mapCard = document.getElementById('examMapCard');
      const neuroContent = container.querySelector('#exam-neuro-section');
      if (mapCard) {
        const neuroSection = neuroContent ? neuroContent.closest('.section') : null;
        if (neuroSection) container.insertBefore(mapCard, neuroSection);
        else container.appendChild(mapCard);
      }
    }
  });
}

function findTemplateSubmenu(sectionId) {
  if (!window.CLINICAL_TEMPLATES) return null;
  for (const cat of window.CLINICAL_TEMPLATES) {
    const found = cat.submenus.find(s => s.id === sectionId);
    if (found) return { category: cat, submenu: found };
  }
  return null;
}

function collectTemplateParts(targetSubmenu) {
  return formatSubmenuParts(targetSubmenu, f => {
    const el = document.getElementById(f.id);
    const value = cleanText(el ? el.value : '');
    return f.customInput === 'gcs-evm' ? gcsText(value) : value;
  });
}

function insertTemplateSection(sectionId) {
  const match = findTemplateSubmenu(sectionId);
  if (!match) return;
  // The symptoms share one History of Presenting Illness section, in key-in order.
  if (match.category.containerId === SCHEMA_HOPI_CONTAINER) {
    insertAllHopiSections();
    return;
  }
  const title = submenuNoteHeader(match.category, match.submenu);
  const parts = collectTemplateParts(match.submenu);
  if (!parts.length) { showToast('Nothing entered in this section yet'); return; }

  // Demographics head every format, so they are written whatever the case is.
  if (sectionId === 'demographic-section') {
    const result = writeDemographicsSection();
    showToast(`${title} ${result === 'updated' ? 'updated in' : 'added to'} the note`);
    return;
  }
  // Impression and Plan closes every format, so it is written for trauma too.
  if (sectionId === IMPRESSION_SECTION) {
    const format = currentNoteFormat();
    if (format === 'clash') { warnFormatClash(); return; }
    writeDemographicsSection();
    const result = appendSection(title, parts);
    showToast(`${title} ${result === 'updated' ? 'updated in' : 'added to'} the note`);
    return;
  }
  // In a trauma case, vitals and history are written inside the surveys.
  if (currentNoteFormat() === 'trauma' && (sectionId === 'history-section' || sectionId === 'vital-signs-section')) {
    writeTraumaDocument();
    showToast('Trauma case: written into the Primary and Secondary Survey');
    return;
  }
  if (!medicalNoteGuard()) return;
  const result = appendSection(title, parts);
  showToast(`${title} ${result === 'updated' ? 'updated in' : 'added to'} the note`);
}

// Insert All / Clear All for HOPI sub-tabs (sections-container)
const hopiKeyOrder = new Map(); // submenuId -> timestamp of first key-in

function getHopiSubmenuIds() {
  const cat = (window.CLINICAL_TEMPLATES || [])
    .find(c => c.containerId === 'sections-container');
  return cat ? cat.submenus.map(s => s.id) : [];
}

// Every filled HOPI symptom, first keyed-in first. The note and the PDF forms both read this.
function collectHopiSections() {
  const cat = (window.CLINICAL_TEMPLATES || [])
    .find(c => c.containerId === 'sections-container');
  if (!cat) return [];

  const ts = id => hopiKeyOrder.get(id) ?? Infinity;
  return [...cat.submenus]
    .sort((a, b) => ts(a.id) - ts(b.id))
    .map(s => ({ header: s.noteHeader || s.title, parts: collectTemplateParts(s) }))
    .filter(s => s.parts.length);
}

function insertAllHopiSections() {
  const lines = [];
  collectHopiSections().forEach(({ header, parts }) => {
    lines.push(`${header}:`);
    parts.forEach((part, i) => {
      lines.push(`   ${part}${i < parts.length - 1 ? ';' : ''}`);
    });
  });

  if (lines.length) {
    if (!medicalNoteGuard()) return;
    const result = appendSection('History of Presenting Illness', lines);
    showToast(`History of Presenting Illness ${result === 'updated' ? 'updated in' : 'added to'} the note`);
  } else {
    showToast('No HOPI fields filled yet');
  }
}

function clearAllHopiSections() {
  const ids = getHopiSubmenuIds();
  if (!ids.length) return;
  ids.forEach(id => clearSection(id));
  hopiKeyOrder.clear();
  showToast('All HOPI sections cleared');
}

// Track key-in order of HOPI sub-tabs (first field entry = main complaint)
document.addEventListener('input', e => {
  const el = e.target;
  if (!el || !el.id) return;
  const cat = (window.CLINICAL_TEMPLATES || [])
    .find(c => c.containerId === 'sections-container');
  if (!cat) return;
  const sub = cat.submenus.find(s => s.fields.some(f => f.id === el.id));
  if (sub && !hopiKeyOrder.has(sub.id)) hopiKeyOrder.set(sub.id, Date.now());
});

// Initialize dynamic clinical templates & two-way chips on load
// A field or submenu added in the Template Editor (or a setup file) becomes an element with its
// id. If that id is already taken by ED Doc's own page (docArea, patientName, ...) the note would
// read the wrong box, so the added item is left out. Runs before the first render, when every
// element with an id belongs to the fixed page.
function dropClashingCustomTemplates(templates) {
  const clashes = id => !!document.getElementById(id);
  templates.forEach(cat => {
    cat.submenus = cat.submenus.filter(sub => {
      if (sub.custom && clashes(sub.id)) {
        console.warn('[Templates] Skipped added submenu "' + sub.id + '": that id is already used by ED Doc');
        return false;
      }
      sub.fields = sub.fields.filter(f => {
        if (!f.custom || !clashes(f.id)) return true;
        console.warn('[Templates] Skipped added field "' + f.id + '": that id is already used by ED Doc');
        return false;
      });
      return true;
    });
  });
}

function initClinicalTemplates() {
  if (window.CLINICAL_TEMPLATES) {
    applySchemaOverrides(window.CLINICAL_TEMPLATES, readSchemaOverrides());
    dropClashingCustomTemplates(window.CLINICAL_TEMPLATES);
  }
  renderClinicalTemplates();
  if (typeof setupChipSync === 'function') setupChipSync();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClinicalTemplates);
} else {
  initClinicalTemplates();
}

function chipValue(btn) {
  return (btn.dataset.output || btn.textContent).trim();
}

function chipTokens(value) {
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

// Text-box fields hold one item per line, numbered "1. ..."; the numbers are not part of the item.
function lineTokens(value) {
  return value.split('\n').map(s => s.replace(/^\s*\d+\s*[.)]\s*/, '').trim()).filter(Boolean);
}

function toggleSingleChip(btn, inputId) {
  const container = btn.closest('.chip-container');
  const isActive = btn.classList.contains('active');

  container.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));

  const input = document.getElementById(inputId);
  if (!input) return;
  if (!isActive) {
    btn.classList.add('active');
    input.value = chipValue(btn);
  } else {
    input.value = '';
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// Pick-several fields keep a comma list; typed extras stay where they are.
function toggleMultiChip(btn, inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const value = chipValue(btn);
  const lines = input.tagName === 'TEXTAREA';
  const tokens = lines ? lineTokens(input.value) : chipTokens(input.value);
  const at = tokens.findIndex(t => t.toLowerCase() === value.toLowerCase());
  if (at === -1) tokens.push(value);
  else tokens.splice(at, 1);
  input.value = lines ? tokens.map((t, i) => `${i + 1}. ${t}`).join('\n') : tokens.join(', ');
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// Two-way sync: a chip lights up while the field holds what it writes, however the value got there.
function setupChipSync() {
  document.querySelectorAll('.chip-container').forEach(container => {
    const chips = container.querySelectorAll('.chip-btn');
    if (!chips.length) return;

    let targetId = container.dataset.target;
    if (!targetId) {
      const withTarget = Array.from(chips).find(btn => btn.dataset.target);
      if (withTarget) targetId = withTarget.dataset.target;
    }
    if (!targetId) {
      const nextInput = container.nextElementSibling;
      if (nextInput && (nextInput.tagName === 'INPUT' || nextInput.tagName === 'TEXTAREA')) {
        targetId = nextInput.id;
      }
    }
    if (!targetId) return;

    container.dataset.target = targetId;
    chips.forEach(btn => btn.dataset.target = targetId);

    const input = document.getElementById(targetId);
    if (input && !input._chipSyncAttached) {
      input._chipSyncAttached = true;
      const syncChips = () => {
        const val = input.value.replace(/\s+/g, ' ').trim().toLowerCase();
        const multi = container.dataset.multi === 'true';
        const tokens = multi && input.tagName === 'TEXTAREA'
          ? lineTokens(input.value).map(t => t.replace(/\s+/g, ' ').toLowerCase())
          : chipTokens(val);
        container.querySelectorAll('.chip-btn').forEach(btn => {
          const text = chipValue(btn).replace(/\s+/g, ' ').toLowerCase();
          btn.classList.toggle('active', !!text && (multi ? tokens.includes(text) : text === val));
        });
      };
      input.addEventListener('input', syncChips);
      input.addEventListener('change', syncChips);
      if (input.value) syncChips();
    }
  });
}

document.addEventListener('DOMContentLoaded', setupChipSync);

// Clear helper
function clearSection(sectionId) {
  const r = document.getElementById(sectionId);
  if (!r) return;

  const elementsToClear = r.querySelectorAll('input, select, textarea');

  elementsToClear.forEach(el => {
    if (el.type !== 'file' && el.type !== 'button') {
      el.classList.add('clearing-input');
    }
  });

  setTimeout(() => {
    elementsToClear.forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'select') {
        el.selectedIndex = 0;
      } else if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = false;
      } else if (el.type !== 'file') {
        el.value = '';
      }
      if (typeof el._resetSlider === 'function') {
        el._resetSlider();
      }
      if (typeof el._resetGCS === 'function') {
        el._resetGCS();
      }
      el.classList.remove('clearing-input');
    });

    // Reset condition chips
    r.querySelectorAll('.chip-btn').forEach(btn => btn.classList.remove('active'));

    // Forget HOPI key-in order for cleared sub-tab so re-keying starts fresh
    if (typeof getHopiSubmenuIds === 'function' && getHopiSubmenuIds().includes(sectionId)) {
      hopiKeyOrder.delete(sectionId);
    }

    if (sectionId === 'demographic-section') {
      updateAge();
      const gender = document.getElementById('patientGender');
      if (gender) delete gender.dataset.fromIc;
    }
  }, 150);
}

function clearDocArea() {
  if (confirm('Are you sure you want to clear all generated documentation notes?')) {
    const area = document.getElementById('docArea');
    if (area) area.value = '';
    wipeDraftStorage();
    showToast('Documentation notes cleared');
  }
}

// Wipe all patient-related data from this device (keeps clinician profile & theme)
function wipePatientData() {
  if (!confirm('Wipe ALL patient data from this device?\n\nThis clears the note, saved draft and every form field. Your hospital/doctor profile and theme are kept.')) return;
  // Stop saving first: the reload below would otherwise save the fields again on its way out.
  window.edDocPersistenceOff = true;
  wipeDraftStorage();
  if (typeof wipeSessionStorage === 'function') wipeSessionStorage();
  if (typeof wipeSerialCharts === 'function') wipeSerialCharts();
  try {
    Object.keys(sessionStorage).forEach(k => sessionStorage.removeItem(k));
  } catch (e) {}
  const area = document.getElementById('docArea');
  if (area) area.value = '';
  location.reload();
}

// Utilities: Timestamp, Copy, Download
function addTimestamp() {
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
  const headerText = `--- ED Clinical Note [${dateStr}, ${timeStr}] ---\n\n`;
  const area = document.getElementById('docArea');
  area.value = headerText + area.value;
  saveDraft(area.value);
  showToast('Timestamp added!');
}

function copyNotes() {
  const area = document.getElementById('docArea');
  if (!area.value.trim()) {
    showToast('Notes area is empty.');
    return;
  }
  navigator.clipboard.writeText(area.value).then(() => {
    showToast('Copied to clipboard!');
  }).catch(() => {
    area.select();
    document.execCommand('copy');
    showToast('Copied to clipboard!');
  });
}

function downloadNotes() {
  const area = document.getElementById('docArea');
  if (!area.value.trim()) {
    showToast('Notes area is empty.');
    return;
  }
  const blob = new Blob([area.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ED_Note_${localDateStamp()}.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
  showToast('Notes downloaded!');
}

// One timer for the one toast: an earlier short toast must not hide a later long one
// (e.g. "Generating PDF..." hiding the "text was cut" warning after 2 seconds).
let toastHideTimer = null;
function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastHideTimer);
  toastHideTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// Today's date as YYYY-MM-DD in local time, for file names (toISOString is UTC, so a
// note saved before 8 am in Malaysia was named with yesterday's date).
function localDateStamp(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

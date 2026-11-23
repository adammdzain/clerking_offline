/* =======================================================
   VOICE DICTATION (SPEECH-TO-TEXT) LOGIC
   ======================================================= */
let recognitionInstance = null;
let isDictating = false;
let dictationSessionActive = false;
let committedFinalIndexes = new Set();
let lastFinalRaw = '';
let lastFinalAt = 0;
const DICTATION_DUP_WINDOW_MS = 4000;

function normalizeDictationPhrase(text) {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// Returns only the not-yet-inserted part of a final transcript.
// Handles Android re-sending the same phrase, or a cumulative phrase
// ("hello" then "hello world") shortly after the previous final.
function dedupeFinalTranscript(transcript) {
  const raw = String(transcript || '').trim();
  const norm = normalizeDictationPhrase(raw);
  if (!norm) return '';

  const now = Date.now();
  const recent = lastFinalRaw && (now - lastFinalAt) < DICTATION_DUP_WINDOW_MS;
  let result = raw;

  if (recent) {
    if (norm === lastFinalRaw) {
      result = '';
    } else if (norm.startsWith(lastFinalRaw + ' ')) {
      // Strip the previously inserted words from the front of the raw text
      const prevWordCount = lastFinalRaw.split(' ').length;
      const words = raw.split(/\s+/);
      let seen = 0, cut = 0;
      while (cut < words.length && seen < prevWordCount) {
        const t = normalizeDictationPhrase(words[cut]);
        if (t) seen += t.split(' ').length;
        cut++;
      }
      result = words.slice(cut).join(' ');
    }
  }

  lastFinalRaw = norm;
  lastFinalAt = now;
  return result;
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  const langSelect = document.getElementById('dictationLangSelect');
  recognition.lang = langSelect ? langSelect.value : 'en-MY';

  recognition.onstart = () => {
    const wasActive = isDictating && dictationSessionActive;
    isDictating = true;
    dictationSessionActive = true;
    committedFinalIndexes = new Set();
    updateDictationUI(true);
    // Only toast on a fresh start, not on silent auto-restarts
    if (!wasActive) showToast('Voice dictation active. Audio is processed by your browser\'s online speech service, so avoid identifiable patient details.', 6000);
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    // Android Chrome (continuous mode) re-delivers already-final results and
    // reports an unreliable resultIndex, so scan every result and commit each
    // final index once, then dedupe repeated / cumulative phrases by text.
    for (let i = 0; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        if (committedFinalIndexes.has(i)) continue;
        committedFinalIndexes.add(i);
        const fresh = dedupeFinalTranscript(transcript);
        const formatted = formatDictatedText(fresh);
        if (formatted) {
          finalTranscript += formatted + (formatted.endsWith('\n') || formatted.endsWith('\t') ? '' : ' ');
        }
      } else if (i >= event.resultIndex) {
        interimTranscript += transcript;
      }
    }

    const liveText = document.getElementById('dictationLiveText');
    if (liveText) {
      liveText.textContent = interimTranscript ? `Listening: "${interimTranscript}"` : 'Listening... Speak naturally (supports "press tab", "indent", "comma", "full stop", "new line", "bullet point")';
    }

    if (finalTranscript) {
      insertTextAtCursorOrEnd('docArea', finalTranscript);
      saveDraft(document.getElementById('docArea').value);
    }
  };

  recognition.onerror = (event) => {
    console.warn('[Dictation] Error:', event.error);
    // Normal timeout on silence, will restart if still dictating
    if (event.error === 'no-speech' || event.error === 'aborted') return;

    // Anything else would fail again on every auto-restart in onend
    stopVoiceDictation(true);
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      showToast('Microphone access denied. Please allow microphone permissions in your browser.', 6000);
    } else if (event.error === 'network') {
      showToast('Voice dictation needs an internet connection.', 6000);
    } else {
      showToast('Dictation error: ' + event.error, 6000);
    }
  };

  recognition.onend = () => {
    committedFinalIndexes = new Set();
    // If doctor didn't explicitly stop it, keep alive seamlessly
    if (isDictating) {
      try {
        recognition.start();
      } catch (e) {
        stopVoiceDictation();
      }
    } else {
      updateDictationUI(false);
    }
  };

  return recognition;
}

// Spoken commands must never collide with clinical words: bare "tab" (tablet),
// "colon", "period", "enter", "bullet" and "koma" (coma) stay as plain text.
function formatDictatedText(text) {
  if (!text) return '';
  let formatted = text
    // 1. Structural, newlines, tabs, indents & bullets
    .replace(/ *\b(?:new paragraph|perenggan baru|dua baris)\b */gi, '\n\n')
    .replace(/ *\b(?:new line|press enter|tekan enter|baris baru)\b */gi, '\n')
    .replace(/ *\b(?:double tab|dua kali tab)\b */gi, '\t\t')
    .replace(/ *\b(?:press tab|tekan tab|indent|indentation|indentasi|engsot)\b */gi, '\t')
    .replace(/ *\b(?:bullet point|titik bulet)\b */gi, '\n• ')

    // 2. Comparison & Math / Medical Symbols
    .replace(/\b(?:plus minus|plus or minus|lebih kurang)\b/gi, '±')
    .replace(/\b(?:greater than or equal to|lebih besar atau sama dengan|lebih daripada atau sama dengan)\b/gi, '≥')
    .replace(/\b(?:less than or equal to|lebih kecil atau sama dengan|kurang daripada atau sama dengan)\b/gi, '≤')
    .replace(/\b(?:greater than|lebih besar daripada|lebih daripada)\b/gi, '>')
    .replace(/\b(?:less than|lebih kecil daripada|kurang daripada)\b/gi, '<')
    .replace(/\b(?:equals|sama dengan)\b/gi, '=')
    .replace(/ *\b(?:percent|percentage|peratus)\b/gi, '%')
    .replace(/ *\b(?:degrees? cel[cs]ius|darjah cel[cs]ius)\b/gi, '°C')
    .replace(/(\d) *(?:degrees?|darjah)\b/gi, '$1°')
    .replace(/\b(?:hashtag|hash|tanda pagar)\b/gi, '#')
    .replace(/\basterisk\b/gi, '*')
    .replace(/ *\b(?:slash|forward slash|garis condong)\b */gi, '/')

    // 3. Brackets & Quotes
    .replace(/\b(?:open bracket|open parenthesis|buka kurungan)\b */gi, '(')
    .replace(/ *\b(?:close bracket|close parenthesis|tutup kurungan)\b/gi, ')')
    .replace(/\b(?:open square bracket|buka kurungan petak)\b */gi, '[')
    .replace(/ *\b(?:close square bracket|tutup kurungan petak)\b/gi, ']')
    .replace(/\b(?:open quote|buka pembuka kata|pembuka kata)\b */gi, '"')
    .replace(/ *\b(?:close quote|unquote|tutup pembuka kata)\b/gi, '"')

    // 4. Standard Punctuation (compound phrases first so "titik koma" stays whole)
    .replace(/ *\b(?:semicolon|titik koma)\b */gi, '; ')
    .replace(/ *\b(?:full colon|titik bertindih)\b */gi, ': ')
    .replace(/ *\b(?:comma|tanda koma)\b */gi, ', ')
    .replace(/ *\b(?:full stop|titik)\b */gi, '. ')
    .replace(/ *\b(?:question mark|tanda tanya)\b */gi, '? ')
    .replace(/ *\b(?:exclamation mark|exclamation point|tanda seru)\b */gi, '! ')
    .replace(/ *\b(?:hyphen|sempang)\b */gi, '-');

  // 5. Smart Space Cleanup
  formatted = formatted
    .replace(/ +([,.:;?!%°\)\}\]])/g, '$1') // remove space before closing marks
    .replace(/([\(\{\[]) +/g, '$1')         // remove space after opening marks
    .replace(/(\n) +/g, '$1')               // remove space after newline
    .replace(/ +(\n)/g, '$1')               // remove space before newline
    .replace(/ +(\t)/g, '$1')               // remove space before tab
    .replace(/(\t) +/g, '$1')               // remove space after tab
    .replace(/ {2,}/g, ' ');               // collapse duplicate spaces

  return formatted;
}

function insertTextAtCursorOrEnd(elementId, textToInsert) {
  const el = document.getElementById(elementId);
  if (!el || !textToInsert) return;

  let startPos = el.selectionStart;
  let endPos = el.selectionEnd;

  if (typeof startPos === 'number' && typeof endPos === 'number' && startPos >= 0) {
    let val = el.value;
    if (startPos > 0 && val.charAt(startPos - 1) === ' ' && /^([,.:;?!%°\)\}\]\n\t])/.test(textToInsert)) {
      val = val.substring(0, startPos - 1) + val.substring(startPos);
      startPos--;
      endPos--;
    }
    el.value = val.substring(0, startPos) + textToInsert + val.substring(endPos);
    el.selectionStart = el.selectionEnd = startPos + textToInsert.length;
  } else {
    let val = el.value;
    if (val.length > 0 && val.endsWith(' ') && /^([,.:;?!%°\)\}\]\n\t])/.test(textToInsert)) {
      val = val.slice(0, -1);
    }
    const needsSpace = val.length > 0 && !val.endsWith('\n') && !val.endsWith('\t') && !val.endsWith(' ') && !/^([,.:;?!%°\)\}\]\n\t])/.test(textToInsert);
    el.value = val + (needsSpace ? ' ' : '') + textToInsert;
  }

  el.scrollTop = el.scrollHeight;
}

function toggleVoiceDictation() {
  if (isDictating) {
    stopVoiceDictation();
  } else {
    startVoiceDictation();
  }
}

// The browser's speech engine sends the audio to its maker's servers (Google for Chrome and
// Edge, Apple for Safari): the one part of ED Doc where patient data leaves this device.
// The user is told once, before the first dictation, and can say no.
const DICTATION_NOTICE_KEY = 'ed_doc_dictation_notice_ok';
let dictationNoticeAccepted = false;

function dictationNoticeOk() {
  if (dictationNoticeAccepted) return true;
  try { if (localStorage.getItem(DICTATION_NOTICE_KEY) === '1') return (dictationNoticeAccepted = true); } catch (e) {}
  const ok = confirm('Voice dictation sends your voice over the internet to the browser\'s speech service (Google for Chrome and Edge, Apple for Safari) to turn it into text.\n\nEverything else in ED Doc stays on this device. Avoid saying names, IC numbers or other details that identify the patient.\n\nTurn on voice dictation?');
  if (!ok) return false;
  dictationNoticeAccepted = true;
  try { localStorage.setItem(DICTATION_NOTICE_KEY, '1'); } catch (e) {}
  return true;
}

function startVoiceDictation() {
  if (!dictationNoticeOk()) return;
  if (!recognitionInstance) {
    recognitionInstance = initSpeechRecognition();
  }
  if (!recognitionInstance) {
    showToast('Voice dictation is not supported by this browser. Try Chrome, Edge or Safari.', 6000);
    return;
  }

  const langSelect = document.getElementById('dictationLangSelect');
  if (langSelect) recognitionInstance.lang = langSelect.value;

  try {
    isDictating = true;
    recognitionInstance.start();
  } catch (err) {
    console.warn('Could not start recognition directly:', err);
    updateDictationUI(true);
  }
}

function stopVoiceDictation(quiet) {
  isDictating = false;
  dictationSessionActive = false;
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch (e) {}
  }
  updateDictationUI(false);
  if (!quiet) showToast('Voice dictation stopped.');
}

function updateDictationUI(active) {
  const btn = document.getElementById('dictateBtn');
  const wrap = document.getElementById('dictationStatusWrap');
  const micSvg = `<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
  const stopSvg = `<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
  if (btn) {
    if (active) {
      btn.classList.add('recording');
      btn.innerHTML = `<span>Stop Dictation</span> ${stopSvg}`;
      btn.title = 'Click to stop voice dictation (Alt+Shift+D)';
    } else {
      btn.classList.remove('recording');
      btn.innerHTML = `<span>Voice Dictation</span> ${micSvg}`;
      btn.title = 'Start Voice Dictation (Alt+Shift+D)';
    }
  }
  if (wrap) {
    wrap.style.display = active ? 'flex' : 'none';
  }
}

function changeDictationLanguage() {
  if (isDictating) {
    stopVoiceDictation();
    setTimeout(startVoiceDictation, 200);
  }
}


  
    /* =======================================================
   ATLS TRAUMA CLERKING SUITE JAVASCRIPT ENGINE
   ======================================================= */
// The trauma tab keeps no vitals or history of its own: those are keyed once, in the
// Vital Signs and Medical History tabs, and the trauma note reads them there. Only GCS
// is entered in two places (Disability on the trauma tab, and the neurological exam),
// so the two pickers are kept in step.
let traumaMirroring = false;

document.addEventListener('input', e => {
  const el = e.target;
  if (!el || !el.id) return;
  if (el.id === 'vitalGCS' && !traumaMirroring) setTraumaGcsFromCode(el.value);
});

// GCS is kept as three scores on the trauma card and as a code (E3V4M6) in the neurological exam
// (the field keeps its old id, vitalGCS, so saved sessions still restore it).
function pushTraumaGcsToVitals() {
  const vital = document.getElementById('vitalGCS');
  if (!vital || traumaMirroring) return;
  const code = [['E', traumaGcsE], ['V', traumaGcsV], ['M', traumaGcsM]]
    .filter(p => p[1] !== null).map(p => p.join('')).join('');
  if (vital.value === code) return;
  traumaMirroring = true;
  try {
    vital.value = code;
    vital.dispatchEvent(new Event('input', { bubbles: true }));
  } finally {
    traumaMirroring = false;
  }
}

function setTraumaGcsFromCode(text) {
  const part = (letter, max) => {
    const m = String(text || '').match(new RegExp(`${letter}([1-${max}])`, 'i'));
    return m ? parseInt(m[1], 10) : null;
  };
  traumaGcsE = part('E', 4);
  traumaGcsV = part('V', 5);
  traumaGcsM = part('M', 6);
  [['e', traumaGcsE], ['v', traumaGcsV], ['m', traumaGcsM]].forEach(([key, val]) => {
    document.querySelectorAll(`.gcs-btn-${key}`).forEach(b => b.classList.toggle('active', Number(b.dataset.val) === val));
  });
  recalcTraumaGcs();
}

// A chip writes its text into the box below it; pressing it again takes that text out.
// Whatever was typed in the box is left alone.
function removeChipText(value, text) {
  return value.split(',').map(p => p.trim()).filter(p => p && p.toLowerCase() !== text.toLowerCase()).join(', ');
}

function addChipText(value, text) {
  const cur = value.trim();
  if (!cur) return text;
  return cur.split(',').some(p => p.trim().toLowerCase() === text.toLowerCase()) ? cur : `${cur}, ${text}`;
}

function setFieldValue(input, value) {
  if (input.value === value) return;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function appendFieldChip(fieldId, btn) {
  btn.classList.toggle('active');
  const input = document.getElementById(fieldId);
  if (!input) return;
  const chipTxt = btn.textContent.trim();
  setFieldValue(input, btn.classList.contains('active') ? addChipText(input.value, chipTxt) : removeChipText(input.value, chipTxt));
}

// Patency is one finding: choosing a chip replaces the other chip's text.
function selectAirwayPatency(fieldId, btn) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  const wasActive = btn.classList.contains('active');
  let value = input.value;
  btn.parentElement.querySelectorAll('.chip-btn').forEach(b => {
    value = removeChipText(value, b.textContent.trim());
    b.classList.remove('active');
  });
  if (!wasActive) {
    btn.classList.add('active');
    value = value ? `${btn.textContent.trim()}, ${value}` : btn.textContent.trim();
  }
  setFieldValue(input, value);
}

// NORMAL on Airway, Breathing and Circulation: each box gets its normal chips (and loses
// any abnormal chip), the intervention chips are taken out, and typed text is kept.
// Unticking takes the normal chips out again.
// Circulation's "Rate: Regular 80bpm" is left out: a rate is a reading, not a normal finding.
const SURVEY_NORMALS = {
  airway: {
    boxes: { traumaAirwayCSpine: ['No injury', 'Trachea not deviated'] },
    interventions: 'traumaAirwayIntervention'
  },
  breathing: {
    boxes: {
      traumaRespInspection: ['Symmetrical chest expansion', 'No open chest wounds / flail', 'No paradoxical movement'],
      traumaRespPalpation: ['No chest wall tenderness', 'No surgical emphysema'],
      traumaRespPercussion: ['Resonant bilateral'],
      traumaRespAuscultation: ['Equal air entry bilateral', 'Clear vesicular breath sounds']
    },
    interventions: 'traumaRespIntervention'
  },
  circulation: {
    boxes: {
      traumaCircCctvr: ['Color: Pink', 'Capillary Refill: <2s', 'Temp: Warm peripheries', 'Volume: Good pulses'],
      traumaCircHemorrhage: ['No external active bleeding']
    },
    interventions: 'traumaCircIntervention'
  }
};

function surveyChipsFor(fieldId) {
  return Array.from(document.querySelectorAll('#Trauma [data-on-click="appendFieldChip"]'))
    .filter(b => { try { return JSON.parse(b.dataset.args)[0] === fieldId; } catch (e) { return false; } });
}

function toggleSurveyNormal(key, explicitVal) {
  const preset = SURVEY_NORMALS[key];
  if (!preset) return;
  const chk = document.getElementById(`${key}Check`);
  const willBeNormal = (typeof explicitVal === 'boolean') ? explicitVal : (chk && chk.textContent !== '✓');
  if (chk) chk.textContent = willBeNormal ? '✓' : '';
  if (!willBeNormal) {
    // Unticking takes the normal chips and their text back out; typed text stays.
    if (key === 'airway') {
      const patent = Array.from(document.querySelectorAll('#airwayPatencyRow .chip-btn')).find(b => b.textContent.trim() === 'Patent');
      if (patent && patent.classList.contains('active')) selectAirwayPatency('traumaAirwayPatency', patent);
    }
    Object.entries(preset.boxes).forEach(([fieldId, normals]) => {
      surveyChipsFor(fieldId).filter(b => b.classList.contains('active') && normals.includes(b.textContent.trim()))
        .forEach(b => appendFieldChip(fieldId, b));
    });
    return;
  }
  if (key === 'airway') {
    const patent = Array.from(document.querySelectorAll('#airwayPatencyRow .chip-btn')).find(b => b.textContent.trim() === 'Patent');
    if (patent && !patent.classList.contains('active')) selectAirwayPatency('traumaAirwayPatency', patent);
  }
  Object.entries(preset.boxes).forEach(([fieldId, normals]) => {
    surveyChipsFor(fieldId).forEach(b => {
      if (normals.includes(b.textContent.trim()) !== b.classList.contains('active')) appendFieldChip(fieldId, b);
    });
  });
  surveyChipsFor(preset.interventions).filter(b => b.classList.contains('active'))
    .forEach(b => appendFieldChip(preset.interventions, b));
}

// GCS Engine (Starts clean & unselected)
let traumaGcsE = null, traumaGcsV = null, traumaGcsM = null;

function setTraumaGcsE(val, btn) {
  const v = parseInt(val);
  if (traumaGcsE === v && btn && btn.classList.contains('active')) {
    traumaGcsE = null;
    document.querySelectorAll('.gcs-btn-e').forEach(b => b.classList.remove('active'));
  } else {
    traumaGcsE = v;
    document.querySelectorAll('.gcs-btn-e').forEach(b => b.classList.remove('active'));
    if (btn) {
      btn.classList.add('active');
    } else {
      const found = document.querySelector(`.gcs-btn-e[data-val="${val}"]`);
      if (found) found.classList.add('active');
    }
  }
  recalcTraumaGcs();
  pushTraumaGcsToVitals();
}

function setTraumaGcsV(val, btn) {
  const v = parseInt(val);
  if (traumaGcsV === v && btn && btn.classList.contains('active')) {
    traumaGcsV = null;
    document.querySelectorAll('.gcs-btn-v').forEach(b => b.classList.remove('active'));
  } else {
    traumaGcsV = v;
    document.querySelectorAll('.gcs-btn-v').forEach(b => b.classList.remove('active'));
    if (btn) {
      btn.classList.add('active');
    } else {
      const found = document.querySelector(`.gcs-btn-v[data-val="${val}"]`);
      if (found) found.classList.add('active');
    }
  }
  recalcTraumaGcs();
  pushTraumaGcsToVitals();
}

function setTraumaGcsM(val, btn) {
  const v = parseInt(val);
  if (traumaGcsM === v && btn && btn.classList.contains('active')) {
    traumaGcsM = null;
    document.querySelectorAll('.gcs-btn-m').forEach(b => b.classList.remove('active'));
  } else {
    traumaGcsM = v;
    document.querySelectorAll('.gcs-btn-m').forEach(b => b.classList.remove('active'));
    if (btn) {
      btn.classList.add('active');
    } else {
      const found = document.querySelector(`.gcs-btn-m[data-val="${val}"]`);
      if (found) found.classList.add('active');
    }
  }
  recalcTraumaGcs();
  pushTraumaGcsToVitals();
}

function recalcTraumaGcs() {
  const ro = document.getElementById('traumaGcsReadout');
  const tot = document.getElementById('traumaGcsTotal');
  const hidden = document.getElementById('traumaGCS');
  if (traumaGcsE !== null || traumaGcsV !== null || traumaGcsM !== null) {
    const eStr = traumaGcsE !== null ? traumaGcsE : '_';
    const vStr = traumaGcsV !== null ? traumaGcsV : '_';
    const mStr = traumaGcsM !== null ? traumaGcsM : '_';
    if (ro) ro.textContent = `E${eStr}V${vStr}M${mStr}`;
    const total = (traumaGcsE || 0) + (traumaGcsV || 0) + (traumaGcsM || 0);
    if (tot) tot.textContent = `${total} / 15`;
    if (hidden) hidden.value = total;
  } else {
    if (ro) ro.textContent = 'E_V_M_';
    if (tot) tot.textContent = '-- / 15';
    if (hidden) hidden.value = '';
  }
}

// Pupil Engine (Starts unselected)
let traumaOdSize = null, traumaOdReact = null;
let traumaOsSize = null, traumaOsReact = null;

function setTraumaEyeSize(eye, size, el) {
  const s = parseInt(size);
  if (eye === 'od') {
    const isAlready = traumaOdSize === s && el && el.classList.contains('active');
    document.querySelectorAll('#traumaOdGauge .gauge-item').forEach(b => b.classList.remove('active'));
    if (isAlready) {
      traumaOdSize = null;
    } else {
      traumaOdSize = s;
      if (el) el.classList.add('active');
      else {
        const found = document.querySelector(`#traumaOdGauge .gauge-item[data-val="${s}"]`);
        if (found) found.classList.add('active');
      }
    }
    const ro = document.getElementById('traumaOdReadout');
    if (ro) ro.textContent = traumaOdSize ? `${traumaOdSize} mm • ${traumaOdReact || 'Unassessed'}` : `-- mm • ${traumaOdReact || 'Unassessed'}`;
  } else {
    const isAlready = traumaOsSize === s && el && el.classList.contains('active');
    document.querySelectorAll('#traumaOsGauge .gauge-item').forEach(b => b.classList.remove('active'));
    if (isAlready) {
      traumaOsSize = null;
    } else {
      traumaOsSize = s;
      if (el) el.classList.add('active');
      else {
        const found = document.querySelector(`#traumaOsGauge .gauge-item[data-val="${s}"]`);
        if (found) found.classList.add('active');
      }
    }
    const ro = document.getElementById('traumaOsReadout');
    if (ro) ro.textContent = traumaOsSize ? `${traumaOsSize} mm • ${traumaOsReact || 'Unassessed'}` : `-- mm • ${traumaOsReact || 'Unassessed'}`;
  }
}

function setTraumaEyeReact(eye, react, el) {
  if (eye === 'od') {
    const isAlready = traumaOdReact === react && el && el.classList.contains('active');
    document.querySelectorAll('#traumaOdReactivity .chip-btn').forEach(b => b.classList.remove('active'));
    if (isAlready) {
      traumaOdReact = null;
    } else {
      traumaOdReact = react;
      if (el) el.classList.add('active');
      else {
        const found = Array.from(document.querySelectorAll('#traumaOdReactivity .chip-btn')).find(b => b.textContent.trim().toLowerCase() === react.toLowerCase());
        if (found) found.classList.add('active');
      }
    }
    const ro = document.getElementById('traumaOdReadout');
    if (ro) ro.textContent = (traumaOdSize ? `${traumaOdSize} mm` : '-- mm') + ' • ' + (traumaOdReact || 'Unassessed');
  } else {
    const isAlready = traumaOsReact === react && el && el.classList.contains('active');
    document.querySelectorAll('#traumaOsReactivity .chip-btn').forEach(b => b.classList.remove('active'));
    if (isAlready) {
      traumaOsReact = null;
    } else {
      traumaOsReact = react;
      if (el) el.classList.add('active');
      else {
        const found = Array.from(document.querySelectorAll('#traumaOsReactivity .chip-btn')).find(b => b.textContent.trim().toLowerCase() === react.toLowerCase());
        if (found) found.classList.add('active');
      }
    }
    const ro = document.getElementById('traumaOsReadout');
    if (ro) ro.textContent = (traumaOsSize ? `${traumaOsSize} mm` : '-- mm') + ' • ' + (traumaOsReact || 'Unassessed');
  }
}

// Interactive Body Injury Plotter (Starts with 0 pins)
let currentTraumaTool = 'L';
let currentTraumaColor = '#ef4444';
let traumaPins = [];

const traumaToolMeta = {
  'L': { name: 'Laceration', color: '#ef4444' },
  'A': { name: 'Abrasion', color: '#f97316' },
  'C': { name: 'Contusion', color: '#a855f7' },
  'D': { name: 'Deformity', color: '#3b82f6' },
  'S': { name: 'Swelling', color: '#06b6d4' },
  'P': { name: 'Puncture wound', color: '#ec4899' },
  'B': { name: 'Burn', color: '#eab308' },
  'T': { name: 'Tenderness', color: '#10b981' }
};

// Anatomical regions traced on assets/human_body_diagram.png (image px, 1778 x 2025).
// [view (A=anterior, P=posterior), name, group, patient side, polygon points]
const TRAUMA_IMG_W = 1778, TRAUMA_IMG_H = 2025;
const TRAUMA_REGIONS_RAW = [
  ["A", "Head / Face", "Head", "", "420,68 457,62 495,68 538,110 558,160 555,210 554,260 536,300 520,330 385,330 372,300 352,260 353,210 349,160 363,110"],
  ["A", "Neck", "Neck", "", "385,330 520,330 524,372 383,372"],
  ["A", "Chest", "Chest / Upper back", "Right", "383,372 457,372 457,700 291,700 286,660 283,620 281,578"],
  ["A", "Chest", "Chest / Upper back", "Left", "524,372 457,372 457,700 627,700 632,660 634,620 629,578"],
  ["A", "Shoulder", "Shoulder", "Right", "383,372 299,418 250,438 220,460 205,500 199,540 198,578 281,578"],
  ["A", "Shoulder", "Shoulder", "Left", "524,372 615,418 670,440 697,460 713,500 722,540 724,578 629,578"],
  ["A", "Upper arm", "Upper arm", "Right", "198,578 206,598 214,618 214,638 213,658 214,678 215,698 217,718 220,738 215,758 214,760 301,760 300,758 298,738 294,718 291,698 288,678 286,658 284,638 283,618 282,598 281,578"],
  ["A", "Upper arm", "Upper arm", "Left", "720,578 715,598 710,618 709,638 708,658 708,678 707,698 709,718 711,738 718,758 719,760 619,760 619,758 620,738 624,718 627,698 630,678 632,658 633,638 634,618 631,598 629,578"],
  ["A", "Forearm", "Forearm", "Right", "214,760 208,780 202,800 195,820 190,840 184,860 180,880 175,900 175,920 175,940 170,960 165,980 160,1000 155,1020 149,1040 226,1040 234,1020 243,1000 251,980 260,960 269,940 275,920 281,900 291,880 300,860 301,840 302,820 303,800 303,780 301,760"],
  ["A", "Forearm", "Forearm", "Left", "619,760 618,780 621,800 624,820 625,840 625,860 632,880 638,900 647,920 655,940 665,960 674,980 683,1000 692,1020 700,1040 781,1040 775,1020 769,1000 763,980 759,960 755,940 752,920 748,900 745,880 742,860 739,840 735,820 731,800 727,780 719,760"],
  ["A", "Hand", "Hand", "Right", "148,1040 228,1040 224,1100 208,1160 192,1215 95,1215 92,1160 88,1100 88,1065"],
  ["A", "Hand", "Hand", "Left", "712,1040 780,1040 865,1065 875,1080 838,1110 847,1160 827,1215 740,1215 729,1160 706,1100"],
  ["A", "Hypochondrium", "Abdomen / Lumbar", "Right", "291,700 295,720 298,740 301,760 303,780 303,797 409,797 408,780 407,760 405,740 404,720 403,700"],
  ["A", "Epigastric", "Abdomen / Lumbar", "", "403,700 404,720 405,740 407,760 408,780 409,797 515,797 513,780 513,760 513,740 514,720 515,700"],
  ["A", "Hypochondrium", "Abdomen / Lumbar", "Left", "515,700 514,720 513,740 513,760 513,780 515,797 621,797 618,780 619,760 620,740 624,720 627,700"],
  ["A", "Lumbar (flank)", "Abdomen / Lumbar", "Right", "303,797 302,817 301,837 300,857 296,877 292,893 403,893 406,877 408,857 409,837 409,817 409,797"],
  ["A", "Umbilical", "Abdomen / Lumbar", "", "409,797 409,817 409,837 408,857 406,877 403,893 515,893 516,877 517,857 517,837 516,817 515,797"],
  ["A", "Lumbar (flank)", "Abdomen / Lumbar", "Left", "515,797 516,817 517,837 517,857 516,877 515,893 627,893 626,877 625,857 624,837 624,817 621,797"],
  ["A", "Iliac fossa", "Abdomen / Lumbar", "Right", "292,893 289,913 288,933 286,953 284,973 283,990 404,990 403,973 403,953 402,933 402,913 403,893"],
  ["A", "Hypogastric (suprapubic)", "Abdomen / Lumbar", "", "403,893 402,913 402,933 403,953 403,973 404,990 525,990 522,973 519,953 516,933 515,913 515,893"],
  ["A", "Iliac fossa", "Abdomen / Lumbar", "Left", "515,893 515,913 516,933 519,953 522,973 525,990 646,990 642,973 635,953 630,933 628,913 627,893"],
  ["A", "Groin / Genitalia", "Pelvis / Buttock", "", "283,990 282,1010 279,1030 274,1050 270,1070 266,1090 264,1100 659,1100 657,1090 654,1070 652,1050 651,1030 649,1010 646,990"],
  ["A", "Thigh", "Thigh", "Right", "264,1100 264,1120 263,1140 263,1160 265,1180 267,1200 270,1220 273,1240 277,1260 282,1280 287,1300 292,1320 298,1340 304,1360 308,1380 313,1400 316,1420 470,1420 470,1400 470,1380 469,1360 469,1340 469,1320 469,1300 468,1280 468,1260 465,1240 461,1220 458,1200 458,1180 458,1160 457,1140 457,1120 457,1100"],
  ["A", "Thigh", "Thigh", "Left", "457,1100 457,1120 457,1140 458,1160 458,1180 458,1200 461,1220 465,1240 468,1260 468,1280 469,1300 469,1320 469,1340 469,1360 470,1380 470,1400 470,1420 628,1420 629,1400 631,1380 633,1360 635,1340 638,1320 641,1300 644,1280 647,1260 650,1240 653,1220 655,1200 656,1180 658,1160 658,1140 659,1120 659,1100"],
  ["A", "Knee", "Knee", "Right", "316,1420 318,1440 320,1460 317,1480 314,1500 313,1520 470,1520 470,1500 471,1480 471,1460 471,1440 470,1420"],
  ["A", "Knee", "Knee", "Left", "470,1420 471,1440 471,1460 471,1480 470,1500 470,1520 629,1520 630,1500 630,1480 630,1460 629,1440 628,1420"],
  ["A", "Lower leg (shin)", "Lower leg", "Right", "313,1520 314,1540 315,1560 317,1580 318,1600 321,1620 326,1640 330,1660 335,1680 340,1700 346,1720 352,1740 358,1760 364,1780 370,1800 373,1820 374,1840 375,1860 368,1870 468,1870 468,1860 468,1840 468,1820 468,1800 468,1780 468,1760 468,1740 468,1720 468,1700 468,1680 468,1660 468,1640 469,1620 469,1600 469,1580 469,1560 469,1540 470,1520"],
  ["A", "Lower leg (shin)", "Lower leg", "Left", "470,1520 469,1540 469,1560 469,1580 469,1600 469,1620 468,1640 468,1660 468,1680 468,1700 468,1720 468,1740 468,1760 468,1780 468,1800 468,1820 468,1840 468,1860 468,1870 572,1870 566,1860 566,1840 566,1820 568,1800 571,1780 575,1760 580,1740 585,1720 590,1700 595,1680 601,1660 608,1640 615,1620 620,1600 623,1580 627,1560 628,1540 629,1520"],
  ["A", "Foot", "Foot", "Right", "368,1870 355,1890 341,1910 340,1930 339,1950 341,1970 344,1990 345,1995 472,1995 472,1990 471,1970 471,1950 470,1930 469,1910 469,1890 468,1870"],
  ["A", "Foot", "Foot", "Left", "468,1870 469,1890 469,1910 470,1930 471,1950 471,1970 472,1990 472,1995 600,1995 601,1990 604,1970 603,1950 599,1930 595,1910 583,1890 572,1870"],
  ["P", "Head (occiput)", "Head", "", "1248,62 1292,58 1336,62 1385,110 1390,160 1396,210 1381,260 1366,275 1214,275 1194,260 1180,210 1190,160 1194,110"],
  ["P", "Neck (nape)", "Neck", "", "1214,275 1366,275 1362,360 1218,360"],
  ["P", "Upper back", "Chest / Upper back", "Left", "1218,360 1290,360 1290,700 1121,700 1112,660 1106,620 1101,578"],
  ["P", "Upper back", "Chest / Upper back", "Right", "1362,360 1290,360 1290,700 1463,700 1469,660 1474,620 1476,578"],
  ["P", "Shoulder", "Shoulder", "Left", "1218,360 1103,418 1060,440 1045,460 1034,500 1028,540 1030,578 1101,578"],
  ["P", "Shoulder", "Shoulder", "Right", "1362,360 1478,418 1521,440 1533,460 1544,500 1553,540 1550,578 1476,578"],
  ["P", "Upper arm", "Upper arm", "Left", "1032,578 1038,598 1045,618 1046,638 1045,658 1045,678 1045,698 1041,718 1036,738 1032,758 1031,760 1133,760 1132,758 1131,738 1126,718 1121,698 1116,678 1112,658 1109,638 1106,618 1103,598 1101,578"],
  ["P", "Upper arm", "Upper arm", "Right", "1548,578 1544,598 1540,618 1541,638 1542,658 1540,678 1538,698 1541,718 1545,738 1551,758 1552,760 1452,760 1452,758 1454,738 1459,718 1463,698 1466,678 1469,658 1472,638 1474,618 1475,598 1476,578"],
  ["P", "Forearm", "Forearm", "Left", "1031,760 1026,780 1020,800 1013,820 1008,840 1003,860 1000,880 997,900 996,920 994,940 989,960 983,980 978,1000 973,1020 968,1040 1039,1040 1049,1020 1060,1000 1070,980 1080,960 1090,940 1099,920 1107,900 1114,880 1120,860 1130,840 1130,820 1132,800 1133,780 1133,760"],
  ["P", "Forearm", "Forearm", "Right", "1452,760 1450,780 1449,800 1448,820 1449,840 1468,860 1476,880 1483,900 1493,920 1503,940 1517,960 1530,980 1540,1000 1549,1020 1558,1040 1631,1040 1625,1020 1618,1000 1611,980 1605,960 1599,940 1596,920 1593,900 1591,880 1589,860 1582,840 1575,820 1567,800 1558,780 1552,760"],
  ["P", "Hand", "Hand", "Left", "985,1040 1048,1040 1040,1110 1025,1160 1003,1215 915,1215 906,1160 904,1100 870,1080 898,1062"],
  ["P", "Hand", "Hand", "Right", "1555,1040 1640,1040 1715,1065 1722,1080 1690,1110 1696,1160 1680,1215 1600,1215 1590,1160 1561,1100"],
  ["P", "Lumbar / Lower back", "Abdomen / Lumbar", "Left", "1121,700 1127,720 1132,740 1133,760 1133,780 1132,800 1130,820 1130,840 1130,860 1130,880 1129,900 1290,900 1290,880 1290,860 1290,840 1290,820 1290,800 1290,780 1290,760 1290,740 1290,720 1290,700"],
  ["P", "Lumbar / Lower back", "Abdomen / Lumbar", "Right", "1290,700 1290,720 1290,740 1290,760 1290,780 1290,800 1290,820 1290,840 1290,860 1290,880 1290,900 1461,900 1456,880 1450,860 1449,840 1448,820 1449,800 1450,780 1452,760 1454,740 1459,720 1463,700"],
  ["P", "Buttock", "Pelvis / Buttock", "Left", "1129,900 1130,920 1131,940 1125,960 1119,980 1116,1000 1112,1020 1112,1040 1111,1060 1104,1080 1102,1085 1291,1085 1291,1080 1291,1060 1291,1040 1291,1020 1291,1000 1291,980 1291,960 1291,940 1291,920 1291,900"],
  ["P", "Buttock", "Pelvis / Buttock", "Right", "1291,900 1291,920 1291,940 1291,960 1291,980 1291,1000 1291,1020 1291,1040 1291,1060 1291,1080 1291,1085 1488,1085 1487,1080 1483,1060 1482,1040 1480,1020 1477,1000 1474,980 1470,960 1465,940 1463,920 1461,900"],
  ["P", "Thigh (posterior)", "Thigh", "Left", "1097,1085 1098,1105 1099,1125 1100,1145 1102,1165 1104,1185 1106,1205 1109,1225 1112,1245 1115,1265 1120,1285 1125,1305 1130,1325 1136,1345 1141,1365 1144,1385 1146,1405 1148,1420 1302,1420 1302,1405 1302,1385 1301,1365 1301,1345 1300,1325 1300,1305 1299,1285 1299,1265 1298,1245 1297,1225 1296,1205 1295,1185 1294,1165 1294,1145 1293,1125 1292,1105 1291,1085"],
  ["P", "Thigh (posterior)", "Thigh", "Right", "1291,1085 1292,1105 1293,1125 1294,1145 1294,1165 1295,1185 1296,1205 1297,1225 1298,1245 1299,1265 1299,1285 1300,1305 1300,1325 1301,1345 1301,1365 1302,1385 1302,1405 1302,1420 1461,1420 1462,1405 1464,1385 1465,1365 1468,1345 1471,1325 1475,1305 1478,1285 1480,1265 1482,1245 1484,1225 1486,1205 1488,1185 1490,1165 1490,1145 1490,1125 1491,1105 1491,1085"],
  ["P", "Popliteal (back of knee)", "Knee", "Left", "1148,1420 1149,1440 1150,1460 1147,1480 1144,1500 1143,1520 1301,1520 1302,1500 1302,1480 1303,1460 1303,1440 1302,1420"],
  ["P", "Popliteal (back of knee)", "Knee", "Right", "1302,1420 1303,1440 1303,1460 1302,1480 1302,1500 1301,1520 1456,1520 1457,1500 1458,1480 1459,1460 1460,1440 1461,1420"],
  ["P", "Calf", "Lower leg", "Left", "1143,1520 1144,1540 1144,1560 1146,1580 1148,1600 1151,1620 1156,1640 1160,1660 1166,1680 1171,1700 1178,1720 1185,1740 1192,1760 1198,1780 1203,1800 1201,1820 1190,1840 1180,1860 1178,1870 1299,1870 1299,1860 1299,1840 1298,1820 1298,1800 1298,1780 1298,1760 1298,1740 1298,1720 1297,1700 1297,1680 1297,1660 1298,1640 1298,1620 1299,1600 1299,1580 1300,1560 1301,1540 1301,1520"],
  ["P", "Calf", "Lower leg", "Right", "1301,1520 1301,1540 1300,1560 1299,1580 1299,1600 1298,1620 1298,1640 1297,1660 1297,1680 1297,1700 1298,1720 1298,1740 1298,1760 1298,1780 1298,1800 1298,1820 1299,1840 1299,1860 1299,1870 1415,1870 1415,1860 1408,1840 1401,1820 1398,1800 1401,1780 1403,1760 1409,1740 1414,1720 1420,1700 1425,1680 1431,1660 1436,1640 1441,1620 1446,1600 1450,1580 1454,1560 1455,1540 1456,1520"],
  ["P", "Heel / foot", "Foot", "Left", "1178,1870 1175,1890 1172,1910 1179,1930 1186,1950 1192,1970 1195,1990 1196,1995 1300,1995 1300,1990 1300,1970 1300,1950 1299,1930 1299,1910 1299,1890 1299,1870"],
  ["P", "Heel / foot", "Foot", "Right", "1299,1870 1299,1890 1299,1910 1299,1930 1300,1950 1300,1970 1300,1990 1300,1995 1400,1995 1401,1990 1404,1970 1407,1950 1411,1930 1415,1910 1415,1890 1415,1870"]
];
let traumaRegionsParsed = null;

function getTraumaRegions() {
  if (!traumaRegionsParsed) {
    traumaRegionsParsed = TRAUMA_REGIONS_RAW.map(r => ({
      view: r[0] === 'A' ? 'anterior' : 'posterior',
      name: r[1], group: r[2], side: r[3],
      pts: r[4].split(' ').map(p => p.split(',').map(Number))
    }));
  }
  return traumaRegionsParsed;
}

function traumaPointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function traumaDistToPoly(x, y, pts) {
  let best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const x1 = pts[j][0], y1 = pts[j][1], dx = pts[i][0] - x1, dy = pts[i][1] - y1;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)));
  }
  return best;
}

function findTraumaRegion(ix, iy) {
  const regions = getTraumaRegions();
  let hit = null;
  regions.forEach(r => { if (traumaPointInPoly(ix, iy, r.pts)) hit = r; });
  if (hit) return hit;
  let near = null, nearD = 45;
  regions.forEach(r => {
    const d = traumaDistToPoly(ix, iy, r.pts);
    if (d < nearD) { nearD = d; near = r; }
  });
  return near;
}

// Rendered rectangle of the picture inside the canvas (SVG uses "meet" letterboxing)
function getTraumaImageBox() {
  const canvas = document.getElementById('traumaDiagramCanvas');
  const svg = canvas && canvas.querySelector('svg');
  if (!svg) return null;
  const r = svg.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const s = Math.min(r.width / 640, r.height / 729);
  const w = 640 * s, h = 729 * s;
  return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, w, h };
}

function selectTraumaTool(toolCode, color, btn) {
  currentTraumaTool = toolCode;
  if (color) currentTraumaColor = color;
  document.querySelectorAll('.injury-tool-btn').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    const found = Array.from(document.querySelectorAll('.injury-tool-btn')).find(b => 
      (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${toolCode}'`)) ||
      b.textContent.includes(`(${toolCode})`)
    );
    if (found) {
      found.classList.add('active');
    }
  }
}

function handleTraumaDiagramClick(e) {
  if (e.target && e.target.classList && e.target.classList.contains('injury-pin')) return;
  const box = getTraumaImageBox();
  if (!box) return;
  const ix = ((e.clientX - box.left) / box.w) * TRAUMA_IMG_W;
  const iy = ((e.clientY - box.top) / box.h) * TRAUMA_IMG_H;
  const reg = findTraumaRegion(ix, iy);
  if (!reg) return;

  // Auto-activate tool button if none active
  if (!document.querySelector('.injury-tool-btn.active')) {
    selectTraumaTool(currentTraumaTool || 'L', currentTraumaColor || '#ef4444');
  }

  const nextId = traumaPins.length + 1;
  const meta = traumaToolMeta[currentTraumaTool] || { name: 'Injury', color: currentTraumaColor };
  const regionLabel = (reg.side ? reg.side + ' ' : '') + reg.name;

  traumaPins.push({
    id: nextId,
    type: currentTraumaTool,
    label: meta.name,
    loc: `${meta.name} over ${regionLabel} (${reg.view} view)`,
    region: regionLabel,
    group: reg.group,
    view: reg.view,
    side: reg.side,
    note: '',
    ix: Math.round(ix),
    iy: Math.round(iy),
    color: meta.color || currentTraumaColor
  });
  renderTraumaPins();
}

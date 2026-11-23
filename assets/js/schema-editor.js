// Template Editor: rename, sort, add and word every submenu, parameter and button.
// It edits a copy of the shipped templates with this device's changes applied, the same way
// ED Doc does on start, and saves only the differences (format in 00-schema-overrides.js).

const BASE_TEMPLATES = schemaClone(window.CLINICAL_TEMPLATES);
const BASE_FIELDS = new Map();
const BASE_SUBS = new Map();
BASE_TEMPLATES.forEach(cat => cat.submenus.forEach(sub => {
  BASE_SUBS.set(sub.id, { sub, category: cat.category });
  sub.fields.forEach(field => BASE_FIELDS.set(field.id, { field, subId: sub.id }));
}));

// Read by id in the PDF forms or the MyKad scanner: deleting one leaves those blank.
const FORM_FIELD_IDS = new Set(['patientName', 'patientID', 'patientAge', 'patientGender', 'patientHospitalID', 'patientPhone', 'patientAddress', 'historyUnderlying', 'historyAllergy', 'historyMedication', 'nnjJaundiceLevel']);
const FIXED_CONTAINER = 'vitals-container';
const NEW_SUBMENU = '__new';
const SUBMENU_WORDING = { title: 'Tab name', noteHeader: 'Note heading', insertLabel: 'Insert button', clearLabel: 'Clear button' };

const TE_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
// Cards show in the same order as ED Doc's board; any other category follows in its own order.
const TE_BOARD_ORDER = ['Patient Demographic', 'Medical History', 'HOPI', 'Vital Signs', 'Physical Examination', 'Impression and Plan', 'Regular & Routine cases'];
// Same board motion as ED Doc (16-case-board.js): every tile move, resize, open and close runs this long (ms).
const TE_BOARD_MS = 480;
const TE_BOARD_EASE = 'cubic-bezier(.45, 0, .2, 1)';
const TE_STATUS_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle class="ring" cx="8" cy="8" r="6.5"/><circle class="dot" cx="8" cy="8" r="3"/></svg>';
const TE_ARROW = '<span class="arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></span>';
const TE_UP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>';
const TE_DOWN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
const TE_WIDE_FIELD_CHIPS = 6;

let tree = [];
let openSection = null;
let openSubmenu = null;
let typeFilter = 'all';
let chipEdit = null;

function init() {
  tree = applySchemaOverrides(schemaClone(BASE_TEMPLATES), readSchemaOverrides());

  syncThemeButton();
  initSheet();
  initSheetDock();
  teInitFilterPill();
  document.getElementById('addForm').addEventListener('submit', submitAddModal);
  document.getElementById('chipForm').addEventListener('submit', submitChipModal);
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      toggleTheme();
    }
  });
  renderBoard();
  new ResizeObserver(teFitBoard).observe(document.getElementById('main-sections'));
}

// ---------- Lookups ----------
function findCat(name) {
  return tree.find(c => c.category === name);
}

function findSub(id) {
  for (const cat of tree) {
    const sub = cat.submenus.find(s => s.id === id);
    if (sub) return { cat, sub };
  }
  return null;
}

function findField(id) {
  for (const cat of tree) {
    for (const sub of cat.submenus) {
      const field = sub.fields.find(f => f.id === id);
      if (field) return { cat, sub, field };
    }
  }
  return null;
}

function isFixedField(field) {
  return !!(field.slider || field.customInput);
}

function isFixedCategory(cat) {
  return cat.containerId === FIXED_CONTAINER;
}

function presentIds() {
  const ids = new Set();
  tree.forEach(cat => cat.submenus.forEach(sub => {
    ids.add(sub.id);
    sub.fields.forEach(f => ids.add(f.id));
  }));
  return ids;
}

// ---------- What changed ----------
function schemaNorm(key, value) {
  if (key === 'chips') return JSON.stringify((value || []).map(normalizeChip));
  if (key === 'multi' || key === 'long') return String(!!value);
  return value == null ? '' : String(value);
}

function sameProp(key, a, b) {
  return schemaNorm(key, a) === schemaNorm(key, b);
}

function sameList(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function isFieldModified(field) {
  const base = BASE_FIELDS.get(field.id);
  if (!base) return true;
  return SCHEMA_FIELD_KEYS.some(k => !sameProp(k, field[k], base.field[k]));
}

function defaultFieldOrder(sub) {
  const base = BASE_SUBS.get(sub.id);
  const ids = sub.fields.map(f => f.id);
  const baseHere = base ? base.sub.fields.map(f => f.id).filter(id => ids.includes(id)) : [];
  return [...baseHere, ...ids.filter(id => !BASE_FIELDS.has(id))];
}

function fieldOrderChanged(sub) {
  return !sameList(sub.fields.map(f => f.id), defaultFieldOrder(sub));
}

function isSubmenuModified(sub) {
  const base = BASE_SUBS.get(sub.id);
  if (!base) return true;
  return SCHEMA_SUBMENU_KEYS.some(k => !sameProp(k, sub[k], base.sub[k])) || fieldOrderChanged(sub);
}

function defaultSubmenuOrder(cat) {
  const base = BASE_TEMPLATES.find(c => c.category === cat.category);
  const ids = cat.submenus.map(s => s.id);
  const baseHere = base ? base.submenus.map(s => s.id).filter(id => ids.includes(id)) : [];
  return [...baseHere, ...ids.filter(id => !BASE_SUBS.has(id))];
}

function submenuOrderChanged(cat) {
  return !sameList(cat.submenus.map(s => s.id), defaultSubmenuOrder(cat));
}

function removedFieldsOf(subId, present) {
  const base = BASE_SUBS.get(subId);
  return base ? base.sub.fields.filter(f => !present.has(f.id)) : [];
}

function submenuChangeCount(sub, present) {
  return sub.fields.filter(isFieldModified).length + (isSubmenuModified(sub) ? 1 : 0) + removedFieldsOf(sub.id, present).length;
}

function removedSubmenusOf(cat, present) {
  const base = BASE_TEMPLATES.find(c => c.category === cat.category);
  return base ? base.submenus.filter(s => !present.has(s.id)) : [];
}

function categoryChangeCount(cat, present) {
  return cat.submenus.reduce((n, sub) => n + submenuChangeCount(sub, present), 0)
    + (submenuOrderChanged(cat) ? 1 : 0)
    + removedSubmenusOf(cat, present).length;
}

function changeCount() {
  const present = presentIds();
  return tree.reduce((n, cat) => n + categoryChangeCount(cat, present), 0);
}

function pickFieldProps(field) {
  const out = {};
  SCHEMA_FIELD_KEYS.forEach(k => {
    if (field[k] === undefined || field[k] === '' || field[k] === false) return;
    out[k] = k === 'chips' ? field.chips.map(normalizeChip) : schemaClone(field[k]);
  });
  return out;
}

function buildOverrides() {
  const ov = emptySchemaOverrides();
  const present = presentIds();
  tree.forEach(cat => {
    if (submenuOrderChanged(cat)) ov.order[cat.category] = cat.submenus.map(s => s.id);
    cat.submenus.forEach(sub => {
      const base = BASE_SUBS.get(sub.id);
      const change = {};
      if (base) {
        SCHEMA_SUBMENU_KEYS.forEach(k => { if (!sameProp(k, sub[k], base.sub[k])) change[k] = sub[k] || ''; });
      } else {
        ov.addedSubmenus[sub.id] = { category: cat.category, title: sub.title, noteHeader: sub.noteHeader || sub.title };
        ['insertLabel', 'clearLabel'].forEach(k => { if (sub[k]) change[k] = sub[k]; });
      }
      if (fieldOrderChanged(sub)) change.fields = sub.fields.map(f => f.id);
      if (Object.keys(change).length) ov.submenus[sub.id] = change;

      sub.fields.forEach(field => {
        const bf = BASE_FIELDS.get(field.id);
        if (!bf) {
          ov.addedFields[field.id] = Object.assign({ home: sub.id }, pickFieldProps(field));
          return;
        }
        const diff = {};
        SCHEMA_FIELD_KEYS.forEach(k => {
          if (sameProp(k, field[k], bf.field[k])) return;
          if (k === 'chips') diff.chips = (field.chips || []).map(normalizeChip);
          else if (k === 'multi' || k === 'long') diff[k] = !!field[k];
          else diff[k] = field[k] || '';
        });
        if (Object.keys(diff).length) ov.fields[field.id] = diff;
      });
    });
  });
  BASE_SUBS.forEach((v, id) => { if (!present.has(id)) ov.removed.push(id); });
  BASE_FIELDS.forEach((v, id) => { if (!present.has(id)) ov.removed.push(id); });
  return ov;
}

function saveSchema() {
  writeSchemaOverrides(buildOverrides());
}

// ---------- Rendering ----------
function args(...values) {
  return escapeHtml(JSON.stringify(values));
}

function searchText() {
  return document.getElementById('searchInput').value.toLowerCase().trim();
}

function isFiltering() {
  return typeFilter !== 'all' || !!searchText();
}

function matchesFilters(cat, sub, field) {
  const chips = field.chips || [];
  if (typeFilter === 'chips' && !chips.length) return false;
  if (typeFilter === 'text' && chips.length) return false;
  const search = searchText();
  if (!search) return true;
  return [field.label, field.id, sub.title, cat.category, ...chips.flatMap(c => [chipLabel(c), chipOutput(c)])]
    .some(text => String(text || '').toLowerCase().includes(search));
}

// Re-rendering replaces the controls, so focus moves to the control with the same key.
function withFocusKept(render) {
  const active = document.activeElement;
  const key = active && active.dataset ? active.dataset.key : null;
  render();
  if (!key || document.contains(active)) return;
  const next = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
  if (next) next.focus({ preventScroll: true });
}

function renderBoard() {
  withFocusKept(() => {
    const board = document.getElementById('main-sections');
    const filtering = isFiltering();
    let total = 0;
    let shown = 0;
    const rank = cat => { const r = TE_BOARD_ORDER.indexOf(cat.category); return r < 0 ? TE_BOARD_ORDER.length : r; };
    // Indexes stay those of the tree, so toggleSection(i) still finds its card.
    const order = tree.map((cat, i) => i).sort((a, b) => rank(tree[a]) - rank(tree[b]) || a - b);
    const cards = order.map(i => tree[i]).map((cat, n) => {
      const i = order[n];
      const hits = cat.submenus.map(sub => ({
        sub,
        fields: sub.fields.filter(f => {
          total++;
          const ok = !filtering || matchesFilters(cat, sub, f);
          if (ok) shown++;
          return ok;
        })
      }));
      if (!filtering) return cardHtml(cat, i);
      const found = hits.filter(h => h.fields.length);
      return found.length ? filteredCardHtml(cat, found) : '';
    }).join('');

    board.innerHTML = cards || '<p class="te-empty">No parameters match this search.</p>';
    teFitBoard();
    document.getElementById('teCounts').textContent = filtering ? `${shown} of ${total} parameters` : `${total} parameters`;
    refreshStatus();
  });
}

function fieldCount(cat) {
  return cat.submenus.reduce((n, s) => n + s.fields.length, 0);
}

function cardHtml(cat, i) {
  const open = cat.category === openSection;
  return `<div class="main-section${open ? ' is-expanded' : ''}" data-card="${i}">
    <button type="button" class="main-collapsible${open ? ' active' : ''}" aria-expanded="${open}" data-key="card:${i}" data-on-click="toggleSection" data-args="${args(i)}">
      <span class="te-title">${escapeHtml(cat.category)}</span><span class="te-count">${fieldCount(cat)}</span>
      <span class="cb-status" role="img" data-status="card-${i}">${TE_STATUS_ICON}</span>${TE_ARROW}
      <span class="cb-summary" data-summary="${i}"></span>
    </button>
    ${open ? `<div class="main-content">${openCardHtml(cat)}</div>` : ''}
  </div>`;
}

function filteredCardHtml(cat, found) {
  const count = found.reduce((n, h) => n + h.fields.length, 0);
  return `<div class="main-section is-expanded">
    <div class="main-collapsible active"><span class="te-title">${escapeHtml(cat.category)}</span><span class="te-count">${count}</span></div>
    <div class="main-content">${found.map(({ sub, fields }) => `
      ${cat.noAccordion ? '' : `<h4 class="te-group-title">${escapeHtml(sub.title)}</h4>`}
      <div class="te-grid">${fields.map(f => fieldHtml(cat, sub, f, true)).join('')}</div>`).join('')}
    </div>
  </div>`;
}

function openCardHtml(cat) {
  if (cat.noAccordion) {
    const sub = cat.submenus[0];
    return sub ? submenuBodyHtml(cat, sub, true) : '';
  }
  const subs = cat.submenus.map(sub => {
    const open = sub.id === openSubmenu;
    return `<div class="section${open ? ' is-open' : ''}">
      <button type="button" class="collapsible${open ? ' active' : ''}" aria-expanded="${open}" data-key="${escapeHtml(`sub:${sub.id}`)}" data-on-click="toggleSubmenu" data-args="${args(sub.id)}">
        <span class="te-title">${escapeHtml(sub.title)}</span>
        <span class="te-count">${sub.fields.length}</span>
        <span class="cb-status" role="img" data-status="${escapeHtml(`sub-${sub.id}`)}">${TE_STATUS_ICON}</span>${TE_ARROW}
      </button>
      ${open ? `<div class="te-sub-body">${submenuBodyHtml(cat, sub, false)}</div>` : ''}
    </div>`;
  }).join('');
  const add = isFixedCategory(cat) ? '' : `<button type="button" class="te-add" data-key="${escapeHtml(`addsub:${cat.category}`)}" data-on-click="openAddModal" data-args="${args(cat.category, NEW_SUBMENU)}">+ Add submenu</button>`;
  return `<div class="te-subs">${subs}${add}</div>`;
}

function submenuBodyHtml(cat, sub, flat) {
  const add = isFixedCategory(cat) ? '' : `<button type="button" class="te-add" data-key="${escapeHtml(`addfield:${sub.id}`)}" data-on-click="openAddModal" data-args="${args(cat.category, sub.id)}">+ Add parameters</button>`;
  return `${submenuSettingsHtml(cat, sub, flat)}
    <div class="te-grid">${sub.fields.map(f => fieldHtml(cat, sub, f, false)).join('')}</div>
    ${sub.fields.length ? '' : '<p class="te-empty-sub">No parameters yet.</p>'}
    ${add}
    ${previewHtml(cat, sub)}`;
}

function iconButton(key, handler, handlerArgs, disabled, label, icon) {
  return `<button type="button" class="te-icon" data-key="${escapeHtml(key)}" data-on-click="${handler}" data-args="${args(...handlerArgs)}" aria-label="${escapeHtml(label)}"${disabled ? ' disabled' : ''}>${icon}</button>`;
}

function submenuSettingsHtml(cat, sub, flat) {
  const base = BASE_SUBS.get(sub.id);
  const input = (key, hint) => `<label class="te-sub-input"><span>${SUBMENU_WORDING[key]}</span>
      <input type="text" value="${escapeHtml(sub[key] || '')}" placeholder="${escapeHtml(hint)}" spellcheck="false" autocomplete="off"
        data-key="${escapeHtml(`subset:${sub.id}:${key}`)}" data-on-change="updateSubmenu" data-args="${args(sub.id, key, { thisValue: true })}">
    </label>`;
  const index = cat.submenus.indexOf(sub);
  const actions = [];
  if (!flat) {
    actions.push(iconButton(`subup:${sub.id}`, 'moveSubmenu', [sub.id, -1], index === 0, `Move ${sub.title} up`, TE_UP));
    actions.push(iconButton(`subdown:${sub.id}`, 'moveSubmenu', [sub.id, 1], index === cat.submenus.length - 1, `Move ${sub.title} down`, TE_DOWN));
  }
  if (base) {
    actions.push(`<button type="button" class="te-action" data-sub-reset="${escapeHtml(sub.id)}"${isSubmenuModified(sub) ? '' : ' hidden'} data-on-click="resetSubmenu" data-args="${args(sub.id)}">Reset ${flat ? 'tab' : 'submenu'}</button>`);
  }
  if (!flat && !isFixedCategory(cat)) {
    actions.push(`<button type="button" class="te-action is-danger" data-on-click="deleteSubmenu" data-args="${args(sub.id)}">Delete submenu</button>`);
  }
  return `<div class="te-sub-panel">
    <div class="te-sub-fields">
      ${flat ? '' : input('title', base ? base.sub.title : 'Name')}
      ${input('noteHeader', sub.title)}
      ${input('insertLabel', 'Insert')}
      ${input('clearLabel', 'Clear')}
    </div>
    <div class="te-sub-actions">${actions.join('')}</div>
  </div>`;
}

function fieldHtml(cat, sub, field, filtering) {
  const id = field.id;
  const name = escapeHtml(field.label);
  const key = part => escapeHtml(`${id}:${part}`);
  const fixed = isFixedField(field);
  const chips = field.chips || [];
  const index = sub.fields.indexOf(field);
  const canMove = !fixed && !filtering && sub.fields.length > 1;
  const modified = isFieldModified(field);

  const top = `<div class="te-field-top">
      <input type="text" class="te-name" value="${name}" aria-label="Parameter name" spellcheck="false" autocomplete="off" data-key="${key('name')}" data-on-change="updateField" data-args="${args(id, 'label', { thisValue: true })}">
      <span class="te-mark" role="img" aria-label="Changed"></span>
      ${canMove ? iconButton(`${id}:up`, 'moveField', [id, -1], index === 0, `Move ${field.label} up`, TE_UP) + iconButton(`${id}:down`, 'moveField', [id, 1], index === sub.fields.length - 1, `Move ${field.label} down`, TE_DOWN) : ''}
      <button type="button" class="te-action" data-reset${BASE_FIELDS.has(id) && modified ? '' : ' hidden'} data-key="${key('reset')}" data-on-click="revertField" data-args="${args(id)}" aria-label="Reset ${name}">Reset</button>
      ${fixed ? '' : `<button type="button" class="te-action is-danger" data-on-click="deleteField" data-args="${args(id)}" aria-label="Delete ${name}">Delete</button>`}
    </div>`;

  const note = field.group
    ? `<label class="te-note">In the note
        <input type="text" class="te-prefix" value="${escapeHtml(field.prefix || '')}" placeholder="No label" aria-label="Wording in the note for ${name}" data-key="${key('prefix')}" data-on-change="updateField" data-args="${args(id, 'prefix', { thisValue: true })}">
      </label>`
    : `<label class="te-note">Note line
        <input type="text" class="te-prefix" value="${escapeHtml(field.line || schemaDefaultLine(field))}" aria-label="Note line for ${name}. {value} is replaced by the answer." spellcheck="false" autocomplete="off" data-key="${key('line')}" data-on-change="updateLine" data-args="${args(id, { thisValue: true })}">
      </label>`;
  const idTag = `<span class="code-id" title="Field ID">${escapeHtml(id)}</span>`;
  const classes = `te-field${modified ? ' is-modified' : ''}${chips.length > TE_WIDE_FIELD_CHIPS ? ' is-wide' : ''}`;

  // Sliders, the GCS picker and the age boxes are their own controls: only the wording can change.
  if (fixed) {
    return `<div class="${classes}" data-field="${escapeHtml(id)}">${top}${note}<div class="te-field-foot">${idTag}</div></div>`;
  }

  const chipList = chips.map((chip, ci) => {
    const label = chipLabel(chip);
    const output = chipOutput(chip);
    return `<button type="button" class="chip-tag" data-key="${key(`chip${ci}`)}" data-on-click="openChipModal" data-args="${args(id, ci)}" aria-label="Edit button ${escapeHtml(label)}">${escapeHtml(label)}${output !== label ? `<span class="te-chip-out">→ ${escapeHtml(output)}</span>` : ''}</button>`;
  }).join('');
  const segment = (prop, options, label) => `<div class="te-seg" role="group" aria-label="${escapeHtml(label)}">${options.map(([value, text]) =>
    `<button type="button" aria-pressed="${!!field[prop] === value}" data-key="${key(`${prop}-${value}`)}" data-on-click="setFieldOption" data-args="${args(id, prop, value)}">${text}</button>`).join('')}</div>`;
  const others = filtering ? [] : cat.submenus.filter(s => s !== sub);
  const moveTo = others.length
    ? `<select class="te-move" aria-label="Move ${name} to another submenu" data-key="${key('moveto')}" data-on-change="moveFieldTo" data-args="${args(id, { thisValue: true })}">
        <option value="">Move to…</option>${others.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}</option>`).join('')}
      </select>`
    : '';

  return `<div class="${classes}" data-field="${escapeHtml(id)}">
    ${top}
    <div class="chip-container">
      ${chipList}
      <input type="text" class="te-chip-add" placeholder="Add button" aria-label="Add buttons to ${name}, separated by commas" autocomplete="off" data-key="${key('chipadd')}" data-on-change="addChips" data-args="${args(id, { this: true })}">
    </div>
    <div class="te-options">
      ${chips.length ? segment('multi', [[false, 'Pick one'], [true, 'Pick several']], `How many buttons ${field.label} takes`) : ''}
      ${segment('long', [[false, 'One line'], [true, 'Several lines']], `Box size for ${field.label}`)}
    </div>
    <input type="text" class="te-hint" value="${escapeHtml(field.placeholder || '')}" placeholder="Hint shown in the empty box" aria-label="Hint for ${name}" autocomplete="off" data-key="${key('hint')}" data-on-change="updateField" data-args="${args(id, 'placeholder', { thisValue: true })}">
    ${note}
    <div class="te-field-foot">${idTag}${moveTo}</div>
  </div>`;
}

function sampleValue(field) {
  const outputs = (field.chips || []).map(chipOutput).filter(Boolean);
  if (outputs.length) return field.multi ? outputs.slice(0, 2).join(', ') : outputs[0];
  if (field.slider || field.customInput) return field.placeholder || '…';
  return '…';
}

function previewHtml(cat, sub) {
  const parts = formatSubmenuParts(sub, sampleValue);
  const text = parts.length ? [submenuNoteHeader(cat, sub), ...parts.map(p => `   ${p}`)].join('\n') : 'Nothing to show yet.';
  return `<div class="te-preview" data-preview="${escapeHtml(sub.id)}">
    <div class="te-preview-title">Note preview <span>using the first button of each parameter</span></div>
    <pre>${escapeHtml(text)}</pre>
  </div>`;
}

// ---------- In-place updates, so typing keeps its place ----------
function fieldNode(id) {
  return document.querySelector(`[data-field="${CSS.escape(id)}"]`);
}

function refreshField(id) {
  const ctx = findField(id);
  const el = fieldNode(id);
  if (!ctx || !el) return;
  withFocusKept(() => { el.outerHTML = fieldHtml(ctx.cat, ctx.sub, ctx.field, isFiltering()); });
}

function refreshPreview(subId) {
  const ctx = findSub(subId);
  const el = document.querySelector(`[data-preview="${CSS.escape(subId)}"]`);
  if (ctx && el) el.outerHTML = previewHtml(ctx.cat, ctx.sub);
}

function syncFieldMarks(id) {
  const ctx = findField(id);
  const el = fieldNode(id);
  if (!ctx || !el) return;
  const modified = isFieldModified(ctx.field);
  el.classList.toggle('is-modified', modified);
  el.querySelector('[data-reset]').hidden = !BASE_FIELDS.has(id) || !modified;
}

function setStatus(selector, changed) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.classList.toggle('is-draft', changed > 0);
  el.setAttribute('aria-label', changed > 0 ? `${changed} changed` : 'No changes');
}

function refreshStatus() {
  const present = presentIds();
  tree.forEach((cat, i) => {
    const changed = categoryChangeCount(cat, present);
    setStatus(`[data-status="card-${i}"]`, changed);
    cat.submenus.forEach(sub => {
      setStatus(`[data-status="${CSS.escape(`sub-${sub.id}`)}"]`, submenuChangeCount(sub, present));
      const reset = document.querySelector(`[data-sub-reset="${CSS.escape(sub.id)}"]`);
      if (reset) reset.hidden = !isSubmenuModified(sub);
    });
    const summary = document.querySelector(`[data-summary="${i}"]`);
    if (summary) {
      const names = cat.noAccordion ? cat.submenus.flatMap(s => s.fields.map(f => f.label)) : cat.submenus.map(s => s.title);
      summary.innerHTML = (changed ? `<b>${changed} changed</b> · ` : '') + escapeHtml(names.join(', '));
    }
  });

  const count = changeCount();
  document.getElementById('noteStatus').textContent = count === 0 ? 'No changes yet' : `${count} ${count === 1 ? 'change' : 'changes'}. Live in ED Doc on this device.`;
  const lines = describeChanges();
  document.getElementById('diffOutput').value = lines.length
    ? lines.join('\n')
    : 'No changes yet. Edits apply to ED Doc on this device straight away.\n\nShare setup sends your template to a colleague as a file; they open it with Load setup.';
  document.getElementById('copyPromptBtn').disabled = count === 0;
  document.getElementById('shareSetupBtn').disabled = count === 0;
}

function afterEdit(subId) {
  saveSchema();
  if (subId) refreshPreview(subId);
  refreshStatus();
}

// ---------- Opening cards ----------
function toggleSection(i) {
  const name = tree[i].category;
  const opening = openSection !== name;
  const board = document.getElementById('main-sections');
  // The board is rebuilt, so cards are matched across the render by their tree index.
  const first = new Map(Array.from(board.querySelectorAll('.main-section[data-card]')).map(c => [c.dataset.card, c.getBoundingClientRect()]));
  const wasOpen = board.querySelector('.main-section.is-expanded[data-card]');
  const wasOpenKey = wasOpen ? wasOpen.dataset.card : null;
  openSection = opening ? name : null;
  openSubmenu = null;
  renderBoard();
  const opened = opening ? board.querySelector('.main-section.is-expanded') : null;
  // Scroll first and fold the jump into the glide below, so the screen makes one movement, not two.
  if (opened) teRevealCard(opened);
  teAnimateBoard(board, first, wasOpenKey, opened);
}

// Cards keep their order: an open card takes its own full row, so later tiles never jump above it.
// The last closed tile before each open card (and at the end) stretches over the cells left in its row.
function teFitBoard() {
  const board = document.getElementById('main-sections');
  const cards = Array.from(board.querySelectorAll('.main-section'));
  cards.forEach(c => { c.style.gridColumn = ''; });
  const columns = getComputedStyle(board).gridTemplateColumns.split(' ').length;
  if (columns < 2) return;
  let run = [];
  const close = () => {
    if (run.length) run[run.length - 1].style.gridColumn = `span ${columns - (run.length - 1) % columns}`;
    run = [];
  };
  cards.forEach(c => (c.classList.contains('is-expanded') ? close() : run.push(c)));
  close();
}

function teRevealCard(card) {
  const header = document.querySelector('body > header');
  const offset = (getComputedStyle(header).position === 'sticky' ? header.offsetHeight : 0) + 12;
  const top = card.getBoundingClientRect().top;
  if (top >= offset && top <= window.innerHeight * 0.5) return;
  window.scrollTo({ top: window.scrollY + top - offset, behavior: 'instant' });
}

function teMove(el, frames, options) {
  if (TE_REDUCED_MOTION.matches || !el || !el.animate) return null;
  return el.animate(frames, Object.assign({ duration: TE_BOARD_MS, easing: TE_BOARD_EASE }, options));
}

// Every tile glides from where it was to where it is now, growing or shrinking as its width changes.
function teAnimateBoard(board, first, wasOpenKey, opened) {
  if (TE_REDUCED_MOTION.matches) return;
  document.querySelectorAll('.te-ghost').forEach(g => g.remove());
  board.querySelectorAll('.main-section[data-card]').forEach(card => {
    const a = first.get(card.dataset.card);
    if (!a) return;
    const b = card.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    if (card === opened) {
      const clip = `inset(0 ${Math.max(0, b.width - a.width)}px ${Math.max(0, b.height - a.height)}px 0 round 8px)`;
      teMove(card, [{ transform: `translate(${dx}px, ${dy}px)`, clipPath: clip }, { transform: 'none', clipPath: 'inset(0 0 0 0 round 8px)' }]);
      teMove(card.querySelector('.main-content'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: TE_BOARD_MS * 0.7, delay: TE_BOARD_MS * 0.3, easing: 'ease-out', fill: 'backwards' });
      return;
    }
    const resized = Math.abs(a.width - b.width) > 1;
    if (dx || dy || resized) {
      const from = { transform: `translate(${dx}px, ${dy}px)` };
      const to = { transform: 'none' };
      if (resized) { from.width = `${a.width}px`; to.width = `${b.width}px`; }
      teMove(card, [from, to]);
    }
    if (card.dataset.card === wasOpenKey) {
      teCloseGhost(a, b);
      // The tile's summary and status come back once it has settled, rather than popping in mid-glide.
      card.querySelectorAll('.cb-summary, .cb-status').forEach(el => {
        teMove(el, [{ opacity: 0 }, { opacity: 1 }], { duration: TE_BOARD_MS * 0.4, delay: TE_BOARD_MS * 0.6, easing: 'ease-out', fill: 'backwards' });
      });
    }
  });
}

// The card that closes leaves a fading shell behind the tiles, shrinking from its open size into its tile.
function teCloseGhost(from, to) {
  const ghost = document.createElement('div');
  ghost.className = 'te-ghost';
  Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  document.body.appendChild(ghost);
  const inset = [to.top - from.top, from.right - to.right, from.bottom - to.bottom, to.left - from.left].map(v => `${Math.max(0, v)}px`).join(' ');
  const a = ghost.animate(
    [{ clipPath: 'inset(0 round 8px)', opacity: 1 }, { clipPath: `inset(${inset} round 8px)`, opacity: 0 }],
    { duration: TE_BOARD_MS, easing: TE_BOARD_EASE }
  );
  a.onfinish = a.oncancel = () => ghost.remove();
  // A tab that stops painting mid-animation must not leave the shell on the page.
  setTimeout(() => ghost.remove(), TE_BOARD_MS + 300);
}

function toggleSubmenu(id) {
  const opening = openSubmenu !== id;
  openSubmenu = opening ? id : null;
  renderBoard();
  if (opening) revealOpen('.section.is-open', '.te-sub-body');
}

function revealOpen(cardSelector, bodySelector) {
  const card = document.querySelector(cardSelector);
  const body = card && card.querySelector(bodySelector);
  if (!card) return;
  const reduced = TE_REDUCED_MOTION.matches;
  if (body && !reduced) {
    body.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  }
  const header = document.querySelector('body > header');
  const offset = (getComputedStyle(header).position === 'sticky' ? header.offsetHeight : 0) + 12;
  const top = card.getBoundingClientRect().top;
  if (top >= offset && top <= window.innerHeight * 0.5) return;
  window.scrollTo({ top: window.scrollY + top - offset, behavior: reduced ? 'auto' : 'smooth' });
}

function setTypeFilter(value) {
  typeFilter = value;
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.filter === value));
  });
  renderBoard();
}

// ---------- Parameter edits ----------
function updateField(id, key, value) {
  const ctx = findField(id);
  if (!ctx) return;
  const text = value.trim();
  if (key === 'label' && !text) {
    refreshField(id);
    return;
  }
  ctx.field[key] = text;
  syncFieldMarks(id);
  afterEdit(ctx.sub.id);
}

function updateLine(id, value) {
  const ctx = findField(id);
  if (!ctx) return;
  let line = value.trim();
  if (line && !line.includes('{value}')) line = `${line} {value}`;
  if (!line || line === schemaDefaultLine(ctx.field)) delete ctx.field.line;
  else ctx.field.line = line;
  const input = fieldNode(id) && fieldNode(id).querySelector('[data-key$=":line"]');
  if (input) input.value = ctx.field.line || schemaDefaultLine(ctx.field);
  syncFieldMarks(id);
  afterEdit(ctx.sub.id);
}

function setFieldOption(id, prop, value) {
  const ctx = findField(id);
  if (!ctx) return;
  if (value) ctx.field[prop] = true;
  else delete ctx.field[prop];
  refreshField(id);
  afterEdit(ctx.sub.id);
}

function parseChipList(text) {
  return text.split(',').map(s => s.trim()).filter(Boolean);
}

function addChips(id, input) {
  const ctx = findField(id);
  const added = parseChipList(input.value);
  input.value = '';
  if (!ctx || added.length === 0) return;
  const chips = ctx.field.chips || [];
  const labels = new Set(chips.map(c => chipLabel(c).toLowerCase()));
  added.forEach(label => {
    if (labels.has(label.toLowerCase())) return;
    labels.add(label.toLowerCase());
    chips.push(label);
  });
  ctx.field.chips = chips;
  refreshField(id);
  afterEdit(ctx.sub.id);
}

function moveField(id, delta) {
  const ctx = findField(id);
  if (!ctx) return;
  const list = ctx.sub.fields;
  const from = list.indexOf(ctx.field);
  const to = from + delta;
  if (to < 0 || to >= list.length) return;
  list.splice(from, 1);
  list.splice(to, 0, ctx.field);
  saveSchema();
  renderBoard();
}

function moveFieldTo(id, subId) {
  const ctx = findField(id);
  const target = subId && findSub(subId);
  if (!ctx || !target) return;
  ctx.sub.fields.splice(ctx.sub.fields.indexOf(ctx.field), 1);
  target.sub.fields.push(ctx.field);
  saveSchema();
  renderBoard();
  showToast(`Moved ${ctx.field.label} to ${target.sub.title}`);
}

function deleteField(id) {
  const ctx = findField(id);
  if (!ctx) return;
  const warning = FORM_FIELD_IDS.has(id) ? '\n\nThe PDF forms or the MyKad scanner fill this one. Without it they leave it blank.' : '';
  if (!confirm(`Delete parameter "${ctx.field.label}"?${warning}`)) return;
  ctx.sub.fields.splice(ctx.sub.fields.indexOf(ctx.field), 1);
  saveSchema();
  renderBoard();
}

function restoreFieldProps(field) {
  const base = BASE_FIELDS.get(field.id);
  if (!base) return;
  SCHEMA_FIELD_KEYS.forEach(k => {
    if (base.field[k] === undefined) delete field[k];
    else field[k] = schemaClone(base.field[k]);
  });
}

function revertField(id) {
  const ctx = findField(id);
  if (!ctx) return;
  restoreFieldProps(ctx.field);
  refreshField(id);
  afterEdit(ctx.sub.id);
}

// ---------- Button (chip) dialog ----------
function openChipModal(fieldId, index) {
  const ctx = findField(fieldId);
  if (!ctx || !ctx.field.chips || !ctx.field.chips[index]) return;
  chipEdit = { fieldId, index };
  const chip = ctx.field.chips[index];
  document.getElementById('chipLabel').value = chipLabel(chip);
  document.getElementById('chipOutput').value = chipOutput(chip) === chipLabel(chip) ? '' : chipOutput(chip);
  document.getElementById('chipTitle').textContent = `Button in ${ctx.field.label}`;
  document.getElementById('chipError').textContent = '';
  syncChipMoveButtons();
  openModal('chipModal', 'chipLabel');
}

function syncChipMoveButtons() {
  const ctx = chipEdit && findField(chipEdit.fieldId);
  if (!ctx) return;
  document.getElementById('chipEarlier').disabled = chipEdit.index === 0;
  document.getElementById('chipLater').disabled = chipEdit.index === ctx.field.chips.length - 1;
}

function moveChip(delta) {
  const ctx = chipEdit && findField(chipEdit.fieldId);
  if (!ctx) return;
  const chips = ctx.field.chips;
  const to = chipEdit.index + delta;
  if (to < 0 || to >= chips.length) return;
  const [chip] = chips.splice(chipEdit.index, 1);
  chips.splice(to, 0, chip);
  chipEdit.index = to;
  syncChipMoveButtons();
  refreshField(ctx.field.id);
  afterEdit(ctx.sub.id);
}

function deleteChip() {
  const ctx = chipEdit && findField(chipEdit.fieldId);
  if (!ctx) return;
  ctx.field.chips.splice(chipEdit.index, 1);
  if (!ctx.field.chips.length) delete ctx.field.multi;
  closeModal('chipModal');
  refreshField(ctx.field.id);
  afterEdit(ctx.sub.id);
}

function submitChipModal(event) {
  event.preventDefault();
  const ctx = chipEdit && findField(chipEdit.fieldId);
  if (!ctx) return;
  const label = document.getElementById('chipLabel').value.trim();
  const output = document.getElementById('chipOutput').value.trim();
  if (!label) {
    document.getElementById('chipError').textContent = 'The button needs some text.';
    return;
  }
  ctx.field.chips[chipEdit.index] = normalizeChip({ label, output: output || label });
  closeModal('chipModal');
  refreshField(ctx.field.id);
  afterEdit(ctx.sub.id);
}

// ---------- Submenu edits ----------
function updateSubmenu(id, key, value) {
  const ctx = findSub(id);
  if (!ctx) return;
  const text = value.trim();
  if (key === 'title' && !text) {
    renderBoard();
    return;
  }
  if (text) ctx.sub[key] = text;
  else delete ctx.sub[key];
  saveSchema();
  if (key === 'title') renderBoard();
  else afterEdit(id);
}

function moveSubmenu(id, delta) {
  const ctx = findSub(id);
  if (!ctx) return;
  const list = ctx.cat.submenus;
  const from = list.indexOf(ctx.sub);
  const to = from + delta;
  if (to < 0 || to >= list.length) return;
  list.splice(from, 1);
  list.splice(to, 0, ctx.sub);
  saveSchema();
  renderBoard();
}

function deleteSubmenu(id) {
  const ctx = findSub(id);
  if (!ctx) return;
  const n = ctx.sub.fields.length;
  if (!confirm(`Delete "${ctx.sub.title}" and its ${n} ${n === 1 ? 'parameter' : 'parameters'}?`)) return;
  ctx.cat.submenus.splice(ctx.cat.submenus.indexOf(ctx.sub), 1);
  if (openSubmenu === id) openSubmenu = null;
  saveSchema();
  renderBoard();
}

// Back to the shipped wording and parameters; parameters you added stay at the end.
function resetSubmenu(id) {
  const ctx = findSub(id);
  const base = BASE_SUBS.get(id);
  if (!ctx || !base) return;
  if (!confirm(`Reset "${ctx.sub.title}" to the default? Its shipped parameters come back as they were. Parameters you added stay.`)) return;
  SCHEMA_SUBMENU_KEYS.forEach(k => {
    if (base.sub[k] === undefined) delete ctx.sub[k];
    else ctx.sub[k] = base.sub[k];
  });
  const baseIds = new Set(base.sub.fields.map(f => f.id));
  const custom = ctx.sub.fields.filter(f => !BASE_FIELDS.has(f.id));
  const strays = ctx.sub.fields.filter(f => BASE_FIELDS.has(f.id) && !baseIds.has(f.id));
  tree.forEach(cat => cat.submenus.forEach(sub => {
    if (sub !== ctx.sub) sub.fields = sub.fields.filter(f => !baseIds.has(f.id));
  }));
  // Shipped parameters moved in from elsewhere go home, if home is still there.
  const keep = [];
  strays.forEach(f => {
    const home = findSub(BASE_FIELDS.get(f.id).subId);
    if (home && home.sub !== ctx.sub) home.sub.fields.push(f);
    else keep.push(f);
  });
  ctx.sub.fields = [...schemaClone(base.sub.fields), ...keep, ...custom];
  saveSchema();
  renderBoard();
}

function resetAllToBaseline() {
  if (!confirm('Reset everything back to the defaults? Your edits on this device will be discarded.')) return;
  tree = schemaClone(BASE_TEMPLATES);
  openSubmenu = null;
  saveSchema();
  renderBoard();
  showToast('Everything restored to the defaults.');
}

// ---------- Add dialog ----------
function usedIds() {
  const ids = new Set([...BASE_FIELDS.keys(), ...BASE_SUBS.keys()]);
  presentIds().forEach(id => ids.add(id));
  return ids;
}

function newId(stem, used) {
  let id = stem;
  for (let n = 2; used.has(id); n++) id = stem + n;
  used.add(id);
  return id;
}

function words(text) {
  return text.replace(/[^a-zA-Z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean);
}

function fieldStem(label) {
  return 'custom' + (words(label).map(w => w[0].toUpperCase() + w.slice(1)).join('') || 'Field');
}

function submenuStem(name) {
  return 'custom-' + (words(name).join('-').toLowerCase() || 'submenu');
}

// One parameter per line; buttons after a "|", separated by commas.
function parseParameterLines(text) {
  return text.split('\n').map(line => {
    const bar = line.indexOf('|');
    const label = (bar === -1 ? line : line.slice(0, bar)).trim();
    if (!label) return null;
    const chips = bar === -1 ? [] : Array.from(new Set(parseChipList(line.slice(bar + 1))));
    return { label, chips };
  }).filter(Boolean);
}

function openModal(id, focusId) {
  document.getElementById(id).classList.add('active');
  document.getElementById(focusId).focus();
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  if (id === 'chipModal') chipEdit = null;
}

function closeAddModal() {
  closeModal('addModal');
}

function closeChipModal() {
  closeModal('chipModal');
}

function openAddModal(categoryName, subId) {
  const select = document.getElementById('addSection');
  const names = tree.filter(c => !isFixedCategory(c)).map(c => c.category);
  select.innerHTML = names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  const wanted = [categoryName, openSection, 'HOPI'].find(n => names.includes(n)) || names[0];
  select.value = wanted;
  syncAddSubmenus(subId || openSubmenu);
  document.getElementById('addLines').value = '';
  document.getElementById('addNewSubmenu').value = '';
  document.getElementById('addMulti').checked = false;
  document.getElementById('addError').textContent = '';
  const isNew = document.getElementById('addSubmenu').value === NEW_SUBMENU && !findCat(wanted).noAccordion;
  openModal('addModal', isNew ? 'addNewSubmenu' : 'addLines');
}

function syncAddSubmenus(preferred) {
  const cat = findCat(document.getElementById('addSection').value);
  const select = document.getElementById('addSubmenu');
  const flat = !cat || cat.noAccordion;
  document.getElementById('addSubmenuWrap').hidden = flat;
  if (flat) {
    select.innerHTML = '';
  } else {
    select.innerHTML = cat.submenus.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}</option>`).join('')
      + `<option value="${NEW_SUBMENU}">New submenu…</option>`;
    const ids = [...cat.submenus.map(s => s.id), NEW_SUBMENU];
    select.value = ids.includes(preferred) ? preferred : (cat.submenus[0] ? cat.submenus[0].id : NEW_SUBMENU);
  }
  syncAddNewSubmenu();
}

function syncAddNewSubmenu() {
  const wrap = document.getElementById('addSubmenuWrap');
  const isNew = !wrap.hidden && document.getElementById('addSubmenu').value === NEW_SUBMENU;
  document.getElementById('addNewSubmenuWrap').hidden = !isNew;
}

function submitAddModal(event) {
  event.preventDefault();
  const cat = findCat(document.getElementById('addSection').value);
  const error = document.getElementById('addError');
  if (!cat) return;
  const isNew = !cat.noAccordion && document.getElementById('addSubmenu').value === NEW_SUBMENU;
  const subName = document.getElementById('addNewSubmenu').value.trim();
  const rows = parseParameterLines(document.getElementById('addLines').value);
  if (isNew && !subName) {
    error.textContent = 'Give the new submenu a name.';
    return;
  }
  if (!rows.length) {
    error.textContent = 'Add at least one parameter, one per line.';
    return;
  }

  const used = usedIds();
  let sub;
  if (cat.noAccordion) {
    sub = cat.submenus[0];
  } else if (isNew) {
    sub = { id: newId(submenuStem(subName), used), title: subName, noteHeader: subName, fields: [], custom: true };
    cat.submenus.push(sub);
  } else {
    sub = cat.submenus.find(s => s.id === document.getElementById('addSubmenu').value);
  }
  if (!sub) return;

  const multi = document.getElementById('addMulti').checked;
  const added = rows.map(row => {
    const field = {
      id: newId(fieldStem(row.label), used),
      label: row.label,
      prefix: row.label,
      chips: row.chips,
      placeholder: row.chips.length ? 'Tap buttons or type custom value...' : `Enter ${row.label}...`,
      custom: true
    };
    if (multi && row.chips.length) field.multi = true;
    sub.fields.push(field);
    return field;
  });

  saveSchema();
  closeAddModal();
  document.getElementById('searchInput').value = '';
  openSection = cat.category;
  openSubmenu = cat.noAccordion ? null : sub.id;
  setTypeFilter('all');
  const first = fieldNode(added[0].id);
  if (first) first.scrollIntoView({ block: 'center', behavior: TE_REDUCED_MOTION.matches ? 'auto' : 'smooth' });
  showToast(isNew ? `Added ${sub.title} with ${added.length} ${added.length === 1 ? 'parameter' : 'parameters'}` : `Added ${added.length} ${added.length === 1 ? 'parameter' : 'parameters'} to ${sub.title}`);
}

// ---------- Changes sheet ----------
function chipNames(chips) {
  return (chips || []).map(c => (chipOutput(c) !== chipLabel(c) ? `${chipLabel(c)} → ${chipOutput(c)}` : chipLabel(c))).join(', ');
}

function describeChanges() {
  const lines = [];
  const present = presentIds();
  tree.forEach(cat => {
    if (submenuOrderChanged(cat)) lines.push(`- ${cat.category}: submenus reordered (${cat.submenus.map(s => s.title).join(', ')})`);
    removedSubmenusOf(cat, present).forEach(s => lines.push(`- Deleted submenu: ${cat.category} > ${s.title}`));

    cat.submenus.forEach(sub => {
      const base = BASE_SUBS.get(sub.id);
      const where = cat.noAccordion ? cat.category : `${cat.category} > ${sub.title}`;
      if (!base) {
        lines.push(`- New submenu: ${where}`);
      } else {
        const shown = (s, k) => s[k] || { noteHeader: s.title, insertLabel: 'Insert', clearLabel: 'Clear' }[k] || '';
        SCHEMA_SUBMENU_KEYS.forEach(k => {
          if (!sameProp(k, sub[k], base.sub[k])) lines.push(`- ${where}: ${SUBMENU_WORDING[k]} "${shown(base.sub, k)}" → "${shown(sub, k)}"`);
        });
        if (fieldOrderChanged(sub)) lines.push(`- ${where}: parameters reordered or moved (${sub.fields.map(f => f.label).join(', ')})`);
        removedFieldsOf(sub.id, present).forEach(f => lines.push(`- Deleted parameter: ${where} > ${f.label}`));
      }

      sub.fields.forEach(field => {
        const bf = BASE_FIELDS.get(field.id);
        const kind = `${field.multi ? 'pick several' : 'pick one'}${field.long ? ', several lines' : ''}`;
        if (!bf) {
          lines.push(`- New parameter: ${where} > ${field.label} (id ${field.id})${field.chips && field.chips.length ? ` buttons [${chipNames(field.chips)}], ${kind}` : ''}; note line "${field.line || schemaDefaultLine(field)}"`);
          return;
        }
        const b = bf.field;
        const diffs = [];
        if (!sameProp('label', field.label, b.label)) diffs.push(`renamed from "${b.label}"`);
        if (!sameProp('placeholder', field.placeholder, b.placeholder)) diffs.push(`hint "${field.placeholder || ''}"`);
        if (!sameProp('prefix', field.prefix, b.prefix) || !sameProp('line', field.line, b.line)) diffs.push(`note line "${field.line || schemaDefaultLine(field)}"`);
        if (!sameProp('chips', field.chips, b.chips)) diffs.push(`buttons [${chipNames(field.chips)}] (was [${chipNames(b.chips)}])`);
        if (!sameProp('multi', field.multi, b.multi)) diffs.push(field.multi ? 'pick several' : 'pick one');
        if (!sameProp('long', field.long, b.long)) diffs.push(field.long ? 'several lines' : 'one line');
        if (diffs.length) lines.push(`- ${where} > ${field.label}: ${diffs.join('; ')}`);
      });
    });
  });
  return lines;
}

function setupPayload() {
  return { app: 'ED Doc template setup', version: 2, savedAt: new Date().toISOString(), overrides: buildOverrides() };
}

function copyPromptToClipboard() {
  const text = `Please make my ED Doc Template Editor changes permanent in assets/clinical_templates.js, so every device gets them.

Changes:
${describeChanges().join('\n')}

The exact setup (version 2 overrides; the format is described in assets/js/00-schema-overrides.js):
\`\`\`json
${JSON.stringify(buildOverrides(), null, 2)}
\`\`\``;
  const done = () => showToast('Changes copied. Paste them into your AI chat.');
  navigator.clipboard.writeText(text).then(done).catch(() => {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    done();
  });
}

function saveFile(name, type, text) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// On a phone this opens the share sheet (WhatsApp, AirDrop, email); elsewhere it saves the file.
async function shareSetup() {
  const text = JSON.stringify(setupPayload(), null, 2);
  const name = 'ed-doc-template-setup.json';
  const file = typeof File === 'function' ? new File([text], name, { type: 'application/json' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'ED Doc template setup' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  saveFile(name, 'application/json', text);
  showToast('Setup saved. Send the file to your colleague.');
}

function chooseSetupFile() {
  document.getElementById('setupFile').click();
}

function loadSetupFile(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  file.text().then(text => {
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      showToast('That file is not an ED Doc template setup.');
      return;
    }
    const payload = raw && raw.overrides ? raw.overrides : raw;
    let ov;
    if (isLegacySchemaOverrides(payload)) ov = migrateLegacySchemaOverrides(payload, BASE_TEMPLATES);
    else if (payload && payload.version === 2) ov = normalizeSchemaOverrides(payload);
    if (!ov) {
      showToast('That file is not an ED Doc template setup.');
      return;
    }
    if (!confirm(`Use the template setup in "${file.name}"? It replaces the edits on this device.`)) return;
    tree = applySchemaOverrides(schemaClone(BASE_TEMPLATES), ov);
    openSubmenu = null;
    saveSchema();
    renderBoard();
    showToast('Setup loaded. ED Doc uses it on this device now.');
  });
}

function cleanTemplates() {
  const copy = schemaClone(tree);
  copy.forEach(cat => cat.submenus.forEach(sub => {
    delete sub.custom;
    sub.fields.forEach(f => {
      delete f.custom;
      if (f.chips) f.chips = f.chips.map(normalizeChip);
      ['line', 'multi', 'long'].forEach(k => { if (!f[k]) delete f[k]; });
    });
  }));
  return copy;
}

// A ready replacement for assets/clinical_templates.js, with every edit built in.
function downloadTemplatesFile() {
  const text = `/**
 * ED DOC - CENTRALIZED CLINICAL TEMPLATES CONFIGURATION
 * Edit menus, submenus, parameters, and chip buttons directly in this file!
 * Changes made here will automatically render in the app and format clinical notes.
 */

const CLINICAL_TEMPLATES = ${JSON.stringify(cleanTemplates(), null, 2)};

if (typeof window !== 'undefined') {
  window.CLINICAL_TEMPLATES = CLINICAL_TEMPLATES;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CLINICAL_TEMPLATES;
}
`;
  saveFile('clinical_templates.js', 'text/javascript', text);
  showToast('Saved clinical_templates.js. It replaces assets/clinical_templates.js.');
}

function setNoteSheet(open) {
  document.body.classList.toggle('note-open', open);
  document.getElementById('noteToggle').setAttribute('aria-expanded', String(open));
}

function toggleNoteSheet() {
  if (TE_DOCKED.matches) return;
  setNoteSheet(!document.body.classList.contains('note-open'));
}

// On wide screens the Changes sheet is docked beside the board and always open (see the CSS of the same width).
const TE_DOCKED = window.matchMedia('screen and (min-width: 1181px)');

function initSheetDock() {
  const header = document.querySelector('body > header');
  const track = () => document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
  track();
  new ResizeObserver(track).observe(header);
  setNoteSheet(TE_DOCKED.matches);
  TE_DOCKED.addEventListener('change', () => setNoteSheet(TE_DOCKED.matches));
}

// The type filter's highlight slides from the old choice to the new one.
function teInitFilterPill() {
  const list = document.querySelector('.te-segments');
  let from = null;
  list.addEventListener('click', e => {
    const moving = list.querySelector(':scope > .te-pill');
    const active = list.querySelector(':scope > button[aria-pressed="true"]');
    from = e.target.closest('button') && (moving || active) ? { active, rect: (moving || active).getBoundingClientRect() } : null;
  }, true);
  // Registered on the document after 00-events.js, so this runs once the filter has switched.
  document.addEventListener('click', e => {
    if (!list.contains(e.target)) return;
    const start = from;
    from = null;
    const next = list.querySelector(':scope > button[aria-pressed="true"]');
    if (!start || !next || next === start.active || TE_REDUCED_MOTION.matches) return;
    list.querySelectorAll(':scope > .te-pill').forEach(p => p.remove());
    const box = list.getBoundingClientRect();
    const place = r => ({ left: `${r.left - box.left}px`, top: `${r.top - box.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const pill = document.createElement('span');
    pill.className = 'te-pill';
    pill.setAttribute('aria-hidden', 'true');
    Object.assign(pill.style, place(next.getBoundingClientRect()));
    list.prepend(pill);
    list.classList.add('te-pill-moving');
    const a = pill.animate([place(start.rect), place(next.getBoundingClientRect())], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    a.onfinish = a.oncancel = () => {
      pill.remove();
      if (!list.querySelector(':scope > .te-pill')) list.classList.remove('te-pill-moving');
    };
  });
}

function initSheet() {
  const sheet = document.querySelector('.output-container');
  const header = document.getElementById('docHeaderRow');

  // The closed sheet stays reachable: tabbing into its contents opens it.
  sheet.addEventListener('focusin', e => {
    if (!header.contains(e.target)) setNoteSheet(true);
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const modal = document.querySelector('.modal-backdrop.active');
    if (modal) {
      closeModal(modal.id);
    } else if (!TE_DOCKED.matches && document.body.classList.contains('note-open')) {
      setNoteSheet(false);
      document.getElementById('noteToggle').focus();
    }
  });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => t.classList.remove('show'), 2500);
}

const TE_SUN_SVG = '<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
const TE_MOON_SVG = '<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

function syncThemeButton() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const btn = document.getElementById('themeToggleBtn');
  // A small icon toggle, as in ED Doc; the words stay for screen readers.
  btn.innerHTML = isLight ? `<span>Night Mode</span> ${TE_MOON_SVG}` : `<span>Day Mode</span> ${TE_SUN_SVG}`;
  btn.title = isLight ? 'Switch to Night Mode (Ctrl+Shift+L)' : 'Switch to Day Mode (Ctrl+Shift+L)';
  document.getElementById('themeMetaColor').setAttribute('content', isLight ? '#f1f3f6' : '#0f1114');
}

function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ed_doc_theme', next);
  syncThemeButton();
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

window.addEventListener('DOMContentLoaded', init);

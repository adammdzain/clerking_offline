// Template Editor changes, saved on this device and applied each time ED Doc starts.
// Only differences from the shipped templates (assets/clinical_templates.js) are stored,
// so anything added to the shipped file later still shows up. Shape (version 2):
// {
//   version: 2,
//   fields:   { id: { label, prefix, line, placeholder, chips, multi, long } }       changed values only
//   submenus: { id: { title, noteHeader, insertLabel, clearLabel, fields: [ids] } }  fields: full order, when changed
//   order:    { category: [submenu ids] }                                           full order, when changed
//   addedFields:   { id: { home: submenuId, label, prefix, line, placeholder, chips, multi, long } }
//   addedSubmenus: { id: { category, title, noteHeader } }
//   removed: [ids of shipped fields and submenus]
// }
// A chip is a string, or { label, output } when the note should say something other than the button.
const SCHEMA_OVERRIDES_KEY = 'ed_doc_schema_v2';
const SCHEMA_LEGACY_KEY = 'ed_doc_schema_overrides';
const SCHEMA_FIELD_KEYS = ['label', 'prefix', 'line', 'placeholder', 'chips', 'multi', 'long'];
const SCHEMA_SUBMENU_KEYS = ['title', 'noteHeader', 'insertLabel', 'clearLabel'];
const SCHEMA_HOPI_CONTAINER = 'sections-container';
const SCHEMA_VITALS_SUBMENU = 'vital-signs-section';

function emptySchemaOverrides() {
  return { version: 2, fields: {}, submenus: {}, order: {}, addedFields: {}, addedSubmenus: {}, removed: [] };
}

function schemaClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function chipLabel(chip) {
  return typeof chip === 'string' ? chip : String((chip && chip.label) || '');
}

function chipOutput(chip) {
  if (typeof chip === 'string') return chip;
  return String((chip && (chip.output || chip.label)) || '');
}

// The stored form: a plain string unless the note wording differs from the button.
function normalizeChip(chip) {
  const label = chipLabel(chip).trim();
  const output = chipOutput(chip).trim();
  return output && output !== label ? { label, output } : label;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// Makes any parsed value safe to apply: unknown keys and wrong types are dropped.
function normalizeSchemaOverrides(raw) {
  const ov = emptySchemaOverrides();
  if (!isPlainObject(raw)) return ov;
  const text = v => (typeof v === 'string' ? v : undefined);
  const ids = list => (Array.isArray(list) ? list.filter(id => typeof id === 'string') : undefined);
  const fieldProps = src => {
    const out = {};
    if (!isPlainObject(src)) return out;
    ['label', 'prefix', 'line', 'placeholder'].forEach(k => { if (text(src[k]) !== undefined) out[k] = src[k]; });
    if (Array.isArray(src.chips)) out.chips = src.chips.map(normalizeChip).filter(c => chipLabel(c));
    ['multi', 'long'].forEach(k => { if (typeof src[k] === 'boolean') out[k] = src[k]; });
    return out;
  };

  if (isPlainObject(raw.fields)) {
    Object.entries(raw.fields).forEach(([id, src]) => { ov.fields[id] = fieldProps(src); });
  }
  if (isPlainObject(raw.submenus)) {
    Object.entries(raw.submenus).forEach(([id, src]) => {
      if (!isPlainObject(src)) return;
      const out = {};
      SCHEMA_SUBMENU_KEYS.forEach(k => { if (text(src[k]) !== undefined) out[k] = src[k]; });
      if (ids(src.fields)) out.fields = ids(src.fields);
      ov.submenus[id] = out;
    });
  }
  if (isPlainObject(raw.order)) {
    Object.entries(raw.order).forEach(([category, list]) => { if (ids(list)) ov.order[category] = ids(list); });
  }
  if (isPlainObject(raw.addedFields)) {
    Object.entries(raw.addedFields).forEach(([id, src]) => {
      if (!isPlainObject(src) || typeof src.home !== 'string') return;
      ov.addedFields[id] = Object.assign({ home: src.home, label: id }, fieldProps(src));
    });
  }
  if (isPlainObject(raw.addedSubmenus)) {
    Object.entries(raw.addedSubmenus).forEach(([id, src]) => {
      if (!isPlainObject(src) || typeof src.category !== 'string' || typeof src.title !== 'string') return;
      ov.addedSubmenus[id] = { category: src.category, title: src.title, noteHeader: text(src.noteHeader) || src.title };
    });
  }
  ov.removed = ids(raw.removed) || [];
  return ov;
}

function isLegacySchemaOverrides(raw) {
  return isPlainObject(raw) && raw.version !== 2 && ('changed' in raw || 'added' in raw);
}

// The first Template Editor stored { changed, removed, added } keyed by section and submenu names.
function migrateLegacySchemaOverrides(v1, templates) {
  const ov = emptySchemaOverrides();
  const staticHome = { 'Patient Demographic': 'demographic-section', 'Medical History': 'history-section' };
  const staticIds = new Set();
  templates.forEach(cat => cat.submenus.forEach(sub => {
    if (Object.values(staticHome).includes(sub.id)) sub.fields.forEach(f => staticIds.add(f.id));
  }));

  Object.entries(isPlainObject(v1.changed) ? v1.changed : {}).forEach(([id, c]) => {
    if (!isPlainObject(c)) return;
    const f = {};
    if (typeof c.field === 'string') f.label = c.field;
    if (typeof c.prefix === 'string') f.prefix = c.prefix;
    // Those tabs wrote the label into the note, so a renamed label keeps doing that.
    if (staticIds.has(id) && typeof c.field === 'string') f.prefix = c.field;
    if (typeof c.placeholder === 'string') f.placeholder = c.placeholder;
    if (Array.isArray(c.chips)) f.chips = c.chips;
    if (c.type === 'textarea') f.long = true;
    ov.fields[id] = f;
  });

  ov.removed = Array.isArray(v1.removed) ? v1.removed.filter(id => typeof id === 'string') : [];

  (Array.isArray(v1.added) ? v1.added : []).forEach(item => {
    if (!isPlainObject(item) || typeof item.id !== 'string') return;
    let home = staticHome[item.section];
    if (!home) {
      const cat = templates.find(c => c.category === item.section);
      if (!cat) return;
      const sub = cat.submenus.find(s => s.title === item.submenu);
      if (sub) {
        home = sub.id;
      } else {
        home = Object.keys(ov.addedSubmenus).find(id => ov.addedSubmenus[id].category === item.section && ov.addedSubmenus[id].title === item.submenu);
        if (!home) {
          home = `custom-${item.id}`;
          ov.addedSubmenus[home] = { category: item.section, title: item.submenu, noteHeader: item.submenu };
        }
      }
    }
    ov.addedFields[item.id] = {
      home,
      label: item.field || item.id,
      prefix: staticHome[item.section] ? (item.field || '') : (item.prefix || ''),
      placeholder: item.placeholder || '',
      chips: Array.isArray(item.chips) ? item.chips : [],
      long: item.type === 'textarea'
    };
  });
  return normalizeSchemaOverrides(ov);
}

function readSchemaOverrides() {
  try {
    const raw = localStorage.getItem(SCHEMA_OVERRIDES_KEY);
    if (raw) return normalizeSchemaOverrides(JSON.parse(raw));
  } catch (e) {}
  try {
    const legacy = localStorage.getItem(SCHEMA_LEGACY_KEY);
    if (legacy && window.CLINICAL_TEMPLATES) {
      const ov = migrateLegacySchemaOverrides(JSON.parse(legacy), window.CLINICAL_TEMPLATES);
      writeSchemaOverrides(ov);
      localStorage.removeItem(SCHEMA_LEGACY_KEY);
      return ov;
    }
  } catch (e) {}
  return emptySchemaOverrides();
}

function isEmptySchemaOverrides(ov) {
  return ['fields', 'submenus', 'order', 'addedFields', 'addedSubmenus'].every(k => Object.keys(ov[k]).length === 0) && ov.removed.length === 0;
}

function writeSchemaOverrides(ov) {
  try {
    if (isEmptySchemaOverrides(ov)) localStorage.removeItem(SCHEMA_OVERRIDES_KEY);
    else localStorage.setItem(SCHEMA_OVERRIDES_KEY, JSON.stringify(ov));
  } catch (e) {}
}

// Turns the shipped templates into the edited ones, in place. The app and the editor both use this,
// so what the editor shows is exactly what ED Doc draws.
function applySchemaOverrides(templates, ov) {
  const subs = new Map();
  const fields = new Map();
  const home = new Map();
  templates.forEach(cat => cat.submenus.forEach(sub => {
    subs.set(sub.id, { sub, cat });
    sub.fields.forEach(f => {
      fields.set(f.id, f);
      home.set(f.id, sub.id);
    });
  }));

  Object.entries(ov.addedSubmenus).forEach(([id, def]) => {
    const cat = templates.find(c => c.category === def.category);
    if (!cat || subs.has(id)) return;
    const sub = { id, title: def.title, noteHeader: def.noteHeader || def.title, fields: [], custom: true };
    cat.submenus.push(sub);
    subs.set(id, { sub, cat });
  });

  Object.entries(ov.addedFields).forEach(([id, def]) => {
    if (fields.has(id) || !subs.has(def.home)) return;
    const f = { id, custom: true };
    SCHEMA_FIELD_KEYS.forEach(k => { if (def[k] !== undefined) f[k] = schemaClone(def[k]); });
    fields.set(id, f);
    home.set(id, def.home);
    subs.get(def.home).sub.fields.push(f);
  });

  Object.entries(ov.fields).forEach(([id, change]) => {
    const f = fields.get(id);
    if (!f) return;
    SCHEMA_FIELD_KEYS.forEach(k => { if (change[k] !== undefined) f[k] = schemaClone(change[k]); });
  });

  // A field listed under another submenu has been moved there.
  const target = new Map(home);
  Object.entries(ov.submenus).forEach(([subId, change]) => {
    if (!subs.has(subId) || !change.fields) return;
    change.fields.forEach(id => { if (fields.has(id)) target.set(id, subId); });
  });
  const reordered = new Map();
  subs.forEach(({ sub }, subId) => {
    const isHere = id => target.get(id) === subId;
    const listed = (ov.submenus[subId] && ov.submenus[subId].fields) || [];
    const ordered = listed.filter((id, i) => fields.has(id) && isHere(id) && listed.indexOf(id) === i);
    const rest = sub.fields.map(f => f.id).filter(id => isHere(id) && !ordered.includes(id));
    reordered.set(subId, [...ordered, ...rest].map(id => fields.get(id)));
  });
  reordered.forEach((list, subId) => { subs.get(subId).sub.fields = list; });

  Object.entries(ov.submenus).forEach(([id, change]) => {
    const entry = subs.get(id);
    if (!entry) return;
    SCHEMA_SUBMENU_KEYS.forEach(k => { if (change[k] !== undefined) entry.sub[k] = change[k]; });
  });

  templates.forEach(cat => {
    const listed = ov.order[cat.category];
    if (!listed) return;
    const byId = new Map(cat.submenus.map(s => [s.id, s]));
    const ordered = listed.filter((id, i) => byId.has(id) && listed.indexOf(id) === i);
    cat.submenus = [...ordered.map(id => byId.get(id)), ...cat.submenus.filter(s => !ordered.includes(s.id))];
  });

  const removed = new Set(ov.removed);
  templates.forEach(cat => {
    cat.submenus = cat.submenus.filter(s => !removed.has(s.id));
    cat.submenus.forEach(s => { s.fields = s.fields.filter(f => !removed.has(f.id)); });
  });
  return templates;
}

// ---------- Note wording, shared by the app and the editor's preview ----------
function schemaDefaultLine(field) {
  const suffix = field.suffix || '';
  return field.prefix ? `${field.prefix}: {value}${suffix}` : `{value}${suffix}`;
}

function formatFieldLine(field, value) {
  const line = field.line || schemaDefaultLine(field);
  return line.includes('{value}') ? line.split('{value}').join(value) : `${line} ${value}`.trim();
}

function formatSubmenuParts(submenu, valueOf) {
  const parts = [];
  const groups = {};
  submenu.fields.forEach(f => {
    const val = valueOf(f);
    if (!val) return;
    if (f.group) {
      (groups[f.group] = groups[f.group] || []).push(`${f.prefix} ${val}${f.suffix || ''}`);
      return;
    }
    parts.push(formatFieldLine(f, val));
  });
  Object.keys(groups).forEach(group => {
    if (submenu.id === SCHEMA_VITALS_SUBMENU) {
      parts.push(groups[group].join(', '));
    } else {
      parts.push(`${group.charAt(0).toUpperCase() + group.slice(1)}: ${groups[group].join(', ')}`);
    }
  });
  return parts;
}

function submenuNoteHeader(category, submenu) {
  const header = submenu.noteHeader || submenu.title;
  return category.containerId === SCHEMA_HOPI_CONTAINER ? `History of Presenting Illness - ${header}` : header;
}

// tags.js — pill "tags" with a searchable picker popover, shared by the Conditions and
// Other columns.
//
// Each field is stored per creature as a string[] (see state.js). This module owns only
// the *transient* picker UI (open/close/position/filter) — none of it is persisted. The
// popover is a fixed-position panel plus a full-viewport backdrop that closes it on any
// outside click. Applying a tag mutates state through the state.js tag helpers (each of
// which calls save()) and then asks render.js to refresh just the affected row's cell —
// never a full table rebuild, so the table's own inputs keep focus.
//
// The two columns plug in through FIELD_CONFIG: Conditions offers a predefined 5e list
// (plus custom); Other has no predefined list at all, so its picker only ever offers to
// add exactly what you typed.
//
// Because the backdrop (z-index 40) covers the whole app while open, every other click
// hits the backdrop and closes the picker first — so no structural change (remove /
// reset / add) can fire underneath an open picker with a stale creatureId.

import { state, hasTag, addTag, removeTag, toggleTag } from './state.js';
import { updateTagsCell } from './render.js';

// Standard D&D 5e conditions offered in the Conditions picker; custom names allowed too.
const CONDITIONS_5E = [
  'Blinded', 'Charmed', 'Concentration', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned',
  'Prone', 'Restrained', 'Stunned', 'Unconscious',
];

// Per-field picker config: the predefined option list (empty = free-text only) and the
// search placeholder.
const FIELD_CONFIG = {
  conditions: { options: CONDITIONS_5E, placeholder: 'Add a condition…' },
  other: { options: [], placeholder: 'Add a note…' },
};

// Transient picker state — never saved. `x`/`y` are viewport coords captured when the
// trigger is clicked (the popover is position:fixed, so it doesn't track scroll).
const picker = { open: false, field: null, creatureId: null, x: 0, y: 0, filter: '' };

let backdropEl = null;
let popEl = null;

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// Open (or re-anchor) the picker under `triggerEl` for a given creature + field.
export function openPicker(field, creatureId, triggerEl) {
  closePicker(); // tear down any existing popover first
  const rect = triggerEl.getBoundingClientRect();
  picker.open = true;
  picker.field = field;
  picker.creatureId = creatureId;
  picker.filter = '';
  picker.x = clamp(rect.left, 8, window.innerWidth - 240);
  picker.y = Math.min(rect.bottom + 6, window.innerHeight - 300);
  if (picker.y < 8) picker.y = 8;
  document.addEventListener('keydown', onDocKey);
  buildPopover();
}

export function closePicker() {
  document.removeEventListener('keydown', onDocKey);
  if (backdropEl) { backdropEl.remove(); backdropEl = null; }
  if (popEl) { popEl.remove(); popEl = null; }
  picker.open = false;
  picker.field = null;
  picker.creatureId = null;
  picker.filter = '';
}

// Escape closes from anywhere, even if focus has left the search box (e.g. after
// clicking an option, whose button gets rebuilt out from under the focus).
function onDocKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); closePicker(); }
}

function config() { return FIELD_CONFIG[picker.field] || FIELD_CONFIG.conditions; }

// The predefined options matching the current filter (substring, case-insensitive).
// Empty for free-text fields like Other.
function filteredOptions() {
  const { options } = config();
  const f = picker.filter.trim().toLowerCase();
  if (!f) return options.slice();
  return options.filter((n) => n.toLowerCase().includes(f));
}

function pickerCreature() {
  return state.creatures.find((c) => c.id === picker.creatureId) || null;
}

// Build the popover shell (backdrop + panel + search) once per open, then fill the
// option list. Typing only rebuilds the list (renderOptions), so the search input keeps
// focus and caret position.
function buildPopover() {
  backdropEl = document.createElement('div');
  backdropEl.className = 'cond-backdrop';
  backdropEl.addEventListener('click', closePicker);

  popEl = document.createElement('div');
  popEl.className = 'cond-pop';
  popEl.style.left = `${picker.x}px`;
  popEl.style.top = `${picker.y}px`;

  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'cond-search';
  search.placeholder = config().placeholder;
  search.value = picker.filter;
  search.addEventListener('input', (e) => {
    picker.filter = e.target.value;
    renderOptions();
  });
  search.addEventListener('keydown', onSearchKey);

  const list = document.createElement('div');
  list.className = 'cond-list';

  popEl.append(search, list);
  document.body.append(backdropEl, popEl);
  renderOptions();
  search.focus();
}

// Enter: toggle the first predefined match if any, else add the typed value as custom.
function onSearchKey(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const filter = picker.filter.trim();
  if (!filter) return;
  const opts = filteredOptions();
  if (opts.length > 0) toggleTag(picker.creatureId, picker.field, opts[0]);
  else addTag(picker.creatureId, picker.field, filter);
  afterApply(true);
}

// Rebuild only the option list: each predefined option (checked when applied), plus a
// custom-add row or an empty state depending on the filter.
function renderOptions() {
  if (!popEl) return;
  const list = popEl.querySelector('.cond-list');
  list.innerHTML = '';
  const c = pickerCreature();
  const { options } = config();
  const filter = picker.filter.trim();
  const filtered = filteredOptions();

  for (const name of filtered) {
    list.appendChild(optionRow(name, c ? hasTag(c, picker.field, name) : false));
  }

  const exactMatch = options.some((n) => n.toLowerCase() === filter.toLowerCase());
  const alreadyApplied = c ? hasTag(c, picker.field, filter) : false;
  if (filter !== '' && !exactMatch && !alreadyApplied) {
    list.appendChild(customRow(filter));           // offer to add the typed value
  } else if (options.length > 0 && filter !== '' && filtered.length === 0) {
    // No predefined option matched and nothing to custom-add. Only meaningful when there
    // IS a predefined list — a free-text field (Other) has none, so it stays silent.
    const empty = document.createElement('div');
    empty.className = 'cond-empty';
    empty.textContent = 'No matches';
    list.appendChild(empty);
  }
}

// Lucide "check" glyph — static markup, no user data, so innerHTML is safe. Shown via
// CSS only on .is-applied rows.
const CHECK_ICON =
  '<svg class="cond-check" viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M20 6 9 17l-5-5"></path></svg>';

function optionRow(name, applied) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = applied ? 'cond-opt is-applied' : 'cond-opt';
  const label = document.createElement('span');
  label.textContent = name; // known list, but keep it text for consistency
  b.appendChild(label);
  b.insertAdjacentHTML('beforeend', CHECK_ICON);
  b.addEventListener('click', () => {
    toggleTag(picker.creatureId, picker.field, name);
    afterApply(false); // keep the search text so filtering continues
  });
  return b;
}

function customRow(query) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cond-opt cond-opt-custom';
  b.appendChild(document.createTextNode('Add '));
  const strong = document.createElement('b');
  strong.textContent = `“${query}”`; // “query”
  b.appendChild(strong);
  b.addEventListener('click', () => {
    const val = picker.filter.trim();
    if (!val) return;
    addTag(picker.creatureId, picker.field, val);
    afterApply(true);
  });
  return b;
}

// Refresh the row's cell and the option list; the popover stays open for more adds.
// `clearFilter` empties the search after custom/Enter adds so the box is ready to type
// again; option toggles keep it.
function afterApply(clearFilter) {
  updateTagsCell(picker.creatureId, picker.field);
  const search = popEl && popEl.querySelector('.cond-search');
  if (clearFilter) {
    picker.filter = '';
    if (search) search.value = '';
  }
  renderOptions();
  if (search) search.focus();
}

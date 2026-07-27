// render.js — builds the table from state and applies targeted updates.
//
// Two update paths (see main.js for when each fires):
//   renderTable()   — full rebuild + re-sort (load, #/Name blur, add, remove, reset)
//   renderHighlight()— move the active-row class + refresh header (Start/Next)
//   updateHpCell(id)— rewrite one row's Current HP + downed state (live Max/Temp/dmg/heal)

import { state } from './state.js';
import { sortedRows } from './order.js';
import { isDowned, clamp } from './hp.js';

const COLUMN_COUNT = 10; // #, Name, AC, Max HP, Temp HP, Current HP, Damage/Heal, Conditions, Other, remove

function tbody() {
  return document.getElementById('creature-rows');
}

// Full rebuild of the table body in sorted order.
export function renderTable() {
  const body = tbody();
  body.innerHTML = '';
  const rows = sortedRows(state.creatures);
  if (rows.length === 0) {
    body.appendChild(emptyRow());
  } else {
    const frag = document.createDocumentFragment();
    for (const c of rows) {
      frag.appendChild(buildRow(c));
    }
    body.appendChild(frag);
  }
  renderHeader();
}

// Ids of the rows as currently rendered, top to bottom. Lets main.js skip work
// when the sort order hasn't actually changed.
export function currentRowOrder() {
  return [...tbody().querySelectorAll('tr')].map((tr) => Number(tr.dataset.id));
}

// Re-sort by MOVING the existing <tr> nodes into place rather than rebuilding them.
// Critical for Tab: the field the user is tabbing into keeps its identity, so focus
// (and any in-progress edit) survives the re-sort.
export function reorderRows() {
  const body = tbody();
  for (const c of sortedRows(state.creatures)) {
    const tr = body.querySelector(`tr[data-id="${c.id}"]`);
    if (tr) body.appendChild(tr); // appendChild moves an existing node
  }
}

// Update the Round counter and Start/Next button label.
export function renderHeader() {
  document.getElementById('round-value').textContent = state.round;
  document.getElementById('start-next-btn').textContent = state.started ? 'Next turn' : 'Start';
}

// Move the highlight without rebuilding rows (preserves any in-progress field edits).
export function renderHighlight() {
  const body = tbody();
  for (const tr of body.querySelectorAll('tr')) {
    tr.classList.toggle('active', Number(tr.dataset.id) === state.activeId);
  }
  renderHeader();
}

// Refresh one row's HP display in place — no rebuild, so focus and Tab order survive.
// (HP never affects sort position, so no re-sort is needed either.)
export function updateHpCell(id) {
  const tr = tbody().querySelector(`tr[data-id="${id}"]`);
  if (!tr) return;
  const c = state.creatures.find((x) => x.id === id);
  if (!c) return;
  // Damage is applied temp-first, so the Temp HP field can change underneath the DM.
  // Keep it in sync, but never clobber it while they're typing in it.
  const temp = tr.querySelector('.f-temphp');
  if (temp && document.activeElement !== temp) temp.value = blankIfZero(c.tempHP);
  const cell = tr.querySelector('.cell-current');
  if (cell) {
    cell.innerHTML = '';
    cell.appendChild(hpCellContent(c));
  }
  tr.classList.toggle('downed', isDowned(c));
}

// Rewrite one row's tag cell (`conditions` or `other`) in place — used when a pill is
// added/removed via the picker or its ✕. Only touches this cell, so table inputs
// elsewhere keep focus.
export function updateTagsCell(id, field) {
  const tr = tbody().querySelector(`tr[data-id="${id}"]`);
  if (!tr) return;
  const c = state.creatures.find((x) => x.id === id);
  if (!c) return;
  const cell = tr.querySelector(`.cond-cell[data-field="${field}"]`);
  if (cell) cell.replaceWith(tagsContent(c, field));
}

// ---- Row construction (DOM API => values are set as .value, never parsed as HTML) ----

function buildRow(c) {
  const tr = document.createElement('tr');
  tr.dataset.id = c.id;
  if (c.id === state.activeId) tr.classList.add('active');
  if (isDowned(c)) tr.classList.add('downed');

  tr.appendChild(initCell(c)); // # (may be negative)
  tr.appendChild(td(textInput('f-name', c.name, { placeholder: 'Name' }), 'cell-name'));
  tr.appendChild(acCell(c));
  // 0 shows as the '—' placeholder, not as "0": zero Max HP means "not configured yet"
  // (see hp.js) and zero Temp HP means "none" — an em dash reads as either, a 0 doesn't.
  tr.appendChild(td(numInput('f-maxhp', blankIfZero(c.maxHP), { placeholder: '—' }), 'cell-maxhp', 'Max HP'));
  tr.appendChild(td(numInput('f-temphp', blankIfZero(c.tempHP), { placeholder: '—' }), 'cell-temphp', 'Temp HP'));
  tr.appendChild(currentCell(c));
  tr.appendChild(adjustCell());
  tr.appendChild(tagsCell(c, 'conditions'));
  tr.appendChild(tagsCell(c, 'other'));
  tr.appendChild(actionsCell());
  return tr;
}

function emptyRow() {
  const tr = document.createElement('tr');
  tr.className = 'empty-row';
  const cell = document.createElement('td');
  cell.colSpan = COLUMN_COUNT;
  cell.textContent = 'No creatures yet — add one to begin.';
  tr.appendChild(cell);
  return tr;
}

// `cls`/`label` are only needed for the card layout (narrow screens): `cls` gives the
// card CSS something to position on, `label` feeds the `::before` field caption that
// stands in for the (hidden) column header.
function td(child, cls, label) {
  const cell = document.createElement('td');
  if (cls) cell.className = cls;
  if (label) cell.dataset.label = label;
  cell.appendChild(child);
  return cell;
}

// Lucide "sport-shoe" glyph — the initiative twin of SHIELD_ICON below, same stroke
// language so the two card pills read as one set: 24 viewBox, 2px round stroke. Static
// markup with no user data, so innerHTML is safe.
const SHOE_ICON =
  '<svg class="init-shoe" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="m15 10.42 4.8-5.07"></path><path d="M19 18h3"></path>' +
  '<path d="M9.5 22 21.414 9.415A2 2 0 0 0 21.2 6.4l-5.61-4.208A1 1 0 0 0 14 3v2a2 2 0 0 ' +
  '1-1.394 1.906L8.677 8.053A1 1 0 0 0 8 9c-.155 6.393-2.082 9-4 9a2 2 0 0 0 0 4h14"></path></svg>';

// # (initiative) sits in its own cell alongside the TURN flag, which is always
// present and shown purely via CSS (tr.active .turn-flag) — no extra render work
// needed when the highlight moves via renderHighlight().
//
// The wrapper is inert on desktop; in the card layout it becomes the shoe pill (the
// icon standing in for the hidden "Initiative" column header), and the flag positions
// itself against the card rather than against the wrapper — see the card block in
// styles.css.
function initCell(c) {
  const cell = document.createElement('td');
  cell.className = 'cell-init';
  cell.dataset.label = 'Init';
  const wrap = document.createElement('div');
  wrap.className = 'init-wrap';
  wrap.innerHTML = SHOE_ICON; // static markup only — the input is appended as a node
  wrap.appendChild(numInput('f-init', c.init, { placeholder: '—' }));
  const flag = document.createElement('span');
  flag.className = 'turn-flag';
  flag.textContent = 'TURN';
  wrap.appendChild(flag);
  cell.appendChild(wrap);
  return cell;
}

// Lucide "shield" glyph — a static constant with no user data, so innerHTML is safe.
// Only visible in the card layout, where it labels the AC pill in place of the (hidden)
// column header; the desktop table hides it and keeps its "AC" <th>.
const SHIELD_ICON =
  '<svg class="ac-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 ' +
  '1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>';

// AC gets its own wrapper so the card layout can draw the icon + value as one shield
// pill; on desktop the wrapper is transparent and only the input shows.
function acCell(c) {
  const cell = document.createElement('td');
  cell.className = 'cell-ac';
  cell.dataset.label = 'AC';
  const wrap = document.createElement('div');
  wrap.className = 'ac-wrap';
  wrap.innerHTML = SHIELD_ICON; // static markup only — the input is appended as a node
  wrap.appendChild(numInput('f-ac', c.ac, { placeholder: '—' }));
  cell.appendChild(wrap);
  return cell;
}

// '' for 0 so a numeric field falls back to its '—' placeholder instead of reading "0".
function blankIfZero(n) {
  return n ? n : '';
}

function numInput(cls, value, opts = {}) {
  const i = document.createElement('input');
  i.type = 'text';
  i.inputMode = 'numeric';
  i.className = cls;
  i.value = value === '' || value == null ? '' : value;
  if (opts.placeholder) i.placeholder = opts.placeholder;
  return i;
}

function textInput(cls, value, opts = {}) {
  const i = document.createElement('input');
  i.type = 'text';
  i.className = cls;
  i.value = value == null ? '' : value;
  if (opts.placeholder) i.placeholder = opts.placeholder;
  return i;
}

// Damage/Healing amount: a transient action input — always starts empty, never stores
// a value.
function actionInput(cls) {
  const i = document.createElement('input');
  i.type = 'text';
  i.inputMode = 'numeric';
  i.className = cls;
  i.value = '';
  i.placeholder = '0';
  return i;
}

// Lucide minus / plus glyphs — static constants with no user data, so innerHTML is safe.
const MINUS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M5 12h14"></path></svg>';
const PLUS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 5v14M5 12h14"></path></svg>';

// Damage / Heal: one shared amount field plus the two apply buttons, joined into a
// single pill. Appended in Tab order — amount → Dmg → Heal — which is also their
// left-to-right reading order, so tabbing never has to reach back.
function adjustCell() {
  const cell = document.createElement('td');
  cell.className = 'cell-adjust';
  cell.dataset.label = 'Damage / Heal';
  const ctl = document.createElement('div');
  ctl.className = 'r-ctl';
  ctl.append(
    actionInput('r-amt f-adjust'), // r-amt styles the segment; f-adjust is what main.js routes on
    applyButton('r-dmg', 'Dmg', MINUS_ICON),
    applyButton('r-heal', 'Heal', PLUS_ICON),
  );
  cell.appendChild(ctl);
  return cell;
}

// One of the two colored apply buttons. Its visible label is its accessible name;
// main.js finds the amount to apply via the shared `.r-ctl` wrapper.
function applyButton(cls, label, icon) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `r-side ${cls}`;
  b.innerHTML = icon;
  b.appendChild(document.createTextNode(label));
  return b;
}

function currentCell(c) {
  const cell = document.createElement('td');
  cell.className = 'cell-current';
  cell.dataset.label = 'Current HP';
  cell.appendChild(hpCellContent(c));
  return cell;
}

// Builds the three-state Current HP display: unconfigured (no Max HP set),
// alive (bar + number, terracotta when bloodied), or downed (empty track + tag).
function hpCellContent(c) {
  const wrap = document.createElement('div');
  wrap.className = 'hp-cell';

  const max = Math.max(0, c.maxHP || 0);
  const dmg = clamp(c.damageTaken || 0, 0, max);
  const temp = Math.max(0, c.tempHP || 0);
  const base = Math.max(0, max - dmg);
  const cur = base + temp;

  if (max === 0) {
    wrap.classList.add('hp-unconfigured');
    const track = document.createElement('div');
    track.className = 'hp-track';
    const label = document.createElement('span');
    label.className = 'hp-label-muted';
    label.textContent = 'set HP';
    wrap.append(track, label);
    return wrap;
  }

  if (cur === 0) {
    wrap.classList.add('hp-downed');
    const track = document.createElement('div');
    track.className = 'hp-track hp-track-downed';
    const tag = document.createElement('span');
    tag.className = 'hp-downed-tag';
    tag.textContent = 'DOWNED';
    wrap.append(track, tag);
    return wrap;
  }

  const bloodied = base / max <= 0.5;
  const pct = clamp(Math.round((base / max) * 100), 0, 100);
  const track = document.createElement('div');
  track.className = 'hp-track hp-track-alive';
  const fill = document.createElement('div');
  fill.className = bloodied ? 'hp-fill hp-fill-bloodied' : 'hp-fill';
  fill.style.width = `${pct}%`;
  track.appendChild(fill);
  if (temp > 0) {
    const tempPct = clamp(Math.round((temp / max) * 100), 0, 30);
    const tempSeg = document.createElement('div');
    tempSeg.className = 'hp-temp-seg';
    tempSeg.style.width = `${tempPct}%`;
    track.appendChild(tempSeg);
  }

  const number = document.createElement('span');
  number.className = 'hp-number';
  const curSpan = document.createElement('span');
  if (bloodied) curSpan.className = 'hp-cur-bloodied';
  curSpan.textContent = String(cur);
  const maxSpan = document.createElement('span');
  maxSpan.className = 'hp-max-of';
  maxSpan.textContent = ` / ${max}`;
  number.append(curSpan, maxSpan);

  wrap.append(track, number);
  return wrap;
}

// ---- Tag cell (Conditions + Other): removable pills + an Add button ----
// The two columns share this builder and the `.cond-*` styling; they differ only in
// which array field they render and what the picker offers. Clicks (pill ✕, + Add) are
// handled by delegation in main.js; the picker popover itself lives in tags.js.

// Human label for the field, used only for accessible button/pill wording.
const TAG_NOUN = { conditions: 'condition', other: 'note' };

function tagsCell(c, field) {
  const cell = document.createElement('td');
  cell.className = field === 'conditions' ? 'cell-conditions' : 'cell-other';
  cell.dataset.label = field === 'conditions' ? 'Conditions' : 'Other';
  cell.appendChild(tagsContent(c, field));
  return cell;
}

// The flex-wrap row of pills followed by the Add button. Rebuilt wholesale by
// updateTagsCell() on every add/remove (cheap — a handful of nodes). The `data-field`
// lets updateTagsCell() and main.js target the right cell/field.
function tagsContent(c, field) {
  const wrap = document.createElement('div');
  wrap.className = 'cond-cell';
  wrap.dataset.field = field;
  const tags = Array.isArray(c[field]) ? c[field] : [];
  for (const name of tags) wrap.appendChild(tagPill(field, name));
  wrap.appendChild(tagAddButton(field, tags.length === 0)); // "+ Add" label only when empty
  return wrap;
}

function tagPill(field, name) {
  const pill = document.createElement('span');
  pill.className = 'cond-pill';
  pill.appendChild(document.createTextNode(name)); // user text — set as text, never HTML
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'cond-x';
  x.dataset.field = field; // main.js reads field + tag to know what to remove
  x.dataset.tag = name;
  x.setAttribute('aria-label', `Remove ${name}`);
  x.textContent = '✕';
  pill.appendChild(x);
  return pill;
}

// The word "Add" is shown only on an otherwise-empty row; rows with pills get a
// compact "+" so the button stays small.
function tagAddButton(field, showLabel) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cond-add';
  b.dataset.field = field; // main.js reads this to open the right picker
  b.setAttribute('aria-label', `Add ${TAG_NOUN[field] || 'tag'}`);
  const plus = document.createElement('span');
  plus.className = 'cond-add-plus';
  plus.textContent = '+';
  b.appendChild(plus);
  if (showLabel) {
    const label = document.createElement('span');
    label.textContent = 'Add';
    b.appendChild(label);
  }
  return b;
}

// Duplicate + remove buttons, grouped in the widened Actions column — plus the ⋮ that
// stands in for the pair in the card layout, where the header line has no room for two
// buttons (CSS decides which of the two affordances is visible; see rowMenu.js).
function actionsCell() {
  const cell = document.createElement('td');
  cell.className = 'cell-actions';
  const group = document.createElement('div');
  group.className = 'row-actions';
  group.append(dupeButton(), removeButton(), menuButton()); // duplicate sits left of remove
  cell.appendChild(group);
  return cell;
}

// Lucide "copy" glyph — a static constant with no user data, so innerHTML is safe here.
const DUPE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>' +
  '<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';

function dupeButton() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-dupe';
  b.setAttribute('aria-label', 'Duplicate creature');
  b.innerHTML = DUPE_ICON;
  return b;
}

function removeButton() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-remove';
  b.textContent = '✕'; // ✕
  b.setAttribute('aria-label', 'Remove creature');
  return b;
}

// Lucide "ellipsis-vertical" — static, no user data, so innerHTML is safe.
export const MENU_DOTS_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle>' +
  '<circle cx="12" cy="19" r="2"></circle></svg>';

// The card layout's action button: opens the duplicate/remove menu (main.js wires the
// click). Hidden on desktop, where both actions are already visible as their own buttons.
function menuButton() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-menu';
  b.setAttribute('aria-label', 'Creature actions');
  b.setAttribute('aria-haspopup', 'menu');
  b.innerHTML = MENU_DOTS_ICON;
  return b;
}

// The two menu entries' icons, exported so main.js can label the menu items with the same
// glyphs the desktop buttons use.
export { DUPE_ICON };
export const TRASH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 ' +
  '1-1-1L5 6"></path><path d="M10 11v6M14 11v6"></path></svg>';

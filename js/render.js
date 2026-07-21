// render.js — builds the table from state and applies targeted updates.
//
// Two update paths (see main.js for when each fires):
//   renderTable()   — full rebuild + re-sort (load, #/Name blur, add, remove, reset)
//   renderHighlight()— move the active-row class + refresh header (Start/Next)
//   updateHpCell(id)— rewrite one row's Current HP + downed state (live Max/Temp/dmg/heal)

import { state } from './state.js';
import { sortedRows } from './order.js';
import { isDowned, clamp } from './hp.js';

const COLUMN_COUNT = 11; // #, Name, AC, Max HP, Temp HP, Current HP, Dmg, Heal, Conditions, Other, remove

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
  if (temp && document.activeElement !== temp) temp.value = c.tempHP;
  const cell = tr.querySelector('.cell-current');
  if (cell) {
    cell.innerHTML = '';
    cell.appendChild(hpCellContent(c));
  }
  tr.classList.toggle('downed', isDowned(c));
}

// ---- Row construction (DOM API => values are set as .value, never parsed as HTML) ----

function buildRow(c) {
  const tr = document.createElement('tr');
  tr.dataset.id = c.id;
  if (c.id === state.activeId) tr.classList.add('active');
  if (isDowned(c)) tr.classList.add('downed');

  tr.appendChild(initCell(c)); // # (may be negative)
  tr.appendChild(td(textInput('f-name', c.name, { placeholder: 'Name' })));
  tr.appendChild(td(numInput('f-ac', c.ac, { placeholder: '—' })));
  tr.appendChild(td(numInput('f-maxhp', c.maxHP, { placeholder: '—' })));
  tr.appendChild(td(numInput('f-temphp', c.tempHP, { placeholder: '—' })));
  tr.appendChild(currentCell(c));
  tr.appendChild(td(actionInput('f-damage')));
  tr.appendChild(td(actionInput('f-heal')));
  tr.appendChild(td(textInput('f-conditions', c.conditions, { placeholder: '—' })));
  tr.appendChild(td(textInput('f-other', c.other, { placeholder: '-'})))
  tr.appendChild(removeCell());
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

function td(child) {
  const cell = document.createElement('td');
  cell.appendChild(child);
  return cell;
}

// # (initiative) sits in its own cell alongside the TURN flag, which is always
// present and shown purely via CSS (tr.active .turn-flag) — no extra render work
// needed when the highlight moves via renderHighlight().
function initCell(c) {
  const cell = document.createElement('td');
  cell.className = 'cell-init';
  const wrap = document.createElement('div');
  wrap.className = 'init-wrap';
  wrap.appendChild(numInput('f-init', c.init, { placeholder: '—' }));
  const flag = document.createElement('span');
  flag.className = 'turn-flag';
  flag.textContent = 'TURN';
  wrap.appendChild(flag);
  cell.appendChild(wrap);
  return cell;
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

// Damage/Healing: transient action inputs — always start empty, never store a value.
function actionInput(cls) {
  const i = document.createElement('input');
  i.type = 'text';
  i.inputMode = 'numeric';
  i.className = cls;
  i.value = '';
  i.placeholder = '0';
  return i;
}

function currentCell(c) {
  const cell = document.createElement('td');
  cell.className = 'cell-current';
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

function removeCell() {
  const cell = document.createElement('td');
  cell.className = 'cell-actions';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-remove';
  b.textContent = '✕'; // ✕
  b.setAttribute('aria-label', 'Remove creature');
  cell.appendChild(b);
  return cell;
}

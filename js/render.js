// render.js — builds the table from state and applies targeted updates.
//
// Two update paths (see main.js for when each fires):
//   renderTable()   — full rebuild + re-sort (load, #/Name blur, add, remove, reset)
//   renderHighlight()— move the active-row class + refresh header (Start/Next)
//   updateHpCell(id)— rewrite one row's Current HP + downed state (live Max/Temp/dmg/heal)

import { state } from './state.js';
import { sortedRows } from './order.js';
import { currentHP, isDowned } from './hp.js';

function tbody() {
  return document.getElementById('creature-rows');
}

// Full rebuild of the table body in sorted order.
export function renderTable() {
  const body = tbody();
  body.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const c of sortedRows(state.creatures)) {
    frag.appendChild(buildRow(c));
  }
  body.appendChild(frag);
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
  document.getElementById('start-next-btn').textContent = state.started ? 'Next' : 'Start';
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
  if (cell) cell.textContent = currentHP(c);
  tr.classList.toggle('downed', isDowned(c));
}

// ---- Row construction (DOM API => values are set as .value, never parsed as HTML) ----

function buildRow(c) {
  const tr = document.createElement('tr');
  tr.dataset.id = c.id;
  if (c.id === state.activeId) tr.classList.add('active');
  if (isDowned(c)) tr.classList.add('downed');

  tr.appendChild(td(numInput('f-init', c.init, { placeholder: '—' }))); // # (may be negative)
  tr.appendChild(td(textInput('f-name', c.name)));
  tr.appendChild(td(numInput('f-ac', c.ac, { min: '0' })));
  tr.appendChild(td(numInput('f-maxhp', c.maxHP, { min: '0' })));
  tr.appendChild(td(numInput('f-temphp', c.tempHP, { min: '0' })));
  tr.appendChild(currentCell(c));
  tr.appendChild(td(actionInput('f-damage')));
  tr.appendChild(td(actionInput('f-heal')));
  tr.appendChild(td(textInput('f-conditions', c.conditions)));
  tr.appendChild(td(textInput('f-other', c.other)));
  tr.appendChild(removeCell());
  return tr;
}

function td(child) {
  const cell = document.createElement('td');
  cell.appendChild(child);
  return cell;
}

function numInput(cls, value, opts = {}) {
  const i = document.createElement('input');
  i.type = 'number';
  i.className = cls;
  i.value = value === '' || value == null ? '' : value;
  i.inputMode = 'numeric';
  if (opts.min != null) i.min = opts.min;
  if (opts.placeholder) i.placeholder = opts.placeholder;
  return i;
}

function textInput(cls, value) {
  const i = document.createElement('input');
  i.type = 'text';
  i.className = cls;
  i.value = value == null ? '' : value;
  return i;
}

// Damage/Healing: transient action inputs — always start empty, never store a value.
function actionInput(cls) {
  const i = document.createElement('input');
  i.type = 'number';
  i.className = cls;
  i.value = '';
  i.min = '0';
  i.placeholder = '0';
  i.inputMode = 'numeric';
  return i;
}

function currentCell(c) {
  const cell = document.createElement('td');
  cell.className = 'cell-current';
  cell.textContent = currentHP(c);
  return cell;
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

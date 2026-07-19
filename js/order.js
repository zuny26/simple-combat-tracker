// order.js — pure ordering helpers.
//
// Always sorted by initiative (#) numeric descending, tie-broken by Name (A→Z,
// case-insensitive, stable). Rows with a blank # are parked at the bottom in
// insertion order and do not participate in the turn order.

// Parse an initiative string to a Number, or null if blank / non-numeric.
export function parseInit(init) {
  if (init == null) return null;
  const s = String(init).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function hasInit(c) {
  return parseInit(c.init) !== null;
}

// Compare two initiatived rows: higher # first, then name A→Z (case-insensitive).
function compareRows(a, b) {
  const ia = parseInit(a.init);
  const ib = parseInit(b.init);
  if (ib !== ia) return ib - ia; // numeric: 10 sorts above 9
  const na = (a.name || '').toLowerCase();
  const nb = (b.name || '').toLowerCase();
  return na.localeCompare(nb);
}

// Full display order: initiatived rows sorted, then parked rows in insertion order.
export function sortedRows(creatures) {
  const withInit = [];
  const parked = [];
  for (const c of creatures) {
    if (hasInit(c)) withInit.push(c);
    else parked.push(c);
  }
  withInit.sort(compareRows);
  return withInit.concat(parked);
}

// Just the initiatived rows, sorted — the list the turn order iterates over.
export function initiativedRows(creatures) {
  return creatures.filter(hasInit).sort(compareRows);
}

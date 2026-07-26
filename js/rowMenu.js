// rowMenu.js — the card layout's per-creature action menu (the ⋮ button).
//
// On desktop a row's actions are two always-visible icon buttons (duplicate / remove).
// In the card layout there isn't room for both on the card's header line beside the
// initiative disc, name, TURN flag and AC pill — so CSS hides that pair and shows a single
// ⋮ instead (see styles.css); this module is the menu behind it. Both affordances are
// always in the DOM; only their visibility differs, so nothing about the DOM depends on the
// viewport.
//
// Same shape as the tag picker (see tags.js): a fixed-position panel plus a full-viewport
// backdrop that closes it on any outside click, Escape closes from anywhere, and none of it
// is persisted. Crucially the menu closes BEFORE running an action, so no confirm() dialog
// and no table rebuild ever happens underneath an open popover.

const PANEL_W = 184;

let backdropEl = null;
let menuEl = null;
let triggerEl = null;

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// Open the menu under `trigger`. `items` is an array of
// { label, icon (static SVG markup), danger, run } — `run` is called after the menu closes.
export function openRowMenu(trigger, items) {
  closeRowMenu(); // tear down any menu already open
  triggerEl = trigger;
  const rect = trigger.getBoundingClientRect();

  backdropEl = document.createElement('div');
  backdropEl.className = 'cond-backdrop'; // same invisible full-viewport catcher as the picker
  backdropEl.addEventListener('click', closeRowMenu);

  menuEl = document.createElement('div');
  menuEl.className = 'row-menu';
  menuEl.setAttribute('role', 'menu');
  // Right-aligned with the trigger (it sits at the card's right edge), clamped on-screen.
  menuEl.style.left = `${clamp(rect.right - PANEL_W, 8, Math.max(8, window.innerWidth - PANEL_W - 8))}px`;
  menuEl.style.top = `${Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 8 - 44 * items.length))}px`;

  for (const item of items) menuEl.appendChild(menuItem(item));

  document.addEventListener('keydown', onDocKey);
  document.body.append(backdropEl, menuEl);
  const first = menuEl.querySelector('.row-menu-item');
  if (first) first.focus();
}

export function closeRowMenu() {
  document.removeEventListener('keydown', onDocKey);
  if (backdropEl) { backdropEl.remove(); backdropEl = null; }
  if (menuEl) { menuEl.remove(); menuEl = null; }
  triggerEl = null;
}

// Escape closes and hands focus back to the ⋮ it came from, so keyboard users don't get
// dropped at the top of the document.
function onDocKey(e) {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  const back = triggerEl;
  closeRowMenu();
  if (back && back.isConnected) back.focus();
}

function menuItem({ label, icon, danger, run }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = danger ? 'row-menu-item is-danger' : 'row-menu-item';
  b.setAttribute('role', 'menuitem');
  if (icon) b.innerHTML = icon; // static markup from render.js — never user data
  b.appendChild(document.createTextNode(label));
  b.addEventListener('click', () => {
    closeRowMenu(); // close first: `run` may confirm() and rebuild the table
    run();
  });
  return b;
}

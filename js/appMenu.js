// appMenu.js — tier 1's collapsed settings menu (the ☰ button).
//
// Below 640px the theme pill and the "?" help button — both global settings, touched once
// a session — give up their line to a single ☰ (see styles.css); this module is the panel
// behind it. Both affordances are always in the DOM and only their visibility differs, so
// nothing about the DOM depends on the viewport and no resize handler is needed.
//
// Same shape as rowMenu.js: a fixed-position panel plus a full-viewport backdrop that
// closes it on any outside click, Escape closes from anywhere and returns focus to the
// trigger, and none of it is persisted. Crucially the panel closes BEFORE running an
// action, so no callout repaint ever happens underneath an open popover.
//
// Theme rows are built from THEMES, so adding a theme in theme.js lights it up in both the
// desktop pill and this panel for free. Choosing one routes through
// themePicker.selectTheme() rather than theme.setTheme() — that is what keeps the desktop
// pill's label correct if the phone is later rotated or the window widened.

import { THEMES } from './theme.js';
import { selectTheme } from './themePicker.js';
import { showUsageCallout } from './usage.js';

const PANEL_W = 224;
const ROW_H = 44;     // approximate; used only to keep the panel on-screen
const CHROME_H = 40;  // section label + separator, same purpose

// Static constant markup — never user data. Same check glyph the picker's menu uses.
const CHECK_SVG =
  '<svg class="theme-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

let backdropEl = null;
let menuEl = null;
let triggerEl = null;

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function rows() {
  return menuEl ? Array.from(menuEl.querySelectorAll('.app-menu-item')) : [];
}

function sectionLabel(text) {
  const el = document.createElement('div');
  el.className = 'app-menu-section';
  el.textContent = text;
  return el;
}

// One theme row: swatch + label + check, carrying the same markup the picker's menu uses.
function themeRow(theme, current) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'app-menu-item';
  b.setAttribute('role', 'menuitemradio');
  b.setAttribute('aria-checked', String(theme.id === current));
  b.dataset.themeId = theme.id;

  const sw = document.createElement('span');
  sw.className = 'theme-swatch';
  sw.style.setProperty('--sw-bg', theme.swatchBg);
  sw.style.setProperty('--sw-dot', theme.swatchDot);

  const label = document.createElement('span');
  label.className = 'app-menu-label';
  label.textContent = theme.label;

  b.append(sw, label);
  b.insertAdjacentHTML('beforeend', CHECK_SVG);
  b.addEventListener('click', () => {
    closeAppMenu(true); // close first, then act
    selectTheme(theme.id);
  });
  return b;
}

function helpRow() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'app-menu-item';
  b.setAttribute('role', 'menuitem');

  const mark = document.createElement('span');
  mark.className = 'app-menu-mark';
  mark.textContent = '?';

  const label = document.createElement('span');
  label.className = 'app-menu-label';
  label.textContent = 'How to run a fight';

  b.append(mark, label);
  b.addEventListener('click', () => {
    closeAppMenu(true); // close first: showUsageCallout() repaints the page under the panel
    showUsageCallout();
  });
  return b;
}

function openAppMenu() {
  closeAppMenu(false); // tear down any panel already open
  const rect = triggerEl.getBoundingClientRect();
  const current = document.documentElement.dataset.theme || THEMES[0].id;

  backdropEl = document.createElement('div');
  backdropEl.className = 'cond-backdrop'; // same invisible full-viewport catcher the pickers use
  backdropEl.addEventListener('click', () => closeAppMenu(true));

  menuEl = document.createElement('div');
  menuEl.className = 'app-menu';
  menuEl.setAttribute('role', 'menu');
  menuEl.setAttribute('aria-label', 'Menu');
  // Right-aligned with the trigger (it sits at the tier's right edge), clamped on-screen.
  const panelH = ROW_H * (THEMES.length + 1) + CHROME_H;
  menuEl.style.left = `${clamp(rect.right - PANEL_W, 8, Math.max(8, window.innerWidth - PANEL_W - 8))}px`;
  menuEl.style.top = `${Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 8 - panelH))}px`;

  menuEl.appendChild(sectionLabel('Theme'));
  for (const t of THEMES) menuEl.appendChild(themeRow(t, current));
  const sep = document.createElement('hr');
  sep.className = 'app-menu-sep';
  menuEl.appendChild(sep);
  menuEl.appendChild(helpRow());

  document.addEventListener('keydown', onDocKey);
  document.body.append(backdropEl, menuEl);
  triggerEl.setAttribute('aria-expanded', 'true');

  // Focus lands on the checked theme row.
  const all = rows();
  const sel = all.find((b) => b.dataset.themeId === current) || all[0];
  if (sel) sel.focus();
}

// Tear the panel down. `focusTrigger` hands focus back to the ☰ it came from, so keyboard
// users aren't dropped at the top of the document.
export function closeAppMenu(focusTrigger) {
  document.removeEventListener('keydown', onDocKey);
  if (backdropEl) { backdropEl.remove(); backdropEl = null; }
  if (menuEl) { menuEl.remove(); menuEl = null; }
  if (triggerEl) {
    triggerEl.setAttribute('aria-expanded', 'false');
    if (focusTrigger && triggerEl.isConnected) triggerEl.focus();
  }
}

// Roving focus over the rows, matching themePicker.js's handler. Enter and Space need no
// case here: the rows are real <button>s, so the browser activates them natively.
function onDocKey(e) {
  const all = rows();
  if (all.length === 0) return;
  const idx = all.indexOf(document.activeElement);
  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      closeAppMenu(true);
      break;
    case 'ArrowDown':
      e.preventDefault();
      (all[idx + 1] || all[0]).focus();
      break;
    case 'ArrowUp':
      e.preventDefault();
      (all[idx - 1] || all[all.length - 1]).focus();
      break;
    case 'Home':
      e.preventDefault();
      all[0].focus();
      break;
    case 'End':
      e.preventDefault();
      all[all.length - 1].focus();
      break;
    default:
      break;
  }
}

export function initAppMenu() {
  triggerEl = document.getElementById('app-menu-btn');
  if (!triggerEl) return;
  triggerEl.addEventListener('click', () => (menuEl ? closeAppMenu(true) : openAppMenu()));
}

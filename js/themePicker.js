// themePicker.js — the top-bar theme dropdown. The menu is built from the THEMES
// list in theme.js, so listing a new theme there is all that's needed here.

import { THEMES, setTheme } from './theme.js';

let picker, trigger, menu;
let isOpen = false;
let current = THEMES[0].id;

function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

function options() {
  return Array.from(menu.querySelectorAll('.theme-option'));
}

function buildMenu() {
  menu.innerHTML = THEMES.map((t) => `
    <li role="option" class="theme-option" data-theme-id="${t.id}" tabindex="-1" aria-selected="false">
      <span class="theme-swatch" style="--sw-bg:${t.swatchBg};--sw-dot:${t.swatchDot}"></span>
      <span class="theme-option-label">${t.label}</span>
      <svg class="theme-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
    </li>`).join('');
}

// Reflect the current theme in the trigger label and the menu's selected mark.
// The trigger itself carries a fixed brush icon, not a swatch — only the menu
// options preview each theme's colors.
function reflect() {
  const t = themeById(current);
  trigger.querySelector('.theme-trigger-label').textContent = t.label;
  options().forEach((li) => li.setAttribute('aria-selected', String(li.dataset.themeId === current)));
}

function onDocPointer(e) {
  if (!picker.contains(e.target)) closeMenu(false);
}

function onKeyDown(e) {
  const opts = options();
  const idx = opts.indexOf(document.activeElement);
  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      closeMenu(true);
      break;
    case 'ArrowDown':
      e.preventDefault();
      (opts[idx + 1] || opts[0]).focus();
      break;
    case 'ArrowUp':
      e.preventDefault();
      (opts[idx - 1] || opts[opts.length - 1]).focus();
      break;
    case 'Home':
      e.preventDefault();
      opts[0].focus();
      break;
    case 'End':
      e.preventDefault();
      opts[opts.length - 1].focus();
      break;
    case 'Enter':
    case ' ':
      if (idx !== -1) {
        e.preventDefault();
        choose(opts[idx].dataset.themeId);
      }
      break;
    default:
      break;
  }
}

function openMenu() {
  if (isOpen) return;
  isOpen = true;
  menu.hidden = false;
  picker.classList.add('is-open');
  trigger.setAttribute('aria-expanded', 'true');
  document.addEventListener('pointerdown', onDocPointer, true);
  document.addEventListener('keydown', onKeyDown);
  // Land keyboard focus on the current selection.
  const sel = options().find((li) => li.dataset.themeId === current) || options()[0];
  if (sel) sel.focus();
}

function closeMenu(focusTrigger) {
  if (!isOpen) return;
  isOpen = false;
  menu.hidden = true;
  picker.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');
  document.removeEventListener('pointerdown', onDocPointer, true);
  document.removeEventListener('keydown', onKeyDown);
  if (focusTrigger) trigger.focus();
}

// Apply a theme and reflect it in the trigger label and the menu's check mark, without
// touching the dropdown's open state. Exported so appMenu.js can route through the picker
// instead of calling setTheme() directly — that is what keeps the desktop pill's label
// correct if the phone is later rotated or the window widened.
export function selectTheme(id) {
  current = id;
  setTheme(id);
  reflect();
}

function choose(id) {
  selectTheme(id);
  closeMenu(true);
}

export function initThemePicker(theme) {
  picker = document.getElementById('theme-picker');
  trigger = document.getElementById('theme-trigger');
  menu = document.getElementById('theme-menu');
  current = themeById(theme).id;

  buildMenu();
  reflect();

  trigger.addEventListener('click', () => (isOpen ? closeMenu(true) : openMenu()));
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu();
    }
  });

  menu.addEventListener('click', (e) => {
    const li = e.target.closest('.theme-option');
    if (li) choose(li.dataset.themeId);
  });
}

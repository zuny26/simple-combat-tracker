// theme.js — theme registry + persistence. Kept separate from combat state so
// "New combat" never touches it. Applied as data-theme on <html>.

const KEY = 'dnd-ct-theme';

// Single source of truth for selectable themes. `id` is the data-theme value on
// <html> (and what's persisted); the swatch colors are the little preview dot
// shown in the picker. Add a theme here and it appears in the dropdown for free.
export const THEMES = [
  { id: 'light',   label: 'Organic Day',   swatchBg: '#ebddc5', swatchDot: '#c67139' },
  { id: 'dark',    label: 'Organic Night', swatchBg: '#2d2921', swatchDot: '#e58f52' },
  { id: 'dracula', label: 'Dracula',       swatchBg: '#282a36', swatchDot: '#bd93f9' },
  { id: 'alucard', label: 'Alucard',       swatchBg: '#fffbeb', swatchDot: '#644ac9' },
];

const VALID = new Set(THEMES.map((t) => t.id));

export function loadTheme() {
  let t = THEMES[0].id;
  try {
    const v = localStorage.getItem(KEY);
    if (VALID.has(v)) t = v;
  } catch {
    // Storage unavailable — fall back to the default theme.
  }
  document.documentElement.dataset.theme = t;
  return t;
}

export function setTheme(t) {
  if (!VALID.has(t)) return;
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // Storage unavailable — theme still applies for this session.
  }
}

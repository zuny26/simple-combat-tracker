// theme.js — theme registry + persistence. Kept separate from combat state so
// "New combat" never touches it. Applied as data-theme on <html>.

const KEY = 'dnd-ct-theme';

// Both entries use the same registry; this module owns legacy browser preferences.
export { THEMES } from './themes.js';
import { THEMES } from './themes.js';

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

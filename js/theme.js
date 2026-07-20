// theme.js — Day/Night theme, persisted separately from combat state so
// "New combat" never touches it. Applied as data-theme on <html>.

const KEY = 'dnd-ct-theme';

export function loadTheme() {
  let t = 'light';
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') t = v;
  } catch (e) {
    // Storage unavailable — fall back to light.
  }
  document.documentElement.dataset.theme = t;
  return t;
}

export function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch (e) {
    // Storage unavailable — theme still applies for this session.
  }
}

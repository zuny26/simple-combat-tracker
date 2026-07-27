// usage.js — dismissible "How to run a fight" callout.
//
// The initial hide (for return visits) happens before first paint via the inline
// script in index.html, which adds `.usage-dismissed` to <html> when the key is set.
// This module wires the dismiss button (hide + remember) and the "?" help button in
// the controls (re-show + forget), so the two share a single hide/show mechanism.

const KEY = 'sct-usage-dismissed';

export function initUsageCallout() {
  const dismissBtn = document.getElementById('usage-dismiss-btn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      document.documentElement.classList.add('usage-dismissed');
      try {
        localStorage.setItem(KEY, '1');
      } catch (e) {
        // Storage unavailable — the callout still hides for this session.
      }
    });
  }

  const helpBtn = document.getElementById('usage-help-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', showUsageCallout);
  }
}

// Re-show the callout and forget the dismissal. Exported so the ☰ app menu's "How to run
// a fight" row runs exactly this body rather than a second copy of it.
export function showUsageCallout() {
  document.documentElement.classList.remove('usage-dismissed');
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    // Storage unavailable — the callout still re-shows for this session.
  }
}

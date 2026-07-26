// confirmDialog.js — shared in-app confirmation dialog, used in place of
// window.confirm for the two destructive actions (New Combat, Remove creature).
//
// The markup is a single instance in index.html (hidden by default) rather than being
// built/torn down per call site, since only one confirmation can ever be pending at a
// time. Callers ask for a confirmation via askConfirm(); the actual action only runs if
// the user clicks the danger button, via the callback they passed in — opening the
// dialog never performs the action itself.

let backdrop, dialog, titleEl, bodyEl, okBtn, cancelBtn;
let onOk = null;

function close() {
  backdrop.hidden = true;
  onOk = null;
}

// Ask the user to confirm a destructive action. `onConfirm` runs only if they click the
// danger button; clicking Cancel, the backdrop, or Escape just closes the dialog.
export function askConfirm(title, body, label, onConfirm) {
  titleEl.textContent = title;
  bodyEl.textContent = body;
  okBtn.textContent = label;
  onOk = onConfirm;
  backdrop.hidden = false;
}

export function initConfirmDialog() {
  backdrop = document.getElementById('confirm-backdrop');
  dialog = backdrop.querySelector('.confirm-dialog');
  titleEl = document.getElementById('confirm-title');
  bodyEl = document.getElementById('confirm-body');
  okBtn = document.getElementById('confirm-ok-btn');
  cancelBtn = document.getElementById('confirm-cancel-btn');

  backdrop.addEventListener('click', close);
  dialog.addEventListener('click', (e) => e.stopPropagation()); // don't let it bubble to the backdrop
  cancelBtn.addEventListener('click', close);
  okBtn.addEventListener('click', () => {
    const cb = onOk;
    close();
    if (cb) cb();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) close();
  });
}

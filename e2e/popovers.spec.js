// popovers.spec.js — the shared popover pattern, asserted once across all four
// implementations.
//
// CLAUDE.md documents one contract for tags.js / rowMenu.js / appMenu.js (and
// themePicker.js follows the same shape): a fixed panel plus a full-viewport backdrop
// that closes on any outside click, Escape closes and returns focus to the trigger,
// nothing is persisted, and the popover closes BEFORE running its action so no dialog
// or table rebuild happens underneath an open panel.
//
// All four now restore focus to their trigger on Escape (tags.js:77-83,
// rowMenu.js:58-64, appMenu.js:151-153, themePicker.js all hand it back explicitly).
// The tag picker has an extra wrinkle the other three don't: applying a tag
// (afterApply(), tags.js) calls updateTagsCell(), which rebuilds the whole cell
// (render.js:99-106, `cell.replaceWith(...)`) and detaches the `.cond-add` button the
// module's `triggerEl` was pointing at. tags.js re-resolves `triggerEl` against the
// fresh DOM at the end of afterApply() so Escape after an apply still has something live
// to focus — see the "applies a tag, then Escape" test below, which is the one that
// actually exercises that path (the plain "closes on Escape" test above presses Escape
// immediately after opening, before any option is clicked, so it can't catch this).
//
// One descriptor flag still records a real divergence from the documented contract:
//
//   ariaExpanded: only #theme-trigger and #app-menu-btn carry it. .btn-menu has
//     aria-haspopup="menu" only; .cond-add has neither.
//
// confirmDialog.js is absent from this table on purpose: it is a modal, not a
// trigger-anchored popover, so the contract does not apply. It is still exercised, by
// the close-before-action test at the bottom.
//
// One more caveat on "share one shape": themePicker.js is the exception. Its choose()
// (themePicker.js:110-113) calls selectTheme() BEFORE closeMenu(true) — action before
// close, the opposite order from rowMenu.js:74 and appMenu.js:69. Harmless today
// (closeMenu only toggles the `hidden` attribute, and setTheme() rebuilds nothing), but
// it is a real inversion of the documented pattern and nothing here asserts it either
// way.
import { test, expect } from '@playwright/test';

import { gotoApp, creature } from './fixtures.js';

const DESKTOP = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };
const NARROW = { width: 320, height: 568 };

const ONE = [creature(1, { init: '10', name: 'Goblin', ac: '13', maxHP: 7 })];

const POPOVERS = [
  {
    name: 'tag picker',
    viewport: DESKTOP,
    trigger: 'tr[data-id="1"] .cond-add[data-field="conditions"]',
    panel: '.cond-pop',
    // The panel is removed from the DOM on close (vs. the theme menu, which is only
    // hidden), so "closed" is asserted differently per popover.
    closeStyle: 'removed',
    restoresFocusOnEscape: true,
    ariaExpanded: false,
  },
  {
    name: 'row menu',
    viewport: PHONE, // the ⋮ only becomes visible below 640px
    trigger: 'tr[data-id="1"] .btn-menu',
    panel: '.row-menu',
    closeStyle: 'removed',
    restoresFocusOnEscape: true,
    ariaExpanded: false, // has aria-haspopup only
  },
  {
    name: 'app menu',
    viewport: PHONE, // the ☰ replaces the theme pill below 640px
    trigger: '#app-menu-btn',
    panel: '.app-menu',
    closeStyle: 'removed',
    restoresFocusOnEscape: true,
    ariaExpanded: true,
  },
  {
    name: 'theme picker',
    viewport: DESKTOP, // the pill is hidden below 640px
    trigger: '#theme-trigger',
    panel: '#theme-menu',
    closeStyle: 'hidden', // toggled via the `hidden` attribute, never removed
    restoresFocusOnEscape: true,
    ariaExpanded: true,
  },
];

async function expectClosed(page, p) {
  if (p.closeStyle === 'removed') await expect(page.locator(p.panel)).toHaveCount(0);
  else await expect(page.locator(p.panel)).toBeHidden();
}

for (const p of POPOVERS) {
  test.describe(p.name, () => {
    test.beforeEach(async ({ page }) => {
      await gotoApp(page, { viewport: p.viewport, creatures: ONE });
    });

    test('opens from its trigger', async ({ page }) => {
      await expectClosed(page, p);
      await page.locator(p.trigger).click();
      await expect(page.locator(p.panel)).toBeVisible();

      if (p.ariaExpanded) {
        await expect(page.locator(p.trigger)).toHaveAttribute('aria-expanded', 'true');
      }
    });

    test('closes on an outside click', async ({ page }) => {
      await page.locator(p.trigger).click();
      await expect(page.locator(p.panel)).toBeVisible();

      // Top-left corner: outside every panel, and over the backdrop where there is one.
      await page.mouse.click(5, 5);

      await expectClosed(page, p);
      if (p.ariaExpanded) {
        await expect(page.locator(p.trigger)).toHaveAttribute('aria-expanded', 'false');
      }
    });

    test('closes on Escape', async ({ page }) => {
      await page.locator(p.trigger).click();
      await expect(page.locator(p.panel)).toBeVisible();

      await page.keyboard.press('Escape');

      await expectClosed(page, p);
      if (p.restoresFocusOnEscape) {
        await expect(page.locator(p.trigger)).toBeFocused();
      } else {
        // Documented gap, asserted so it cannot change silently in either direction.
        await expect(page.locator(p.trigger)).not.toBeFocused();
      }
    });

    // Geometry tautology for its default fixture, not a test of positioning logic: at
    // DESKTOP/PHONE widths none of the four panels comes close to their clamp bounds
    // (see the 320px test below for the actual numbers), and the theme picker has no
    // JS positioning to test at all — #theme-menu is placed purely by CSS, anchored
    // under the pill. Kept anyway as cheap forward-looking insurance against a CSS or
    // layout regression, not as proof any clamp math works.
    test('stays inside the viewport', async ({ page }) => {
      await page.locator(p.trigger).click();
      const box = await page.locator(p.panel).boundingBox();

      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(p.viewport.width + 1);
    });
  });
}

test('the mobile popovers stay on-screen at 320px', async ({ page }) => {
  // NOT a stress test of the clamp() math in rowMenu.js:38 / appMenu.js:112 — at every
  // supported width that clamp is unreachable defensive code. Its lower bound only
  // engages under a viewport of roughly 210px (rowMenu) / 250px (appMenu); its upper
  // bound only engages with under ~8px of trailing padding, where the real numbers at
  // 320px are ~17.6px (rowMenu) and ~26px (appMenu).
  //
  // The on-screen bounds below therefore prove nothing about the positioning logic:
  // they hold at this width no matter what `left` is computed, because the clamp — not
  // the assertion — is what drags a mis-aligned panel back into view. The assertion
  // with teeth is the right-edge one: it pins the alignment formula itself
  // (`rect.right - PANEL_W`) to the trigger's right edge. Switching that to `rect.left`
  // moves each panel's right edge off its trigger (row menu 293.8 → 312, likewise for
  // the app menu) while both stay comfortably inside 320px, so only this assertion
  // catches it.
  await gotoApp(page, { viewport: NARROW, creatures: ONE });

  for (const [trigger, panel] of [
    ['tr[data-id="1"] .btn-menu', '.row-menu'],
    ['#app-menu-btn', '.app-menu'],
  ]) {
    await page.locator(trigger).click();
    const box = await page.locator(panel).boundingBox();
    const t = await page.locator(trigger).boundingBox();
    expect(box.x, `${panel} left edge`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${panel} right edge`).toBeLessThanOrEqual(NARROW.width + 1);
    expect(box.x + box.width, `${panel} right edge aligns with trigger`)
      .toBeCloseTo(t.x + t.width, 0);
    await page.keyboard.press('Escape');
  }
});

test('the row menu closes before its action runs', async ({ page }) => {
  // The reason the pattern exists: no confirm dialog or table rebuild may ever happen
  // underneath an open panel. The end-state assertions below can't actually prove that
  // ordering on their own: menuItem's click handler, removeRow(), and askConfirm() are
  // three synchronous, mutually independent DOM writes with no repaint or microtask
  // between them, so the DOM at the end of the click is identical whichever runs first.
  // A MutationObserver can see the order a plain assertion can't, because its records
  // are queued in mutation order and delivered as one ordered batch at the end of the
  // click's task — so it's installed BEFORE the Remove click and the sequence itself is
  // asserted, in addition to the end state.
  await gotoApp(page, { viewport: PHONE, creatures: ONE });

  await page.locator('tr[data-id="1"] .btn-menu').click();

  await page.evaluate(() => {
    window.__seq = [];
    new window.MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'childList') {
          for (const n of r.removedNodes) {
            if (n.nodeType === 1 && n.classList.contains('row-menu')) window.__seq.push('menu-gone');
          }
        } else if (r.type === 'attributes' && r.target.id === 'confirm-backdrop'
                   && !r.target.hasAttribute('hidden')) {
          window.__seq.push('dialog-open');
        }
      }
      // attributeFilter keeps askConfirm's textContent writes (title/body/button label)
      // out of the log — only the backdrop's `hidden` toggle matters here.
    }).observe(document.body,
      { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  });

  await page.locator('.row-menu-item', { hasText: 'Remove' }).click();

  expect(await page.evaluate(() => window.__seq)).toEqual(['menu-gone', 'dialog-open']);
  await expect(page.locator('.row-menu')).toHaveCount(0);
  await expect(page.locator('.cond-backdrop')).toHaveCount(0);
  await expect(page.locator('#confirm-backdrop')).toBeVisible();
});

test('the app menu closes before applying a theme', async ({ page }) => {
  // Same non-provable-by-end-state problem as the row menu test above: themeRow's
  // click handler calls closeAppMenu(true) and selectTheme() back to back, two
  // synchronous, independent DOM writes with nothing between them, so final state
  // can't distinguish the order. Record it with a MutationObserver instead.
  await gotoApp(page, { viewport: PHONE, creatures: ONE });

  await page.locator('#app-menu-btn').click();

  await page.evaluate(() => {
    window.__seq = [];
    const mo = new window.MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'childList') {
          for (const n of r.removedNodes) {
            if (n.nodeType === 1 && n.classList.contains('app-menu')) window.__seq.push('menu-gone');
          }
        } else if (r.type === 'attributes' && r.attributeName === 'data-theme') {
          window.__seq.push('theme-changed');
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  });

  // Selected by theme id, not label: appMenu.js:56 sets data-theme-id, and ids are the
  // stable half of a THEMES entry (js/theme.js:9) while labels are copy.
  await page.locator('.app-menu-item[data-theme-id="dracula"]').click();

  expect(await page.evaluate(() => window.__seq)).toEqual(['menu-gone', 'theme-changed']);
  await expect(page.locator('.app-menu')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
});

test('the tag picker adds a condition without rebuilding the table', async ({ page }) => {
  await gotoApp(page, { viewport: DESKTOP, creatures: ONE });

  // Tag the row, then confirm two fields kept what was in them — updateTagsCell() must
  // touch only its own cell. The name field alone doesn't prove much: main.js:62-63
  // commits every keystroke to state.js on `input`, so even a full renderTable() would
  // read 'Goblin scout' straight back out of state and this assertion would still pass.
  // `.f-adjust` is the assertion with teeth: it's the one field render.js never derives
  // from state — actionInput() (render.js:235-243) always renders it as '', and
  // main.js:74 explicitly declines to model its input (`f-adjust is an action input —
  // no model change on input`). A table rebuild has no state to restore it from and
  // blanks it; an in-place cell update never touches it. So this only stays '3' if the
  // picker really did a scoped update.
  const nameField = page.locator('tr[data-id="1"] .f-name');
  await nameField.fill('Goblin scout');

  const adjustField = page.locator('tr[data-id="1"] .f-adjust');
  await adjustField.fill('3');

  await page.locator('tr[data-id="1"] .cond-add[data-field="conditions"]').click();
  await page.locator('.cond-opt', { hasText: 'Prone' }).click();

  await expect(page.locator('tr[data-id="1"] .cond-pill')).toHaveText(/Prone/);
  await expect(nameField).toHaveValue('Goblin scout');
  await expect(adjustField).toHaveValue('3');
});

test('the tag picker restores focus to the (rebuilt) trigger after applying a tag, then Escape', async ({ page }) => {
  // The "closes on Escape" case in the table above presses Escape immediately after
  // opening, before any option is clicked — it never exercises the real interaction, in
  // which applying a tag first rebuilds the cell (render.js:99-106) and detaches the
  // `.cond-add` button tags.js anchored to. `triggerEl` is re-resolved at the end of
  // afterApply() specifically to survive that. `trigger` below is a Playwright locator,
  // not a captured element handle, so it re-queries the live DOM on every assertion —
  // asserting against it after the click proves the FRESH button (not the original,
  // now-detached one) ends up focused.
  await gotoApp(page, { viewport: DESKTOP, creatures: ONE });

  const trigger = page.locator('tr[data-id="1"] .cond-add[data-field="conditions"]');
  await trigger.click();
  await page.locator('.cond-opt', { hasText: 'Prone' }).click();

  await page.keyboard.press('Escape');

  await expect(page.locator('.cond-pop')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

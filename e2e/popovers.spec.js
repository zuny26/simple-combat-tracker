// popovers.spec.js — the shared popover pattern, asserted once across all four
// implementations.
//
// CLAUDE.md documents one contract for tags.js / rowMenu.js / appMenu.js (and
// themePicker.js follows the same shape): a fixed panel plus a full-viewport backdrop
// that closes on any outside click, Escape closes and returns focus to the trigger,
// nothing is persisted, and the popover closes BEFORE running its action so no dialog
// or table rebuild happens underneath an open panel.
//
// Two descriptor flags record where the current code diverges from that description —
// both verified against the source, both deliberate here rather than asserted away:
//
//   restoresFocusOnEscape: tags.js never stores its trigger element (tags.js:72-74),
//     so Escape closes the picker but drops focus to the document. rowMenu.js:58-64
//     and appMenu.js:151-153 both do it correctly.
//   ariaExpanded: only #theme-trigger and #app-menu-btn carry it. .btn-menu has
//     aria-haspopup="menu" only; .cond-add has neither.
//
// confirmDialog.js is absent from this table on purpose: it is a modal, not a
// trigger-anchored popover, so the contract does not apply. It is still exercised, by
// the close-before-action test at the bottom.
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
    restoresFocusOnEscape: false, // known gap — see header
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
  // The tightest supported width, where the clamp math in rowMenu.js:38 and
  // appMenu.js:112 is most likely to be off.
  await gotoApp(page, { viewport: NARROW, creatures: ONE });

  for (const [trigger, panel] of [
    ['tr[data-id="1"] .btn-menu', '.row-menu'],
    ['#app-menu-btn', '.app-menu'],
  ]) {
    await page.locator(trigger).click();
    const box = await page.locator(panel).boundingBox();
    expect(box.x, `${panel} left edge`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${panel} right edge`).toBeLessThanOrEqual(NARROW.width + 1);
    await page.keyboard.press('Escape');
  }
});

test('the row menu closes before its action runs', async ({ page }) => {
  // The reason the pattern exists: no confirm dialog or table rebuild may ever happen
  // underneath an open panel.
  await gotoApp(page, { viewport: PHONE, creatures: ONE });

  await page.locator('tr[data-id="1"] .btn-menu').click();
  await page.locator('.row-menu-item', { hasText: 'Remove' }).click();

  await expect(page.locator('.row-menu')).toHaveCount(0);
  await expect(page.locator('.cond-backdrop')).toHaveCount(0);
  await expect(page.locator('#confirm-backdrop')).toBeVisible();
});

test('the app menu closes before applying a theme', async ({ page }) => {
  await gotoApp(page, { viewport: PHONE, creatures: ONE });

  await page.locator('#app-menu-btn').click();
  // Selected by theme id, not label: appMenu.js:56 sets data-theme-id, and ids are the
  // stable half of a THEMES entry (js/theme.js:9) while labels are copy.
  await page.locator('.app-menu-item[data-theme-id="dracula"]').click();

  await expect(page.locator('.app-menu')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
});

test('the tag picker adds a condition without rebuilding the table', async ({ page }) => {
  await gotoApp(page, { viewport: DESKTOP, creatures: ONE });

  // Tag the row, then confirm an unrelated field kept the text being typed into it —
  // updateTagsCell() must touch only its own cell.
  const nameField = page.locator('tr[data-id="1"] .f-name');
  await nameField.fill('Goblin scout');

  await page.locator('tr[data-id="1"] .cond-add[data-field="conditions"]').click();
  await page.locator('.cond-opt', { hasText: 'Prone' }).click();

  await expect(page.locator('tr[data-id="1"] .cond-pill')).toHaveText(/Prone/);
  await expect(nameField).toHaveValue('Goblin scout');
});

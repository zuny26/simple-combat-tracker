// focus-reorder.spec.js — the invariant CLAUDE.md calls the central constraint of the
// codebase: the DM types into the table while state changes underneath them, so a
// re-sort must never destroy the field being edited or break Tab.
//
// These live in a real browser rather than jsdom because they turn on focus semantics
// — above all e.relatedTarget on focusout, which main.js:102 reads to decide where to
// hand focus back. jsdom's fidelity there is exactly what this project does not trust.
// The structural half (that reorderRows moves nodes) is proven cheaply in
// test/reorder.dom.test.js.
//
// Rows are addressed by data-id throughout, never by nth(): the whole point is that
// positions change underneath you.
import { test, expect } from '@playwright/test';

import { gotoApp, creature } from './fixtures.js';

// Bbb outranks Aaa, so the initial order is [1, 2].
const TWO = [
  creature(1, { init: '20', name: 'Bbb', maxHP: 10 }),
  creature(2, { init: '5', name: 'Aaa', maxHP: 10 }),
];

async function rowIds(page) {
  return page.locator('#creature-rows tr').evaluateAll(
    (trs) => trs.map((tr) => Number(tr.dataset.id)),
  );
}

test('typing a new # does not reorder mid-edit', async ({ page }) => {
  await gotoApp(page, { creatures: TWO });
  expect(await rowIds(page)).toEqual([1, 2]);

  const aaaInit = page.locator('tr[data-id="2"] .f-init');
  await aaaInit.click();
  await aaaInit.fill('30'); // would sort Aaa to the top

  // Reorder is deferred to blur precisely so this does not happen.
  expect(await rowIds(page)).toEqual([1, 2]);
  await expect(aaaInit).toBeFocused();
  await expect(aaaInit).toHaveValue('30');
});

test('Tab commits the reorder and lands focus where Tab was going', async ({ page }) => {
  await gotoApp(page, { creatures: TWO });

  const aaaInit = page.locator('tr[data-id="2"] .f-init');
  await aaaInit.click();
  await aaaInit.fill('30');
  await page.keyboard.press('Tab');

  expect(await rowIds(page)).toEqual([2, 1]); // the row moved to the top
  // The Name field of the SAME creature — the element Tab was targeting, in a row that
  // has since been re-inserted elsewhere in the tbody.
  await expect(page.locator('tr[data-id="2"] .f-name')).toBeFocused();
});

test('clicking into another row commits the reorder and keeps the clicked field focused',
  async ({ page }) => {
    // The click path populates relatedTarget differently from Tab, so it needs its own
    // coverage.
    await gotoApp(page, { creatures: TWO });

    const aaaInit = page.locator('tr[data-id="2"] .f-init');
    await aaaInit.click();
    await aaaInit.fill('30');

    const bbbAc = page.locator('tr[data-id="1"] .f-ac');
    await bbbAc.click();

    expect(await rowIds(page)).toEqual([2, 1]);
    await expect(bbbAc).toBeFocused();
  });

test('an unfinished edit survives the re-sort it caused', async ({ page }) => {
  // Equal #, so Name is the tie-break and renaming alone changes the order.
  await gotoApp(page, {
    creatures: [
      creature(1, { init: '10', name: 'Bbb', maxHP: 10 }),
      creature(2, { init: '10', name: 'Zzz', maxHP: 10 }),
    ],
  });
  expect(await rowIds(page)).toEqual([1, 2]);

  const zzzName = page.locator('tr[data-id="2"] .f-name');
  await zzzName.click();
  await zzzName.fill('Aaa'); // now sorts first
  await page.keyboard.press('Tab');

  expect(await rowIds(page)).toEqual([2, 1]);
  await expect(zzzName).toHaveValue('Aaa', 'the edit was not destroyed by the move');
});

test('a re-sort that changes nothing leaves focus completely alone', async ({ page }) => {
  await gotoApp(page, { creatures: TWO });

  const bbbInit = page.locator('tr[data-id="1"] .f-init');
  await bbbInit.click();
  await bbbInit.fill('19'); // still outranks Aaa — order is unchanged
  await page.keyboard.press('Tab');

  expect(await rowIds(page)).toEqual([1, 2]);
  await expect(page.locator('tr[data-id="1"] .f-name')).toBeFocused();
});

test('the highlight follows the creature, not the row position', async ({ page }) => {
  await gotoApp(page, { creatures: TWO });

  await page.locator('#start-next-btn').click(); // Start -> top row (Bbb, id 1)
  await expect(page.locator('tr[data-id="1"]')).toHaveClass(/active/);

  const bbbInit = page.locator('tr[data-id="1"] .f-init');
  await bbbInit.click();
  await bbbInit.fill('1'); // Bbb now sorts last
  await page.locator('tr[data-id="2"] .f-name').click(); // blur commits the re-sort

  expect(await rowIds(page)).toEqual([2, 1]);
  // Still Bbb's turn, even though Bbb is now the bottom row.
  await expect(page.locator('tr[data-id="1"]')).toHaveClass(/active/);
});

test('clearing the active creature\'s # moves the highlight to the next row down',
  async ({ page }) => {
    await gotoApp(page, {
      creatures: [
        creature(1, { init: '20', name: 'Aaa', maxHP: 10 }),
        creature(2, { init: '10', name: 'Bbb', maxHP: 10 }),
        creature(3, { init: '5', name: 'Ccc', maxHP: 10 }),
      ],
    });

    await page.locator('#start-next-btn').click(); // Start -> Aaa
    await page.locator('#start-next-btn').click(); // Next  -> Bbb
    await expect(page.locator('tr[data-id="2"]')).toHaveClass(/active/);

    const bbbInit = page.locator('tr[data-id="2"] .f-init');
    await bbbInit.click();
    await bbbInit.fill(''); // Bbb leaves the turn order entirely
    await page.locator('tr[data-id="3"] .f-name').click();

    // reassignActiveAfterLeaving(oldIdx=1) picks whoever now sits at index 1 -> Ccc.
    await expect(page.locator('tr[data-id="3"]')).toHaveClass(/active/);
    await expect(page.locator('tr[data-id="2"]')).not.toHaveClass(/active/);
    // ...and Bbb is parked at the bottom.
    expect(await rowIds(page)).toEqual([1, 3, 2]);
  });

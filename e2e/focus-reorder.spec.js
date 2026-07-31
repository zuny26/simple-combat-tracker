// focus-reorder.spec.js — the invariant CLAUDE.md calls the central constraint of the
// codebase: the DM types into the table while state changes underneath them, so a
// re-sort must never destroy the field being edited or break Tab.
//
// These live in a real browser rather than jsdom because they exercise real focus
// semantics jsdom does not faithfully model: real Tab-key traversal, real
// click-to-focus, and — critically — the browser's own focus-transition machinery
// running across a live DOM move (reorderRows() relocates existing <tr> nodes
// mid-transition rather than replacing them).
//
// Coverage note: resortPreservingFocus()'s explicit `e.relatedTarget` read and its
// `next.focus()` fallback are NOT exercised by this suite in Chromium. A mutation that
// deleted that call left all 7 tests below green — Chromium's own HTML focus update
// steps re-validate and complete the focus move to the already-chosen target (Tab's
// next tabbable element, or whatever a real click targets) once reorderRows() finishes
// its synchronous move, regardless of that line. See task-6-report.md for the mutation
// that demonstrated this. The tests below still prove the invariant that actually
// matters — an edit is never destroyed and focus lands where the user expects — they
// just don't prove it via that specific fallback line.
//
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
  await expect(zzzName, 'the edit was not destroyed by the move').toHaveValue('Aaa');
  // The value check alone can't distinguish "the node survived the move" from "the node
  // was rebuilt from state that already held the edit": onInput writes c.name into state
  // before blur, so even a renderTable() rebuild (the bug this test exists to catch)
  // would render 'Aaa' from state and this assertion would stay green. Only a
  // focus-landing check tells them apart — a rebuilt .f-ac is a brand new element that
  // Tab could never have focused.
  await expect(page.locator('tr[data-id="2"] .f-ac')).toBeFocused();
});

test('a re-sort that changes nothing leaves focus completely alone', async ({ page }) => {
  await gotoApp(page, { creatures: TWO });

  // This test's whole point is that NOTHING moved — resortPreservingFocus's
  // currentRowOrder()/sortedRows() comparison short-circuits before ever touching the
  // DOM. rowIds() and toBeFocused() can't prove that on their own: reorderRows()
  // re-appending both rows in their existing relative order would leave rowIds and
  // focus unchanged too, and would pass just as green. So watch the DOM directly
  // instead of only checking the outcome.
  await page.evaluate(() => {
    window.__mutations = [];
    const observer = new window.MutationObserver((records) => {
      window.__mutations.push(...records);
    });
    observer.observe(
      document.getElementById('creature-rows'),
      { childList: true, subtree: true },
    );
    window.__reorderObserver = observer;
  });

  const bbbInit = page.locator('tr[data-id="1"] .f-init');
  await bbbInit.click();
  await bbbInit.fill('19'); // still outranks Aaa — order is unchanged
  await page.keyboard.press('Tab');

  expect(await rowIds(page)).toEqual([1, 2]);
  await expect(page.locator('tr[data-id="1"] .f-name')).toBeFocused();

  const mutationCount = await page.evaluate(() => {
    window.__reorderObserver.disconnect();
    return window.__mutations.length;
  });
  expect(mutationCount).toBe(0);
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

test('the unchanged branch still moves the highlight when the active creature leaves',
  async ({ page }) => {
    // TWO: Bbb outranks Aaa, so turn order is [Bbb, Aaa] — Aaa is the LAST
    // initiatived row.
    await gotoApp(page, { creatures: TWO });

    await page.locator('#start-next-btn').click(); // Start -> Bbb
    await page.locator('#start-next-btn').click(); // Next  -> Aaa (last row)
    await expect(page.locator('tr[data-id="2"]')).toHaveClass(/active/);

    const aaaInit = page.locator('tr[data-id="2"] .f-init');
    await aaaInit.click();
    await aaaInit.fill(''); // Aaa leaves the turn order, but was already the bottom
    // row, so parking it changes nothing about display order: resortPreservingFocus
    // takes the "unchanged" branch (renderHighlight(); return) rather than reorderRows().
    await page.locator('tr[data-id="1"] .f-name').click(); // commit the blur

    // Display order really is untouched.
    expect(await rowIds(page)).toEqual([1, 2]);
    // reassignActiveAfterLeaving(oldIdx=1) wraps past the end of the one remaining
    // initiatived row (Bbb) back to remaining[0] -> Bbb regains the highlight. The
    // "unchanged" branch's renderHighlight() call is the ONLY thing that can apply
    // that to the DOM here — without it the active class would stay stuck on Aaa.
    await expect(page.locator('tr[data-id="1"]')).toHaveClass(/active/);
    await expect(page.locator('tr[data-id="2"]')).not.toHaveClass(/active/);
  });

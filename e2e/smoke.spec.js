// smoke.spec.js — proves the harness itself works: server, seeding, real UI, overflow.
import { test, expect } from '@playwright/test';

import { gotoApp, creature, expectNoOverflow } from './fixtures.js';

test('a seeded combat renders in initiative order', async ({ page }) => {
  // Names are chosen so initiative order and name order DISAGREE: the high-init
  // creature is alphabetically first. Sorting by name descending would yield
  // Zzz, Aaa and fail here, so this test can actually tell the two apart.
  await gotoApp(page, {
    creatures: [
      creature(1, { init: '5', name: 'Zzz', maxHP: 10 }),
      creature(2, { init: '20', name: 'Aaa', maxHP: 10 }),
    ],
  });

  const rows = page.locator('#creature-rows tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator('.f-name')).toHaveValue('Aaa');
  await expect(rows.nth(1).locator('.f-name')).toHaveValue('Zzz');
});

test('the real Add button adds a row and focuses its #', async ({ page }) => {
  // Guards the seeding shortcut above: if Add breaks, seeding would still pass and
  // hide it.
  await gotoApp(page, { creatures: [creature(1, { init: '10', name: 'Aaa' })] });

  await page.locator('#add-btn').click();

  await expect(page.locator('#creature-rows tr')).toHaveCount(2);
  await expect(page.locator('#creature-rows tr').last().locator('.f-init')).toBeFocused();
});

test('the desktop layout does not overflow', async ({ page }) => {
  await gotoApp(page, {
    viewport: { width: 1600, height: 900 },
    creatures: [creature(1, { init: '18', name: 'Ancient Red Dragon', ac: '22', maxHP: 546 })],
  });

  await expectNoOverflow(page);
});

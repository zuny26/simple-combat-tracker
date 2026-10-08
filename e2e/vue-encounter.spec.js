import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
});

const creature = (page, id) => page.locator(`tr[data-id="${id}"]`);
const order = page => page.locator('#creature-rows tr[data-id]').evaluateAll(rows =>
  rows.map(row => row.dataset.id));

test('Vue creates and advances an encounter, edits with Tab/click, and restores without reseeding', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('vue.html');
  expect(response.status()).toBe(200);
  await expect(page).toHaveTitle('D&D Combat Tracker — Vue');
  await expect(page.locator('script[type="module"][src^="/simple-combat-tracker/assets/"]')).toHaveCount(1);
  await page.locator('#add-btn').click();
  const first = creature(page, 1);
  await expect(first.locator('.f-init')).toBeFocused();
  await first.locator('.f-init').fill('20');
  await first.locator('.f-init').press('Tab');
  await expect(first.locator('.f-name')).toBeFocused();
  await first.locator('.f-name').fill('Goblin');
  await first.locator('.f-ac').fill('13');
  await first.locator('.f-maxhp').fill('12.5');
  await first.locator('.f-temphp').fill('3');
  await expect(first.locator('.hp-number')).toHaveText('15.5 / 12.5');
  await page.locator('#add-btn').click();
  const second = creature(page, 2);
  await second.locator('.f-init').fill('5');
  await second.locator('.f-name').fill('Ogre');
  await page.locator('#add-btn').click(); // third creature remains parked
  await page.locator('#start-next-btn').click();
  await expect(first).toHaveClass(/active/);
  await page.locator('#start-next-btn').click();
  await expect(second).toHaveClass(/active/);
  await page.locator('#start-next-btn').click();
  await expect(first).toHaveClass(/active/);
  await expect(page.locator('#round-value')).toHaveText('2');

  await first.locator('.f-init').fill('1');
  expect(await order(page)).toEqual(['1', '2', '3']); // no sorting during input
  await first.locator('.f-init').press('Tab');
  await expect(first.locator('.f-name')).toBeFocused();
  expect(await order(page)).toEqual(['2', '1', '3']);
  await expect(first).toHaveClass(/active/); // identity survives sorting
  await first.locator('.f-name').pressSequentially(' captain');
  await first.locator('.f-init').fill('30');
  await second.locator('.f-name').click();
  await expect(second.locator('.f-name')).toBeFocused();
  expect(await order(page)).toEqual(['1', '2', '3']);
  await second.locator('.f-name').pressSequentially(' chief');

  await page.reload(); // no storage seed script: read real UI saves
  await expect(first.locator('.f-init')).toHaveValue('30');
  await expect(first.locator('.f-name')).toHaveValue('Goblin captain');
  await expect(first.locator('.f-ac')).toHaveValue('13');
  await expect(first.locator('.f-maxhp')).toHaveValue('12.5');
  await expect(first.locator('.f-temphp')).toHaveValue('3');
  await expect(second.locator('.f-name')).toHaveValue('Ogre chief');
  await expect(first).toHaveClass(/active/);
  await expect(page.locator('#round-value')).toHaveText('2');
  await first.locator('.f-init').fill('');
  await expect(second).toHaveClass(/active/);
  await second.locator('.f-init').click();
  await second.locator('.f-init').fill('not a number');
  await expect(page.locator('#start-next-btn')).toHaveText('Start');
  await expect(page.locator('#round-value')).toHaveText('0');
  expect(errors).toEqual([]);
});

test('Vue name ties reorder on blur and retain the Tab and click destinations', async ({ page }) => {
  await page.goto('vue.html');
  await expect(page).toHaveTitle('D&D Combat Tracker — Vue');
  for (const [id, name] of [[1, 'Alpha'], [2, 'Beta']]) {
    await page.locator('#add-btn').click();
    await creature(page, id).locator('.f-init').fill('10');
    await creature(page, id).locator('.f-name').fill(name);
  }
  await page.locator('#start-next-btn').click();
  const first = creature(page, 1);
  const second = creature(page, 2);
  await first.locator('.f-name').fill('Zulu');
  expect(await order(page)).toEqual(['1', '2']);
  await first.locator('.f-name').press('Tab');
  await expect(first.locator('.f-ac')).toBeFocused();
  expect(await order(page)).toEqual(['2', '1']);
  await expect(first).toHaveClass(/active/);
  await first.locator('.f-ac').pressSequentially('17');
  await second.locator('.f-name').fill('Zzz');
  await first.locator('.f-name').click();
  await expect(first.locator('.f-name')).toBeFocused();
  expect(await order(page)).toEqual(['1', '2']);
  await first.locator('.f-name').pressSequentially(' mage');
  await page.reload();
  await expect(first.locator('.f-name')).toHaveValue('Zulu mage');
  await expect(first.locator('.f-ac')).toHaveValue('17');
  await expect(second.locator('.f-name')).toHaveValue('Zzz');
});

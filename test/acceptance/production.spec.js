import { test, expect } from '@playwright/test';
import { URL } from 'node:url';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
});

const creature = (page, id) => page.locator(`tr[data-id="${id}"]`);
const order = page => page.locator('#creature-rows tr[data-id]').evaluateAll(rows =>
  rows.map(row => row.dataset.id));

test('the built tracker creates and advances an encounter, edits with Tab/click, and restores without reseeding', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('./');
  expect(response.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe('/simple-combat-tracker/');
  await expect(page.locator('#app .app-card')).toBeVisible();
  await expect(page).toHaveTitle('D&D Combat Tracker');
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

test('Vue applies damage and healing explicitly and reloads applied HP without pending amounts', async ({ page }) => {
  await page.goto('./');
  await page.locator('#add-btn').click();
  const first = creature(page, 1);
  await first.getByRole('textbox', { name: 'Max HP', exact: true }).fill('12');
  await first.getByRole('textbox', { name: 'Temp HP', exact: true }).fill('3');
  await page.locator('#add-btn').click();
  const second = creature(page, 2);
  await second.getByRole('textbox', { name: 'Max HP', exact: true }).fill('10');
  const amount = row => row.getByRole('textbox', { name: 'Damage or healing amount' });
  await amount(second).fill('7');
  await amount(first).fill('5.5');
  await amount(first).press('Enter');
  await expect(first.locator('.hp-number')).toHaveText('15 / 12');
  await expect(amount(first)).toHaveValue('5.5');
  await first.getByRole('button', { name: 'Damage', exact: true }).click();
  await expect(first.locator('.hp-number')).toHaveText('9.5 / 12');
  await expect(first.locator('.f-temphp')).toHaveValue('');
  await expect(amount(first)).toHaveValue('');
  await expect(amount(second)).toHaveValue('7');
  await expect(second.locator('.hp-number')).toHaveText('10 / 10');
  await amount(first).fill('4'); // leave an unapplied amount on each creature
  await page.reload();
  await expect(first.locator('.hp-number')).toHaveText('9.5 / 12');
  await expect(first.locator('.f-temphp')).toHaveValue('');
  await expect(amount(first)).toHaveValue('');
  await expect(amount(second)).toHaveValue('');
  await expect(second.locator('.hp-number')).toHaveText('10 / 10');
  await first.locator('.f-temphp').fill('2');
  await amount(first).fill('1.5');
  await first.getByRole('button', { name: 'Heal', exact: true }).click();
  await expect(first.locator('.hp-number')).toHaveText('13 / 12');
  await expect(first.locator('.f-temphp')).toHaveValue('2');
  await expect(amount(first)).toHaveValue('');
  await amount(first).fill('8');
  await page.reload();
  await expect(first.locator('.hp-number')).toHaveText('13 / 12');
  await expect(first.locator('.f-temphp')).toHaveValue('2');
  await expect(amount(first)).toHaveValue('');
});

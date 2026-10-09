import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
});

const creature = (page, id) => page.locator(`tr[data-id="${id}"]`);
const order = page => page.locator('#creature-rows tr[data-id]').evaluateAll(rows =>
  rows.map(row => row.dataset.id));

test('Vue name ties reorder on blur and retain the Tab and click destinations', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('D&D Combat Tracker');
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

test('Vue destructive confirmation supports cancellation, keyboard use, and reload at 320px', async ({ page }) => {
  const width = 320;
  await page.setViewportSize({ width, height: 800 });
  await page.goto('./');
  await page.locator('#add-btn').click();
  const first = creature(page, 1);
  await first.locator('.f-init').fill('20');
  await first.locator('.f-name').fill('Goblin');
  await first.locator('.f-maxhp').fill('12');
  await first.getByRole('button', { name: 'Creature actions' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate creature' }).click();
  await expect(creature(page, 2).locator('.f-name')).toHaveValue('Goblin 2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('#start-next-btn').click();
  const saved = () => page.evaluate(() => localStorage.getItem('dnd-combat-tracker-v1'));
  const before = await saved();
  const remove = first.getByRole('button', { name: 'Creature actions' });
  const openRemoval = async () => {
    await remove.click();
    await page.getByRole('menuitem', { name: 'Remove creature' }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
  };
  await openRemoval();
  const dialog = page.getByRole('dialog', { name: 'Remove creature?' });
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  const accept = page.locator('#confirm-ok-btn');
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(800);
  await expect(cancel).toBeFocused();
  await cancel.press('Shift+Tab');
  await expect(accept).toBeFocused();
  await accept.press('Tab');
  await expect(cancel).toBeFocused();
  await cancel.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(remove).toBeFocused();
  expect(await saved()).toBe(before);
  await openRemoval();
  await cancel.click();
  await expect(remove).toBeFocused();
  expect(await saved()).toBe(before);
  await openRemoval();
  await page.locator('.confirm-backdrop').click({ position: { x: 2, y: 2 } });
  await expect(dialog).toHaveCount(0);
  expect(await saved()).toBe(before);
  await openRemoval();
  await accept.click();
  await expect(first).toHaveCount(0);
  await expect(creature(page, 2)).toHaveClass(/active/);
  await expect(page.locator('#add-btn')).toBeFocused();
  await page.reload();
  await expect(first).toHaveCount(0);
  await expect(creature(page, 2)).toHaveClass(/active/);
  await page.locator('#reset-btn').click();
  await cancel.click();
  await expect(page.locator('#reset-btn')).toBeFocused();
  await expect(creature(page, 2)).toBeVisible();
  await page.locator('#reset-btn').click();
  await accept.click();
  await expect(page.locator('#reset-btn')).toBeFocused();
  await page.reload();
  await expect(page.locator('tr[data-id]')).toHaveCount(0);
  await expect(page.locator('#round-value')).toHaveText('0');
  await expect(page.locator('#start-next-btn')).toHaveText('Start');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

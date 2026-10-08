import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
});

const creature = (page, id) => page.locator(`tr[data-id="${id}"]`);
const order = page => page.locator('#creature-rows tr[data-id]').evaluateAll(rows =>
  rows.map(row => row.dataset.id));

test('Vue applies damage and healing explicitly and reloads applied HP without pending amounts', async ({ page }) => {
  await page.goto('vue.html');
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


for (const width of [1280, 320]) {
  test(`Vue destructive confirmation supports cancellation, keyboard use, and reload at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('vue.html');
    await page.locator('#add-btn').click();
    const first = creature(page, 1);
    await first.locator('.f-init').fill('20');
    await first.locator('.f-name').fill('Goblin');
    await first.locator('.f-maxhp').fill('12');
    await first.getByRole('button', { name: 'Duplicate creature' }).click();
    await expect(creature(page, 2).locator('.f-name')).toHaveValue('Goblin 2');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('#start-next-btn').click();
    const saved = () => page.evaluate(() => localStorage.getItem('dnd-combat-tracker-v1'));
    const before = await saved();
    const remove = first.getByRole('button', { name: 'Remove creature' });
    await remove.click();
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
    await remove.click();
    await cancel.click();
    await expect(remove).toBeFocused();
    expect(await saved()).toBe(before);
    await remove.click();
    await page.locator('.confirm-backdrop').click({ position: { x: 2, y: 2 } });
    await expect(dialog).toHaveCount(0);
    expect(await saved()).toBe(before);
    await remove.click();
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
}

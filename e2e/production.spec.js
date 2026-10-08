import { test, expect } from '@playwright/test';
import { URL } from 'node:url';

test('the built tracker loads at the Pages path and restores an edited encounter', async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('./');
  expect(response.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe('/simple-combat-tracker/');
  // A source-server run cannot satisfy this artifact check.
  await expect(page.locator('script[type="module"][src^="/simple-combat-tracker/assets/"]'))
    .toHaveCount(1);

  await page.locator('#add-btn').click();
  const first = page.locator('tr[data-id="1"]');
  await first.locator('.f-init').fill('20');
  await first.locator('.f-name').fill('Goblin');
  await first.locator('.f-maxhp').fill('10');
  await first.locator('.f-temphp').fill('2');
  await page.locator('#add-btn').click();
  const second = page.locator('tr[data-id="2"]');
  await second.locator('.f-init').fill('5');
  await second.locator('.f-name').fill('Ogre');
  await page.locator('#start-next-btn').click();
  await expect(first).toHaveClass(/active/);
  await page.locator('#start-next-btn').click();
  await expect(second).toHaveClass(/active/);
  await page.locator('#start-next-btn').click();
  await expect(page.locator('#round-value')).toHaveText('2');

  await first.locator('.f-adjust').fill('5');
  await first.locator('.r-dmg').click(); // two temp HP, then three normal HP
  await first.locator('.f-adjust').fill('1');
  await first.locator('.r-heal').click(); // eight normal HP remain
  await first.locator('.f-adjust').fill('9'); // pending input must not persist

  // No addInitScript: reload must read what the real UI saved.
  await page.reload();
  await expect(first.locator('.f-name')).toHaveValue('Goblin');
  await expect(first.locator('.hp-number > span').first()).toHaveText('8');
  await expect(first.locator('.f-temphp')).toHaveValue('');
  await expect(first.locator('.f-adjust')).toHaveValue('');
  await expect(second.locator('.f-name')).toHaveValue('Ogre');
  await expect(first).toHaveClass(/active/);
  await expect(page.locator('#round-value')).toHaveText('2');
  expect(errors).toEqual([]);
});

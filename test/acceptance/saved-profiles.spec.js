import { test, expect } from '@playwright/test';
import { expectNoOverflow } from './fixtures.js';
import { THEMES } from '../../src/ui/themes.ts';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

for (const width of [320, 768, 1400, 1600]) {
  test(`bookmarks save across reload and New Combat in every theme at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await page.locator('#usage-dismiss-btn').click();
    await page.locator('#add-btn').click();
    const row = page.locator('tr[data-id]').first();
    const bookmark = row.locator('.btn-bookmark');
    await expect(bookmark).toBeDisabled();
    await row.locator('.f-name').fill(' Goblin 2 ');
    await row.locator('.f-ac').fill('13');
    await row.locator('.f-maxhp').fill('7');
    await row.locator('.f-temphp').fill('3');
    await row.locator('.f-adjust').fill('5');
    await row.getByRole('button', { name: 'Damage', exact: true }).click();
    await expect(bookmark).toHaveAccessibleName('Save profile: not saved');
    await bookmark.focus();
    await page.keyboard.press('Enter');
    await expect(bookmark).toHaveAccessibleName('Saved profile: matching');
    await expect(row.locator('.f-name')).toHaveValue(' Goblin 2 ');
    await expect(row.locator('.hp-number')).toHaveText('5 / 7');
    await page.reload();
    await expect(bookmark).toHaveAccessibleName('Saved profile: matching');
    await expect(row.locator('.hp-number')).toHaveText('5 / 7');

    for (const theme of THEMES) {
      await page.locator(width <= 640 ? '#app-menu-btn' : '#theme-trigger').click();
      await page.getByRole('menuitemradio', { name: theme.label }).click();
      await expect(bookmark).toBeVisible();
      await expect(bookmark.locator('.bookmark-shape')).toHaveCSS(
        'fill',
        await bookmark.evaluate((el) => getComputedStyle(el).color),
      );
      await expect(bookmark.locator('.bookmark-difference')).toBeHidden();
      await row.locator('.f-ac').fill('15');
      await expect(bookmark).toHaveAccessibleName(
        'Saved profile: differences; existing profile kept',
      );
      await expect(bookmark.locator('.bookmark-shape')).toHaveCSS('fill', 'none');
      await expect(bookmark.locator('.bookmark-difference')).toBeVisible();
      await bookmark.click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await row.locator('.f-name').fill('Orc');
      await expect(bookmark).toHaveAccessibleName('Save profile: not saved');
      await expect(bookmark.locator('.bookmark-shape')).toHaveCSS('fill', 'none');
      await expect(bookmark.locator('.bookmark-difference')).toBeHidden();
      await expectNoOverflow(page);
      await row.locator('.f-name').fill(' goblin 3 ');
      await row.locator('.f-ac').fill('13');
      await expect(bookmark).toHaveAccessibleName('Saved profile: matching');
    }

    await bookmark.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('#reset-btn').click();
    await page.locator('#confirm-ok-btn').click();
    await expect(page.locator('tr[data-id]')).toHaveCount(0);
    await page.reload();
    await page.locator('#add-btn').click();
    await row.locator('.f-name').fill('GOBLIN');
    await row.locator('.f-ac').fill('13');
    await row.locator('.f-maxhp').fill('7');
    await expect(bookmark).toHaveAccessibleName('Saved profile: matching');
    await expectNoOverflow(page);
  });
}

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
    const compact = width <= 1400;
    const inlineBookmark = row.locator('.btn-bookmark');
    const menuTrigger = row.getByRole('button', { name: 'Creature actions' });
    const bookmark = compact
      ? row.getByRole('menuitem', { name: /^(Save profile|Update profile|Profile saved)$/ })
      : inlineBookmark;
    if (compact) await expect(inlineBookmark).toBeHidden();
    else await expect(menuTrigger).toBeHidden();
    async function openBookmark(label) {
      if (compact) await menuTrigger.click();
      await expect(bookmark).toHaveAccessibleName(label);
      return bookmark;
    }
    async function inspectBookmark(label, inspect) {
      await openBookmark(label);
      if (inspect) await inspect(bookmark);
      if (compact) {
        await page.keyboard.press('Escape');
        await expect(page.getByRole('menu')).toHaveCount(0);
        await expect(menuTrigger).toBeFocused();
      }
    }
    async function activateBookmark(label) {
      await openBookmark(label);
      await bookmark.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('menu')).toHaveCount(0);
      if (compact) await expect(menuTrigger).toBeFocused();
    }
    await inspectBookmark('Save profile', async (button) => expect(button).toBeDisabled());
    await row.locator('.f-name').fill(' Goblin 2 3 ');
    await row.locator('.f-ac').fill('13');
    await row.locator('.f-maxhp').fill('7');
    await row.locator('.f-temphp').fill('3');
    await row.locator('.f-adjust').fill('5');
    await row.getByRole('button', { name: 'Damage', exact: true }).click();
    await activateBookmark('Save profile');
    await inspectBookmark('Profile saved');
    await expect(row.locator('.f-name')).toHaveValue(' Goblin 2 3 ');
    await expect(row.locator('.hp-number')).toHaveText('5 / 7');
    await page.reload();
    await inspectBookmark('Profile saved');
    await expect(row.locator('.hp-number')).toHaveText('5 / 7');

    for (const theme of THEMES) {
      await page.locator(width <= 640 ? '#app-menu-btn' : '#theme-trigger').click();
      await page.getByRole('menuitemradio', { name: theme.label }).click();
      await inspectBookmark('Profile saved', async (button) => {
        await expect(button).toBeVisible();
        await expect(button.locator('.bookmark-shape')).toHaveCSS(
          'fill',
          await button.locator('svg').evaluate((el) => getComputedStyle(el).color),
        );
        await expect(button.locator('.bookmark-difference')).toBeHidden();
        await expectNoOverflow(page);
      });
      await row.locator('.f-ac').fill('15');
      await inspectBookmark('Update profile', async (button) => {
        await expect(button.locator('.bookmark-shape')).toHaveCSS('fill', 'none');
        await expect(button.locator('.bookmark-difference')).toBeVisible();
      });
      await activateBookmark('Update profile');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await row.locator('.f-name').fill('Orc');
      await inspectBookmark('Save profile', async (button) => {
        await expect(button.locator('.bookmark-shape')).toHaveCSS('fill', 'none');
        await expect(button.locator('.bookmark-difference')).toBeHidden();
      });
      await expectNoOverflow(page);
      await row.locator('.f-name').fill(' goblin 3 ');
      await row.locator('.f-ac').fill('13');
      await inspectBookmark('Profile saved');
    }

    await activateBookmark('Profile saved');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('#reset-btn').click();
    await page.locator('#confirm-ok-btn').click();
    await expect(page.locator('tr[data-id]')).toHaveCount(0);
    await page.reload();
    await page.locator('#add-btn').click();
    await row.locator('.f-name').fill('GOBLIN');
    await row.locator('.f-ac').fill('13');
    await row.locator('.f-maxhp').fill('7');
    await inspectBookmark('Profile saved');
    await expectNoOverflow(page);
  });
}

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
      if (compact && label !== 'Update profile') await expect(menuTrigger).toBeFocused();
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
      await expect(
        page.getByRole('dialog', { name: 'Update saved profile Goblin?' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
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

for (const width of [320, 1600]) {
  test(`profile overwrites contain focus, restore it, and persist independently at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await page.locator('#usage-dismiss-btn').click();
    await page.locator('#add-btn').click();
    const row = page.locator('tr[data-id]').first();
    await row.locator('.f-name').fill('Goblin');
    await row.locator('.f-ac').fill('13');
    await row.locator('.f-maxhp').fill('7');
    const compact = width === 320;
    const trigger = compact ? row.locator('.btn-menu') : row.locator('.btn-bookmark');
    async function bookmark(label) {
      await trigger.focus();
      await page.keyboard.press('Enter');
      if (compact) {
        await page.getByRole('menuitem', { name: label, exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('menu')).toHaveCount(0);
      }
    }
    await bookmark('Save profile');
    await row.locator('.f-name').fill('Goblin 2');
    await row.locator('.f-ac').fill('15');
    await row.locator('.f-maxhp').fill('12');
    await row.locator('.f-temphp').fill('3');
    await row.locator('.f-adjust').fill('4');
    await row.getByRole('button', { name: 'Damage', exact: true }).click();
    const encounter = await page.evaluate(() => localStorage.getItem('dnd-combat-tracker-v1'));
    const saved = await page.evaluate(() => localStorage.getItem('dnd-saved-profiles-v1'));
    const dialog = page.getByRole('dialog', { name: 'Update saved profile Goblin?' });
    const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
    const accept = page.locator('#confirm-ok-btn');
    await bookmark('Update profile');
    await expect(dialog).toContainText('Update saved profile Goblin?');
    await expect(dialog.locator('li')).toHaveText(['AC: 13 → 15', 'Max HP: 7 → 12']);
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(accept).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(accept).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cancel).toBeFocused();
    await expect(page.locator('.app-card')).toHaveAttribute('inert', '');
    await expectNoOverflow(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('dnd-saved-profiles-v1'))).toBe(saved);
    await bookmark('Update profile');
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('dnd-saved-profiles-v1'))).toBe(saved);
    await bookmark('Update profile');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('dnd-combat-tracker-v1'))).toBe(
      encounter,
    );
    await page.reload();
    await expect(row.locator('.f-name')).toHaveValue('Goblin 2');
    await expect(row.locator('.hp-number')).toHaveText('11 / 12');
    await bookmark('Profile saved');
    await expect(dialog).toHaveCount(0);
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('dnd-saved-profiles-v1')).profiles),
    ).toEqual([{ name: 'Goblin', ac: '15', maxHP: 12 }]);
  });
}

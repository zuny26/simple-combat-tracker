import { test, expect } from '@playwright/test';
import { expectNoOverflow } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

for (const width of [1600, 768, 320]) {
  test(`undo and redo restore edits, turns and removed creatures at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    const mobile = width <= 640;
    const history = async (name) => {
      if (mobile) {
        await page.locator('#app-menu-btn').click();
        await page.getByRole('menuitem', { name, exact: true }).click();
        await expect(page.getByRole('menu')).toHaveCount(0);
        await expect(page.locator('#app-menu-btn')).toBeFocused();
      } else await page.getByRole('button', { name, exact: true }).click();
    };
    const disabledHistory = async () => {
      if (mobile) await page.locator('#app-menu-btn').click();
      for (const name of ['Undo', 'Redo']) {
        await expect(
          page.getByRole(mobile ? 'menuitem' : 'button', { name, exact: true }),
        ).toBeDisabled();
      }
      if (mobile) await page.keyboard.press('Escape');
    };
    await disabledHistory();
    await page.locator('#add-btn').click();
    const first = page.locator('tr[data-id="1"]');
    await first.locator('.f-init').fill('20');
    await first.locator('.f-name').pressSequentially('Goblin');
    await history('Undo');
    await expect(first.locator('.f-name')).toHaveValue('');
    await history('Redo');
    await expect(first.locator('.f-name')).toHaveValue('Goblin');
    await first.locator('.f-maxhp').fill('12');
    await first.locator('.f-temphp').fill('3');
    await page.locator('#add-btn').click();
    const second = page.locator('tr[data-id="2"]');
    await second.locator('.f-init').fill('10');
    await second.locator('.f-name').fill('Orc');
    await page.locator('#start-next-btn').click();
    await first.locator('.f-init').fill('5');
    // Clicking Undo must settle blur/reordering and restore order in the same interaction.
    await history('Undo');
    await expect(first.locator('.f-init')).toHaveValue('20');
    await expect(page.locator('tr[data-id]').first()).toHaveAttribute('data-id', '1');
    await expect(first).toHaveClass(/active/);
    await first.locator('.f-adjust').fill('5');
    await first.getByRole('button', { name: 'Damage', exact: true }).click();
    await expect(first.locator('.hp-number')).toHaveText('10 / 12');
    await history('Undo');
    await expect(first.locator('.f-temphp')).toHaveValue('3');
    await expect(first.locator('.hp-number')).toHaveText('15 / 12');
    await history('Redo');
    await expect(first.locator('.hp-number')).toHaveText('10 / 12');
    await page.locator('#start-next-btn').click();
    await expect(second).toHaveClass(/active/);
    await history('Undo');
    await expect(first).toHaveClass(/active/);
    await history('Redo');
    await expect(second).toHaveClass(/active/);
    if (width <= 1400) {
      await second.getByRole('button', { name: 'Creature actions' }).click();
      await page.getByRole('menuitem', { name: 'Remove creature' }).click();
    } else await second.getByRole('button', { name: 'Remove creature' }).click();
    await page.locator('#confirm-ok-btn').click();
    await expect(second).toHaveCount(0);
    await history('Undo');
    await expect(second.locator('.f-name')).toHaveValue('Orc');
    await expect(second).toHaveClass(/active/);
    await first.locator('.f-maxhp').fill('7');
    await history('Undo');
    await expect(first.locator('.f-maxhp')).toHaveValue('12');
    await history('Redo');
    await expect(first.locator('.f-maxhp')).toHaveValue('7');
    await page.reload();
    await expect(first.locator('.f-maxhp')).toHaveValue('7');
    await expect(second).toHaveClass(/active/);
    await disabledHistory();
    await first.locator('.f-ac').fill('15');
    await history('Undo');
    await page.locator('#reset-btn').click();
    await page.locator('#confirm-ok-btn').click();
    await expect(page.locator('tr[data-id]')).toHaveCount(0);
    await disabledHistory();
    await expectNoOverflow(page);
  });
}

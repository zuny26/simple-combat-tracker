import { test, expect } from '@playwright/test';
import { expectNoOverflow } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

test('encounter toolbar stays on one row through the compact 800px cutoff', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '+ Add creature', exact: true }).click();
  await page.locator('tr[data-id="1"] .f-init').fill('20');

  for (const started of [false, true]) {
    if (started) await page.locator('#start-next-btn').click();
    for (const width of [640, 641, 768, 790, 800, 801]) {
      await page.setViewportSize({ width, height: 900 });
      const bounds = [];
      for (const selector of [
        '#start-next-btn',
        '#add-btn',
        '#undo-btn',
        '#redo-btn',
        '#reset-btn',
      ]) {
        const button = page.locator(selector);
        await expect(button).toBeVisible();
        bounds.push(await button.boundingBox());
      }
      for (let index = 1; index < bounds.length; index++) {
        expect(bounds[index].y).toBeCloseTo(bounds[0].y, 0);
        expect(bounds[index].x).toBeGreaterThanOrEqual(
          bounds[index - 1].x + bounds[index - 1].width,
        );
      }
      await expect(page.locator('#add-btn')).toHaveAccessibleName('+ Add creature');
      for (const name of ['Undo', 'Redo']) {
        const button = page.getByRole('button', { name, exact: true });
        const box = await button.boundingBox();
        const label = button.locator('.lbl-long');
        if (width <= 800) {
          expect(box.width).toBeCloseTo(box.height, 1);
          await expect(label).toHaveCSS('clip', 'rect(0px, 0px, 0px, 0px)');
        } else {
          expect(box.width).toBeGreaterThan(box.height);
          await expect(label).toHaveCSS('position', 'static');
        }
      }
      await expect(page.locator('#add-btn .lbl-long')).toHaveCSS(
        'position',
        width <= 800 ? 'absolute' : 'static',
      );
      await expect(page.locator('#reset-btn .lbl-long')).toHaveCSS(
        'position',
        width <= 640 ? 'absolute' : 'static',
      );
      if (width > 640) {
        const resetRight = bounds.at(-1).x + bounds.at(-1).width;
        const toolbarRight = await page.locator('.tier2').evaluate((el) => {
          const box = el.getBoundingClientRect();
          return box.right - parseFloat(window.getComputedStyle(el).paddingRight);
        });
        expect(resetRight).toBeCloseTo(toolbarRight, 1);
      }
      await expectNoOverflow(page);
    }
  }
});

for (const width of [1600, 768, 320]) {
  test(`undo and redo restore edits, turns and removed creatures at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    const history = async (name) => {
      await page.getByRole('button', { name, exact: true }).click();
    };
    const disabledHistory = async () => {
      for (const name of ['Undo', 'Redo']) {
        await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
      }
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
    if (width <= 640) {
      const buttons = ['#start-next-btn', '#add-btn', '#undo-btn', '#redo-btn', '#reset-btn'];
      const bounds = [];
      for (const selector of buttons) {
        await expect(page.locator(selector)).toBeVisible();
        bounds.push(await page.locator(selector).boundingBox());
      }
      for (let index = 1; index < bounds.length; index++) {
        expect(bounds[index].y).toBeCloseTo(bounds[0].y, 0);
        expect(bounds[index].x).toBeGreaterThanOrEqual(
          bounds[index - 1].x + bounds[index - 1].width,
        );
      }
      await expectNoOverflow(page);
    }
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

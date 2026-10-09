import { test, expect } from '@playwright/test';
import { expectNoOverflow } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
});

for (const width of [1600, 768, 320]) {
  test(`Vue preferences and encounter controls work at ${width}px without overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('./');
    await page.locator('#usage-dismiss-btn').click();
    await page.locator('#add-btn').click();
    const row = page.locator('tr[data-id="1"]');
    await row.locator('.f-name').fill('Goblin');
    await row.locator('.f-init').fill('20');
    await row.locator('.f-ac').fill('13');
    await row.locator('.f-maxhp').fill('12');
    await page.locator('#start-next-btn').click();
    await expectNoOverflow(page);
    const mobile = width <= 640;
    const trigger = page.locator(mobile ? '#app-menu-btn' : '#theme-trigger');
    await expect(trigger).toBeVisible();
    await expect(page.locator(mobile ? '#theme-trigger' : '#app-menu-btn')).toBeHidden();
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByRole('menu', { name: mobile ? 'Menu' : 'Theme', exact: true });
    await expect(menu.getByRole('menuitemradio', { name: 'Organic Day' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(menu.getByRole('menuitemradio', { name: 'Organic Night' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expectNoOverflow(page);
    const bounds = await menu.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(800);
    await page.locator('.cond-backdrop').click({ position: { x: 2, y: 2 } });
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await menu.getByRole('menuitemradio', { name: 'Dracula' }).click();
    await expect(menu).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
    await expect(trigger).toBeFocused();
    if (mobile) {
      await trigger.click();
      await menu.getByRole('menuitem', { name: 'How to run a fight' }).click();
    } else await page.locator('#usage-help-btn').click();
    await expect(page.locator('.usage-callout')).toBeVisible();
    await page.locator('#usage-dismiss-btn').click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
    await expect(page.locator('.usage-callout')).toHaveCount(0);
    const rowTrigger = row.getByRole('button', { name: 'Creature actions' });
    if (width <= 1400) {
      await rowTrigger.click();
      await expect(page.getByRole('menuitem', { name: 'Duplicate creature' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(rowTrigger).toBeFocused();
      await rowTrigger.click();
      await page.getByRole('menuitem', { name: 'Duplicate creature' }).click();
    } else await row.getByRole('button', { name: 'Duplicate creature' }).click();
    await expect(page.locator('tr[data-id="2"] .f-name')).toHaveValue('Goblin 2');
    if (mobile) {
      await trigger.click();
      await menu.getByRole('menuitem', { name: 'New Combat' }).click();
    } else await page.locator('#reset-btn').click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.locator('#confirm-ok-btn').click();
    await page.reload();
    await expect(page.locator('tr[data-id]')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
    await expect(page.locator('.usage-callout')).toHaveCount(0);
    await expectNoOverflow(page);
  });
}

test('Vue applies saved preferences before its application module runs', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('dnd-ct-theme', 'dark');
    localStorage.setItem('sct-usage-dismissed', '1');
  });
  // Blocking app modules distinguishes the head script from Vue's reconciliation.
  await page.route('**/assets/*.js', route => route.abort());
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveClass(/usage-dismissed/);
  await expect(page.locator('#app')).toBeEmpty();
});

test('Vue starts and preference controls work when localStorage access throws', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto('./');
  await page.locator('#theme-trigger').click();
  await page.getByRole('menuitemradio', { name: 'Alucard' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'alucard');
  await page.locator('#usage-dismiss-btn').click();
  await page.locator('#usage-help-btn').click();
  await expect(page.locator('.usage-callout')).toBeVisible();
  await page.locator('#add-btn').click();
  await expect(page.locator('tr[data-id]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

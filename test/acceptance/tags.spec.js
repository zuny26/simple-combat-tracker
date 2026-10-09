import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

for (const width of [1600, 320]) {
  test(`Vue condition and note pickers dismiss, restore focus, and fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('./');
    await page.locator('#add-btn').click();
    const row = page.locator('tr[data-id="1"]');
    const trigger = row.getByRole('button', { name: 'Add a condition', exact: true });
    const search = page.getByRole('textbox', { name: 'Add a condition', exact: true });
    const panel = page.locator('.cond-pop');
    await row.locator('.f-adjust').fill('7');
    await trigger.click();
    await expect(search).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const bounds = await panel.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(720);
    await search.fill('pois');
    await page.getByRole('button', { name: 'Poisoned', exact: true }).click();
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(row.locator('.cell-conditions .vue-tag-text')).toHaveText('Poisoned');
    await expect(row.locator('.f-adjust')).toHaveValue('7');
    await trigger.click();
    await search.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.locator('.cond-backdrop').click({ position: { x: 1, y: 1 } });
    await expect(panel).toHaveCount(0);
    await trigger.click();
    const longTag = 'CustomCondition'.repeat(12);
    await search.fill(longTag);
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await search.press('Enter');
    const noteTrigger = row.getByRole('button', { name: 'Add a note', exact: true });
    await noteTrigger.click();
    await page.getByRole('textbox', { name: 'Add a note', exact: true }).fill('<img src=x> guard');
    await page.getByRole('textbox', { name: 'Add a note', exact: true }).press('Enter');
    await expect(row.locator('img')).toHaveCount(0);
    const tags = row.locator('.cond-pill');
    for (const tag of await tags.all()) {
      expect(await tag.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    if (width === 320 || width === 1600) {
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
    await noteTrigger.click();
    await page.getByRole('textbox', { name: 'Add a note', exact: true }).fill('unsaved draft');
    await page.reload();
    await expect(panel).toHaveCount(0);
    await expect(row.locator('.cell-conditions .vue-tag-text')).toHaveText(['Poisoned', longTag]);
    await expect(row.locator('.cell-other .vue-tag-text')).toHaveText('<img src=x> guard');
    await noteTrigger.click();
    await expect(page.getByRole('textbox', { name: 'Add a note', exact: true })).toHaveValue('');
    await page.getByRole('textbox', { name: 'Add a note', exact: true }).press('Escape');
    await expect(noteTrigger).toBeFocused();
    await row.getByRole('button', { name: 'Remove Poisoned', exact: true }).click();
    await page.reload();
    await expect(row.locator('.cell-conditions .vue-tag-text')).toHaveText(longTag);
  });
}

test('Vue keeps a growing note picker above the viewport bottom', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  await page.goto('./');
  for (let count = 0; count < 4; count++) await page.locator('#add-btn').click();
  const trigger = page
    .locator('tr[data-id="2"]')
    .getByRole('button', { name: 'Add a note', exact: true });
  await trigger.evaluate((el) => el.scrollIntoView({ block: 'end' }));
  await trigger.click();
  await page.getByRole('textbox', { name: 'Add a note', exact: true }).fill('LongNote'.repeat(24));
  const bounds = await page.locator('.cond-pop').boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(360);
});

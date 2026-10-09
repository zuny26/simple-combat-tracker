import { test, expect } from '@playwright/test';

test('HP bar keeps normal and temporary HP proportional, including missing normal HP', async ({
  page,
}) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
  await page.goto('./');
  await page.locator('#add-btn').click();
  const row = page.locator('tr[data-id="1"]');
  await row.getByRole('textbox', { name: 'Max HP', exact: true }).fill('5');
  await row.getByRole('textbox', { name: 'Temp HP', exact: true }).fill('5');

  async function expectSegments(normal, temporary) {
    await expect
      .poll(async () => {
        const track = await row.locator('.hp-track').boundingBox();
        const fill = await row.locator('.hp-fill').boundingBox();
        const temp = await row.locator('.hp-temp-seg').boundingBox();
        return (
          Math.abs(fill.width / track.width - normal) < 0.01 &&
          Math.abs(temp.width / track.width - temporary) < 0.01 &&
          Math.abs(temp.x - (fill.x + fill.width)) < 1
        );
      })
      .toBe(true);
  }

  await expect(row.locator('.hp-number')).toHaveText('10 / 5');
  await expectSegments(0.5, 0.5);
  await row.getByRole('textbox', { name: 'Temp HP', exact: true }).fill('15');
  await expectSegments(0.25, 0.75);
  await row.getByRole('textbox', { name: 'Damage or healing amount' }).fill('18');
  await row.getByRole('button', { name: 'Damage', exact: true }).click();
  await expect(row.locator('.hp-temp-seg')).toHaveCount(0);
  await row.getByRole('textbox', { name: 'Temp HP', exact: true }).fill('5');
  await expect(row.locator('.hp-number')).toHaveText('7 / 5');
  await expectSegments(0.2, 0.5);
});

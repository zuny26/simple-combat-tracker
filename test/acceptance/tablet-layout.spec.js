import { test, expect } from '@playwright/test';
import { expectNoOverflow } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
  );
});

async function addCreature(page, id) {
  await page.locator('#add-btn').click();
  const row = page.locator(`tr[data-id="${id}"]`);
  await row.getByRole('textbox', { name: 'Initiative', exact: true }).fill(String(21 - id));
  await row
    .getByRole('textbox', { name: 'Name', exact: true })
    .fill('Ancient copper dragon guarding the mountain pass');
  await row.getByRole('textbox', { name: 'AC', exact: true }).fill('18');
  await row.getByRole('textbox', { name: 'Max HP', exact: true }).fill('125');
  await row.getByRole('textbox', { name: 'Temp HP', exact: true }).fill('12');
  return row;
}

async function expectTabletGrouping(row) {
  const firstLine = row.locator(
    '.init-wrap, .cell-name, .cell-ac, .cell-maxhp, .cell-temphp, .cell-current, .cell-actions',
  );
  const boxes = await firstLine.evaluateAll((elements) =>
    elements.map((el) => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width);
    expect(Math.min(boxes[i].y + boxes[i].height, boxes[0].y + boxes[0].height)).toBeGreaterThan(
      Math.max(boxes[i].y, boxes[0].y),
    );
  }
  const secondLine = [];
  for (const selector of ['.cell-adjust', '.cell-conditions', '.cell-other']) {
    secondLine.push(await row.locator(selector).boundingBox());
  }
  expect(secondLine[1].width).toBeCloseTo(secondLine[2].width, 1);
  for (let i = 0; i < secondLine.length; i++) {
    expect(secondLine[i].y).toBeGreaterThanOrEqual(
      Math.max(...boxes.map((box) => box.y + box.height)),
    );
    expect(secondLine[i].y).toBeCloseTo(secondLine[0].y, 0);
    if (i > 0)
      expect(secondLine[i].x).toBeGreaterThanOrEqual(secondLine[i - 1].x + secondLine[i - 1].width);
  }
}

test('768px keeps populated creature controls in two compact lines with touch targets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('./');
  const row = await addCreature(page, 1);
  await expectTabletGrouping(row);
  for (const control of await row.locator('input:not(.cond-search), button:visible').all()) {
    const bounds = await control.boundingBox();
    expect(bounds.height).toBeGreaterThanOrEqual(46);
    expect(bounds.height).toBeLessThanOrEqual(48);
    expect(bounds.width).toBeGreaterThanOrEqual(46);
  }
  await expect(row.locator('.hp-number')).toHaveText('137 / 125');
  await expect(row.locator('.hp-track')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Creature actions' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Remove creature', exact: true })).toBeHidden();
  await expectNoOverflow(page);
});

async function addTag(page, row, field, value) {
  const label = field === 'conditions' ? 'Add a condition' : 'Add a note';
  await row.getByRole('button', { name: label, exact: true }).click();
  const search = page.getByRole('textbox', { name: label, exact: true });
  await search.fill(value);
  await search.press('Enter');
}

async function expectInViewport(page, locator) {
  const bounds = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
}

test('crowded rows grow and keep menus, pickers, and turn order usable across tablet boundaries', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('./');
  const first = await addCreature(page, 1);
  const normalHeight = (await first.boundingBox()).height;
  for (const condition of ['Poisoned', 'Concentration', 'Restrained', 'Frightened']) {
    await addTag(page, first, 'conditions', condition);
  }
  const note =
    'Guarding the mountain pass until reinforcements arrive. '.repeat(5) +
    'UnbrokenNote'.repeat(12);
  await addTag(page, first, 'other', note);
  expect((await first.boundingBox()).height).toBeGreaterThan(normalHeight);
  const second = await addCreature(page, 2);
  await second.locator('.f-adjust').fill('200');
  await second.getByRole('button', { name: 'Damage', exact: true }).click();
  await page.locator('#start-next-btn').click();

  for (const width of [320, 767, 768, 769, 1024, 1366, 1399, 1400, 1401, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(first).toHaveClass(/active/);
    await expect(first.locator('.turn-flag')).toBeVisible();
    await expect(second).toHaveClass(/downed/);
    await expect(second.locator('.hp-downed-tag')).toBeVisible();
    await expect(first.locator('.cell-conditions .vue-tag-text')).toHaveText([
      'Poisoned',
      'Concentration',
      'Restrained',
      'Frightened',
    ]);
    await expect(first.locator('.cell-other .vue-tag-text')).toHaveText(note);
    const firstBounds = await first.boundingBox();
    const secondBounds = await second.boundingBox();
    expect(secondBounds.y).toBeGreaterThanOrEqual(firstBounds.y + firstBounds.height);
    for (const tag of await first.locator('.cond-pill').all()) {
      expect(await tag.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
    if (width >= 768 && width <= 1400) {
      await expectTabletGrouping(first);
      for (const control of await first.locator('button:visible').all()) {
        expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(46);
      }
      await second.getByRole('button', { name: 'Creature actions' }).click();
      await expectInViewport(page, page.getByRole('menu', { name: 'Creature actions' }));
      const duplicate = page.getByRole('menuitem', { name: 'Duplicate creature' });
      expect((await duplicate.boundingBox()).height).toBeGreaterThanOrEqual(46);
      await duplicate.press('Escape');
      const trigger = second.getByRole('button', { name: 'Add a condition', exact: true });
      await trigger.click();
      const panel = page.getByRole('dialog', { name: 'Add a condition' });
      await expectInViewport(page, panel);
      await page.getByRole('textbox', { name: 'Add a condition', exact: true }).fill('Prone');
      const option = page.getByRole('button', { name: 'Prone', exact: true });
      expect((await option.boundingBox()).height).toBeGreaterThanOrEqual(46);
      await option.click();
      await expect(panel).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await second.getByRole('button', { name: 'Remove Prone', exact: true }).click();
      await second.getByRole('button', { name: 'Add a note', exact: true }).click();
      const noteSearch = page.getByRole('textbox', { name: 'Add a note', exact: true });
      await noteSearch.fill('LongNote'.repeat(24));
      await expectInViewport(page, page.getByRole('dialog', { name: 'Add a note' }));
      await noteSearch.press('Escape');
    } else if (width < 768) {
      await expect(first.getByRole('button', { name: 'Creature actions' })).toBeVisible();
      expect((await first.locator('.cell-current').boundingBox()).y).toBeGreaterThanOrEqual(
        (await first.locator('.cell-maxhp').boundingBox()).y,
      );
      expect((await first.locator('.cell-other').boundingBox()).y).toBeGreaterThan(
        (await first.locator('.cell-conditions').boundingBox()).y,
      );
    } else {
      await expect(page.locator('.combat-table thead')).toBeVisible();
      await expect(first.getByRole('button', { name: 'Creature actions' })).toBeHidden();
      await expect(
        first.getByRole('button', { name: 'Remove creature', exact: true }),
      ).toBeVisible();
    }
    await expectNoOverflow(page);
  }
});

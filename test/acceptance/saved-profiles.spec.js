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
      ? row.getByRole('menuitem', { name: /^(Save profile|Update profile|Unsave profile)$/ })
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
    await inspectBookmark('Unsave profile');
    await expect(row.locator('.f-name')).toHaveValue(' Goblin 2 3 ');
    await expect(row.locator('.hp-number')).toHaveText('5 / 7');
    await page.reload();
    await inspectBookmark('Unsave profile');
    await expect(row.locator('.hp-number')).toHaveText('5 / 7');

    for (const theme of THEMES) {
      await page.locator(width <= 640 ? '#app-menu-btn' : '#theme-trigger').click();
      await page.getByRole('menuitemradio', { name: theme.label }).click();
      await row.locator('.f-name').focus();
      const suggestions = page.getByRole('grid', { name: 'Saved profiles' });
      await expect(suggestions).toBeVisible();
      await expect(suggestions.locator('.profile-choice')).toHaveText(['Goblin']);
      const bounds = await suggestions.boundingBox();
      const inputBounds = await row.locator('.f-name').boundingBox();
      expect(bounds.width).toBeCloseTo(inputBounds.width, 1);
      expect(bounds.x).toBeCloseTo(inputBounds.x, 1);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
      await expectNoOverflow(page);
      await page.keyboard.press('Escape');
      await expect(suggestions).toHaveCount(0);
      await expect(row.locator('.f-name')).toBeFocused();
      await inspectBookmark('Unsave profile', async (button) => {
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
      await inspectBookmark('Unsave profile');
    }

    const encounter = await page.evaluate(() => localStorage.getItem('dnd-combat-tracker-v1'));
    await activateBookmark('Unsave profile');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await inspectBookmark('Save profile');
    expect(await page.evaluate(() => localStorage.getItem('dnd-combat-tracker-v1'))).toBe(
      encounter,
    );
    await page.reload();
    await inspectBookmark('Save profile');
    await row.locator('.f-name').focus();
    await expect(page.getByRole('grid', { name: 'Saved profiles' })).toHaveCount(0);
    await expect(row.locator('.f-name')).toHaveValue(' goblin 3 ');
    await expect(row.locator('.hp-number')).toHaveText('5 / 7');
    await activateBookmark('Save profile');
    await inspectBookmark('Unsave profile');
    await page.locator('#reset-btn').click();
    await page.locator('#confirm-ok-btn').click();
    await expect(page.locator('tr[data-id]')).toHaveCount(0);
    await page.reload();
    await page.locator('#add-btn').click();
    await row.locator('.f-name').focus();
    await expect(page.locator('.profile-choice')).toHaveText(['goblin']);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('grid')).toHaveCount(0);
    await expect(row.locator('.f-name')).toHaveValue('goblin');
    await expect(row.locator('.f-name')).toBeFocused();
    await expect(row.locator('.f-ac')).toHaveValue('13');
    await expect(row.locator('.f-maxhp')).toHaveValue('7');
    await expect(row.locator('.hp-number')).toHaveText('7 / 7');
    await inspectBookmark('Unsave profile');
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
    await bookmark('Unsave profile');
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('dnd-combat-tracker-v1'))).toBe(
      encounter,
    );
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('dnd-saved-profiles-v1')).profiles),
    ).toEqual([]);
  });
}

test('name autocomplete keeps input focus, filters, navigates, dismisses and applies only deliberate selections', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('./');
  await page.locator('#usage-dismiss-btn').click();
  for (const [name, ac, maxHP] of [
    ['Goblin', '13', '7'],
    ['Orc', '15', '20'],
  ]) {
    await page.locator('#add-btn').click();
    const row = page.locator('tr[data-id]').last();
    await row.locator('.f-name').fill(name);
    await row.locator('.f-ac').fill(ac);
    await row.locator('.f-maxhp').fill(maxHP);
    await row.locator('.btn-bookmark').click();
  }
  await page.locator('#add-btn').click();
  const row = page.locator('tr[data-id]').last();
  const name = row.locator('.f-name');
  const list = page.getByRole('grid');
  await name.focus();
  await expect(list.locator('.profile-choice')).toHaveText(['Goblin', 'Orc']);
  for (const width of [768, 320, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(async () => {
        const inputBounds = await name.boundingBox();
        const panelBounds = await list.boundingBox();
        return panelBounds.width - inputBounds.width;
      })
      .toBeCloseTo(0, 1);
    await expect(name).toBeFocused();
    await expectNoOverflow(page);
  }
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(list.getByRole('gridcell', { selected: true })).toHaveText('Orc');
  await page.keyboard.press('ArrowUp');
  await expect(list.getByRole('gridcell', { selected: true })).toHaveText('Goblin');
  await expect(name).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(list).toHaveCount(0);
  await expect(name).toBeFocused();
  await expect(name).toHaveValue('');
  await name.fill(' gOb ');
  await expect(list.locator('.profile-choice')).toHaveText(['Goblin']);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');
  await expect(row.locator('.f-ac')).toBeFocused();
  await expect(list).toHaveCount(0);
  await expect(name).toHaveValue(' gOb ');
  await expect(row.locator('.f-maxhp')).toHaveValue('');
  await name.focus();
  await row.locator('.f-init').click();
  await expect(list).toHaveCount(0);
  await expect(row.locator('.f-init')).toBeFocused();
  await name.fill('gOb');
  await expect(list.locator('.profile-choice')).toHaveText(['Goblin']);
  await name.fill('Dragon');
  await expect(list).toHaveCount(0);
  await expect(name).toHaveAttribute('aria-expanded', 'false');
  await expect(name).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(name).toHaveValue('Dragon');
  await name.fill('');
  await expect(list.locator('.profile-choice')).toHaveText(['Goblin', 'Orc']);
  await list.getByRole('gridcell', { name: 'Goblin', exact: true }).click();
  await expect(list).toHaveCount(0);
  await expect(name).toBeFocused();
  await expect(name).toHaveValue('Goblin 2');
  await expect(row.locator('.btn-bookmark')).toHaveAccessibleName('Unsave profile');
  await row.locator('.btn-bookmark').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(row.locator('.btn-bookmark')).toHaveAccessibleName('Save profile');
  await row.locator('.btn-bookmark').click();
  await page.locator('#add-btn').click();
  const next = page.locator('tr[data-id]').last();
  await next.locator('.f-name').fill('Gob');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(next.locator('.f-name')).toHaveValue('Goblin 3');
  await expect(page.locator('tr[data-id]')).toHaveCount(4);
  await page.reload();
  await expect(next.locator('.f-name')).toHaveValue('Goblin 3');
  await expect(next.locator('.btn-bookmark')).toHaveAccessibleName('Unsave profile');
});

for (const width of [320, 1600]) {
  test(`profile deletion closes suggestions, preserves creatures, and restores focus at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./');
    await page.locator('#usage-dismiss-btn').click();
    for (const [name, ac, maxHP] of [
      ['Goblin', '13', '7'],
      ['Orc', '15', '20'],
    ]) {
      await page.locator('#add-btn').click();
      const row = page.locator('tr[data-id]').last();
      await row.locator('.f-name').fill(name);
      await row.locator('.f-ac').fill(ac);
      await row.locator('.f-maxhp').fill(maxHP);
      if (width === 320) {
        await row.getByRole('button', { name: 'Creature actions' }).click();
        await page.getByRole('menuitem', { name: 'Save profile', exact: true }).click();
      } else await row.locator('.btn-bookmark').click();
    }
    await page.locator('#add-btn').click();
    const reusedId = await page.locator('tr[data-id]').last().getAttribute('data-id');
    const reused = page.locator(`tr[data-id="${reusedId}"]`);
    await reused.locator('.f-name').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(reused.locator('.f-name')).toHaveValue('Goblin 2');
    await page.locator('#add-btn').click();
    const rowId = await page.locator('tr[data-id]').last().getAttribute('data-id');
    const row = page.locator(`tr[data-id="${rowId}"]`);
    const name = row.locator('.f-name');
    await row.locator('.f-ac').fill('18');
    await row.locator('.f-maxhp').fill('30');
    await name.fill('gob');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const encounter = await page.evaluate(() => localStorage.getItem('dnd-combat-tracker-v1'));
    const saved = await page.evaluate(() => localStorage.getItem('dnd-saved-profiles-v1'));
    // Observe the picker at the moment the dialog is inserted, not just the final DOM.
    await page.evaluate(() => {
      window.profileDeletionObservations = [];
      let pickerPresent = document.querySelector('[role="grid"]') !== null;
      const containsRole = (node, role) =>
        node instanceof window.Element &&
        (node.matches(`[role="${role}"]`) || node.querySelector(`[role="${role}"]`));
      new window.MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.removedNodes) {
            if (containsRole(node, 'grid')) pickerPresent = false;
          }
          for (const node of record.addedNodes) {
            if (containsRole(node, 'grid')) pickerPresent = true;
            if (containsRole(node, 'dialog')) {
              window.profileDeletionObservations.push(!pickerPresent);
            }
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    });
    const picker = page.getByRole('grid', { name: 'Saved profiles' });
    const trash = picker.getByRole('button', { name: 'Delete saved profile Goblin' });
    const dialog = page.getByRole('dialog', { name: 'Delete saved profile Goblin?' });
    const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
    const accept = page.getByRole('button', { name: 'Delete profile', exact: true });
    async function unchanged() {
      await expect(name).toHaveValue('gob');
      await expect(row.locator('.f-ac')).toHaveValue('18');
      await expect(row.locator('.f-maxhp')).toHaveValue('30');
      expect(await page.evaluate(() => localStorage.getItem('dnd-combat-tracker-v1'))).toBe(
        encounter,
      );
    }
    await name.focus();
    await trash.click();
    await expect(picker).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(cancel).toBeFocused();
    await unchanged();
    await cancel.click();
    await expect(name).toBeFocused();
    await expect(picker).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('dnd-saved-profiles-v1'))).toBe(saved);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect(trash).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(picker).toHaveCount(0);
    await expect(name).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+Tab');
    await expect(picker).toHaveCount(0);
    await expect(name).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Tab');
    await expect(picker).toHaveCount(0);
    await expect(row.locator('.f-ac')).toBeFocused();
    await name.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(accept).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(name).toBeFocused();
    await expect(picker).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('dnd-saved-profiles-v1'))).toBe(saved);
    await unchanged();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect(name).toBeFocused();
    await expect(picker).toHaveCount(0);
    await unchanged();
    expect(await page.evaluate(() => window.profileDeletionObservations)).toEqual([
      true,
      true,
      true,
    ]);
    for (const creature of [page.locator('tr[data-id]').first(), reused]) {
      if (width === 320) {
        await creature.getByRole('button', { name: 'Creature actions' }).click();
        await expect(
          page.getByRole('menuitem', { name: 'Save profile', exact: true }),
        ).toBeVisible();
        await page.keyboard.press('Escape');
      } else await expect(creature.locator('.btn-bookmark')).toHaveAccessibleName('Save profile');
    }
    await name.fill('');
    await expect(picker.locator('.profile-choice')).toHaveText(['Orc']);
    await expectNoOverflow(page);
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(reused.locator('.f-name')).toHaveValue('Goblin 2');
    await expect(reused.locator('.f-ac')).toHaveValue('13');
    await expect(reused.locator('.f-maxhp')).toHaveValue('7');
    await name.focus();
    await expect(picker.locator('.profile-choice')).toHaveText(['Orc']);
  });
}

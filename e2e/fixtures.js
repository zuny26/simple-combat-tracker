// fixtures.js — shared setup for the browser suite.
import { expect } from '@playwright/test';

const STORAGE_KEY = 'dnd-combat-tracker';
const THEME_KEY = 'dnd-ct-theme';

// A creature blob in the shape state.js:load() expects. Callers usually only care
// about init/name; everything else takes the makeCreature() defaults.
export function creature(id, fields = {}) {
  return {
    id,
    init: '',
    name: '',
    ac: '',
    maxHP: 0,
    tempHP: 0,
    damageTaken: 0,
    conditions: [],
    other: [],
    ...fields,
  };
}

// Stub out the Google Fonts requests index.html makes, so the suite never touches the
// network. Consequence: layout runs on fallback font metrics, which differ between
// machines — so assert RELATIONSHIPS (overflow, shared line, visibility), never
// absolute pixel sizes. See the "Fonts" section of the spec.
async function blockFonts(page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
}

// Seed localStorage BEFORE the app's module runs, then load the page. Seeding storage
// is far faster and more deterministic than clicking creatures in through the UI —
// but because it bypasses the UI, smoke.spec.js also exercises the real Add button so
// this shortcut cannot silently rot that path.
//
// !! WARNING — DO NOT USE THIS AS THE SETUP FOR A RELOAD-PERSISTENCE TEST !!
// The seed goes in via page.addInitScript, which Playwright runs before EVERY
// document in this page — including after page.reload() and any in-app navigation.
// So a test shaped "edit something, reload, assert it survived" would pass even if
// save() were completely broken: the reload re-writes this original blob into
// localStorage before the app reads it, resurrecting the seeded values and masking
// the bug. To test persistence, seed here, then remove the init script before
// reloading (e.g. drive the whole setup through the UI instead, or use a fresh
// context whose storage you write once via page.evaluate after the first load).
export async function gotoApp(page, opts = {}) {
  const {
    creatures = [], round = 0, activeId = null, started = false, theme = null, viewport = null,
  } = opts;

  if (viewport) await page.setViewportSize(viewport);
  await blockFonts(page);

  const blob = JSON.stringify({
    creatures,
    round,
    activeId,
    started,
    nextId: creatures.reduce((max, c) => Math.max(max, c.id), 0) + 1,
  });

  await page.addInitScript(([stateKey, stateValue, themeKey, themeId]) => {
    localStorage.setItem(stateKey, stateValue);
    if (themeId) localStorage.setItem(themeKey, themeId);
  }, [STORAGE_KEY, blob, THEME_KEY, theme]);

  await page.goto('/');
  // An empty combat still renders one <tr> (the "no creatures yet" row), so this waits
  // for first paint of the table either way.
  await expect(page.locator('#creature-rows tr').first()).toBeVisible();

  // ...but for the same reason, that visibility wait CANNOT tell "the seed rendered"
  // from "the seed silently failed and we are looking at the empty-state placeholder"
  // — both are one visible <tr>. Without this count assertion, a layout-only test
  // (gotoApp + expectNoOverflow) would pass green while measuring an empty table if
  // STORAGE_KEY were renamed or state.js:load() regressed.
  //
  // The `[data-id]` matters: only real creature rows carry it (render.js:112), while
  // the placeholder is a bare `tr.empty-row` (render.js:131). Counting plain `tr`
  // instead would still pass vacuously when seeding exactly ONE creature, since the
  // placeholder is itself exactly one row — and single-creature layout tests are
  // precisely the shape this guard exists for.
  if (creatures.length > 0) {
    await expect(page.locator('#creature-rows tr[data-id]')).toHaveCount(creatures.length);
  }
}

// Fail if anything renders past the right edge of the viewport. Promoted from the
// ad-hoc snippet in .claude/skills/run-and-screenshot/SKILL.md, whose own notes say
// this is the check that catches what the eye misses.
export async function expectNoOverflow(page) {
  const { limit, worst } = await page.evaluate(() => {
    // Measure against clientWidth, NOT the viewport width: content can only lay out
    // to clientWidth, which excludes the vertical scrollbar (~15px in headless
    // Chromium). Comparing against the viewport would hide up to a scrollbar's worth
    // of real overflow on any page that scrolls.
    const vw = document.documentElement.clientWidth;
    let found = null;
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // collapsed / hidden
      if (r.right > vw + 1 && (!found || r.right > found.right)) {
        // getAttribute, not el.className: on SVG elements className is an
        // SVGAnimatedString, which stringifies to "[object SVGAnimatedString]" and
        // would blank the diagnostic on exactly the icons most likely to overflow.
        found = { tag: el.tagName, cls: el.getAttribute('class') || '', right: r.right };
      }
    });
    return { limit: vw, worst: found };
  });

  expect(worst, `something overflows the ${limit}px layout width: ${JSON.stringify(worst)}`)
    .toBeNull();
}

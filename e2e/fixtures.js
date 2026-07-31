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
}

// Fail if anything renders past the right edge of the viewport. Promoted from the
// ad-hoc snippet in .claude/skills/run-and-screenshot/SKILL.md, whose own notes say
// this is the check that catches what the eye misses.
export async function expectNoOverflow(page) {
  const { width } = page.viewportSize();
  const worst = await page.evaluate((vw) => {
    let found = null;
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // collapsed / hidden
      if (r.right > vw + 1 && (!found || r.right > found.right)) {
        // className is an SVGAnimatedString on SVG elements, so coerce it.
        found = { tag: el.tagName, cls: String(el.className), right: r.right };
      }
    });
    return found;
  }, width);

  expect(worst, `something overflows the ${width}px viewport: ${JSON.stringify(worst)}`)
    .toBeNull();
}

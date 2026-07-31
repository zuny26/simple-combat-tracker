# CLAUDE.md

This file provides guidance to AI agents when working with code in this repository.

## What this is

A D&D combat tracker for DMs: initiative order, HP, and status conditions for one encounter.

Fully local by design — no backend, no bundler, no framework, no build step. `index.html` loads
`js/main.js` as a native ES module; all data lives in `localStorage`. The only dependencies
(eslint, Playwright) are dev-time.

## Commands

```bash
npm test            # node --test 'test/*.test.js' — pure modules + jsdom DOM tests
npm run test:e2e    # playwright test — real browser: focus, popovers, layout
npm run lint        # eslint .
npm run check       # lint + test — fast and offline; run this constantly
npm run check:all   # lint + test + test:e2e — run this before committing UI work

node --test test/hp.test.js                      # one file
node --test --test-name-pattern 'temp-first'     # one test by name
npx playwright test e2e/popovers.spec.js         # one browser spec

npx playwright install chromium   # one-time; NOT --with-deps (needs root, fails here)
```

To run the app, serve it over HTTP — ES modules fail under `file://`:

```bash
python3 -m http.server 8934   # then open http://localhost:8934/
```

For any UI/CSS/layout change, run `npm run check:all` — the Playwright suite covers the
multi-width overflow check. Use the `run-and-screenshot` skill
(`.claude/skills/run-and-screenshot/SKILL.md`) when you need to *look* at the result
rather than assert on it.

## Architecture

**`js/state.js` is the single source of truth.** It exports one mutable `state` object
(`creatures`, `round`, `activeId`, `started`, `nextId`). Every module imports and mutates it
directly; every mutation is followed by `save()`. There is no store, no events, no
reactivity — mutate, then call the right render function.

**Nothing derivable is stored.** Current HP is computed from `maxHP - damageTaken + tempHP`
(`hp.js`); display order is computed from `init`/`name` (`order.js`). Only the inputs
persist.

**Layers, roughly:**

- Pure logic, fully unit-tested, no DOM: `state.js`, `hp.js`, `order.js`, `turns.js`
- DOM rendering: `render.js`
- Event wiring + orchestration: `main.js`
- Self-contained UI widgets: `tags.js`, `rowMenu.js`, `appMenu.js`, `themePicker.js`,
  `confirmDialog.js`, `usage.js`, `theme.js`

### Rendering: rebuild vs. in-place update

The DM types into the table _while_ state changes underneath them, so choosing the right
update path is the central constraint of this codebase — a full rebuild destroys the field
being typed in and breaks Tab.

- `renderTable()` — full rebuild + re-sort. Only for structural changes: load, add, remove,
  duplicate, reset.
- `reorderRows()` — re-sorts by **moving** existing `<tr>` nodes, so focus survives.
  Deferred to blur of `#`/Name (never on `input`), and skipped entirely when the order
  didn't actually change (`currentRowOrder()`).
- `renderHighlight()` — toggles the active-row class + header only.
- `updateHpCell(id)` / `updateTagsCell(id, field)` — rewrite one cell.

When adding a feature, pick the narrowest path that works.

### Turn tracking

The highlight follows the _creature_ (`state.activeId`), never a table index, so re-sorting
mid-combat can't lose whose turn it is. Rows with a blank/non-numeric `#` are "parked" at the
bottom and are outside the turn order entirely. When the active creature leaves that order
(removed, or `#` cleared), `turns.js:reassignActiveAfterLeaving(oldIdx)` moves the highlight
to the next row down / wraps / reverts to pre-combat — `oldIdx` must be captured _before_ the
creature leaves.

### Event handling

`main.js` delegates `input`/`focusin`/`focusout`/`keydown`/`click` on `#creature-rows`, so
new rows need no listeners. Routing is by CSS class, which makes those classes part of the
contract between `render.js` and `main.js`: `f-init`, `f-name`, `f-ac`, `f-maxhp`,
`f-temphp`, `f-adjust` (fields); `r-dmg`, `r-heal`, `cond-add`, `cond-x`, `btn-dupe`,
`btn-remove`, `btn-menu` (actions). Renaming one means updating both files.

### Popover widgets

`tags.js`, `rowMenu.js`, and `appMenu.js` share one pattern: a `position: fixed` panel plus a
full-viewport invisible backdrop that closes on any outside click, Escape closes and returns
focus to the trigger, nothing is persisted, and **the popover closes before running its
action** — so no dialog or table rebuild ever happens underneath an open panel.

### Persistence

Three independent `localStorage` keys, deliberately separate so "New Combat" only clears the
first: `dnd-combat-tracker` (combat state), `dnd-ct-theme`, `sct-usage-dismissed`.

`state.js:load()` is the corruption firewall: it normalizes every field, tolerates legacy
shapes (e.g. `conditions` as a comma-separated string), backfills missing ids, and drops an
`activeId` that no longer resolves. It must never throw — a bad blob can't be allowed to
brick the app. Most of `test/state.test.js` feeds it deliberately bad data.

Theme and usage-callout state are also read by an inline pre-paint script in `index.html` to
avoid a flash; that script intentionally does _not_ know the list of valid themes.

## Conventions

- **User data is never HTML.** Text goes in via `textContent` or `.value`. `innerHTML` is
  used only for the static SVG icon constants in `render.js`/`rowMenu.js`/`appMenu.js` —
  keep it that way.
- **Themes are registered in one place:** the `THEMES` array in `js/theme.js`. Adding an
  entry (plus its `[data-theme="…"]` variable block in `styles.css`) lights it up in both
  the desktop picker and the mobile menu automatically.
- **Same DOM at every viewport.** Responsive variants (desktop buttons vs. the `⋮` row menu,
  theme pill vs. `☰`) are all present in the DOM; CSS at the 640px breakpoint chooses which
  is visible. No resize handlers, no viewport-conditional rendering. The card layout uses
  `data-label` on `<td>`s for the field captions that replace the hidden column headers.
- **Styling is CSS custom properties in `styles.css`** — colors, spacing, radii, and the
  explicit `--control-h` values that keep header pills aligned. No hardcoded colors.
- **eslint's browser globals are hand-listed** in `eslint.config.js`. Using a new browser API
  (`setTimeout`, `matchMedia`, …) requires adding it there or `no-undef` fails the lint.
  `no-undef` is the only typo-catcher here — there's no typechecker.
- **Tests split by fidelity.** `test/` is `node:test` + `node:assert/strict`: the pure
  modules, plus jsdom tests that boot the real `index.html` and assert what `render.js`
  builds and what `main.js` routes. `e2e/` is Playwright against the served app, and
  owns anything where the browser is the thing under test — focus and `relatedTarget`,
  Tab, popover outside-click, viewport layout. Focus assertions never go in `test/`;
  jsdom cannot be trusted on them. If the two suites ever disagree, Playwright wins.
  `test/helpers.js` provides an in-memory `localStorage`; `test/domHarness.js` boots
  jsdom; `e2e/fixtures.js` seeds storage and blocks the font requests.
- **No pixel baselines.** Layout is asserted relationally (no overflow, shared line,
  visibility), never in absolute pixels — the browser suite blocks the Google Fonts
  request, so absolute metrics are not portable across machines. That also means a
  green overflow test is not proof the shipped app doesn't overflow with the real font.
- **Some tests assert ordering or node identity, not final state** — e.g. that a popover
  closes *before* its action runs, or that `reorderRows()` moves the existing `<tr>`
  rather than rebuilding it. Collapsing those into end-state checks would silently gut
  the property they exist to protect.

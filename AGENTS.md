# Repository guidance

This file provides guidance to AI agents when working with code in this repository.

## What this is

A D&D combat tracker for DMs: initiative order, HP, and status conditions for one encounter.

Fully local by design: no backend; all encounter data lives in `localStorage`.
Milestone 1 of the Vue migration serves and bundles the existing `index.html` / `js/main.js`
application with Vite. The legacy mutable state and manual DOM modules still own the running
app. Vue Composition API, strict TypeScript SFC checking, Vitest, and Vue Test Utils are
installed for subsequent milestones; the test-only SFC probe does not mount in the app.

Before changing migration architecture, read the governing decisions:
[static Vue application](docs/adr/0001-static-vue-application.md),
[combat state ownership](docs/adr/0002-combat-state-ownership.md), and
[behavior-focused testing](docs/adr/0003-behavior-focused-testing.md).
Before replacing tests, read the [per-test responsibility audit](docs/migrations/test-audit.md).

## Commands

Use Node 24.15+ and `npm ci` to install the locked dependencies.

```bash
npm run dev         # Vite: http://127.0.0.1:8934/simple-combat-tracker/
npm run build       # generated static output in dist/
npm run preview     # serve dist/ at the same URL (build first)
npm run typecheck   # explicit strict vue-tsc check; build alone does not check types
npm test            # legacy node:test + Vitest
npm run test:legacy # existing pure-module and jsdom DOM tests
npm run test:unit   # Vitest: typed module and mounted Vue UI tests
npm run test:e2e    # Chromium against dist/ at the Pages path (build first)
npm run lint        # ESLint: legacy JS, TypeScript, and Vue SFCs
npm run check       # lint + typecheck + both unit/DOM suites; fast and offline
npm run check:all   # check + build + Chromium; run before committing UI/tooling work

node --test test/hp.test.js
npm run test:unit -- test/tooling.test.ts
npx playwright test e2e/popovers.spec.js
npx playwright install chromium # one-time locally; avoid --with-deps (requires root)
```

Vite preview is local verification, not deployment. Stop dev/preview on port 8934 before
running browser checks: Playwright starts its own preview and never reuses a source server.
GitHub Actions runs `check:all` on pushed commits, installing Chromium and OS dependencies
on its hosted runner. There are no local hooks or required PR workflows. Public deployment
remains on its existing mechanism; this milestone adds no publishing job or Pages settings.

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

- **Commit messages follow Conventional Commits:** include a type and, when possible, a domain scope, e.g. `feat(combat): add turn advancement`.
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
  `no-undef` catches legacy JS typos; `vue-tsc` checks introduced TypeScript/Vue code.
- **Tests split by fidelity.** `test/*.test.js` uses `node:test` + `node:assert/strict`: the pure
  modules, plus jsdom tests that boot the real `index.html` and assert what `render.js`
  builds and what `main.js` routes. `test/**/*.test.ts` and `src/**/*.test.ts` use Vitest;
  Vue Test Utils mounts SFCs in jsdom with fresh instances. Vitest excludes legacy JS and
  Playwright files. `e2e/` is Playwright against the production build, and
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
  closes _before_ its action runs, or that `reorderRows()` moves the existing `<tr>`
  rather than rebuilding it. Collapsing those into end-state checks would silently gut
  the property they exist to protect.

## Agent skills

### Issue tracker

Specs and tickets live in `.scratch/<feature>/`. Before creating, reading,
or updating tickets, read `docs/agents/issue-tracker.md`.

### Triage labels

Local issues use the default triage roles in their `Status:` line.
Before triaging, read `docs/agents/triage-labels.md`.

### Domain docs

Use one root `GLOSSARY.md` and `docs/adr/`. Before exploring or designing
the codebase, read `docs/agents/domain.md`.

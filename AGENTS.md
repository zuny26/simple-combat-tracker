# Repository guidance

This file provides guidance to AI agents when working with code in this repository.

## What this is

A D&D combat tracker for DMs: initiative order, HP, and status conditions for one encounter.

Fully local by design: no backend; all encounter data lives in `localStorage`.
Vite serves and bundles two independent entries: the public legacy tracker at `index.html`
and the Vue tracker at `vue.html`. Legacy mutable state and manual DOM modules own only the
legacy entry; Vue Composition API and app-scoped typed combat own the Vue entry. Strict
TypeScript SFC checking, Vitest, and Vue Test Utils verify the new UI alongside legacy checks.

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

The independent Vue tracker is at `http://127.0.0.1:8934/simple-combat-tracker/vue.html`
in both dev and production preview. Build emits both entries; `/simple-combat-tracker/`
continues to open the legacy tracker.

Vite preview is local verification, not deployment. Stop dev/preview on port 8934 before
running browser checks: Playwright starts its own preview and never reuses a source server.
GitHub Actions runs `check:all` on pushed commits, installing Chromium and OS dependencies
on its hosted runner. There are no local hooks or required PR workflows. Public deployment
remains on its existing mechanism; this milestone adds no publishing job or Pages settings.

## Architecture

### Typed combat expansion (tickets 02–03)

`src/combat/combat.ts:createCombat()` creates a fresh encounter with typed read-only
state and named actions. Each app/test owns one instance. Actions coordinate HP
invariants, tags, duplication, and active-creature departure; UI callers pass creature
IDs and never capture turn indices. `displayOrder` and `hp(id)` are derived reads.
`isEmptyCreature(id)` and `hasMeaningfulData()` support UI-owned confirmations.
Conditions use `conditions`; notes use `other`. Pending HP adjustments belong to UI state.

`src/combat/rules.ts` and the combat factory use no Vue or browser globals.
`src/combat/vueCombat.ts:createVueCombat()` supplies Vue `reactive` state to the factory
and exposes a deep `readonly` state view. Create it once for each Vue app and
share it with that app's UI. The optional state observer on `createCombat` is the
integration boundary; callers edit through actions, and state is read-only in TypeScript.
IDs remain unique across resets within an instance. Non-finite HP edits and nonpositive
or non-finite damage/healing amounts are ignored; negative HP edits clamp to zero.

The module is exercised through public-interface Vitest tests, including Node-only combat
tests and Vue observable-state tests, and drives the Vue entry. Keep the legacy app's state
owner separate until cutover. Existing tests remain applicable to that app.

### Versioned encounter persistence (ticket 03)

`src/combat/persistence.ts:createPersistedCombat(storage, observe?)` restores a fresh
combat instance and centrally saves completed changes. The explicit `EncounterStorage`
interface has `getItem`/`setItem`; tests supply independent in-memory or failing adapters.
`createBrowserStorage()` defers browser storage access until these calls so a throwing
`localStorage` getter is also contained. The Vue entry creates one instance
with `createVueCombat(createBrowserStorage())`; omitting storage creates an in-memory instance.
The legacy entry still uses its own state and storage code.

The new key is `dnd-combat-tracker-v1`, separate from legacy combat, theme, and help keys.
Version 1 stores `version`, `nextId`, `creatures`, `round`, `activeId`, and `started`.
Creature fields are `id`, initiative text (`init`), `name`, `ac`, `maxHP`, `tempHP`,
`damageTaken`, `conditions`, and notes (`other`). Identity allocation survives removal,
reset, and reload. HP totals, display order, and transient UI state are excluded. Unknown
saved fields are ignored and omitted on the next save; legacy formats are not loaded.

The loader rejects the whole encounter on malformed JSON, unsupported versions, invalid
field shapes, non-finite/negative HP inputs, damage above maximum HP, invalid or duplicate
IDs, invalid next identity, or inconsistent progression. IDs and `nextId` are positive safe
integers, with `nextId` available for allocation. At the safe-integer limit allocation
wraps to the first unused positive ID, retaining issued IDs across resets within an instance.
The round counter saturates at `Number.MAX_SAFE_INTEGER` so further turns and saves remain
usable without losing the encounter to an unsafe counter. Tags are trimmed, nonblank strings unique
without regard to case. Pre-combat requires round zero and no active creature; started
combat requires a positive safe-integer round and an existing eligible active creature.
Initiative remains text: blank, nonnumeric, and non-finite values are parked; finite zero
and negative values remain eligible.

Recovery creates an empty pre-combat encounter, without rewriting storage on load. The
next actual change replaces invalid data. Read failures also start in memory; write
failures preserve the completed action, and later changes retry saving. The combat factory
accepts initial state/identity and an `onChange` callback; it notifies once after each action
finishes its invariants, skipping rejected or unchanged actions. Widgets call combat actions
and never save independently. Persistence tests exercise the public factory/storage seam.

### Vue encounter editing and turns (ticket 04)

`vue.html` loads `src/main.ts`, which creates one persisted Vue combat instance and passes
it to `src/ui/EncounterTracker.vue`. Mounted tests pass fresh instances through the same
`combat` prop. The tracker and `CreatureRow.vue` invoke named actions by creature ID; they
never import legacy state or DOM widgets. Tags, destructive actions, and
preferences remain later tickets.

Rows use creature-ID keys. Initiative/name actions save on input, while the tracker keeps
transient displayed IDs and sorts on blur. Combat turns always use the derived combat order,
even during an unfinished edit. After a keyed move, the tracker restores the blur event's
Tab/click destination only if it remains connected and the patch left focus on the body.
Adding a creature focuses its initiative after the Vue patch. Chromium owns these focus checks.

HP fields keep local text drafts so decimal input survives typing and unrelated updates.
Finite edits save immediately; invalid/non-finite edits leave the previous HP value intact,
negative edits clamp to zero, and blur displays the accepted numeric value (zero is blank).
Draft text and displayed row order never persist. HP and downed presentation derive from
combat state. Responsive markup uses the existing CSS and variables at every viewport;
the Vue app card supplies its own combat-started class for the mobile round counter.

`test/encounter.test.ts` verifies mounted field/action wiring and visible state with fresh
instances. `e2e/vue-encounter.spec.js` exercises both sorting fields with Tab/click and reloads
the built Vue entry without a storage seed script. Legacy tests remain active independently.

### Vue damage and healing (ticket 05)

Each keyed `CreatureRow.vue` owns a pending adjustment text ref. Typing and Enter leave HP
unchanged. The explicit Damage/Heal buttons pass a finite positive amount and creature ID
to the named combat action, then clear only that row's draft, including valid actions that
leave HP unchanged at its limit. Invalid/nonpositive drafts leave HP and the draft intact.
Keyed sorting retains each creature's draft; reload starts drafts empty. Combat actions own
HP rules and persistence; rows derive HP/downed presentation and never save independently.

Mounted encounter tests cover explicit controls, row isolation through sorting, invalid
amounts, maximum-HP clamping, and downed turn eligibility. The Chromium damage/healing
workflow reloads actual UI saves and verifies that pending amounts disappear.

### Running legacy application

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

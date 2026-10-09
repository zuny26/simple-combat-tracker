# Repository guidance

## What this is

A browser-only D&D combat tracker for DMs: initiative order, HP, and status conditions
for one encounter. No backend; encounter and preferences live in `localStorage`.
`index.html` loads the maintained Vue Composition API application through Vite.
Each app/test owns one typed combat instance. The legacy singleton and manual DOM
application have been retired; the theme registry remains in `js/themes.js`.

Before changing architecture, read the governing decisions:
[static Vue application](docs/adr/0001-static-vue-application.md),
[combat state ownership](docs/adr/0002-combat-state-ownership.md), and
[behavior-focused testing](docs/adr/0003-behavior-focused-testing.md).
Before replacing tests, read the [responsibility audit](docs/migrations/test-audit.md).

## Commands

Use Node 24.15+ and `npm ci` to install locked dependencies.

```bash
npm run dev         # http://127.0.0.1:8934/simple-combat-tracker/
npm run build       # generated static output in dist/
npm run preview     # serve dist/ at the same URL (build first)
npm run typecheck   # strict vue-tsc; build alone does not check types
npm test            # Vitest: combat, persistence, mounted Vue UI
npm run test:unit   # alias for npm test; accepts test file arguments
npm run test:e2e    # Chromium against dist/ at the Pages path (build first)
npm run lint        # ESLint: JavaScript, TypeScript, and Vue SFCs
npm run check       # lint + typecheck + Vitest; fast and offline
npm run check:all   # check + build + Chromium; run before committing UI/tooling work

npm run test:unit -- test/component/combat.test.ts
npx playwright test test/acceptance/production.spec.js
npx playwright install chromium # one-time locally; avoid --with-deps (requires root)
```

Stop dev/preview on port 8934 before browser checks: Playwright starts its own preview
and never reuses a source server. Preview verifies locally; it is not deployment.
CI on `master` pushes and pull requests targeting `master` installs dependencies and
Chromium and runs `check:all`. Successful default-branch
pushes (currently `master`) upload the tested `dist/`; a separate CD workflow consumes
that successful CI run's unchanged Pages archive and deploys it to
https://zuny26.github.io/simple-combat-tracker/; pull-request checks never publish.
Pages uses GitHub Actions, with no custom domain. There are no local hooks.
Before changing hosting or restoring the prior deployment, read
[production verification and restoration](docs/production.md). Publish generated output;
raw Vue source cannot run the application. `/vue.html` is no longer a separate entry.

## Architecture

### Combat actions and Vue ownership

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
tests and Vue observable-state tests, and drives the Vue entry.

### Versioned encounter persistence

`src/combat/persistence.ts:createPersistedCombat(storage, observe?)` restores a fresh
combat instance and centrally saves completed changes. The explicit `EncounterStorage`
interface has `getItem`/`setItem`; tests supply independent in-memory or failing adapters.
`createBrowserStorage()` defers browser storage access until these calls so a throwing
`localStorage` getter is also contained. The Vue entry creates one instance
with `createVueCombat(createBrowserStorage())`; omitting storage creates an in-memory instance.

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

### Encounter editing and turns

`index.html` loads `src/main.ts`, which creates one persisted Vue combat instance and passes
it to `src/ui/EncounterTracker.vue`. Mounted tests pass fresh instances through the same
`combat` prop. The tracker and `CreatureRow.vue` invoke named actions by creature ID; they
read state and request changes through the app-scoped combat interface.

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

`test/component/encounter.test.ts` verifies mounted field/action wiring and visible state with fresh
instances. `test/acceptance/production.spec.js` exercises initiative Tab/click and actual reloads;
`test/acceptance/encounter.spec.js` covers name-tie Tab/click destinations.

### Damage and healing

Each keyed `CreatureRow.vue` owns a pending adjustment text ref. Typing and Enter leave HP
unchanged. The explicit Damage/Heal buttons pass a finite positive amount and creature ID
to the named combat action, then clear only that row's draft, including valid actions that
leave HP unchanged at its limit. Invalid/nonpositive drafts leave HP and the draft intact.
Keyed sorting retains each creature's draft; reload starts drafts empty. Combat actions own
HP rules and persistence; rows derive HP/downed presentation and never save independently.

Mounted encounter tests cover explicit controls, row isolation through sorting, invalid
amounts, maximum-HP clamping, and downed turn eligibility. The Chromium damage/healing
workflow reloads actual UI saves and verifies that pending amounts disappear.

### Duplication and destructive actions

Rows invoke `duplicateCreature(id)` for fresh copies with numbered names and copied
initiative/AC/maximum HP. `EncounterTracker.vue` owns transient removal/reset confirmation
and calls `isEmptyCreature(id)`/`hasMeaningfulData()` before deciding whether to ask.
Untouched creatures remove immediately; New Combat clears empty rows without confirmation
and an already empty encounter causes no save. Accepted removal/reset calls named combat
actions; opening and cancelling never save. Reset preserves identity allocation and touches
only the versioned encounter key, leaving legacy encounter/theme/help data intact.

The Vue confirmation makes the encounter card inert, focuses Cancel, cycles Tab within
its two buttons, and cancels via Escape or backdrop click. Closing returns focus to the
trigger, or Add when accepted removal deletes the trigger. Keep confirmation state in the UI.
Responsive row menus expose Duplicate/Remove in the card layout; New Combat is also available from the mobile app menu.
Mounted tests own data protection and action outcomes; Chromium owns modal keyboard/focus,
backdrop dismissal, narrow layout, and reload workflows.

### Conditions and notes

`CreatureTags.vue` renders the Conditions and Other cells for each keyed creature row.
Conditions offers standard options plus custom text; Other accepts free-text notes.
Applied offered options are disabled; individual pill buttons remove tags. Combat actions
own trimming, blank rejection, duplicate prevention, and central persistence. Vue
interpolation displays all tag text literally.

Each cell owns its transient picker, query, and viewport-clamped position, recalculated
after query updates change the panel height. A fixed backdrop
dismisses on outside click; Escape closes and returns focus to the Add trigger. Applying
an option or pressing Enter with text closes the picker and awaits the Vue patch before
calling `addTag`, then returns focus to Add. Enter chooses the first offered match or
adds custom text. Opening starts with an empty query; picker state never persists.

`test/component/vue-tags.test.ts` mounts fresh encounters for tag actions, literal text, validation,
removal/restoration, and close-before-action/save sequencing. `test/acceptance/tags.spec.js` owns
browser dismissal/focus, actual reloads, and picker/tag bounds at desktop and
320px widths.

### Responsive menus and preferences

`ActionMenu.vue` owns transient row, app, and desktop theme menus: fixed panels with
viewport-clamped placement, a dismissal backdrop, arrow/Home/End navigation, and Escape
returning focus to the trigger. Tab closes and resumes native navigation from the trigger.
The Vue patch removes the menu before emitting an action, so saves and confirmations run
after dismissal. Menu confirmations retain the original menu trigger for focus restoration.
Responsive controls are always present; existing CSS chooses row menus at the 1400px card
breakpoint and the app menu at 640px. New Combat also remains available in the header.

`js/themes.js` is the theme registry; `js/themes.d.ts`
types its Vue consumers. Register themes there and add their variable block in `styles.css`.
`src/ui/preferences.ts` creates app-scoped preference state through the same injected storage
interface as combat, using only `dnd-ct-theme` and `sct-usage-dismissed`. Dismissal writes `1`;
reopening writes `0`, understood by the pre-paint reader. Read/write failures are contained
independently and leave controls usable in memory. The tracker applies theme/help presentation;
combat reset never changes either preference. Omitted preference storage is in-memory for tests.

The HTML head applies stored theme and help dismissal synchronously before styles load,
without importing a registry or depending on Vue. Unknown themes fall back through CSS and
are reconciled against the registry at startup; a throwing storage getter cannot block startup.
Mounted preference checks own persistence, reopening, storage failures, and dismissal before
saves/actions. Chromium owns menu focus/dismissal, confirmation from menus, pre-paint
presentation with app modules blocked, and representative viewport bounds with fallback fonts.

## Conventions

- **Conventional Commits:** include a type and domain scope where possible,
  e.g. `feat(combat): add turn advancement`.
- **User data is text:** use Vue interpolation and bound input values; never turn names,
  conditions, or notes into HTML. SVG markup is static.
- **Themes:** register in `js/themes.js` and add the matching `[data-theme="…"]`
  variable block in `styles.css`. Both theme controls consume the same registry.
- **Styling:** use CSS custom properties in `styles.css` for colors, spacing, radii,
  and `--control-h` alignment; no hardcoded colors.
- **Responsive UI:** use the same DOM at every viewport. CSS chooses row menus at
  1400px and app menus at 640px. Cells use `data-label` captions; avoid resize handlers
  and viewport-conditional rendering.
- **Browser globals:** JavaScript globals are hand-listed in `eslint.config.js`;
  add any new API used by JS there. Strict `vue-tsc` checks TypeScript/Vue identifiers.
- **Testing seams:** combat tests use public actions/observable state; persistence tests
  use injected storage; Vue Test Utils mounts fresh app instances and asserts input,
  output, and visible behavior. Vitest runs `test/component/**/*.test.ts` and `src/**/*.test.ts`.
  Browser acceptance in `test/acceptance/` owns focus, Tab, relatedTarget, dismissal, pre-paint
  presentation, and layout against the production build. Focus assertions stay out of
  jsdom tests; if simulated DOM and Chromium disagree, Chromium wins.
- **Reload checks:** drive real UI saves and reload without a seeding init script.
  `test/acceptance/fixtures.js` contains only the shared relational overflow assertion.
- **No pixel baselines:** assert bounds, visibility, and overflow relationally. The browser
  suite blocks Google Fonts, so passing fallback-font checks cannot prove real-font equivalence.
- **Sequencing:** retain checks that observe menus/pickers being removed before actions,
  saves, or confirmation. End-state checks alone lose this guarantee. Avoid private Vue
  internals, deleted routing/renderer contracts, and exact row-node identity assertions.

## Agent skills

### Issue tracker

Specs and tickets live in GitHub Issues for `zuny26/simple-combat-tracker`.
Before creating, reading, or updating tickets, read `docs/agents/issue-tracker.md`.

### Triage labels

GitHub issues use the default triage labels.
Before triaging, read `docs/agents/triage-labels.md`.

### Domain docs

Use one root `GLOSSARY.md` and `docs/adr/`. Before exploring or designing
the codebase, read `docs/agents/domain.md`.

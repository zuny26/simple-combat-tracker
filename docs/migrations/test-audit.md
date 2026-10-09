# Test responsibility audit

Governing decisions: [testing ADR](../adr/0003-behavior-focused-testing.md),
[state ownership ADR](../adr/0002-combat-state-ownership.md), and
[migration plan](vue-migration.md).

The following is the historical milestone-1 inventory. At that milestone all 108
existing cases were retained because the legacy app remained active:
76 node:test cases and 32 Chromium cases. The decision column below records what happens
when the relevant implementation is replaced, not permission to remove coverage early.
Port = rewrite against the agreed public seam; consolidate = fold the guarantee into a
stronger behavior check; retire = remove an obsolete implementation/legacy-format contract.
Retain = keep the browser responsibility, adapting selectors as needed. Each original case
is listed by name and by the failure its assertions can detect.

Combat actions/state, injected persistence, mounted Vue UI, and production browser acceptance
are the agreed seams. Browser focus, Tab, dismissal, and geometry stay in Chromium. Node
identity is meaningful for the current renderer, but is not a requirement on keyed Vue rows.
Retire a legacy check only when its implementation disappears or its replacement passes.
The ticket-09 reconciliation below records completed replacements for this inventory.

## `test/hp.test.js`

| Existing case | Failure detected | Migration decision |
| --- | --- | --- |
| clamp holds a value inside its bounds | Out-of-bounds values escape clamping. | Consolidate → action boundary clamping cases; retire standalone helper contract. |
| currentHP derives max - damage + temp | Displayed HP omits damage or temporary HP. | Port → combat actions/state. |
| temp HP can push current HP above max | Temporary HP is incorrectly capped at maximum HP. | Port → combat actions/state. |
| damage smaller than temp HP eats temp only | Small damage consumes normal HP before temporary HP. | Port → combat actions/state. |
| damage larger than temp HP zeroes temp and overflows into damageTaken | Overflow damage fails to consume temporary HP first. | Port → combat actions/state. |
| damage past max HP clamps and current HP floors at zero | Excess damage produces negative HP. | Port → combat actions/state. |
| healing reduces damageTaken and never touches temp HP | Healing changes temporary HP or fails to reduce damage. | Port → combat actions/state. |
| healing cannot overheal past max HP | Healing exceeds normal maximum HP. | Port → combat actions/state. |
| a fresh creature with maxHP 0 is not downed | Unconfigured HP appears defeated. | Port → combat actions/state. |
| a creature with max depleted and no temp is downed | Depleted HP fails to show downed. | Port → combat actions/state. |
| remaining temp HP keeps a creature standing | Temporary HP is ignored when determining downed. | Port → combat actions/state. |
| lowering max HP re-clamps a stale damage accumulator | Lower maximum leaves excess accumulated damage. | Port → combat actions/state. |
| currentHP self-clamps an un-normalized creature (stale damage from a just-lowered Max HP, before clampDamage runs) | Derived HP trusts stale damage before normalization. | Consolidate → maximum-HP action invariants; retire unnormalized private-state access. |
| raising max HP lifts current HP back off zero | Increasing maximum fails to restore HP. | Port → combat actions/state. |

## `test/order.test.js`

| Existing case | Failure detected | Migration decision |
| --- | --- | --- |
| parseInit treats blank and non-numeric values as parked | Blank or junk initiative enters combat. | Port → combat actions/state. |
| parseInit accepts zero and negative initiatives as real values | Zero/negative initiative is incorrectly parked. | Port → combat actions/state. |
| rows sort by initiative numerically, not as strings | Initiative sorts lexically. | Port → combat actions/state. |
| equal initiative ties break by name, case-insensitively | Name ties use case-sensitive ordering. | Port → combat actions/state. |
| parked rows sit at the bottom in insertion order | Parked rows reorder or precede eligible creatures. | Port → combat actions/state. |
| initiativedRows excludes parked rows entirely | Parked creatures participate in turns. | Port → combat actions/state. |
| a zero-initiative row participates in the turn order | Zero initiative disappears from turns. | Port → combat actions/state. |
| sorting does not mutate the input array | Deriving display order mutates the roster. | Consolidate → observable roster order remains stable while deriving display order. |

## `test/render.dom.test.js`

| Existing case | Failure detected | Migration decision |
| --- | --- | --- |
| a rendered row carries every class main.js routes on | Rendered fields/actions no longer match delegated routing classes. | Retire → routing classes disappear; action wiring is covered by mounted UI. |
| the card layout gets a caption on every cell that loses a column header | Mobile cells lose captions. | Port → mounted UI caption output; browser verifies mobile readability. |
| zero Max HP and zero Temp HP render blank, not "0" | Unset HP displays literal zero or lacks unconfigured styling. | Port → mounted UI unconfigured/zero-HP display. |
| a creature at zero current HP renders as downed | Defeated creatures lack visible downed styling. | Port → mounted UI downed display. |
| a creature name is never parsed as HTML | A name payload becomes markup. | Port → mounted UI literal-text safety. |
| a tag pill is never parsed as HTML | A tag payload becomes markup or has incorrect removal metadata. | Port → mounted UI literal tags/removal; retire routing attributes. |

## `test/reorder.dom.test.js`

| Existing case | Failure detected | Migration decision |
| --- | --- | --- |
| reorderRows moves the existing nodes instead of rebuilding them | Resorting destroys editable row nodes. | Retire → manual node moves; browser editing/value guarantees remain. |
| renderTable DOES rebuild, so it is the wrong tool for a re-sort | Structural rendering silently stops rebuilding nodes (legacy contract). | Retire → full rebuild is obsolete. |
| currentRowOrder reports the DOM, not the sorted model | DOM-order comparison reads sorted state rather than actual rows. | Retire → DOM-order helper is obsolete. |
| a blank # parks the row at the bottom regardless of insertion order | A parked row stays above eligible rows. | Consolidate → combat ordering tests plus browser visible-order smoke. |

## `test/state.test.js`

| Existing case | Failure detected | Migration decision |
| --- | --- | --- |
| load survives malformed JSON without throwing | Malformed JSON bricks startup. | Port → versioned persistence with in-memory/failing adapters. |
| load survives a non-object blob | Non-object saved data bricks startup. | Port → versioned persistence with in-memory/failing adapters. |
| load survives a null blob | Null saved data bricks startup. | Port → versioned persistence with in-memory/failing adapters. |
| load defaults creatures to an empty array when the key is missing | Missing creatures prevents empty-state recovery. | Port → versioned persistence with in-memory/failing adapters. |
| a legacy comma-separated conditions string is split into tags | Old comma-delimited condition data is lost. | Retire → legacy-format conversion/backfill is not required; new-format IDs are validated. |
| a legacy other string is kept whole, commas and all | Old free-text note is incorrectly split at commas. | Retire → legacy-format conversion/backfill is not required; new-format IDs are validated. |
| normalization coerces missing and junk fields to safe defaults | Invalid fields propagate unusable values. | Port → invalid new-format fields recover safely; old coercion details retire. |
| missing ids are backfilled above the highest existing id | Backfilled legacy IDs collide with existing IDs. | Retire → legacy-format conversion/backfill is not required; new-format IDs are validated. |
| a started combat with a dangling activeId reverts to pre-combat | A dangling active ID leaves combat invalid. | Port → versioned persistence with in-memory/failing adapters. |
| a started combat with a valid activeId is preserved | Loading valid progression resets it. | Port → versioned persistence with in-memory/failing adapters. |
| save then load round-trips a combat | Saved encounter inputs/progression fail to round-trip. | Port → versioned persistence with in-memory/failing adapters. |
| duplicate numbers names in sequence | Duplicate naming reuses suffixes. | Port → combat actions/state. |
| duplicating a blank name leaves it blank | Blank names receive artificial suffixes. | Port → combat actions/state. |
| a duplicate enters fresh but keeps its stat block | Duplicates inherit injuries/tags or lose copied stats. | Port → combat actions/state. |
| a duplicate is spliced in directly after its source | Duplicate insertion position is wrong before sorting. | Port → combat actions/state. |
| duplicating an unknown id returns null | Unknown duplication throws or returns a non-null result. | Port → unknown-ID action leaves encounter usable; null return is not required. |
| isEmptyCreature distinguishes a fresh row from a touched one | Meaningful data is mistaken for an untouched creature. | Port → mounted UI untouched/meaningful removal decisions. |
| resetState clears everything back to pre-combat | Reset leaves creatures or combat progression behind. | Port → combat actions/state. |
| tags are added, matched case-insensitively, and de-duplicated | Blank/duplicate tags are accepted or case-insensitive matching fails. | Port → combat actions/state. |
| tags are removed and toggled case-insensitively | Removing/toggling a tag uses case-sensitive matching. | Port → combat actions/state. |

## `test/turns.test.js`

| Existing case | Failure detected | Migration decision |
| --- | --- | --- |
| start is a no-op when nothing is initiatived | Combat starts with only parked creatures. | Port → combat actions/state. |
| start highlights the top initiatived row and opens round 1 | Start chooses wrong creature or round. | Port → combat actions/state. |
| next walks down the order without changing the round | Normal advancement increments round or skips a creature. | Port → combat actions/state. |
| next past the last row wraps to the top and bumps the round | Wrap fails to increment round/select top. | Port → combat actions/state. |
| next resumes at the top without bumping the round when the active creature has left | A vanished active creature spuriously increments round. | Retire → invalid direct mutation/index-helper contract; actions own departure invariants. |
| next reverts to pre-combat when the order empties | Empty order leaves invalid running combat. | Port → combat actions/state. |
| revertToPreCombat clears the highlight and the round | Pre-combat retains active identity/round. | Consolidate → start/departure/reset action outcomes; retire helper interface. |
| reassignActiveAfterLeaving picks the row now sitting at the old index | Departure selects wrong successor instead of old-position successor. | Port → combat actions/state. |
| reassignActiveAfterLeaving wraps to the top when the last row left | Last-creature departure fails to wrap. | Port → combat actions/state. |
| reassignActiveAfterLeaving reverts to pre-combat when nothing is left | Final departure leaves invalid combat. | Port → combat actions/state. |
| reassignActiveAfterLeaving falls back to the top row for a null index | Missing captured index fails legacy fallback. | Retire → invalid direct mutation/index-helper contract; actions own departure invariants. |
| reassignActiveAfterLeaving does nothing before combat starts | Reassignment starts combat unexpectedly. | Port → remove/park before combat preserves pre-combat. |
| maybeRevertToPreCombat reverts once every row is parked | All parked creatures leave combat running. | Consolidate → start/departure/reset action outcomes; retire helper interface. |
| maybeRevertToPreCombat leaves a running combat alone | Valid combat is reset by eligibility check. | Consolidate → start/departure/reset action outcomes; retire helper interface. |
| activeInitiativedIndex returns -1 when there is no active creature | Missing active creature returns a valid index. | Retire → invalid direct mutation/index-helper contract; actions own departure invariants. |

## `test/wiring.dom.test.js`

| Existing case | Failure detected | Migration decision |
| --- | --- | --- |
| the Dmg button applies the amount from its own row | Damage targets the wrong row or fails to clear pending input. | Port → mounted Vue UI inputs/actions and visible state. |
| the Heal button applies the amount from its own row | Healing targets the wrong row. | Port → mounted Vue UI inputs/actions and visible state. |
| Enter in the amount field never applies it | Enter applies HP or is not suppressed by the legacy handler. | Port → Enter leaves HP/input unchanged; retire defaultPrevented implementation assertion. |
| editing Max HP re-clamps the damage accumulator | Max HP input fails to clamp accumulated damage. | Port → mounted Vue UI inputs/actions and visible state. |
| removing an untouched row skips the confirm dialog | Removing an untouched creature unnecessarily asks confirmation. | Port → mounted Vue UI inputs/actions and visible state. |
| removing a named row asks first, and only removes on confirm | Meaningful removal occurs before confirmation or never commits. | Port → mounted Vue UI inputs/actions and visible state. |
| cancelling the remove dialog leaves the creature alone | Cancellation removes data. | Port → mounted Vue UI inputs/actions and visible state. |
| the tag pill X removes exactly that tag | Tag removal targets wrong tag or leaves stale UI. | Port → mounted Vue UI inputs/actions and visible state. |
| the duplicate button copies the row in place | Duplicate action fails to create/render a fresh copy. | Port → mounted Vue UI inputs/actions and visible state. |

## `e2e/smoke.spec.js`

| Existing case | Failure detected | Migration decision |
| --- | --- | --- |
| a seeded combat renders in initiative order | The browser loads an empty/wrongly ordered encounter. | Retain → production encounter/order smoke; consolidate permutations into state tests. |
| the real Add button adds a row and focuses its # | Seeding masks broken Add or lost entry focus. | Retain → real Add and keyboard entry workflow. |
| the desktop layout does not overflow | Wide desktop content extends beyond the layout width. | Retain → relational desktop overflow check. |

## `e2e/focus-reorder.spec.js`

| Existing case | Failure detected | Migration decision |
| --- | --- | --- |
| typing a new # does not reorder mid-edit | Typing moves the row prematurely or loses input/focus. | Retain → usable in-progress editing. |
| Tab commits the reorder and lands focus where Tab was going | Blur reorder breaks Tab navigation. | Retain → browser Tab workflow. |
| clicking into another row commits the reorder and keeps the clicked field focused | Reorder steals click focus. | Retain → browser click workflow. |
| an unfinished edit survives the re-sort it caused | Name tie reorder loses edited value or target focus. | Retain → value preservation/name editing workflow. |
| a re-sort that changes nothing leaves focus completely alone | No-op sorting disrupts focus. | Consolidate → browser stable editing workflow. |
| the highlight follows the creature, not the row position | Sorting transfers active identity to another creature. | Consolidate → combat identity tests plus one browser visible-highlight case. |
| clearing the active creature's # moves the highlight to the next row down | Parking the active creature selects wrong visible successor. | Consolidate → departure action cases plus browser park workflow. |
| the unchanged branch still moves the highlight when the active creature leaves | Parking last eligible creature leaves stale active styling despite unchanged display order. | Consolidate → empty-order action test plus visible browser recovery. |

## `e2e/popovers.spec.js`

| Existing case | Failure detected | Migration decision |
| --- | --- | --- |
| tag picker / opens from its trigger | Trigger does not open panel / exposed expanded state is incorrect. | Port → mounted UI open state; retain opening in browser menu workflow. |
| tag picker / closes on an outside click | Backdrop/outside click does not dismiss panel. | Retain → browser dismissal; consolidate repeated combinations after widget ports. |
| tag picker / closes on Escape | Escape fails to dismiss/restore trigger focus. | Retain → browser keyboard dismissal and focus. |
| tag picker / stays inside the viewport | Panel extends beyond supported viewport bounds. | Retain → browser geometry; consolidate into representative desktop/mobile cases. |
| row menu / opens from its trigger | Trigger does not open panel / exposed expanded state is incorrect. | Port → mounted UI open state; retain opening in browser menu workflow. |
| row menu / closes on an outside click | Backdrop/outside click does not dismiss panel. | Retain → browser dismissal; consolidate repeated combinations after widget ports. |
| row menu / closes on Escape | Escape fails to dismiss/restore trigger focus. | Retain → browser keyboard dismissal and focus. |
| row menu / stays inside the viewport | Panel extends beyond supported viewport bounds. | Retain → browser geometry; consolidate into representative desktop/mobile cases. |
| app menu / opens from its trigger | Trigger does not open panel / exposed expanded state is incorrect. | Port → mounted UI open state; retain opening in browser menu workflow. |
| app menu / closes on an outside click | Backdrop/outside click does not dismiss panel. | Retain → browser dismissal; consolidate repeated combinations after widget ports. |
| app menu / closes on Escape | Escape fails to dismiss/restore trigger focus. | Retain → browser keyboard dismissal and focus. |
| app menu / stays inside the viewport | Panel extends beyond supported viewport bounds. | Retain → browser geometry; consolidate into representative desktop/mobile cases. |
| theme picker / opens from its trigger | Trigger does not open panel / exposed expanded state is incorrect. | Port → mounted UI open state; retain opening in browser menu workflow. |
| theme picker / closes on an outside click | Backdrop/outside click does not dismiss panel. | Retain → browser dismissal; consolidate repeated combinations after widget ports. |
| theme picker / closes on Escape | Escape fails to dismiss/restore trigger focus. | Retain → browser keyboard dismissal and focus. |
| theme picker / stays inside the viewport | Panel extends beyond supported viewport bounds. | Retain → browser geometry; consolidate into representative desktop/mobile cases. |
| the mobile popovers stay on-screen at 320px | Narrow row/app panels overflow or lose right-edge trigger alignment. | Retain → relational narrow browser bounds; exact anchoring can change if documented. |
| the row menu closes before its action runs | Confirmation opens under an open menu; mutation sequence catches ordering. | Port → observable close-before-confirm sequencing in mounted UI; retain browser flow. |
| the app menu closes before applying a theme | Theme applies while menu remains open; final state alone masks order. | Port → mounted UI close-before-action sequencing; retain browser menu/theme flow. |
| the tag picker adds a condition without rebuilding the table | Applying a tag destroys pending adjustment or entered name. | Retain → browser pending-input preservation; retire manual renderer constraint. |
| the tag picker restores focus to the (rebuilt) trigger after applying a tag, then Escape | Escape after applying a tag focuses a detached trigger. | Retain → browser apply-then-Escape focus; retire rebuilt-trigger mechanism. |

## Harnesses and new checks

`test/helpers.js`, `test/domHarness.js`, and `e2e/fixtures.js` contain no independent cases.
Retain while their suites depend on them. Replace singleton/jsdom global bootstrapping with
fresh combat instances and storage adapters at port time. Browser seed fixtures remain useful
for layout, but never use their per-navigation init script for reload persistence tests.

Milestone 1 adds `test/tooling.test.ts` with `test/fixtures/ToolingProbe.vue`: one test-only
Composition API input exercises typed SFC compilation and Vue Test Utils literal text/input
outputs. It owns no encounter state and can retire once real mounted UI tests exercise the
same toolchain. `e2e/production.spec.js` checks generated asset loading at the configured
Pages path, encounter creation/advancement, damage/healing, and reload persistence through
the real UI without an init script. Retain this production integration responsibility.

The 108 retained legacy cases do not establish complete migration acceptance coverage.
Later milestones add new-format validation/storage failures, independent app instances,
reset/preferences, custom tags/notes, and complete Vue workflows as specified in the plan.
Chromium fixtures block external fonts: green fallback-font geometry checks do not establish
real-font equivalence. The new probe is a tooling check, not migrated combat coverage.

Ticket 04 adds the independently runnable `vue.html` entry without replacing legacy
implementations or tests. `test/encounter.test.ts` mounts the real tracker with fresh combat
instances and verifies persisted field wiring, deferred initiative/name sorting, progression,
parked-creature departure, literal user text, HP presentation, and numeric drafts. The
test-only SFC probe remains a tooling check. `e2e/vue-encounter.spec.js` loads the generated Vue
entry at the Pages path, creates and advances an encounter, checks initiative/name editing
with real Tab/click destinations, and restores real UI saves on reload without reseeding.


Ticket 06 extends mounted Vue encounter tests with duplication, meaningful/empty removal,
accept/cancel/reset persistence, preference isolation, and active-creature removal/wrap.
Chromium verifies destructive confirmation at desktop and 320px widths: Cancel/Escape/
backdrop dismissal, trapped Tab, focus restoration, accepted actions, and actual reload.
Legacy destructive-action tests remain applicable to the independent legacy entry.

Ticket 07 adds `test/vue-tags.test.ts` for offered/custom conditions, free-text notes,
trimming/blank/duplicate behavior, literal text, individual removal, restored tags, and
UI-only query state. Action-boundary and storage-callback observations protect the picker
being removed before the named action and save, rather than just its eventual absence.
`e2e/vue-tags.spec.js` covers real UI saves/reloads, keyboard entry, outside-click dismissal,
Escape and apply focus restoration, pending HP input preservation, and long tag/picker
geometry at 1280, 768, and 320px, including a growing note picker near the viewport bottom.
Legacy tag tests remain active for the legacy entry.

Ticket 08 adds mounted preference controls/storage/sequencing in `test/vue-preferences.test.ts`
and browser focus, pre-paint, storage-getter failure, reload, and viewport responsibilities
in `e2e/vue-preferences.spec.js`. Existing Vue destructive browser cases now open row actions
through the card menu, retaining their confirmation keyboard, dismissal, and reload assertions.
Legacy checks remain applicable to their independent entry.

## Ticket 09: completed retirement and current coverage

The maintained root entry is now Vue. All legacy JavaScript application modules except
`js/themes.js` and its declaration are removed, together with `vue.html`, node:test cases,
custom global/jsdom bootstrapping, legacy browser specs, and the test-only tooling probe.
The tables above remain the per-case historical record; every Port/Consolidate behavior
now belongs to the passing replacement seams below. Retire decisions concern obsolete
implementation or old-format compatibility contracts, rather than lost user workflows.

| Historical responsibility | Current replacement and retained failure cases |
| --- | --- |
| HP rules (`hp.test.js`) | `test/combat.test.ts`: derived totals, temporary HP above max, fully absorbed ordinary damage with existing injuries, overflow and excess damage, healing with temporary HP, max changes, downed/unconfigured, invalid amounts. `test/encounter.test.ts`: visible HP and drafts; `e2e/production.spec.js`: real damage/heal/reload. Self-clamping unnormalized state and standalone clamp contracts retire; named actions own invariants. |
| Ordering (`order.test.js`, ordering parts of `reorder.dom.test.js`) | `test/combat.test.ts`: descending finite numeric initiative, zero/negative values, stable case-insensitive ties, parked insertion order, nonmutating derived order. `test/encounter.test.ts`: saved input/deferred display order. `e2e/production.spec.js` and `e2e/encounter.spec.js`: initiative/name Tab/click, active identity and values after reorder. |
| Turns (`turns.test.js`) | `test/combat.test.ts`: parked start, start/next/wrap, departing middle/last/final active creature, non-active removal, pre-combat departure, downed eligibility, active identity during ties. Mounted encounter checks show highlight/round/reset outcomes. Captured-index and direct mutation fallback helpers retire. |
| Persistence and creature actions (`state.test.js`) | `test/persistence.test.ts`: versioned round trips, malformed/invalid shape/version/HP/ID/progression recovery, ignored unknown fields, unavailable reads/writes and save retry, no write on load/rejected actions, allocation across reset/reload and safe-integer boundaries. `test/combat.test.ts`: duplication names/stats/insertion/unknown ID, independent tags, trim/case/blank handling, reset. Old conversion/coercion/backfill and unused toggle contracts retire; offered conditions use add/remove. |
| Rendering and routing (`render.dom.test.js`, `wiring.dom.test.js`) | `test/encounter.test.ts`: fields/actions, own-row HP adjustments and Enter, deferred sorting with pending drafts, max-HP clamp, zero/unconfigured/downed output, literal names, responsive captions, duplicate/removal/reset and confirmation persistence. `test/vue-tags.test.ts`: literal offered/custom conditions/notes, individual removal/restoration and sequencing. Routing classes and manual node/rebuild contracts retire. |
| Browser smoke and production | `e2e/production.spec.js`: actual root Pages URL and generated module, Add focus, creation/round advancement, initiative Tab/click, actual UI saves/reloads, parked recovery, fractional HP and pending-amount isolation. Real mounted SFCs replace the tooling probe. |
| Browser popovers and confirmations | `e2e/encounter.spec.js`: name editing plus one narrow confirmation workflow covering trapped Tab, Escape/Cancel/backdrop, bounds, trigger/Add restoration, and reload. `e2e/tags.spec.js`: desktop/narrow picker focus/dismissal/bounds, long literal tags, pending inputs, reload, growing panel near viewport bottom. `e2e/preferences.spec.js`: desktop/tablet/narrow menus, keyboard/dismissal/focus, theme/help/reset independence, pre-paint module-blocked preferences, throwing localStorage getter. |

Browser permutations are consolidated to 12 cases: two production workflows, name editing,
one narrow modal workflow, two representative tag layouts and one dynamic-height case,
three representative preference/control layouts, and two startup cases. Tablet geometry
remains in the preference/control workflow; desktop/narrow tag checks retain the distinct
table/card layouts. Repeated desktop modal cancellation is covered by the mounted decisions
and narrow real-browser keyboard workflow. No focus/layout assertion moves to jsdom.

`npm test`/`test:unit` now run only Vitest. `npm run check:all` runs lint, strict typechecking,
Vitest, build, then Chromium against that artifact. Push CI uses the same command and has
no deployment job. Source retirement on the migration branch does not change public hosting;
Pages inspection, configuration recording, and deployment remain ticket 10.

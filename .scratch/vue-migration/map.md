# Vue migration map

## Notes

- [Specification](spec.md) and [migration plan](../../docs/migrations/vue-migration.md).
- The maintained local root entry is Vue; public deployment cutover remains ticket 10.

## Decisions-so-far

- [01: Build and verification foundation](issues/01-build-and-verification-foundation.md):
  Vite serves/builds the legacy entry with the expected `/simple-combat-tracker/` base.
  Strict Vue/TypeScript checking runs separately. Vitest/Vue Test Utils exercise a
  test-only SFC; legacy unit/DOM and Chromium checks remain active. Acceptance uses
  the generated artifact, and pushed commits run the same complete verification.
  Public deployment is unchanged. The [per-test audit](../../docs/migrations/test-audit.md)
  records each test's responsibility and migration decision.

- [02: Isolated combat actions](issues/02-isolated-combat-actions.md):
  The typed factory owns independent encounters and named actions, derives order/HP,
  and handles active-creature departure internally. A Vue adapter adds built-in
  reactivity and a read-only state view. The legacy app remains the running owner;
  typed combat is an independently tested expansion alongside it.

- [03: Versioned encounter persistence](issues/03-versioned-encounter-persistence.md):
  An injected storage interface restores and centrally saves version-1 encounter inputs,
  progression, and identity allocation. Whole-encounter validation recovery and storage
  failure containment keep actions usable in memory. Vue instances optionally use the
  adapter; the legacy entry and its storage key remain independent.

- [04: Create, edit, and advance encounters in Vue](issues/04-vue-encounter-editing-and-turns.md):
  `/simple-combat-tracker/vue.html` runs a persisted Vue encounter independently of the
  legacy root entry. Keyed rows save input immediately and keep displayed order transient
  until initiative/name blur; Chromium verifies usable Tab/click focus and actual reload
  restoration. HP drafts are UI state, while HP and progression derive from combat actions.
  Both entries build and pass existing checks; public deployment remains unchanged.

- [05: Apply damage and healing through explicit Vue controls](issues/05-vue-damage-and-healing.md):
  Each keyed Vue row owns its pending text amount; Damage/Heal explicitly invoke combat
  actions by creature ID and clear that row's valid amount. Enter is inert. Mounted tests
  cover row isolation, HP presentation, and validation; Chromium reloads real UI saves to
  verify applied HP persists while pending amounts disappear.

- [06: Duplicate creatures and confirm destructive actions](issues/06-duplication-and-destructive-confirmation.md):
  Vue rows expose fresh duplication and removal; the tracker owns transient confirmation
  for meaningful removal/New Combat. Cancellation leaves state/storage intact; accepted
  actions persist through the combat module and preserve independent preferences.
  Desktop/mobile Chromium checks cover dismissal, keyboard focus, and real reloads.

- [07: Manage conditions and notes in Vue](issues/07-vue-conditions-and-notes.md):
  Vue-owned pickers offer conditions/custom text and Other notes, with individual removal
  through named combat actions. Query/open state is transient; the picker patch completes
  before applying a tag. Mounted checks protect validation, literal text, and action/save
  sequencing; Chromium verifies dismissal, focus, long tags, and actual reload restoration.

- [08: Complete responsive menus, themes, and help preferences](issues/08-responsive-menus-and-preferences.md):
  CSS chooses desktop controls and card/app menus from the same Vue UI. Shared menu
  dismissal completes before actions and preserves the trigger for confirmation focus.
  Both entries use `js/themes.js`; Vue preferences have an independent injected storage
  boundary and synchronous head presentation. Mounted tests protect storage failures,
  reopening, reset independence, and sequencing; Chromium covers focus, actual reloads,
  pre-paint presentation, and relational bounds at representative widths.

- [09: Retire legacy code and consolidate verification](issues/09-retire-legacy-and-consolidate-checks.md):
  Vue is the maintained root entry with one app-scoped combat owner. Legacy singleton,
  manual DOM widgets/routing, custom bootstrap harnesses, and obsolete tests retire after
  the [audit reconciliation](../../docs/migrations/test-audit.md#ticket-09-completed-retirement-and-current-coverage).
  Vitest owns rules/storage/mounted behavior; 12 Chromium cases retain production-path,
  editing, reload, modal/menu/picker focus and representative geometry responsibilities.
  `check:all` and push-only CI verify without publishing; hosting cutover stays ticket 10.

## Fog

- Actual Pages configuration, published URL, and default branch must be verified before
  cutover. This milestone does not change remote hosting settings.
- Migration branch source now requires a Vite build; keep it off the existing raw-source
  deployment branch until ticket 10 publishes the checked artifact.

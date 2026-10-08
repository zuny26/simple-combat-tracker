# 03: Persist and safely restore the new encounter format

**What to build:** Preserve a new-format encounter and its progression across reloads while allowing the tracker to keep running in memory when saved data or browser storage cannot be used.

**Blocked by:** 02 — Introduce isolated combat instances and named actions.

**Status:** resolved

- [x] Persistence receives an explicit storage interface. Production uses browser storage; tests use fresh in-memory or failing adapters without global browser setup.
- [x] An explicit versioned format stores encounter inputs and progression. Current HP, derived display order, menus, confirmation state, searches, and unapplied adjustments are not saved as combat data.
- [x] Saves are coordinated centrally after accepted combat changes, including edits, HP actions, progression, duplication, tags, removal, and reset. Widgets and fields do not perform independent saves.
- [x] A valid round trip restores creatures and progression and allows subsequent actions and identity allocation to continue correctly.
- [x] Runtime validation covers supported versions, field shapes, finite numeric fields, unique creature identities, and consistent round/start/active-creature references and eligibility. Initiative text retains the defined parked-creature behavior.
- [x] Malformed JSON, unsupported versions, invalid fields or identities, and inconsistent progression recover to a safe usable state without throwing. Recovery granularity is documented. Legacy encounter compatibility and backward-compatible writes are not required.
- [x] Unavailable reads and failed writes leave combat actions usable in memory. Combat persistence remains separate from theme and help preferences.
- [x] Adapter tests cover round trips, validation failures, storage failures, and exclusion of derived/transient state. No new test-only public API is introduced.
- [x] The legacy application remains runnable, applicable checks pass, and repository guidance describes the format, storage seam, central saving, and recovery guarantees.



## Answer

Implemented version-1 snapshots under `dnd-combat-tracker-v1` with an explicit injected
storage adapter, centralized saves after completed changes, whole-encounter runtime
validation/recovery, and contained browser read/write failures. Identity allocation and
progression survive reload and reset. Vue instances can opt into persistence; the legacy
running app remains independent. Repository guidance documents the format and guarantees.

Verified with Node 24.15: lint, strict typechecking, legacy tests, all 63 Vitest tests,
production build, and all 33 Chromium acceptance tests. Playwright ran outside the sandbox
because its preview server could not start inside it.

Recorded in [Decisions-so-far](../map.md#decisions-so-far).


Code review found an extreme-counter boundary: allocating or advancing from the maximum
safe integer could make a saved snapshot invalid. Regression tests now cover safe ID
wrapping without reuse within an instance and round saturation at that limit. The standards
review's optional repeated-payload-type suggestion was addressed with `CombatInitialState`.

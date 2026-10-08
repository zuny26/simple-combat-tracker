# 03: Persist and safely restore the new encounter format

**What to build:** Preserve a new-format encounter and its progression across reloads while allowing the tracker to keep running in memory when saved data or browser storage cannot be used.

**Blocked by:** 02 — Introduce isolated combat instances and named actions.

**Status:** ready-for-agent

- [ ] Persistence receives an explicit storage interface. Production uses browser storage; tests use fresh in-memory or failing adapters without global browser setup.
- [ ] An explicit versioned format stores encounter inputs and progression. Current HP, derived display order, menus, confirmation state, searches, and unapplied adjustments are not saved as combat data.
- [ ] Saves are coordinated centrally after accepted combat changes, including edits, HP actions, progression, duplication, tags, removal, and reset. Widgets and fields do not perform independent saves.
- [ ] A valid round trip restores creatures and progression and allows subsequent actions and identity allocation to continue correctly.
- [ ] Runtime validation covers supported versions, field shapes, finite numeric fields, unique creature identities, and consistent round/start/active-creature references and eligibility. Initiative text retains the defined parked-creature behavior.
- [ ] Malformed JSON, unsupported versions, invalid fields or identities, and inconsistent progression recover to a safe usable state without throwing. Recovery granularity is documented. Legacy encounter compatibility and backward-compatible writes are not required.
- [ ] Unavailable reads and failed writes leave combat actions usable in memory. Combat persistence remains separate from theme and help preferences.
- [ ] Adapter tests cover round trips, validation failures, storage failures, and exclusion of derived/transient state. No new test-only public API is introduced.
- [ ] The legacy application remains runnable, applicable checks pass, and repository guidance describes the format, storage seam, central saving, and recovery guarantees.


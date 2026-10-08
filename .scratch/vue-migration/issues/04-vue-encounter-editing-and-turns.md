# 04: Create, edit, and advance encounters in Vue

**What to build:** Let the DM prepare creatures and run their turn order in a separately runnable Vue tracker, with saved editing and progression, while the legacy public tracker remains available.

**Blocked by:** 03 — Persist and safely restore the new encounter format.

**Status:** resolved

- [x] The Vue application creates one app-scoped combat instance connected to persistence. Its UI reads observable state and invokes named actions; no legacy singleton or DOM widget independently drives the Vue encounter.
- [x] The DM can add a creature with empty editable fields and edit initiative, name, AC, maximum HP, and temporary HP. Current HP, downed/unconfigured presentation, round, and active-creature highlighting update correctly.
- [x] Start and Next follow the combat rules, including parked creatures, round-one start, wrap, identity across reordering, and reassignment when initiative becomes ineligible.
- [x] Editable rows use creature-ID keys. Initiative/name edits save during input and preferably reorder on blur, with temporary display-order coordination owned by the UI rather than persistence.
- [x] Entered values are retained through typing, Tab, clicks, and reordering. Any departure from preferred sorting/editing behavior is documented with its reason and a verified usable workflow.
- [x] Reload restores the encounter and progression. Browser reload checks do not reseed or overwrite the state being tested.
- [x] User-entered names and field values render as text. Existing styling and CSS variables are retained where practical, without introducing a router or a visual redesign.
- [x] Fresh-instance component tests verify field/action wiring and visible state. Chromium checks demonstrate encounter creation, turn advancement, usable initiative/name editing with Tab/click, and reload restoration; simulated DOM tests do not assert real focus.
- [x] Both applications remain runnable, applicable checks pass, public deployment remains unchanged, and repository guidance documents Vue entry, keyed editing, and transitional ownership.


## Answer

Implemented an independent Vue entry at `/simple-combat-tracker/vue.html`, backed by one
persisted app-scoped combat instance. Creature-ID keyed rows save edits on input and defer
initiative/name display sorting until blur. Chromium verifies retained Tab/click destinations,
active identity through sorting, parked-creature reassignment, round wrap, and restoration
of actual UI saves without reseeding. HP text drafts preserve decimal typing; invalid values
leave accepted HP intact and blur displays the accepted value. Legacy entry and public
deployment remain available independently.

Verification: `npm run check:all` passed with Node 24.15.0, including both unit/DOM suites,
strict type checking, lint, the dual-entry production build, and all 35 Chromium checks.
Parallel Standards and Spec reviews found no blocking issues; the optional duplicated-test
storage helper cleanup was applied and the four mounted tests and type checking rerun.

Decision recorded in the [migration map](../map.md#decisions-so-far).

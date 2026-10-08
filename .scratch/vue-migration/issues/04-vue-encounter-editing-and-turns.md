# 04: Create, edit, and advance encounters in Vue

**What to build:** Let the DM prepare creatures and run their turn order in a separately runnable Vue tracker, with saved editing and progression, while the legacy public tracker remains available.

**Blocked by:** 03 — Persist and safely restore the new encounter format.

**Status:** ready-for-agent

- [ ] The Vue application creates one app-scoped combat instance connected to persistence. Its UI reads observable state and invokes named actions; no legacy singleton or DOM widget independently drives the Vue encounter.
- [ ] The DM can add a creature with empty editable fields and edit initiative, name, AC, maximum HP, and temporary HP. Current HP, downed/unconfigured presentation, round, and active-creature highlighting update correctly.
- [ ] Start and Next follow the combat rules, including parked creatures, round-one start, wrap, identity across reordering, and reassignment when initiative becomes ineligible.
- [ ] Editable rows use creature-ID keys. Initiative/name edits save during input and preferably reorder on blur, with temporary display-order coordination owned by the UI rather than persistence.
- [ ] Entered values are retained through typing, Tab, clicks, and reordering. Any departure from preferred sorting/editing behavior is documented with its reason and a verified usable workflow.
- [ ] Reload restores the encounter and progression. Browser reload checks do not reseed or overwrite the state being tested.
- [ ] User-entered names and field values render as text. Existing styling and CSS variables are retained where practical, without introducing a router or a visual redesign.
- [ ] Fresh-instance component tests verify field/action wiring and visible state. Chromium checks demonstrate encounter creation, turn advancement, usable initiative/name editing with Tab/click, and reload restoration; simulated DOM tests do not assert real focus.
- [ ] Both applications remain runnable, applicable checks pass, public deployment remains unchanged, and repository guidance documents Vue entry, keyed editing, and transitional ownership.


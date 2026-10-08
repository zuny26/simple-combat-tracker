# 05: Apply damage and healing through explicit Vue controls

**What to build:** Let the DM apply a creature-specific pending amount through Damage or Heal without typing or Enter accidentally changing HP, and preserve applied results across reloads.

**Blocked by:** 04 — Create, edit, and advance encounters in Vue.

**Status:** ready-for-agent

- [ ] Each creature has a pending adjustment owned by the UI. Typing and pressing Enter do not apply damage or healing.
- [ ] Damage and Heal invoke the named action for the intended creature and clear that creature's pending amount after application. Amounts on other creatures are unaffected.
- [ ] Damage consumes temporary HP first and clamps normal HP at zero. Healing restores normal HP up to maximum without changing temporary HP. Invalid/nonpositive adjustment input cannot produce an invalid HP state.
- [ ] Maximum-HP changes immediately update the derived total and clamp accumulated damage. Unconfigured HP remains visually distinct from downed HP, and downed creatures stay in turn order.
- [ ] Applied changes persist; pending adjustments do not. Reload restores the applied HP state without restoring an unapplied amount.
- [ ] Fresh-instance component tests cover row-specific wiring, Enter remaining inert, clearing amounts, and visible HP changes. A Chromium damage/healing workflow verifies actual reload persistence without fixture reseeding.
- [ ] Applicable checks pass, the legacy application and public deployment remain available, and repository guidance records the UI ownership and explicit-action conventions as needed.


# 05: Apply damage and healing through explicit Vue controls

**What to build:** Let the DM apply a creature-specific pending amount through Damage or Heal without typing or Enter accidentally changing HP, and preserve applied results across reloads.

**Blocked by:** 04 — Create, edit, and advance encounters in Vue.

**Status:** resolved

- [x] Each creature has a pending adjustment owned by the UI. Typing and pressing Enter do not apply damage or healing.
- [x] Damage and Heal invoke the named action for the intended creature and clear that creature's pending amount after application. Amounts on other creatures are unaffected.
- [x] Damage consumes temporary HP first and clamps normal HP at zero. Healing restores normal HP up to maximum without changing temporary HP. Invalid/nonpositive adjustment input cannot produce an invalid HP state.
- [x] Maximum-HP changes immediately update the derived total and clamp accumulated damage. Unconfigured HP remains visually distinct from downed HP, and downed creatures stay in turn order.
- [x] Applied changes persist; pending adjustments do not. Reload restores the applied HP state without restoring an unapplied amount.
- [x] Fresh-instance component tests cover row-specific wiring, Enter remaining inert, clearing amounts, and visible HP changes. A Chromium damage/healing workflow verifies actual reload persistence without fixture reseeding.
- [x] Applicable checks pass, the legacy application and public deployment remain available, and repository guidance records the UI ownership and explicit-action conventions as needed.


## Answer

Each keyed Vue creature row now owns a pending adjustment text draft. Typing and Enter
leave HP unchanged; explicit Damage/Heal buttons invoke the named combat action by
creature ID, then clear only that row's valid positive amount. Invalid/nonpositive inputs
leave HP intact. Existing combat actions retain temporary-HP consumption, normal-HP
clamping, healing limits, and centralized persistence. Pending drafts follow keyed rows
through sorting and disappear on reload; applied HP changes restore normally.

Mounted tests cover row-specific controls, Enter, clearing, sorting, invalid amounts,
maximum-HP changes, unconfigured/downed presentation, and downed turn eligibility.
Chromium verifies damage and healing across actual reloads without reseeding storage.
Repository guidance records UI ownership and explicit application. Legacy entry and
public deployment remain unchanged.

Verification with Node 24.15.0: lint, strict type checking, all legacy unit/DOM suites,
78 Vitest tests, the dual-entry production build, and all 36 Chromium checks passed.
The sandboxed `check:all` run completed through build; its preview server could not start,
so the browser stage was rerun successfully outside the sandbox. Parallel Standards and
Spec reviews found no issues.

Decision recorded in the [migration map](../map.md#decisions-so-far).

# 06: Duplicate creatures and confirm destructive actions

**What to build:** Let the DM prepare groups quickly and safely remove creatures or begin New Combat, with confirmation protecting meaningful encounter data and cancellation leaving the encounter intact.

**Blocked by:** 04 — Create, edit, and advance encounters in Vue.

**Status:** resolved

- [x] Duplicate controls create a distinct creature with copied initiative/AC/maximum HP and increasing numbered names; blank source names remain blank. Copies enter with full normal HP, no temporary HP, and cleared conditions/notes.
- [x] Untouched empty creatures can be removed immediately. Removing a creature with meaningful data requires confirmation owned by the UI.
- [x] Accepting removal invokes the named action and correctly reassigns the active creature from its previous position, wrapping without a round increment or returning to pre-combat as appropriate.
- [x] New Combat confirms when meaningful data would be lost and resets creatures and progression to pre-combat. Empty/reset behavior does not cause needless destructive changes.
- [x] Opening or cancelling confirmation does not change combat state or saved data. Accepted changes persist, while confirmation state does not.
- [x] Combat reset touches only encounter data; independent theme/help preference data is preserved even before its Vue controls are finished.
- [x] Fresh-instance component tests cover duplication, meaningful versus empty removal, and confirmation accept/cancel/reset outcomes. Chromium demonstrates usable destructive confirmation and its cancellation workflow.
- [x] Applicable checks pass, the legacy application and public deployment remain available, and repository guidance documents confirmation ownership and destructive-action behavior as needed.


## Answer

Vue rows now duplicate through the named combat action and request UI-owned removal
confirmation for meaningful creatures. New Combat confirms meaningful data loss;
empty rows clear immediately and an empty encounter remains a no-op. Acceptance uses
combat actions for reassignment/reset and persistence; cancellation changes no data.
The modal supports Cancel, Escape, backdrop dismissal, trapped Tab, and focus restoration.
Independent preference and legacy encounter keys remain intact.

Verified with Node 24.15: lint, strict typechecking, all legacy files, 88 Vitest tests,
both production entries, and 38 Chromium checks. The browser suite needed permission
for its local preview server. A review-requested populated-layout/dialog-bounds check
also passed in the five-test Vue browser suite. Standards review found no violations;
spec review found no missing requirements. Legacy application/deployment remain unchanged.

Decision recorded in [the migration map](../map.md#decisions-so-far).

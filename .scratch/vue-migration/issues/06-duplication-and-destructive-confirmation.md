# 06: Duplicate creatures and confirm destructive actions

**What to build:** Let the DM prepare groups quickly and safely remove creatures or begin New Combat, with confirmation protecting meaningful encounter data and cancellation leaving the encounter intact.

**Blocked by:** 04 — Create, edit, and advance encounters in Vue.

**Status:** ready-for-agent

- [ ] Duplicate controls create a distinct creature with copied initiative/AC/maximum HP and increasing numbered names; blank source names remain blank. Copies enter with full normal HP, no temporary HP, and cleared conditions/notes.
- [ ] Untouched empty creatures can be removed immediately. Removing a creature with meaningful data requires confirmation owned by the UI.
- [ ] Accepting removal invokes the named action and correctly reassigns the active creature from its previous position, wrapping without a round increment or returning to pre-combat as appropriate.
- [ ] New Combat confirms when meaningful data would be lost and resets creatures and progression to pre-combat. Empty/reset behavior does not cause needless destructive changes.
- [ ] Opening or cancelling confirmation does not change combat state or saved data. Accepted changes persist, while confirmation state does not.
- [ ] Combat reset touches only encounter data; independent theme/help preference data is preserved even before its Vue controls are finished.
- [ ] Fresh-instance component tests cover duplication, meaningful versus empty removal, and confirmation accept/cancel/reset outcomes. Chromium demonstrates usable destructive confirmation and its cancellation workflow.
- [ ] Applicable checks pass, the legacy application and public deployment remain available, and repository guidance documents confirmation ownership and destructive-action behavior as needed.


# 07: Manage conditions and notes in Vue

**What to build:** Let the DM attach offered or custom conditions and free-text notes to creatures, remove individual tags, and resume with those statuses after reload.

**Blocked by:** 04 — Create, edit, and advance encounters in Vue.

**Status:** ready-for-agent

- [ ] Offered conditions and custom conditions can be added to the intended creature; free-text notes can be added through Other. Individual conditions and notes can be removed.
- [ ] Tags are trimmed, blank entries ignored, and case-insensitive duplicates prevented. Names, conditions, and notes containing markup-like content display as text rather than executable HTML.
- [ ] Changes use the combat module's named actions and central persistence, with saved tags restored after reload.
- [ ] Open pickers and search/input state belong to the UI and are not persisted. Pickers do not rewrite Vue-owned DOM through legacy widget code.
- [ ] Outside clicks dismiss pickers; Escape dismisses and returns focus to the trigger. The picker closes before running its action.
- [ ] Fresh-instance component tests cover offered/custom conditions, notes, duplicate prevention, removal, and text rendering. Sequencing checks protect close-before-action rather than merely checking the final state.
- [ ] Chromium verifies condition entry, browser dismissal/focus behavior, and readable picker/tag presentation without overflow at representative widths.
- [ ] Applicable checks pass, the legacy application and public deployment remain available, and repository guidance documents the migrated picker ownership and behavior as needed.


# 07: Manage conditions and notes in Vue

**What to build:** Let the DM attach offered or custom conditions and free-text notes to creatures, remove individual tags, and resume with those statuses after reload.

**Blocked by:** 04 — Create, edit, and advance encounters in Vue.

**Status:** resolved

- [x] Offered conditions and custom conditions can be added to the intended creature; free-text notes can be added through Other. Individual conditions and notes can be removed.
- [x] Tags are trimmed, blank entries ignored, and case-insensitive duplicates prevented. Names, conditions, and notes containing markup-like content display as text rather than executable HTML.
- [x] Changes use the combat module's named actions and central persistence, with saved tags restored after reload.
- [x] Open pickers and search/input state belong to the UI and are not persisted. Pickers do not rewrite Vue-owned DOM through legacy widget code.
- [x] Outside clicks dismiss pickers; Escape dismisses and returns focus to the trigger. The picker closes before running its action.
- [x] Fresh-instance component tests cover offered/custom conditions, notes, duplicate prevention, removal, and text rendering. Sequencing checks protect close-before-action rather than merely checking the final state.
- [x] Chromium verifies condition entry, browser dismissal/focus behavior, and readable picker/tag presentation without overflow at representative widths.
- [x] Applicable checks pass, the legacy application and public deployment remain available, and repository guidance documents the migrated picker ownership and behavior as needed.

## Answer

Implemented Vue-owned Conditions and Other pickers with offered/custom conditions, notes,
literal tag rendering, individual removal, and named combat actions with central persistence.
Picker/query state stays transient; the Vue patch removes the picker before its action/save.
Escape and apply return focus to Add; query updates reclamp growing panels to the viewport.

Verification: `npm run check:all` passed on Node 24.15.0 (76 legacy tests, 91 Vitest tests,
42 Chromium tests). Standards review found no violations; the spec review’s growing-picker
overflow finding was reproduced in Chromium, fixed, and re-reviewed with no remaining findings.
See the [migration map decision](../map.md#decisions-so-far).

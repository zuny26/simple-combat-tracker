# 01: Save profiles and show bookmark states

**What to build:** Let the DM bookmark a creature's reusable Name, AC, and Max HP, keep that saved profile across reloads and New Combat, and see whether each creature is unsaved, saved and matching, or saved with differences.

**Blocked by:** None (can start immediately).

**Status:** completed

- [x] Each creature row has an accessible bookmark action that immediately saves a new normalized name with only Name, AC, and Max HP; saving does not change the creature.
- [x] Profile identity trims surrounding whitespace, removes trailing whitespace-separated numeric suffixes, trims again, and compares case-insensitively. Normalization is idempotent: Goblin 2 3 becomes Goblin. Saved display names preserve capitalization without those suffixes. Goblin, goblin, spaced Goblin, and Goblin 2 share identity; R2D2 retains its digits. Manually typed names use the same rules.
- [x] Saving an equivalent name with identical AC and Max HP is a no-op, retaining exactly one profile without a confirmation. Until ticket 02 adds overwrite confirmation, saving differing stats leaves the existing profile unchanged.
- [x] Bookmark states reflect the current normalized identity and permanent characteristics after row edits and saving; capitalization, whitespace, numeric suffixes, initiative, damage taken, Temp HP, conditions, and notes do not produce a differing state.
- [x] Resolve the specification's visual-state TBD with three distinct appearances and accessible descriptions, usable across registered themes and supported viewports with the same DOM at each viewport.
- [x] Saved profiles use independently versioned browser storage with an injected storage boundary; reload and New Combat retain them without altering encounter or preference persistence. Malformed data or unavailable storage does not prevent encounter use.
- [x] Cover normalization, no-op saves, state transitions, and storage recovery at their owning seams. Verify actual UI saving followed by reload and New Combat in Chromium, and run the full required validation.

## Completed implementation

- `ProfileRegistry` uses a reactive Map keyed by normalized name for direct lookup; `createProfileRegistry` injects storage and exposes read-only state. The existing versioned storage format remains compatible.
- The bookmark appearances and labels are: outline / "Save profile", outline with an exclamation mark / "Update profile", and filled / "Profile saved".
- Desktop shows Bookmark, Duplicate, and Remove with shared button styling. Tablet and mobile place all three actions inside the three-dot menu, with their desktop icons to the left of the labels. Menus close before actions run.
- Profile saves leave creature values and encounter history unchanged. Overwrite confirmation remains scoped to ticket 02; autocomplete and deletion remain scoped to tickets 03 and 04.

## Validation

`npm run check:all` passed with Node 24.15.0: formatting, lint, strict type checking, 173 Vitest tests, production build, and 26 Chromium tests. Chromium verifies actual saving followed by reload and New Combat across all registered themes at 320px, 768px, 1400px, and 1600px. Standards and spec reviews found no remaining issues.

Implemented on `feat/saving-profiles` in commits `e38358f`, `58f58d6`, `fdea16f`, `9bc953f`, and `8ae2dfe`.

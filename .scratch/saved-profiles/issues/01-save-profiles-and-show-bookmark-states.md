# 01: Save profiles and show bookmark states

**What to build:** Let the DM bookmark a creature's reusable Name, AC, and Total HP, keep that saved profile across reloads and New Combat, and see whether each creature is unsaved, saved and matching, or saved with differences.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Each creature row has an accessible bookmark button that immediately saves a new normalized name with only Name, AC, and Total HP; saving does not change the creature.
- [ ] Profile identity trims surrounding whitespace, removes a trailing number separated by whitespace, trims again, and compares case-insensitively. Saved display names preserve capitalization without that suffix. Goblin, goblin, spaced Goblin, and Goblin 2 share identity; R2D2 retains its digits. Manually typed names use the same rules.
- [ ] Saving an equivalent name with identical AC and Total HP is a no-op, retaining exactly one profile without a confirmation. Until ticket 02 adds overwrite confirmation, saving differing stats leaves the existing profile unchanged.
- [ ] Bookmark states reflect the current normalized identity and permanent characteristics after row edits and saving; capitalization, whitespace, numeric suffixes, initiative, damage taken, Temp HP, conditions, and notes do not produce a differing state.
- [ ] Resolve the specification's visual-state TBD with three distinct appearances and accessible descriptions, usable across registered themes and supported viewports with the same DOM at each viewport.
- [ ] Saved profiles use independently versioned browser storage with an injected storage boundary; reload and New Combat retain them without altering encounter or preference persistence. Malformed data or unavailable storage does not prevent encounter use.
- [ ] Cover normalization, no-op saves, state transitions, and storage recovery at their owning seams. Verify actual UI saving followed by reload and New Combat in Chromium, and run the full required validation.

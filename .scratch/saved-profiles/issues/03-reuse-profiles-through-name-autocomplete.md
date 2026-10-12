# 03: Reuse profiles through Name autocomplete

**What to build:** Let the DM browse and filter saved profiles from a creature's existing Name field and apply a selected profile to that row, preserving encounter values and assigning an appropriate numbered name.

**Blocked by:** 01: Save profiles and show bookmark states.

**Status:** completed

- [x] Focusing an empty Name field shows every saved profile; typing filters with a case-insensitive substring match against normalized names, including partial and differently capitalized queries.
- [x] Selecting a suggestion fills the current creature's Name, AC, and Max HP without adding a row, using named combat actions to preserve encounter invariants and persistence.
- [x] Application preserves initiative, damage taken, Temp HP, conditions, and notes, except damage taken is capped at the resulting Max HP. Applying Max HP 10 to a creature with 15 damage taken leaves zero normal HP and preserves Temp HP; a blank row starts at full normal HP.
- [x] Name allocation compares normalized names against other creatures, excluding the row being filled. No match uses the saved base name; matches use the highest numeric suffix plus one, treating an unsuffixed name as one. Goblin and Goblin 3 produce Goblin 4; existing names remain unchanged.
- [x] Selecting the same profile in several rows is allowed. Their bookmarks match the base profile, and saving identical numbered creatures remains a no-op.
- [x] The autocomplete supports keyboard navigation and selection, Escape and outside dismissal, and normal Tab navigation without accidental application. Close the picker before applying the selection; maintain existing input-save, blur-sort, and HP draft behavior.
- [x] Suggestions remain usable without overflow across supported viewports and themes, using the same DOM at every viewport and rendering profile names as text.
- [x] Hide the autocomplete entirely when no saved profiles match the Name query; show it again when matches return, keeping focus in the Name field.
- [x] The autocomplete matches the Name input's exact width and left edge in every layout and follows input width changes while open.
- [x] Cover matching, name allocation, application, and preservation at their owning seams. Chromium verifies keyboard/focus behavior and saving a profile through the UI, reloading, starting New Combat, and reusing it through autocomplete. Run the full required validation.

## Completed implementation

- The existing Name field is an accessible combobox that browses saved profiles and filters normalized names by case-insensitive substring. Keyboard arrows and Enter select deliberately; Escape, outside interaction, blur, and Tab dismiss without accidental application. The picker closes before the combat action and persistence run.
- `combat.applyProfile` changes only Name, AC, and Max HP on the current creature. It preserves encounter values, caps damage at the resulting Max HP, and allocates numbered names from other normalized creature names, excluding the current row. Zero suffixes are handled correctly, and identical numbered profiles retain matching bookmarks and no-op saves.
- Empty results hide the picker instead of displaying “No matching profiles.” The panel uses the Name input's measured width and remains aligned as that width changes while open. Profile names render as text, and the DOM stays the same across viewports.

## Validation

`npm run check:all` passed with Node 24.15.0: formatting, lint, strict type checking, 183 Vitest tests, production build, and 29 Chromium tests. Coverage includes matching, allocation, application, preservation, picker closure before persistence, keyboard/focus behavior, actual UI saves followed by reload and New Combat, no-match dismissal and reopening, and exact panel width across all registered themes at 320px, 768px, 1400px, and 1600px, including resizing while the picker remains open. Standards and spec reviews found no remaining issues in the implementation.

Implemented on `feat/saving-profiles` in commits `dd31411`, `4febb23`, and `83afdef`.

# 03: Reuse profiles through Name autocomplete

**What to build:** Let the DM browse and filter saved profiles from a creature's existing Name field and apply a selected profile to that row, preserving encounter values and assigning an appropriate numbered name.

**Blocked by:** 01: Save profiles and show bookmark states.

**Status:** ready-for-agent

- [ ] Focusing an empty Name field shows every saved profile; typing filters with a case-insensitive substring match against normalized names, including partial and differently capitalized queries.
- [ ] Selecting a suggestion fills the current creature's Name, AC, and Max HP without adding a row, using named combat actions to preserve encounter invariants and persistence.
- [ ] Application preserves initiative, damage taken, Temp HP, conditions, and notes, except damage taken is capped at the resulting Max HP. Applying Max HP 10 to a creature with 15 damage taken leaves zero normal HP and preserves Temp HP; a blank row starts at full normal HP.
- [ ] Name allocation compares normalized names against other creatures, excluding the row being filled. No match uses the saved base name; matches use the highest numeric suffix plus one, treating an unsuffixed name as one. Goblin and Goblin 3 produce Goblin 4; existing names remain unchanged.
- [ ] Selecting the same profile in several rows is allowed. Their bookmarks match the base profile, and saving identical numbered creatures remains a no-op.
- [ ] The autocomplete supports keyboard navigation and selection, Escape and outside dismissal, and normal Tab navigation without accidental application. Close the picker before applying the selection; maintain existing input-save, blur-sort, and HP draft behavior.
- [ ] Suggestions remain usable without overflow across supported viewports and themes, using the same DOM at every viewport and rendering profile names as text.
- [ ] Cover matching, name allocation, application, and preservation at their owning seams. Chromium verifies keyboard/focus behavior and saving a profile through the UI, reloading, starting New Combat, and reusing it through autocomplete. Run the full required validation.

# Saved profiles specification

## Purpose

Let the DM reuse player characters, recurring NPCs, and monsters between encounters without re-entering their name, AC, and Total HP (max HP).

A **saved profile** contains those reusable values. A **creature** is a participant in the current encounter. Saving a profile and applying a profile to a creature are separate operations.

## Saved values and persistence

- Store only Name, AC, and Total HP as profile characteristics.
- Keep saved profiles in localStorage independently of the encounter and preferences. Saved profiles survive page reloads and New Combat.
- Do not save initiative, damage taken, Temp HP, conditions, or notes in a profile.
- Encounter edits do not automatically update saved profiles. Updating or deleting a saved profile does not change creatures already in the encounter.

## Name normalization and identity

Identify saved profiles by normalized name: trim surrounding whitespace, remove trailing whitespace-separated numeric suffixes, trim again, and compare without regard to capitalization. Preserve capitalization for display and omit the numeric suffixes from the saved profile name. Normalization is idempotent: `Goblin 2 3` becomes `Goblin`, and normalizing `Goblin` again leaves it unchanged.

For example, `Goblin`, `goblin`, `Goblin 2`, and Goblin surrounded by spaces identify the same saved profile. `R2D2` retains its digits because they are not separated by whitespace. The trailing-number rule also applies to names typed manually.

## Saving from a creature

Each creature row offers a star/bookmark button that saves its current Name, AC, and Total HP.

- If no profile has the normalized name, save a new profile immediately.
- If the profile already has the same AC and Total HP, do nothing. Differences in capitalization, surrounding whitespace, or the trailing numeric suffix do not create another profile.
- If either stat differs, show a confirmation popup identifying the profile and highlighting each proposed change with its existing and proposed values.
- Confirming updates the existing profile. Canceling leaves it unchanged. Neither action changes the creature.

For example, saving `Goblin 2` with AC 15 and Total HP 12 when `Goblin` already has AC 13 and Total HP 7 proposes updating that profile, showing `AC: 13 → 15` and `Total HP: 7 → 12`.

## Bookmark visual states

The bookmark icon must visually distinguish three states, using the same normalized-name identity as saving:

1. **Not saved**: No saved profile has the creature's normalized name.
2. **Saved and matching**: A saved profile has the creature's normalized name, and its AC and Total HP match the creature's values.
3. **Saved with differences**: A saved profile has the creature's normalized name, but its AC or Total HP differs from the creature's values.

Differences in capitalization, surrounding whitespace, or the trailing numeric suffix do not count as differences in permanent characteristics. Encounter-only values do not affect the bookmark state.

The state reflects the current creature and saved profile values, including after row edits, saving, and profile deletion. Use an outline bookmark labeled "Save profile" for not saved, a filled bookmark labeled "Profile saved" for saved and matching, and an outline bookmark containing an exclamation mark labeled "Update profile" for saved with differences. Desktop shows the bookmark beside Duplicate and Remove, with its label as an accessible name and tooltip. Tablet and mobile put the same labeled bookmark action inside the three-dot creature menu.

## Name autocomplete

Reuse profiles through the existing Name input rather than a separate add-from-profiles button.

- Focusing an empty Name field shows all saved profiles.
- Typing filters suggestions using a case-insensitive substring match against normalized names.
- Selecting a suggestion fills the current row's Name, AC, and Total HP. It does not create an additional row.
- Preserve that row's initiative, damage taken, Temp HP, conditions, and notes, subject to the existing rule that damage taken cannot exceed Total HP.
- A newly added blank row therefore starts at full normal HP when a profile is applied.
- Selecting the same saved profile in multiple rows is allowed; saving an identical profile remains a no-op.

When applying a suggestion, compare its base name with other creatures in the encounter using the same name normalization, excluding the row being filled. If there is no match, use the saved profile's base name. If there is a match, append the highest matching numeric suffix plus one, treating an unsuffixed name as number one. Leave existing creature names unchanged.

For example, if other rows contain `Goblin` and `Goblin 3`, selecting the Goblin profile names the current row `Goblin 4`. Saving that row still targets the Goblin profile.

If a creature has taken 15 damage and applying a profile lowers its Total HP to 10, cap damage taken at 10, leaving zero normal HP. Its Temp HP remains unchanged.

## Deleting profiles

Each autocomplete suggestion has a trashcan button. Activating it opens a confirmation popup identifying the profile to delete, without applying the suggestion to the current row.

Confirming removes only that saved profile and persists the deletion. Canceling leaves it available. Creatures already in the encounter remain unchanged.

## Acceptance criteria

- Save a creature, reload the page, and find its profile through the Name autocomplete.
- Start New Combat and find the same saved profile afterward.
- Save equivalent normalized names with identical stats and retain exactly one profile without an overwrite prompt.
- Show the appropriate bookmark state for an unsaved name, a saved profile with matching permanent characteristics, and a saved profile with different permanent characteristics.
- Save different AC or Total HP under an existing normalized name and see the precise changes before confirming or canceling.
- Apply a profile to a blank row and receive its saved values at full normal HP.
- Apply a profile to an existing row and preserve its other encounter values, with damage capped at the resulting Total HP.
- Apply the same profile in several rows and receive incremented encounter names based on the highest existing suffix.
- Save a numbered encounter creature and target its unnumbered profile.
- Find profiles with partial, differently capitalized names, and browse every profile from an empty Name field.
- Cancel deletion and retain the profile; confirm deletion and remove it without changing encounter creatures or applying the suggestion.

## Scope

This feature provides saved profiles through row bookmarking, Name autocomplete, overwrite confirmation, and confirmed deletion. Profile updates come from saving a creature's edited values. A separate profile editor, bulk party picker, additional saved characteristics, import/export, and synchronization across devices are outside this specification.

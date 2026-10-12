# Saving profiles

Saved profiles belong to the app-scoped registry in [profileRegistry.ts](../src/profiles/profileRegistry.ts). Each profile contains a reusable name, AC, and Max HP, independent of any creature's participation in an encounter. [main.ts](../src/main.ts) creates one registry alongside the combat instance and passes both the same injected storage boundary. They own separate state and storage keys.

## State and ownership

The registry owns a Vue-reactive `Map<string, SavedProfile>` and exposes it through read-only state. Named operations own registry mutations; `find`, `matching`, and `bookmarkState` provide read-only access and derived results. Each registry instance loads its own map when created.

| Value | Purpose |
| --- | --- |
| Map key | The normalized, lowercase profile identity. |
| `name` | The normalized profile name, retaining its original capitalization. |
| `ac` | AC stored as a string, including an empty string. |
| `maxHP` | Maximum normal HP stored as a number. |

Saving copies only these three profile fields into a new object. Creature IDs, initiative, damage, Temp HP, conditions, notes, and turn state never enter the registry. Later encounter edits cannot mutate a saved profile, and registry changes do not modify encounter creatures.

The registry uses Vue reactivity directly. The combat module imports the `SavedProfile` type and shared name-allocation helper, but does not depend on a registry instance. Applying a profile passes its values across that boundary through a named combat action.

## Name identity and lookup

[names.ts](../src/profiles/names.ts) defines the normalization shared by registry operations and encounter name allocation. `profileName` trims surrounding whitespace and removes a trailing whitespace-separated sequence of digits and whitespace. `profileIdentity` lowercases that result. For example, ` Goblin 2 3 ` and `goblin` both identify `goblin`, while `R2D2` retains its embedded digits. Repeated normalization leaves the same result.

The normalized identity allows multiple numbered encounter creatures to share one saved profile. Names differing only in capitalization, surrounding whitespace, or numeric suffixes cannot create separate registry entries. Using a `Map` also permits names such as `__proto__` and `constructor` without treating them as object properties.

`find(name)` performs an exact lookup by normalized identity. `matching(query)` normalizes the query and returns profiles whose normalized names contain it, in map insertion order. An empty normalized query returns all profiles. Neither operation changes state or writes storage.

## Saving and updating flow

`bookmarkState(creature)` derives the relationship between supplied creature values and the registry:

| Result | Meaning |
| --- | --- |
| `unsaved` | No profile exists for the normalized name. |
| `matching` | A profile exists with exactly equal AC and Max HP. |
| `different` | A profile exists, but AC or Max HP differs. |

Encounter-only fields have no effect on this comparison. Renaming a creature to a different identity changes which profile is compared; it does not rename or remove the previously saved profile.

`save(creature)` follows this sequence:

1. Normalize the supplied name.
2. Return if the normalized name is empty or its identity already has a profile, whether matching or different.
3. Insert a new object containing the normalized name, AC, and Max HP.
4. Persist the complete registry.

Conflicting values therefore require an explicit `overwrite(creature)` call. Overwrite looks up the existing profile and proceeds only when its state is `different`. It replaces AC and Max HP while preserving the saved name and capitalization, then persists the registry. Missing profiles and equivalent values produce no mutation or storage write.

For example, saving `Goblin 2` with AC `13` and Max HP `7` creates `Goblin`. Saving `goblin 3` with AC `15` leaves that profile unchanged. Overwriting with those values updates the saved AC to `15`; the saved name remains `Goblin`, and neither encounter creature changes.

## Applying a profile to combat

`combat.applyProfile(id, profile)` in [combat.ts](../src/combat/combat.ts) ends any active edit group and delegates a single update to `editCreature`. It supplies only name, AC, and Max HP. The combat action retains the creature's ID, initiative, Temp HP, conditions, and notes, and clamps existing damage to the resulting Max HP. Applying a profile to a new undamaged creature gives it full normal HP; applying one to an existing creature preserves its damage within that limit.

`allocateProfileName` compares the profile identity against other encounter creatures, excluding the target creature. With no matches it uses the supplied profile name. Otherwise it adds a suffix one greater than the largest existing suffix, treating an unsuffixed matching name as number one. Existing `Goblin` and `Goblin 3` creatures therefore cause the next application to use `Goblin 4`.

An effective application uses the normal combat history and persistence flow, so all changed values and any clamped damage form one undoable action. Applying a profile does not save or overwrite registry data. Likewise, undoing or redoing encounter changes does not restore registry entries; the relationship returned by `bookmarkState` is derived again from the current values. See [combat history](combat-history.md) for checkpoint ownership.

## Persistence, recovery, and deletion

The registry uses the `EncounterStorage` interface from [persistence.ts](../src/combat/persistence.ts), with optional storage for an in-memory instance. Browser storage access is deferred through `createBrowserStorage`, allowing both reads and writes to be caught even when access to `localStorage` itself throws.

The key `dnd-saved-profiles-v1` stores the complete registry as `{ version: 1, profiles: [...] }`. Map keys are reconstructed from profile names when loading. Loading requires version one and a profile array; each entry must have a nonempty, already-trimmed string name, string AC, and finite nonnegative numeric Max HP. Names are then normalized, and empty normalized names or duplicate identities invalidate the complete registry. Unknown profile fields are discarded when valid entries are copied into memory.

Missing data, malformed JSON, unsupported versions, invalid entries, duplicate identities, and read failures all start an empty registry. Loading performs no repair write. A later effective mutation writes the current valid registry. Write failures leave the mutation usable in memory, and a later successful mutation saves the complete current map, including earlier changes whose writes failed.

`delete(name)` removes only the entry with that normalized identity and persists if an entry existed. Deleting a missing profile does nothing. Deleting the last profile writes an empty versioned array. Deletion leaves encounter creatures intact, and their profile relationships are recalculated from the remaining registry.

Registry writes affect only the profile key. Encounter reset, removal, and history restoration leave saved profiles intact; saving, overwriting, or deleting profiles leaves encounter and preference storage intact.

## Behavioral coverage

[Registry tests](../test/component/profileRegistry.test.ts) cover field isolation, normalized identity, conflict handling, explicit overwrite, lookup, deletion, storage round trips, malformed data, and storage failures. [Combat tests](../test/component/combat.test.ts) cover profile application, name allocation, preservation of encounter data, damage clamping, and undo of the applied change.

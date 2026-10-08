# 02: Introduce isolated combat instances and named actions

**What to build:** Provide an independent encounter that can be created, edited, and progressed through named combat actions, without callers coordinating mutation, HP invariants, or active-creature reassignment. Introduce this beside the runnable legacy application as the expansion step of the migration.

**Blocked by:** 01 — Establish Vite tooling and pushed-commit verification.

**Status:** ready-for-agent

- [ ] Each application or test creates a fresh combat instance. Callers read observable state and invoke named actions; independent instances cannot leak state into one another. Combat rules have no Vue or browser-global dependency, and Vue integration uses built-in reactivity.
- [ ] Actions support creation, editing, duplication, removal, conditions, notes, damage, healing, start, advancement, and reset. UI callers never capture a previous turn index to make removal or parking safe.
- [ ] Display order uses descending finite numeric initiative and stable case-insensitive name ties. Blank, non-numeric, and non-finite initiative park creatures in insertion order; zero and negative finite initiative remain eligible. Normal ordering is derived.
- [ ] Start selects the first eligible creature at round one, or stays in pre-combat when none are eligible. Next advances and increments the round on wrap, including downed creatures. Reordering follows the active creature by identity.
- [ ] Removing or parking the active creature selects its successor using the previous turn-order position, wraps when necessary without increasing the round, and returns to pre-combat with round zero when no eligible creature remains.
- [ ] Current HP is derived from remaining normal HP plus temporary HP. Damage consumes temporary HP first and stops normal HP at zero; healing restores normal HP up to maximum without changing temporary HP. Maximum-HP changes clamp accumulated damage. Unconfigured HP is distinguishable from downed HP.
- [ ] Duplication allocates a unique identity, copies initiative/AC/maximum HP, inserts after the source before deriving order, and uses increasing numeric name suffixes. Blank names stay blank; copies have full normal HP, zero temporary HP, and no conditions or notes.
- [ ] Conditions and notes are trimmed, nonblank, case-insensitively unique tags. Reset clears creatures and progression. Public behavior supports distinguishing untouched empty creatures from meaningful encounter data.
- [ ] Public-interface Vitest tests cover these rules and meaningful edge cases without depending on legacy singleton or renderer interfaces. The legacy application remains available and uses its own single state owner.
- [ ] Applicable checks pass and repository guidance explains instance ownership, named actions, independent rules, and the transitional architecture.


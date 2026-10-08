# 02: Introduce isolated combat instances and named actions

**What to build:** Provide an independent encounter that can be created, edited, and progressed through named combat actions, without callers coordinating mutation, HP invariants, or active-creature reassignment. Introduce this beside the runnable legacy application as the expansion step of the migration.

**Blocked by:** 01 — Establish Vite tooling and pushed-commit verification.

**Status:** resolved

- [x] Each application or test creates a fresh combat instance. Callers read observable state and invoke named actions; independent instances cannot leak state into one another. Combat rules have no Vue or browser-global dependency, and Vue integration uses built-in reactivity.
- [x] Actions support creation, editing, duplication, removal, conditions, notes, damage, healing, start, advancement, and reset. UI callers never capture a previous turn index to make removal or parking safe.
- [x] Display order uses descending finite numeric initiative and stable case-insensitive name ties. Blank, non-numeric, and non-finite initiative park creatures in insertion order; zero and negative finite initiative remain eligible. Normal ordering is derived.
- [x] Start selects the first eligible creature at round one, or stays in pre-combat when none are eligible. Next advances and increments the round on wrap, including downed creatures. Reordering follows the active creature by identity.
- [x] Removing or parking the active creature selects its successor using the previous turn-order position, wraps when necessary without increasing the round, and returns to pre-combat with round zero when no eligible creature remains.
- [x] Current HP is derived from remaining normal HP plus temporary HP. Damage consumes temporary HP first and stops normal HP at zero; healing restores normal HP up to maximum without changing temporary HP. Maximum-HP changes clamp accumulated damage. Unconfigured HP is distinguishable from downed HP.
- [x] Duplication allocates a unique identity, copies initiative/AC/maximum HP, inserts after the source before deriving order, and uses increasing numeric name suffixes. Blank names stay blank; copies have full normal HP, zero temporary HP, and no conditions or notes.
- [x] Conditions and notes are trimmed, nonblank, case-insensitively unique tags. Reset clears creatures and progression. Public behavior supports distinguishing untouched empty creatures from meaningful encounter data.
- [x] Public-interface Vitest tests cover these rules and meaningful edge cases without depending on legacy singleton or renderer interfaces. The legacy application remains available and uses its own single state owner.
- [x] Applicable checks pass and repository guidance explains instance ownership, named actions, independent rules, and the transitional architecture.


## Answer

Added independent typed encounters through `createCombat()` with named actions for
editing, duplication, removal, tags, HP, progression, and reset. Actions own departure
reassignment and HP invariants. Ordering and HP are derived, and meaningful-data reads
support later UI confirmations. Numeric duplicate suffixes continue increasing even
beyond the safe-integer range. IDs remain unique across resets in each instance.

`createVueCombat()` wraps owned state with Vue built-in reactivity and exposes a deep
read-only state view. Combat rules and the core factory have no Vue/browser dependency.
The legacy app remains the only running combat owner; persistence and UI integration
remain later tickets. Updated repository guidance explains this expansion boundary.

Validation with Node 24.15: lint, strict typechecking, all legacy test files, 20 Vitest
cases (19 new combat/observable-state cases), production build, and 33 Chromium cases
passed. Playwright required permission to start its local server outside the sandbox.
Each new behavior slice was verified failing before implementation; additional regression
cases cover name ties, downed turns, parked duplicates, and independent tag arrays.

Decision summary: [migration map — Decisions-so-far](../map.md#decisions-so-far).

### Standards review

No documented-standard violations or actionable baseline smells found (0 findings).
Reviewed instance ownership, framework boundaries, derived state, tests, and tracker docs.

### Spec review

One P2 finding: fully absorbed large finite damage could erase existing injuries through
floating-point rounding. Corrected by computing unabsorbed damage before adding to the
accumulator. A public-interface test reproduced the failure before the fix and now passes.
The reviewer confirmed resolution; no missing requirements, scope creep, or remaining
incorrect implementations found. Reviewed against starting commit `3516e4d`.

Final review: Standards 0 findings; Spec 1 finding corrected, 0 remaining.
The full legacy/Vitest suite passed again after the correction.

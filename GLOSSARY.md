# Combat Tracker

A tracker for a DM to manage creatures, hit points, conditions, and turns in a combat encounter.

## Language

**Creature**: An encounter participant, including player characters and monsters. _Avoid_: Entity, combatant

**Initiative**: A creature's numeric priority in the turn order; higher initiative acts earlier, with names breaking ties alphabetically.

**Parked creature**: A creature with blank, nonnumeric, or non-finite initiative; remains visible without taking turns.

**Active creature**: The creature whose turn is highlighted. _Avoid_: Active row

**Round**: A cycle through the creatures in the turn order; starting combat begins round one and advancing past the last creature begins the next round.

**Pre-combat**: The state before combat starts, with no active creature and round zero.

**Total HP**: A creature's maximum normal hit points, excluding Temp HP.

**Temp HP**: Additional hit points consumed before normal HP when taking damage.

**Current HP**: Remaining normal HP plus Temp HP.

**Damage**: An amount deducted from Temp HP first, then normal HP, stopping at zero.

**Heal**: An amount restored to normal HP up to Total HP, leaving Temp HP unchanged.

**Condition**: An offered or custom named status attached to a creature.

**Note**: A free-text tag in the Other field.

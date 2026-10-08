# Combat Tracker

A tracker for a DM to manage creatures, hit points, conditions, and turns in one encounter.

## Language

**Creature**:
A participant in the encounter, including player characters and monsters.
_Avoid_: Entity, combatant

**Initiative**:
A creature's numeric priority in the turn order; higher initiative acts earlier, with names breaking ties alphabetically.

**Parked creature**:
A creature with blank or non-numeric initiative that remains visible but does not participate in the turn order.

**Active creature**:
The creature whose turn is currently highlighted during combat.
_Avoid_: Active row

**Round**:
A cycle through the creatures in the turn order; starting combat begins round one and advancing past the last creature begins the next round.

**Pre-combat**:
The state before combat starts, with no active creature and round zero.

**Current HP**:
The tracker's displayed hit-point total, including remaining normal hit points and temporary hit points.

**Condition**:
A named status attached to a creature, chosen from the offered list or entered as custom text.

**Note**:
A free-text tag attached to a creature in the Other field.

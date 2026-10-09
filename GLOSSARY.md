# Combat Tracker

A DM manages creatures, HP, conditions, and turns in one encounter.

## Language

**Creature**:
An encounter participant, including player characters and monsters.
_Avoid_: Entity, combatant

**Initiative**:
Numeric turn priority, descending; names break ties alphabetically without regard to case.

**Parked creature**:
A creature with blank, nonnumeric, or non-finite initiative; visible without taking turns.

**Active creature**:
The creature whose turn is highlighted.
_Avoid_: Active row

**Round**:
One cycle through the turn order; combat starts at round one.

**Pre-combat**:
No active creature and round zero.

**Current HP**:
Remaining normal HP plus temporary HP.

**Condition**:
An offered or custom named status attached to a creature.

**Note**:
A free-text tag in the Other field.

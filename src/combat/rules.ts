import type { ReadonlyCreature } from './combat';

export function initiative(value: string): number | null {
  if (value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function turnOrder(creatures: readonly ReadonlyCreature[]): ReadonlyCreature[] {
  return creatures.filter(creature => initiative(creature.init) !== null).sort((a, b) =>
    (initiative(b.init)! - initiative(a.init)!) || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

export function displayOrder(creatures: readonly ReadonlyCreature[]): ReadonlyCreature[] {
  return [...turnOrder(creatures), ...creatures.filter(creature => initiative(creature.init) === null)];
}

export function hp(creature: ReadonlyCreature) {
  const current = creature.maxHP - creature.damageTaken + creature.tempHP;
  return { current, configured: creature.maxHP > 0, downed: creature.maxHP > 0 && current === 0 };
}

function baseName(name: string): string {
  return (name.match(/^(.*?)\s+\d+\s*$/)?.[1] ?? name).trim();
}

export function duplicateName(source: string, creatures: readonly ReadonlyCreature[]): string {
  const base = baseName(source);
  if (!base) return '';
  let maximum = 1n;
  for (const creature of creatures) {
    if (baseName(creature.name).toLowerCase() !== base.toLowerCase()) continue;
    const suffix = creature.name.match(/\s+(\d+)\s*$/)?.[1];
    const number = suffix ? BigInt(suffix) : 1n;
    if (number > maximum) maximum = number;
  }
  return `${base} ${maximum + 1n}`;
}

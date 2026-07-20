// hp.js — pure HP model (D&D 5e temp-first). Operates on creature objects.
//
// Stored per creature: maxHP, tempHP, damageTaken (accumulator).
// Current HP is NEVER stored — always derived:
//   Current HP = max(0, maxHP - damageTaken) + tempHP

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// Keep damageTaken within [0, maxHP]. Call after any change to damageTaken OR maxHP,
// so lowering Max can't leave a stale over-Max accumulator and raising Max lifts Current HP.
export function clampDamage(c) {
  const max = Math.max(0, c.maxHP || 0);
  c.damageTaken = clamp(c.damageTaken || 0, 0, max);
}

// Derived Current HP for display. Floors the Max-portion at 0; overheal via Temp only.
export function currentHP(c) {
  const max = Math.max(0, c.maxHP || 0);
  const dmg = clamp(c.damageTaken || 0, 0, max);
  const temp = Math.max(0, c.tempHP || 0);
  return Math.max(0, max - dmg) + temp;
}

// True when displayed Current HP is exactly 0 (Max-portion depleted AND no Temp HP).
// Requires Max HP to actually be set — a freshly-added creature with maxHP 0
// hasn't been "reduced to 0", it just hasn't had its stats filled in yet.
export function isDowned(c) {
  return (c.maxHP || 0) > 0 && currentHP(c) === 0;
}

// Damage (on Enter): temp-first. Subtract from Temp HP, overflow to damageTaken (clamped).
// e.g. Temp 5, 8 damage -> Temp 0, +3 to damageTaken. `n` is assumed > 0.
export function applyDamage(c, n) {
  let remaining = n;
  const temp = Math.max(0, c.tempHP || 0);
  const absorbed = Math.min(temp, remaining);
  c.tempHP = temp - absorbed;
  remaining -= absorbed;
  if (remaining > 0) {
    c.damageTaken = (c.damageTaken || 0) + remaining;
  }
  clampDamage(c);
}

// Healing (on Enter): reduce damageTaken only, floored at 0. Never touches Temp HP.
// `n` is assumed > 0.
export function applyHealing(c, n) {
  c.damageTaken = (c.damageTaken || 0) - n;
  clampDamage(c);
}

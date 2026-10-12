export function profileName(name: string): string {
  return name
    .trim()
    .replace(/\s[\s\d]+$/, '')
    .trim();
}

export function profileIdentity(name: string): string {
  return profileName(name).toLowerCase();
}

export function allocateProfileName(base: string, otherNames: readonly string[]): string {
  const matches = otherNames.filter((name) => profileIdentity(name) === profileIdentity(base));
  if (!matches.length) return base;
  let maximum = 0n;
  for (const name of matches) {
    const suffix = name.match(/\s+(\d+)\s*$/)?.[1];
    const number = suffix ? BigInt(suffix) : 1n;
    if (number > maximum) maximum = number;
  }
  return `${base} ${maximum + 1n}`;
}

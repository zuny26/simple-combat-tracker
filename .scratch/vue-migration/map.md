# Vue migration map

## Notes

- [Specification](spec.md) and [migration plan](../../docs/migrations/vue-migration.md).
- Milestone 1 retains the legacy application as the only running combat owner.

## Decisions-so-far

- [01: Build and verification foundation](issues/01-build-and-verification-foundation.md):
  Vite serves/builds the legacy entry with the expected `/simple-combat-tracker/` base.
  Strict Vue/TypeScript checking runs separately. Vitest/Vue Test Utils exercise a
  test-only SFC; legacy unit/DOM and Chromium checks remain active. Acceptance uses
  the generated artifact, and pushed commits run the same complete verification.
  Public deployment is unchanged. The [per-test audit](../../docs/migrations/test-audit.md)
  records each test's responsibility and migration decision.

- [02: Isolated combat actions](issues/02-isolated-combat-actions.md):
  The typed factory owns independent encounters and named actions, derives order/HP,
  and handles active-creature departure internally. A Vue adapter adds built-in
  reactivity and a read-only state view. The legacy app remains the running owner;
  typed combat is an independently tested expansion alongside it.

## Fog

- Actual Pages configuration, published URL, and default branch must be verified before
  cutover. This milestone does not change remote hosting settings.
- New-format persistence and Vue encounter workflows remain future tickets.

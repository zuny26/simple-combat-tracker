# Test behavior at its owning seam

Favor state/component tests for rules and edge cases, with a small Chromium suite
for workflows and browser fidelity. Choose coverage by responsibility, not a quota.

| Seam | Responsibility |
| --- | --- |
| Vitest combat actions/state | HP, ordering, turns, tags, duplication, reset |
| Injected storage | Validation, round trips, recovery, read/write failures |
| Vue Test Utils | Fresh instances; field/action wiring and visible behavior |
| Playwright production build | Complete workflows, focus, Tab, dismissal, pre-paint presentation, reloads, layout |

Assert public behavior rather than private Vue internals or exact row-node identity.
Chromium wins when simulated DOM behavior disagrees. Preserve checks that observe
menus/pickers closing before actions, saves, or confirmation; end-state checks
cannot prove sequencing.

Reload through real UI saves without reseeding storage. Assert visibility, bounds,
and overflow relationally, without pixel baselines. Acceptance blocks Google Fonts
and proves fallback-font geometry only. `test/acceptance/fixtures.js` holds the
shared overflow assertion; keep storage setup out of it.

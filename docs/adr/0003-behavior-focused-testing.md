# Concentrate tests on combat and UI behavior

Use Vitest for combat and persistence tests, Vue Test Utils for isolated UI tests, and Playwright for acceptance tests that require a real browser. Target approximately 90% state/component tests and 10% acceptance tests as a distribution of useful tests, rather than retaining the current suite wholesale or enforcing a numerical coverage threshold.

Evaluate existing tests by the behavior and failure modes they protect. Replace or remove tests tied to obsolete rendering and event-routing details as those implementations migrate. Focus, Tab, and layout assertions require real-browser fidelity when they are retained; essential guarantees must not be moved into simulated DOM tests merely to meet the target distribution.

The acceptance suite covers creating and advancing an encounter, editing initiative with usable Tab/click focus, damage/healing with reload persistence, conditions and destructive-action confirmation, desktop/mobile layout and menu accessibility, and the production artifact under the GitHub Pages base path. State/component tests own permutations and edge cases, including HP calculations, turn reassignment, duplication, validation, and confirmation outcomes.

The final verification command runs lint, Vue/TypeScript checking, Vitest, a production build, and the browser acceptance suite against that build. Existing tests may remain temporarily while their responsibilities migrate, but obsolete tests are not a permanent acceptance requirement.

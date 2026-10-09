# Concentrate tests on combat and UI behavior

Use Vitest for combat and persistence tests, Vue Test Utils for isolated UI tests, and Playwright for acceptance tests that require a real browser. Favor state/component tests for rules, validation, and action wiring, with a small browser suite for complete workflows and browser fidelity. Choose coverage by responsibility rather than a numerical quota.

Evaluate tests by the behavior and failure modes they protect. Exercise public actions, injected storage, UI inputs/outputs, and visible behavior rather than private implementation details. Focus, Tab, dismissal, and layout assertions belong in Chromium; simulated DOM checks cannot establish browser fidelity.

The acceptance suite covers creating and advancing an encounter, editing initiative with usable Tab/click focus, damage/healing with reload persistence, conditions and destructive-action confirmation, desktop/mobile layout and menu accessibility, and the production artifact under the GitHub Pages base path. State/component tests own permutations and edge cases, including HP calculations, turn reassignment, duplication, validation, and confirmation outcomes.

The complete verification command runs lint, Vue/TypeScript checking, Vitest, a production build, and the browser acceptance suite against that build. Reload checks use real UI saves, and layout checks assert visibility and bounds relationally without pixel baselines. Retain sequencing checks that observe menus/pickers closing before actions, saves, or confirmation; end-state assertions alone cannot establish that guarantee.

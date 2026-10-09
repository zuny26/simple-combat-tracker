# 09: Retire legacy code and consolidate verification

**What to build:** Make the complete Vue tracker the maintained local application and give maintainers one reliable verification workflow, while preserving the existing public deployment until production cutover.

**Blocked by:** 05 — Apply damage and healing through explicit Vue controls; 07 — Manage conditions and notes in Vue; 08 — Complete responsive menus, themes, and help preferences.

**Status:** resolved

- [x] The Vue tracker completes creature editing, HP, turns, duplication, confirmation, conditions, notes, menus, preferences, and responsive workflows with one combat state owner.
- [x] Transitional bridges, obsolete manual DOM rendering/delegated routing, and the legacy singleton implementation are removed only after their useful behavior coverage has replacements. Retirement does not disrupt the existing public deployment mechanism before cutover.
- [x] The test audit is reconciled: meaningful rules and failure cases are retained or ported, obsolete implementation contracts and custom legacy bootstrapping are retired, and redundant browser permutations are consolidated where lower-seam coverage is sufficient.
- [x] Combat tests use public actions/observable state; persistence tests use the storage interface; mounted Vue tests assert inputs/outputs and visible behavior. No assertions depend on private Vue internals, deleted routing classes, renderer calls, or exact row-node identity.
- [x] A small Chromium suite covers encounter creation/round advancement, usable initiative editing with Tab/click, damage/healing with reload, conditions/destructive confirmation, responsive layout/menu accessibility, and production asset loading at the configured Pages base path.
- [x] Browser tests serve the generated production artifact at the configured path rather than relying on a development server at the origin root. Reload fixtures do not overwrite saved state. Actual focus, Tab, dismissal, and geometry remain browser checks.
- [x] The final verification command runs ESLint, explicit strict Vue/TypeScript checking, Vitest, a production build, and acceptance against that checked build. Push CI runs these checks without deploying the replacement yet.
- [x] Test distribution follows responsibilities rather than a numerical quota; no pixel baselines or mandatory browser expansion are introduced.
- [x] Repository guidance accurately describes development/build/preview/check commands, combat actions and ownership, keyed UI lifecycle, persistence/recovery, independent preferences, and testing seams. Applicable user-text, CSS, theme, responsive, and browser-fidelity conventions and issue/domain pointers remain, with links to ADR rationale.


## Answer

Vue is the maintained `index.html` entry at `/simple-combat-tracker/`; Vite builds one
application. Removed the legacy singleton, manual DOM rendering/routing/widgets, parallel
Vue entry, node:test harnesses and obsolete checks. The theme registry remains shared by
Vue's desktop/mobile controls. The [test audit](../../../../docs/migrations/test-audit.md#ticket-09-completed-retirement-and-current-coverage)
records completed replacements and retirements, including added public-interface coverage
for fully absorbed ordinary damage, pre-combat departure, and responsive captions.

Vitest owns combat/storage/mounted behavior; 12 Chromium cases cover production-path
loading, initiative/name Tab/click, explicit HP/reload, tags, modal/menu accessibility,
preferences/pre-paint/storage-getter failure, and representative layouts. Reload workflows
use actual UI saves without storage reseeding. `check:all` and existing push CI verify the
production artifact without deploying. AGENTS.md documents the maintained architecture,
commands, lifecycle, storage/recovery, conventions, and testing seams.

Validation: `npm run check:all` passed with Node 24.15.0: ESLint, strict vue-tsc,
97 Vitest cases across six files, production build, and 12 Chromium acceptance cases.
The root acceptance check first failed against the old legacy entry and then passed with
Vue. Focus/layout coverage stays in Chromium; no pixel baselines or test quotas were added.

Standards review: 0 findings. Spec review: 0 findings. Both reviewed the working changes
against pre-implementation commit `c85b0860505212c99c977c7cfe92f602d21fe4f0`.

Recorded in the [migration map](../map.md#decisions-so-far). Changes remain on the migration
branch with no push, publishing job, or hosting-settings change. Keep this source off the
existing raw-source deployment branch until ticket 10 verifies Pages and publishes the
checked artifact. No new editing departures were introduced.

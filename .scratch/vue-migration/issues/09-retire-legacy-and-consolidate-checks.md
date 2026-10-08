# 09: Retire legacy code and consolidate verification

**What to build:** Make the complete Vue tracker the maintained local application and give maintainers one reliable verification workflow, while preserving the existing public deployment until production cutover.

**Blocked by:** 05 — Apply damage and healing through explicit Vue controls; 07 — Manage conditions and notes in Vue; 08 — Complete responsive menus, themes, and help preferences.

**Status:** ready-for-agent

- [ ] The Vue tracker completes creature editing, HP, turns, duplication, confirmation, conditions, notes, menus, preferences, and responsive workflows with one combat state owner.
- [ ] Transitional bridges, obsolete manual DOM rendering/delegated routing, and the legacy singleton implementation are removed only after their useful behavior coverage has replacements. Retirement does not disrupt the existing public deployment mechanism before cutover.
- [ ] The test audit is reconciled: meaningful rules and failure cases are retained or ported, obsolete implementation contracts and custom legacy bootstrapping are retired, and redundant browser permutations are consolidated where lower-seam coverage is sufficient.
- [ ] Combat tests use public actions/observable state; persistence tests use the storage interface; mounted Vue tests assert inputs/outputs and visible behavior. No assertions depend on private Vue internals, deleted routing classes, renderer calls, or exact row-node identity.
- [ ] A small Chromium suite covers encounter creation/round advancement, usable initiative editing with Tab/click, damage/healing with reload, conditions/destructive confirmation, responsive layout/menu accessibility, and production asset loading at the configured Pages base path.
- [ ] Browser tests serve the generated production artifact at the configured path rather than relying on a development server at the origin root. Reload fixtures do not overwrite saved state. Actual focus, Tab, dismissal, and geometry remain browser checks.
- [ ] The final verification command runs ESLint, explicit strict Vue/TypeScript checking, Vitest, a production build, and acceptance against that checked build. Push CI runs these checks without deploying the replacement yet.
- [ ] Test distribution follows responsibilities rather than a numerical quota; no pixel baselines or mandatory browser expansion are introduced.
- [ ] Repository guidance accurately describes development/build/preview/check commands, combat actions and ownership, keyed UI lifecycle, persistence/recovery, independent preferences, and testing seams. Applicable user-text, CSS, theme, responsive, and browser-fidelity conventions and issue/domain pointers remain, with links to ADR rationale.


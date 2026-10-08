# Migrate the combat tracker to a static Vue application

Status: ready-for-agent

## Problem Statement

The DM needs to manage one encounter reliably while editing creatures, applying HP changes, and advancing turns. The existing browser-only tracker provides those workflows, but its shared mutable singleton, manual rendering, and delegated event routing make further development depend on careful coordination of state, persistence, and DOM updates. Rebuilding editable rows can disrupt typing and focus, and the current tests include contracts specific to that rendering machinery.

The project needs a maintainable, typed UI and isolated behavior tests while preserving the combat rules and a usable editing experience. The migration must keep each development milestone runnable and leave the public tracker available until the replacement is verified.

## Solution

Deliver the same single-encounter, browser-only tracker as a Vue Composition API application with strict TypeScript and Vite. Keep combat data local, preserve the existing appearance and interactions where practical, and support static hosting on GitHub Pages.

An app-scoped combat module exposes named actions and observable state. Independent combat rules, centrally coordinated persistence, and UI-owned interaction state replace direct singleton mutation and manual DOM orchestration. Incremental milestones establish tooling, migrate combat and persistence, deliver complete Vue workflows, finish widgets and tests, and finally cut over the public deployment to the checked production artifact.

## User Stories

1. As a DM, I want to open the tracker without an account or backend, so that I can manage an encounter using only my browser.
2. As a DM, I want to add a creature with empty editable fields, so that I can enter its encounter details quickly.
3. As a DM, I want to edit a creature's name, initiative, AC, maximum HP, and temporary HP, so that the encounter reflects the creatures at the table.
4. As a DM, I want numeric initiative sorted from highest to lowest, so that I can read the turn order directly.
5. As a DM, I want equal initiatives ordered by name without regard to case, so that ties behave consistently.
6. As a DM, I want creatures with blank or non-numeric initiative parked below the turn order, so that I can prepare creatures without giving them a turn.
7. As a DM, I want zero and negative numeric initiatives to participate in combat, so that valid initiative values are retained.
8. As a DM, I want parked creatures to retain their insertion order, so that unfinished entries remain predictable.
9. As a DM, I want initiative and name edits saved as I type and rows sorted on blur when practical, so that entering values remains stable while my work is preserved.
10. As a DM, I want to move between editable fields with Tab or a click without losing values, so that I can update several creatures efficiently.
11. As a DM, I want combat to start at round one with the highest-priority creature active, so that the first turn is clear.
12. As a DM, I want Start to leave an encounter in pre-combat when every creature is parked, so that combat does not begin without a turn order.
13. As a DM, I want Next to advance through eligible creatures and increase the round on wrap, so that I can track encounter progression.
14. As a DM, I want the active creature followed by identity when initiative or names change, so that reordering does not change whose turn it is.
15. As a DM, I want removal or parking of the active creature to select the next creature using its previous position, so that progression remains predictable.
16. As a DM, I want the active creature to wrap to the beginning when the last eligible creature leaves, so that combat can continue with those remaining.
17. As a DM, I want an encounter with no eligible creatures to return to pre-combat with round zero, so that the tracker does not display an invalid turn.
18. As a DM, I want downed creatures to remain in the turn order, so that I decide how their turns are handled.
19. As a DM, I want current HP derived from maximum HP, accumulated damage, and temporary HP, so that the displayed total stays consistent.
20. As a DM, I want damage to consume temporary HP before normal HP and stop at zero, so that damage follows the tracker's existing rules.
21. As a DM, I want healing to restore normal HP up to maximum HP without changing temporary HP, so that healing does not create extra temporary HP.
22. As a DM, I want maximum HP changes to clamp accumulated damage and immediately update current HP, so that revised stats produce a valid total.
23. As a DM, I want unconfigured HP visually distinguished from a downed creature, so that unfinished entries do not look defeated.
24. As a DM, I want to type a pending adjustment and explicitly choose Damage or Heal, so that typing or pressing Enter cannot accidentally change HP.
25. As a DM, I want pending adjustments cleared after applying them and excluded from saved combat data, so that an unapplied amount cannot become an encounter fact.
26. As a DM, I want to duplicate a creature's initiative, AC, and maximum HP with a distinct identity and numbered name, so that I can prepare groups quickly.
27. As a DM, I want duplicates to start with full normal HP, no temporary HP, and no conditions or notes, so that a fresh creature does not inherit another's injuries or statuses.
28. As a DM, I want meaningful creature removal confirmed and untouched empty entries removable immediately, so that I can discard mistakes without accidentally losing encounter data.
29. As a DM, I want cancelling a destructive action to retain the encounter, so that reviewing a confirmation does not itself change data.
30. As a DM, I want to choose offered conditions or enter custom conditions and remove them individually, so that I can represent the statuses used at my table.
31. As a DM, I want to add and remove free-text notes in the Other field, so that I can retain encounter reminders.
32. As a DM, I want blank tags ignored and case-insensitive duplicates prevented, so that conditions and notes remain readable.
33. As a DM, I want New Combat to confirm when meaningful data would be lost and then reset the encounter to pre-combat, so that I can safely begin another fight.
34. As a DM, I want my encounter and progression restored after reload, so that I can resume without re-entering data.
35. As a DM, I want the tracker to remain usable when saved data is invalid or storage is unavailable, so that storage failures do not prevent running a fight.
36. As a DM, I want my selected theme and help preference retained independently of combat reset, so that starting a fight does not reset my preferences.
37. As a DM, I want the saved theme and dismissed help applied before paint, so that opening the tracker does not flash the default presentation.
38. As a DM, I want to dismiss help and reopen it from the available controls, so that instructions are available when needed.
39. As a DM, I want desktop and mobile controls to provide the same encounter actions, so that I can use the tracker on either screen size.
40. As a DM, I want menus and pickers usable with keyboard dismissal and outside clicks, so that temporary UI does not obstruct encounter work.
41. As a DM, I want menus to close before opening confirmations or applying their actions, so that overlays do not conflict.
42. As a DM, I want readable fields, tags, and menus without viewport overflow, so that I can manage an encounter on representative desktop and mobile widths.
43. As a DM, I want names, conditions, and notes displayed as text, so that entered content cannot become executable markup.
44. As a DM, I want the existing public tracker available during development, so that an unfinished replacement does not interrupt access.
45. As a DM, I want the deployed replacement to load its assets correctly at the site's Pages URL, so that the published tracker works as verified.
46. As a maintainer, I want independent app and test instances with named combat actions, so that behavior can be developed without shared state leaking between instances.
47. As a maintainer, I want strict type checking and behavior-focused automated checks on pushed commits, so that failures are caught before publishing.
48. As a maintainer, I want successful default-branch verification to deploy the exact tested artifact after cutover, so that the public application matches the checked build.
49. As a maintainer, I want each migration milestone runnable with current repository guidance, so that subsequent work can rely on accurate commands and architecture.

## Implementation Decisions

- Follow the accepted static Vue application, combat state ownership, and behavior-focused testing ADRs. Use Vue Composition API, TypeScript single-file UI modules, strict checking, Vite, Vitest, Vue Test Utils, and Playwright. Remain a single page without a router; Vue's built-in reactivity is sufficient initially.
- Create an app-scoped combat module with fresh instances for each app and test. It owns creatures and combat progression; callers read observable state and invoke named actions instead of mutating shared objects. Combat rules remain independent of Vue and browser globals.
- Actions cover creature creation and editing, duplication, removal, conditions and notes, damage and healing, combat start/advancement, and reset. Each action owns its associated invariants. UI callers must not capture a previous turn index to make removal or parking safe.
- Preserve numeric descending initiative, stable case-insensitive name ties, and insertion order for parked creatures. Blank and non-finite/non-numeric initiative are parked; zero and negative finite initiative remain eligible. Derive normal ordering rather than persisting it.
- Preserve round-one start, round increments on advancement past the last creature, active-creature identity across reordering, and reassignment from the departing active creature's previous position. Reassignment itself preserves the round; an empty turn order returns to pre-combat. Downed creatures are not automatically skipped.
- Preserve the HP accumulator model: displayed current HP is remaining normal HP plus temporary HP. Clamp accumulated damage between zero and maximum HP; consume temporary HP first for damage, reduce normal damage for healing, and retain existing maximum HP adjustment behavior. Unconfigured HP is distinct from downed HP.
- Apply HP adjustments only through explicit Damage or Heal actions. Typing and Enter in the adjustment field do not apply HP changes. Clear the pending amount after application; keep it in UI state rather than persisted combat data.
- Preserve duplication behavior: new unique identity, source initiative/AC/maximum HP, full normal HP, zero temporary HP, cleared conditions/notes, and increasing numeric name suffixes. Blank source names remain blank. Insert the copy after the source before deriving display order.
- Retain offered and custom conditions and free-text notes as trimmed, case-insensitively unique tags. Render all user-entered values as text; do not interpret user data as HTML.
- Keep confirmation state in the UI. Confirm destructive actions involving meaningful data; untouched empty creatures can be removed without confirmation. Cancellation must not change combat state. Combat reset clears creatures and progression independently of theme and help preferences.
- Use creature-ID keys for editable Vue rows. Prefer initiative/name autosaving during input and display sorting on blur when cleanly implementable. Keep temporary editing/display-order coordination in UI state. Minor focus, markup, spacing, and interaction changes are acceptable when exact preservation requires fragile workarounds; document each departure from preferred editing behavior, its reason, and the verified usable workflow. Entered values must not be lost.
- Inject an explicit storage interface into persistence. Production uses browser storage and tests use an in-memory adapter. Coordinate saves centrally after accepted changes rather than scattering saves across widgets and fields. Persist encounter inputs and progression, deriving HP and normal sorting.
- Introduce an explicit versioned saved-data format. Runtime validation covers the supported version, field shapes, finite numbers, unique creature IDs, and consistent progression/active-creature references. Invalid saved data must recover to a safe usable state without throwing; unavailable reads/writes must leave the app usable in memory. Legacy encounter data may be ignored, and backward-compatible writes are unnecessary. Exact format layout and recovery granularity are implementation choices subject to these guarantees.
- UI modules own menus, picker search, confirmation state, editing interactions, and unapplied adjustments. Keep theme and help preferences independently persisted and retain their pre-paint application. Maintain one theme registry serving desktop and mobile controls.
- Retain existing CSS and theme variables where practical. Keep responsive presentation driven by CSS with the same underlying UI at each viewport. Preserve accessible menu/picker dismissal and close-before-action behavior without depending on deleted manual DOM machinery.
- Deliver incrementally, keeping the legacy application available until the replacement can complete encounter workflows. Only one combat state owner may drive a running application. Transitional widgets use the same named actions and cannot independently mutate combat state or rewrite Vue-owned DOM.
- Milestone 1 establishes Vite serving/building for the existing application, Vue/TypeScript tooling, explicit type checking, pushed-commit verification, a test responsibility audit, and ignored generated output. Public deployment remains unchanged.
- Milestone 2 introduces typed app-scoped combat, the new persistence format, storage adapters, and public-interface tests while the legacy application remains available.
- Milestone 3 delivers complete Vue encounter workflows: creature editing, HP actions, turns, duplication, removal, and confirmation, backed by state/UI tests and relevant browser checks.
- Milestone 4 finishes conditions, notes, menus, theme/help preferences, and responsive behavior; removes transitional bridges and obsolete DOM code; and consolidates the test suite by responsibility.
- Milestone 5 verifies the generated production artifact at the configured Pages path, completes repository documentation, and enables deployment after successful default-branch verification. Each milestone ends with runnable code and passing applicable checks; later tickets may divide milestones into smaller complete workflows.
- Run GitHub Actions checks on pushed commits, with no local hooks or required pull-request workflow. Final verification runs ESLint, explicit Vue/TypeScript checking, Vitest, a production build, and Playwright against that build. Keep checks for still-active legacy code until replacement coverage is ready. Vite building is not a substitute for type checking.
- Use the repository Pages base path for the recorded remote unless actual hosting configuration establishes a custom domain. Verify the published URL and Pages configuration before cutover. Serve and visit the configured path in acceptance checks. Publish only generated static output, and make deployment depend on successful verification using the artifact that was tested. Other pushed branches verify without publishing.
- Enable automatic deployment only at cutover. Record the prior deployment configuration before changing it so the previous static deployment mechanism can be restored if necessary. Restoring legacy encounter data is not required.
- Update repository agent instructions as milestones change architecture and commands: build/development/preview, checks, state ownership, actions, keyed UI lifecycle, persistence/recovery, and testing seams. Retain applicable user-text, theme, CSS, responsive, and browser-fidelity conventions and pointers to issue/domain docs. Link to ADRs for rationale.

## Testing Decisions

- Use the four seams agreed in the migration plan: combat actions and observable state; persistence through its storage interface; Vue UI inputs/outputs and visible state; and browser acceptance against the production artifact. Prefer these existing responsibilities over additional testing seams. No new test-only public API is required.
- Good tests exercise public behavior and meaningful failure modes. Avoid assertions about private Vue internals, obsolete routing classes, manual renderer calls, or exact row-node identity once that implementation is removed. Preserve guarantees such as usable editing and close-before-action through observable workflows and sequencing where it matters.
- Combat-module tests cover HP calculations/actions, numeric and tie ordering, parked creatures, start/advance/wrap, identity across reordering, departure reassignment, empty-order recovery, duplication, tags, reset, and independent instances. The existing HP, order, turn, and state tests provide behavioral prior art; port those behaviors to public actions/state rather than requiring the old interfaces.
- Persistence tests use in-memory and failing adapters to cover new-format round trips, malformed JSON, invalid shapes/numbers/IDs, unsupported versions, inconsistent active-creature/progression data, safe recovery, and unavailable storage. Verify that derived outputs and pending UI state are not persisted. Existing corruption-firewall and round-trip tests provide prior art; legacy-format compatibility tests do not carry forward as requirements.
- Mount Vue UI modules with fresh combat state and in-memory persistence to verify editing/action wiring, row-specific HP adjustments, Enter remaining inert, duplicate/remove controls, tags and notes, confirmation accept/cancel/empty-entry behavior, themes, and help preferences. Existing DOM rendering/wiring tests provide behavioral examples, but the custom bootstrapping and class-routing contracts can be retired.
- Use a small Chromium Playwright suite for complete workflows and browser fidelity: encounter creation and round advancement; initiative editing with usable Tab/click focus; damage/healing with reload persistence; conditions and destructive confirmation; desktop/mobile layout and menu accessibility; and production loading at the Pages base path. Existing focus/reordering, popover, and smoke cases provide prior art.
- Real-browser persistence tests reload without a fixture overwriting saved state. Real-browser deployment checks serve the production artifact at its configured base path rather than relying only on a development server at the origin root. These browser checks establish integration behavior that adapter and mounted-UI tests cannot prove.
- Keep actual focus, Tab, viewport geometry, and browser dismissal behavior in Playwright. Use representative viewport cases and relational assertions for overflow, visibility, and placement, with no pixel baselines. Existing font-blocking fixtures keep tests independent of external font requests; passing with fallback metrics does not establish real-font equivalence.
- Audit every existing test by the failure it detects. Retain useful coverage during transition, port behavior tests, remove tests coupled to deleted machinery, and consolidate redundant browser permutations once meaningful lower-seam coverage exists. Approximately 90% state/component tests and 10% acceptance tests is a direction, not a quota or coverage gate.
- Every milestone passes the checks applicable to its running code. The final verification command must pass lint, Vue/TypeScript checking, Vitest, production build, and acceptance tests against the checked artifact before deployment can run.

## Out of Scope

- New combat features, multiple encounters, accounts, backend services, synchronization, or server-side data storage.
- Migration of legacy saved encounters, compatibility loaders, backward-compatible writes, or restoration of old saved data during rollback.
- A router or an initial requirement for Pinia or another external state-management framework.
- Exact preservation of old DOM structure, event-routing classes, renderer interfaces, row-node identity, or fragile focus workarounds.
- A visual redesign, pixel-perfect matching, screenshot baselines, or mandatory expansion beyond the existing Chromium environment.
- Enforcing a numeric test-distribution quota or retaining obsolete tests permanently.
- Local Git hooks, required pull-request workflows, deployment from non-default branches, or deployment before production readiness.
- Implementation changes, dependency installation, deployment, and creation of dependency-ordered implementation tickets as part of publishing this specification.

## Further Notes

- Source of agreed scope: [Vue migration plan](../../docs/migrations/vue-migration.md).
- Governing decisions: [Static Vue application](../../docs/adr/0001-static-vue-application.md), [Combat state ownership](../../docs/adr/0002-combat-state-ownership.md), and [Behavior-focused testing](../../docs/adr/0003-behavior-focused-testing.md).
- Domain terms follow the root [glossary](../../GLOSSARY.md), especially creature, parked creature, active creature, round, pre-combat, current HP, condition, and note.
- The recorded repository remote is `zuny26/simple-combat-tracker`, with `/simple-combat-tracker/` as the expected repository Pages path. Actual published URL, default branch, and Pages configuration must be verified during implementation before cutover; this spec does not claim they have been inspected remotely.
- The testing seams were already agreed during planning. They were presented again when synthesizing this spec; absent a requested revision, the recorded agreement governs.
- Dependency-ordered implementation tickets can be produced separately through `to-tickets`; the five milestones guide sequencing without requiring one large commit per milestone.

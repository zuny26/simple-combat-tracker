# Vue migration plan

This plan records the completed planning interview. Implementation begins after the user confirms shared understanding. A specification and dependency-ordered tickets can then be produced through `to-spec` and `to-tickets`.

## Decisions

- [Static Vue application](../adr/0001-static-vue-application.md): Vue Composition API, strict TypeScript, Vite, GitHub Pages, incremental delivery, practical preservation of appearance and interactions, and push-only verification.
- [Combat state ownership](../adr/0002-combat-state-ownership.md): an app-scoped combat module with named actions, independent combat logic, centrally coordinated persistence, and transient interaction state owned by the UI.
- [Behavior-focused testing](../adr/0003-behavior-focused-testing.md): Vitest, Vue Test Utils, and a small Playwright acceptance suite; approximately 90% state/component tests and 10% acceptance tests as a direction, not a quota.

## Core behavior to preserve

- Add, edit, duplicate, and remove creatures; retain custom conditions and notes.
- Sort numeric initiative descending, break ties by name case-insensitively, and keep parked creatures outside the turn order.
- Start at round one, advance through the turn order, increment the round on wrap, and follow the active creature by identity.
- When the active creature is removed or parked, choose the next creature according to its previous turn-order position, wrapping or returning to pre-combat when necessary.
- Apply damage to temporary HP first, heal normal HP without increasing temporary HP, clamp damage, and derive the displayed current HP. Retain the existing behavior when maximum HP changes and the visual distinction between unconfigured HP and downed creatures.
- Apply damage/healing through explicit actions. Keep unapplied adjustment amounts out of persisted combat data.
- Confirm destructive actions involving meaningful data; resetting combat keeps theme and help preferences independent.
- Persist the new application's encounter and preferences across reloads; continue in memory when storage is unavailable and recover safely from invalid saved data.
- Render user-entered values as text.

Preserve initiative/name autosaving during input and sorting on blur when cleanly implementable. Use creature-ID keys for editable Vue rows. Minor changes to focus behavior, markup, spacing, and interactions are acceptable when preserving them would require fragile workarounds. Any departure from the preferred editing behavior must be documented with its reason and verified through a usable editing workflow.

## Ownership and interfaces

The combat module owns creatures and combat progression. UI callers use named actions rather than directly mutating shared objects. Actions handle the associated invariants, including active-creature reassignment, so UI callers never need to capture a turn index before removal. Each app and test creates a fresh instance.

Combat rules remain independent of Vue and browser globals. A Vue integration exposes the state for rendering and connects UI actions to the combat module. Vue's built-in reactivity is sufficient initially; the application remains a single page without a router.

Persistence has an explicit storage dependency. Production uses a browser-storage adapter and tests use an in-memory adapter. Saving is coordinated centrally after accepted changes, rather than distributed among fields, widgets, and event handlers. Persist combat inputs and progression; derive HP and normal sorting rather than persisting calculated output.

Menus, picker searches, confirmation state, editing interaction state, and unapplied damage/healing amounts belong to UI modules. Theme and help preferences remain independent of combat. Retain the pre-paint behavior for theme and dismissed help so mounting Vue does not introduce a flash.

Use a new saved-data format and an explicit format version. Existing browser data may be ignored; legacy loaders and backward-compatible writes are unnecessary. Validate the new format at runtime, including finite numbers, unique creature IDs, supported format versions, and consistent active-creature references. TypeScript does not validate stored JSON.

## Testing seams

1. **Combat actions and observable state:** verify HP rules, ordering, progression, duplication, removal, and active-creature reassignment without DOM or browser storage. This does not establish event wiring or browser interaction behavior.
2. **Persistence load/save:** verify valid round trips, invalid-data recovery, and unavailable storage through the storage interface. This does not establish real-browser reload wiring.
3. **UI inputs, outputs, and visible state:** mount Vue UI modules with fresh app state and in-memory persistence; verify field/actions wiring, tags, confirmations, and preferences. Avoid private Vue internals and assertions about obsolete event-routing classes. Simulated DOM results do not establish real focus or layout.
4. **Browser acceptance:** verify a small set of complete user workflows and browser-specific behavior against the built artifact, including reload persistence and deployment-path correctness.

The agreed browser suite covers encounter creation and round advancement; initiative editing with usable Tab/click focus; damage/healing with reload persistence; conditions and destructive-action confirmation; desktop/mobile layout and menu accessibility; and loading under the Pages base path. Begin with the existing Chromium environment. Use representative viewport cases and relational layout assertions; no pixel baselines are required.

Assess each existing test by the failure it detects. Retain useful tests during the transition, port behavior tests to the new public interfaces, and remove tests tied to deleted rendering/routing machinery. Consolidate redundant browser cases once their meaningful coverage exists at a lower seam. Do not add tests solely to satisfy a numerical ratio.

## Incremental milestones

1. **Build and verification foundation.** Serve and build the existing app with Vite, introduce Vue/TypeScript tooling and explicit type checking, and configure pushed-commit checks. Keep the existing app runnable and keep public deployment unchanged. Audit existing tests and identify their replacement coverage. Ignore generated build/cache output.
2. **Typed combat and persistence.** Introduce the app-scoped combat module, new saved-data format, storage adapters, and public-interface Vitest tests. Keep the legacy app available until its replacement can run complete encounter workflows. Only one state owner drives any running application.
3. **Vue encounter workflows.** Integrate the typed combat module into the Vue application and migrate the encounter controls and creature table, including HP actions, turn progression, duplication, removal, confirmation, and editing. Demonstrate complete workflows with state/component tests and the relevant browser acceptance checks. Transitional widgets must call the same actions and must not independently mutate state or rewrite Vue-owned DOM.
4. **Vue widgets and test consolidation.** Finish conditions/notes, menus, theme/help preferences, and responsive behavior. Retain the existing styling where practical, remove transitional bridges and obsolete DOM code, and consolidate tests into the agreed distribution of responsibilities.
5. **Production verification and Pages cutover.** Run the final checks against the generated artifact at the configured Pages path, verify the agreed workflows and representative layouts, finish repository documentation, and enable deployment of the checked artifact on successful default-branch pushes.

Each milestone ends with runnable code and passing applicable checks. Ticket boundaries may be refined into smaller complete workflows during `to-tickets`; these milestones are sequencing guidance, not instructions to make one large commit per milestone.

## Verification and deployment

GitHub Actions runs on pushed commits; there are no local hooks and no required pull-request workflow. The final verification command runs ESLint, Vue/TypeScript checking, Vitest, a production build, and Playwright acceptance tests against that build. During migration, keep checks for the still-active legacy code until their replacements are ready.

Use explicit `vue-tsc` checking because Vite's build does not type-check. Browser persistence tests must reload without a fixture overwriting saved state. Browser deployment checks must serve and visit the configured base path, rather than testing only the development server at `/`.

The current remote is `zuny26/simple-combat-tracker`. For a repository Pages URL, configure `/simple-combat-tracker/`; verify the actual published URL and Pages configuration before cutover because a custom domain would use `/`. Publish only generated static files from `dist/`. The deployment job must depend on successful verification and use the artifact that was tested.

Enable automatic deployment only at cutover and only for successful default-branch pushes. Checks on other branches run without publishing. Record the prior deployment configuration before changing it so the static deployment mechanism can be restored if necessary; backward compatibility with the old application's saved data is not part of that rollback.

## Repository instructions

Update AGENTS.md when each milestone changes the facts it documents:

- Replace the native-module/no-build description with the actual Vue/Vite development and static deployment model.
- Update commands and checks to match package scripts, including type checking and production preview.
- Replace singleton mutation, manual rendering paths, and CSS-class event-routing contracts with app-scoped state ownership, named actions, keyed rows, and UI lifecycle conventions.
- Document the new persistence format, recovery rules, separate preferences, and pre-paint requirements.
- Replace the custom jsdom bootstrapping guidance with fresh app instances, Vue UI mounting, and the agreed testing seams.
- Keep guidance for user text, theme registration, CSS variables, responsive layout, and real-browser fidelity where it still applies.
- Preserve the local issue-tracker and domain-document pointers. Link to architecture decisions rather than duplicating their rationale throughout agent instructions.

## Sources checked during planning

- [Vue state management](https://vuejs.org/guide/scaling-up/state-management.html)
- [Vue testing](https://vuejs.org/guide/scaling-up/testing.html)
- [Vue TypeScript tooling](https://vuejs.org/guide/typescript/overview.html)
- [Vue keyed lists](https://vuejs.org/guide/essentials/list.html#maintaining-state-with-key)
- [Vite static deployment](https://vite.dev/guide/static-deploy.html)

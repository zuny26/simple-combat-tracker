# Repository guidance

A browser-only D&D tracker for one encounter. Vue Composition API and Vite serve one page; encounters and preferences live in `localStorage`.

## Read before working

- Exploring or designing: [domain guidance](docs/agents/domain.md).
- Changing architecture: [static application](docs/adr/0001-static-vue-application.md) and [combat ownership](docs/adr/0002-combat-state-ownership.md).
- Adding or changing tests: [testing policy](docs/adr/0003-behavior-focused-testing.md).
- Changing hosting: [production guide](docs/production.md).
- Creating, reading, or updating tickets: [GitHub issue tracker](docs/agents/issue-tracker.md).
- Triaging: [status labels](docs/agents/triage-labels.md).

## Setup and validation

Use Node 24.15+ and `npm ci`. Other scripts are defined in [package.json](package.json).

```bash
npm run dev        # http://127.0.0.1:8934/simple-combat-tracker/
npm run check      # lint, strict type checking, Vitest
npm run check:all  # check, production build, Chromium acceptance
npm run test:unit -- test/component/combat.test.ts
```

Run `check:all` before committing UI/tooling changes. Vite builds do not check types. Install Chromium once with `npx playwright install chromium`; avoid `--with-deps` locally because it requires root. Stop dev/preview on port 8934 before browser checks: Playwright starts its own production preview and never reuses a source server.

## Code ownership

| Area                         | Entry or module                               |
| ---------------------------- | --------------------------------------------- |
| Application and encounter UI | `src/main.ts`, `src/ui/EncounterTracker.vue`  |
| Combat actions and rules     | `src/combat/combat.ts`, `src/combat/rules.ts` |
| Vue state adapter            | `src/combat/vueCombat.ts`                     |
| Versioned encounter storage  | `src/combat/persistence.ts`                   |
| Theme/help preferences       | `src/ui/preferences.ts`                       |

Use one combat instance per app/test. UI callers pass creature IDs to named actions; actions own HP and turn invariants. Edit through actions, read through the read-only state, and use the injected storage boundary for persistence. Combat reset affects only the encounter key; preferences remain independent.

Keep drafts, displayed row order, menus, pickers, and confirmation in the UI. Rows use creature-ID keys. Initiative/name edits save on input and sort on blur; HP fields retain text drafts while typing. Damage/healing requires an explicit button action; Enter leaves HP unchanged.

## Conventions

- Use Conventional Commits with a domain scope where useful, e.g. `feat(combat): add turn advancement`.
- Render user text with Vue interpolation and bound values; SVG markup is static.
- Register themes in `src/ui/themes.ts` and add their variable block in `styles.css`. Both theme controls use that registry.
- Use CSS custom properties for colors, spacing, radii, and `--control-h` alignment.
- Keep the same DOM at every viewport. CSS selects row menus at 1400px and app menus at 640px; cells use `data-label` captions. Avoid resize handlers and viewport-conditional rendering.
- Add browser APIs used by JavaScript to the hand-listed globals in `eslint.config.js`. Strict `vue-tsc` checks TypeScript/Vue identifiers.
- Write each Markdown paragraph and list item on one line, relying on editor soft wrapping; preserve structural line breaks in headings, lists, tables, and code blocks.

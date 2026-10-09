# Build a browser-only Vue application for GitHub Pages

Use Vue Composition API, TypeScript single-file UI modules, and Vite for the browser-only combat tracker. GitHub Pages hosts the generated static HTML, CSS, and JavaScript; encounter data stays in the browser. The build step adds tooling and framework dependencies in exchange for declarative UI updates, explicit types, and isolated testing.

Keep the application as one page without a router, accounts, backend, or server-side encounter storage. Use CSS custom properties and the shared theme registry for presentation. Persistence uses an explicitly versioned format and must tolerate unavailable browser storage and invalid saved data.

Initiative/name edits save while typing and reorder on blur. Editing must remain usable and preserve entered values. Keep transient editing and focus coordination in the UI rather than persisted encounter data.

Run strict type checking separately from the production build. CI verifies pushes to `master` and pull requests targeting `master`; CD deploys only the exact tested artifact from successful default-branch push verification. Pull-request checks never publish, and there are no local Git hooks.

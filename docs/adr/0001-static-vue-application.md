# Build a browser-only Vue application for GitHub Pages

Use Vue Composition API, TypeScript single-file components, and Vite. The build adds tooling and dependencies in exchange for declarative updates, explicit types, and isolated testing. GitHub Pages serves generated static files; encounter data stays in the browser.

Keep one page without accounts, a router, backend, or server-side encounter storage. Use a versioned persistence format that tolerates invalid data and unavailable browser storage. Check types separately from the Vite build and publish only the artifact that passed verification; the [production guide](../production.md) defines the deployment workflow.

# Build a browser-only Vue application for GitHub Pages

The combat tracker will migrate incrementally from native JavaScript modules and manual DOM rendering to Vue, TypeScript, and Vite. GitHub Pages will continue to host static HTML, CSS, and JavaScript; combat data will remain in the browser. The build step adds tooling and framework dependencies in exchange for declarative UI updates, explicit types, and simpler isolated testing.

Core combat behavior is a migration requirement. Existing appearance and minor interactions should be preserved when practical; small changes are acceptable when preservation would require costly workarounds. Initiative/name edits should save while typing and reorder on blur when this can be implemented cleanly with Vue; fragile focus workarounds are not required. Editing must remain usable and must not lose entered values. Each migration milestone must remain runnable and pass applicable checks, while the public site stays on the existing application until the replacement is ready.

The application has no active users, so compatibility with the old saved-data format, migration of existing browser data, and rollback to the old application are not requirements. The replacement may use a new saved format and start with a clean encounter. Persistence must still tolerate unavailable storage and invalid data written in the new format.

Use Vue Composition API with TypeScript single-file UI modules and strict type checking. Retain the existing CSS and theme variables initially. The application remains one page without a router. Update repository instructions at each milestone to describe the architecture then present.

Run verification in GitHub Actions on pushed commits; do not install local Git hooks or require pull requests. Enable automatic GitHub Pages deployment from the default branch only after the replacement is ready and deployment checks pass. Checks on other pushed branches must not deploy the public site.

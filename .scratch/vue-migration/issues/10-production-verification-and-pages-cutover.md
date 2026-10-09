# 10: Verify the production artifact and cut over GitHub Pages

**What to build:** Publish the verified Vue tracker at the actual GitHub Pages URL and automatically deploy the exact tested static artifact after successful default-branch verification.

**Blocked by:** 09 — Retire legacy code and consolidate verification.

**Status:** claimed

- [ ] Verify the actual repository remote, default branch, published URL, and Pages configuration before cutover; do not assume the recorded planning configuration has been inspected remotely.
- [ ] Use the repository Pages base path for the recorded remote unless actual custom-domain configuration establishes a root path. Serve and visit the configured path to verify generated asset loading.
- [ ] Record the prior deployment configuration before changing it, with sufficient instructions to restore the previous static deployment mechanism. Restoring legacy encounter data is not required.
- [ ] Run final lint, explicit Vue/TypeScript checking, Vitest, production build, and Chromium acceptance against the generated artifact at the verified hosting path. The agreed complete workflows and representative desktop/mobile layouts pass before replacement deployment is enabled.
- [ ] GitHub Actions deploys only after successful verification on default-branch pushes. Other pushed branches verify without publishing, and no local hooks or required pull-request workflow are introduced.
- [ ] Deployment publishes only generated static output and consumes the exact artifact tested by verification, without a separate unverified rebuild.
- [ ] The published replacement loads its assets and runs as a browser-only single page with local encounter data, no accounts, backend, router, or server-side persistence.
- [ ] Production/deployment documentation and repository agent guidance match the final commands, hosting path, verification/deployment relationship, and restoration procedure. Any accepted editing or interaction departures remain documented with their verified usable workflow.

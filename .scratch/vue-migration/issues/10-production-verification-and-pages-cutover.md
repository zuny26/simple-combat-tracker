# 10: Verify the production artifact and cut over GitHub Pages

**What to build:** Publish the verified Vue tracker at the actual GitHub Pages URL and automatically deploy the exact tested static artifact after successful default-branch verification.

**Blocked by:** 09 — Retire legacy code and consolidate verification.

**Status:** resolved

- [x] Verify the actual repository remote, default branch, published URL, and Pages configuration before cutover; do not assume the recorded planning configuration has been inspected remotely.
- [x] Use the repository Pages base path for the recorded remote unless actual custom-domain configuration establishes a root path. Serve and visit the configured path to verify generated asset loading.
- [x] Record the prior deployment configuration before changing it, with sufficient instructions to restore the previous static deployment mechanism. Restoring legacy encounter data is not required.
- [x] Run final lint, explicit Vue/TypeScript checking, Vitest, production build, and Chromium acceptance against the generated artifact at the verified hosting path. The agreed complete workflows and representative desktop/mobile layouts pass before replacement deployment is enabled.
- [x] GitHub Actions deploys only after successful verification on default-branch pushes. CI checks `master` pushes and pull requests targeting `master`; pull-request checks never publish. No local hooks are introduced. This replaces the original all-push verification policy by explicit user approval (see Comments).
- [x] Deployment publishes only generated static output and consumes the exact artifact tested by verification, without a separate unverified rebuild.
- [x] The published replacement loads its assets and runs as a browser-only single page with local encounter data, no accounts, backend, router, or server-side persistence.
- [x] Production/deployment documentation and repository agent guidance match the final commands, hosting path, verification/deployment relationship, and restoration procedure. Any accepted editing or interaction departures remain documented with their verified usable workflow.

## Comments

- User requested separate CI/CD workflows. CI builds and tests once; CD consumes
  the exact successful CI run's unchanged Pages archive rather than rebuilding.
- After updating `master` and successfully deploying, the user explicitly approved
  preserving CI on `master` pushes and pull requests targeting `master`, replacing
  verification on every pushed branch. Deployment remains restricted to successful
  default-branch push CI; pull-request CI never deploys.

## Answer

Verified authenticated GitHub settings before cutover: remote
`zuny26/simple-combat-tracker`, default branch `master`, legacy Pages publishing
from `master` root, no custom domain, HTTPS enforced, and `github-pages` environment
policy allowing `master`. Recorded legacy source commit
`abd5e7eab46504f2f6bc5e24037be0aa33e0da79` and the branch-root/Jekyll restoration
procedure in [production documentation](../../../docs/production.md).
Switched Pages to GitHub Actions and retained `/simple-combat-tracker/` as the base.

Separate CI and CD workflows verify/build/test and deploy respectively. CD requires
successful CI from a default-branch push, downloads by that CI run ID, transfers
the unchanged `artifact.tar`, and deploys without checkout or rebuild. The user
updated `master`; commit `c987487daae0d34b72fb60f831453a6eda2216df` passed
[CI](https://github.com/zuny26/simple-combat-tracker/actions/runs/37915799061)
and [CD](https://github.com/zuny26/simple-combat-tracker/actions/runs/37915891580).
Successful PR checks produced skipped CD runs.

Validation: local `check:all` and deployed-commit CI passed lint, strict type checking,
97 Vitest cases, build, and 12 Chromium cases. All 12 Chromium cases also passed at
the actual public URL, covering editing, local save/reload, explicit HP, tags,
destructive confirmation, preferences, and desktop/mobile layouts. Downloaded
CI/CD archives were byte-identical; public HTML/JavaScript/CSS matched the tested
archive bytes. No new editing departures were introduced.

Standards review: 0 findings. Spec review: 0 findings. Both reviewed the original
implementation and the separate-workflow revision. Final guidance describes the
user-approved trigger policy and restoration procedure.

Recorded in the [migration map](../map.md#decisions-so-far).

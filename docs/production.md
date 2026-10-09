# Production verification and GitHub Pages

The tracker is a browser-only Vue page at
https://zuny26.github.io/simple-combat-tracker/. Vite's base is
`/simple-combat-tracker/`; there is no custom domain. Encounters and preferences
stay in browser `localStorage`. There are no accounts, backend, router, or
server-side encounter storage.

## Verify locally

Use Node 24.15+ and install the locked dependencies with `npm ci`. Install
Chromium once with `npx playwright install chromium`. Stop any dev/preview
server on port 8934, then run `npm run check:all`.

That command runs ESLint, explicit strict Vue/TypeScript checking, Vitest, a
production build, and Chromium acceptance against `dist/`. Playwright starts
its own preview at `http://127.0.0.1:8934/simple-combat-tracker/` and never
reuses a development server. `npm run build` alone does not check types.
For manual inspection, build and run `npm run preview`, then visit that same
path. Preview is local verification.

The browser checks cover asset loading, creating/advancing encounters,
initiative/name editing with Tab and click, explicit damage/healing, actual
save/reload workflows, tags, confirmation and menu focus/dismissal, preferences,
pre-paint presentation, and representative desktop/mobile bounds. Google Fonts
are blocked in acceptance checks, so they establish fallback-font geometry.
There are no pixel baselines. Initiative/name inputs save while typing and
sort on blur; HP text drafts normalize on blur. Damage/healing uses explicit
buttons; typing or Enter leaves HP unchanged. Pending amounts disappear on
reload.

## Deploy the tested artifact

[CI](../.github/workflows/verify.yml) verifies pushes to `master` and pull requests
targeting `master` with `npm run check:all`. After successful verification on the repository's
default branch (currently `master`), it uploads the tested `dist/` with
`actions/upload-pages-artifact`. The separate [CD workflow](../.github/workflows/deploy.yml)
runs after CI completes and deploys only successful default-branch push runs.
It downloads the Pages archive using that CI run's ID and transfers the unchanged
`artifact.tar` into its own run, because `actions/deploy-pages` reads artifacts
from the deployment run. It then deploys that archive without checking out,
extracting, or rebuilding the application.
Pull-request checks never publish; other branch pushes do not trigger CI.
There are no local hooks.

Pages must use **GitHub Actions** as its publishing source. The `github-pages`
environment permits the `master` branch; update its branch policy if the default
branch changes. Deployment has `pages: write` and `id-token: write` permissions
and serializes Pages deployments without cancelling an in-progress deployment.
Failed verification prevents artifact upload and deployment; the last successful
deployment stays published. Failed checks retain Playwright diagnostics for seven days.

After a production push, check that both CI and CD succeed in Actions.
Open the published URL in a fresh browser context, check that generated assets
load, then create a creature, start/advance combat, apply damage, and reload.
Confirm the encounter restores and pending adjustment text does not. Check the
mobile controls and viewport bounds as well. A successful local preview alone
does not establish a successful public deployment.

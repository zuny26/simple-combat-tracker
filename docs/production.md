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
reload. These verified workflows retain the agreed editing behavior.

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
There are no local hooks. This trigger policy was approved during ticket 10
completion, replacing the original plan to verify every pushed branch.

Pages must use **GitHub Actions** as its publishing source. The `github-pages`
environment permits the `master` branch; update its branch policy if the default
branch changes. Deployment has `pages: write` and `id-token: write` permissions
and serializes Pages deployments without cancelling an in-progress deployment.
Failed verification prevents artifact upload and deployment; the previous site
stays published. Failed checks retain Playwright diagnostics for seven days.

After a production push, check that both CI and CD succeed in Actions.
Open the published URL in a fresh browser context, check that generated assets
load, then create a creature, start/advance combat, apply damage, and reload.
Confirm the encounter restores and pending adjustment text does not. Check the
mobile controls and viewport bounds as well. A successful local preview alone
does not establish a successful public deployment.

## Completed production verification

On 2026-10-09, `master` commit `c987487daae0d34b72fb60f831453a6eda2216df`
passed [CI](https://github.com/zuny26/simple-combat-tracker/actions/runs/37915799061)
and [CD](https://github.com/zuny26/simple-combat-tracker/actions/runs/37915891580).
CI passed lint, explicit type checking, all 97 Vitest cases, the production build,
and all 12 Chromium acceptance cases. CD downloaded that CI run's Pages archive
and published it successfully. Pull-request CI also passed and its CD run was
skipped, confirming the push-event deployment gate.

Downloaded CI/CD `artifact.tar` files were byte-identical, with SHA-256
`9194632e3c96a6f8cef6b76d4bf84f6385fe86b9aabb5c15164005391276420f`.
Public `index.html`, generated JavaScript, and CSS matched their archived bytes.
All 12 existing Chromium cases also passed against the actual public URL using
a temporary configuration with no preview server, including real encounter
reloads and 1600px, 768px, and 320px layouts. The site is confirmed to run the
tested static Vue application at the repository Pages path.

## Prior deployment and restoration

Authenticated GitHub API inspection before cutover recorded:

| Setting | Previous value |
| --- | --- |
| Repository | `zuny26/simple-combat-tracker` |
| Default branch | `master` |
| Pages build type | `legacy` (Deploy from a branch) |
| Pages source | `master`, `/` (root) |
| Published URL | `https://zuny26.github.io/simple-combat-tracker/` |
| Custom domain | None (`cname: null`) |
| HTTPS enforcement | Enabled |
| Deployment environment | `github-pages`, custom branch policy allowing `master` |
| Last legacy source commit | `abd5e7eab46504f2f6bc5e24037be0aa33e0da79` |

The previous [Pages run](https://github.com/zuny26/simple-combat-tracker/actions/runs/30210489014)
built raw repository files with GitHub's Jekyll workflow, then deployed them.
The legacy commit contains `index.html`, `styles.css`, and `js/main.js` with its
native-module dependencies. The Vue source requires a Vite build.

To restore the previous static publishing mechanism while keeping the migration:

1. Disable **CD** in GitHub Actions so future
   default-branch pushes cannot replace the restored deployment. Let any active
   Pages deployment finish before switching the source.
2. Create a restoration branch from the recorded legacy commit:
   `git push origin abd5e7eab46504f2f6bc5e24037be0aa33e0da79:refs/heads/pages-legacy-restore`.
   If that branch already exists, inspect it before reusing it.
3. In the `github-pages` environment, allow `pages-legacy-restore` alongside
   `master`. In Settings → Pages, choose **Deploy from a branch**, select
   `pages-legacy-restore` and **/(root)**, and save. Keep the custom domain blank
   and HTTPS enabled. This uses the same branch-root/Jekyll mechanism without
   rewriting `master`.
4. Wait for GitHub's **pages build and deployment** run to succeed and open the
   public URL. Verify the legacy `js/main.js` loads and encounter controls work.

To return to Vue, select **GitHub Actions** as the Pages source, re-enable the
CD workflow, and push a default-branch commit to run verification and
publish its tested artifact. Legacy encounter-data restoration is not required;
Vue uses its separate versioned encounter key.

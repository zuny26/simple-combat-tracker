# GitHub Pages production guide

Published URL: https://zuny26.github.io/simple-combat-tracker/

Use `/simple-combat-tracker/` as Vite's base. Pages uses **GitHub Actions**, HTTPS, and no custom domain. The `github-pages` environment allows `master`; update its branch policy when changing the default branch.

## Verification

1. Follow [setup and validation](../AGENTS.md#setup-and-validation) and run `npm run check:all`.
2. For manual inspection, run `npm run build` then `npm run preview` and visit `http://127.0.0.1:8934/simple-combat-tracker/`. Preview verifies locally.
3. After publishing, confirm both CI and CD succeeded. In a fresh browser context, open the public URL, verify asset loading, create/advance an encounter, apply damage, and reload. Saved encounter data must restore, pending adjustments must clear, and desktop/mobile controls must fit the viewport.

## Deployment

[CI](../.github/workflows/verify.yml) runs `check:all` on `master` pushes and PRs targeting `master`. Only successful default-branch pushes upload the tested `dist/`. [CD](../.github/workflows/deploy.yml) consumes that CI run's archive by run ID and publishes it. PR checks never deploy; other branch pushes do not trigger CI.

CD transfers the unchanged `artifact.tar` into its own run because the Pages action reads artifacts from the deployment run. Keep this transfer intact rather than rebuilding. Failed verification leaves the last successful deployment live.

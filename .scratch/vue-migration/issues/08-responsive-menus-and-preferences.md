# 08: Complete responsive menus, themes, and help preferences

**What to build:** Give desktop and mobile users equivalent encounter controls and retain their chosen theme and help preference independently of combat, including presentation before paint.

**Blocked by:** 06 — Duplicate creatures and confirm destructive actions.

**Status:** resolved

- [x] Desktop controls and mobile row/app menus expose equivalent applicable encounter actions, including duplication, removal, New Combat, themes, and help.
- [x] Responsive presentation uses CSS with the same underlying UI at every viewport, retaining existing styling, theme variables, and control alignment where practical. No viewport-conditional rendering or resize handlers are required.
- [x] Menus and theme pickers support outside-click dismissal and Escape with focus returned to the trigger. They close before invoking actions or opening confirmations, verified through observable sequencing.
- [x] A single theme registry supplies desktop and mobile choices. Selection persists independently of combat and is applied before paint without a default-theme flash.
- [x] Help can be dismissed and reopened from available controls. Its dismissal preference persists independently and is applied before paint.
- [x] New Combat preserves both preferences. Unavailable preference storage leaves controls usable in memory, and the pre-paint handling cannot prevent application startup.
- [x] Fresh-instance component tests verify preference controls, persistence, help reopening, and reset independence. Chromium verifies menu accessibility/dismissal, confirmation from a menu, and equivalent desktop/mobile workflows.
- [x] Representative viewport checks use relational assertions for overflow, visibility, and placement, including readable fields and menus; no pixel baselines are introduced. Passing fallback-font checks is not described as proof of real-font equivalence.
- [x] Applicable checks pass, the legacy application and public deployment remain available, and repository guidance documents theme registration, preferences, pre-paint behavior, and responsive UI ownership.


## Answer

Implemented Vue-owned responsive row/app/theme menus with keyboard and outside dismissal,
focus restoration, and close-before-action patches. Both entries share `js/themes.js`.
Vue theme/help state persists independently through injected storage, contains read/write
failures, and is applied synchronously in the HTML head before styles and app startup.
New Combat preserves preferences; help can be dismissed and reopened from both controls.

Validation on Node 24.15.0: lint, strict typecheck, legacy suites, 95 Vitest tests, production
build, and all 47 Chromium cases pass. Browser checks use the production Pages path,
actual UI saves/reloads, blocked app modules for pre-paint verification, and relational
layout at 1600/768/320px with fallback fonts. Browser preview required execution outside
the sandbox to bind its port. Public deployment and the independent legacy entry remain.

See [Decisions-so-far](../map.md#decisions-so-far) and repository guidance for ownership.

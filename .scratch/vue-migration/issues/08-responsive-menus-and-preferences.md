# 08: Complete responsive menus, themes, and help preferences

**What to build:** Give desktop and mobile users equivalent encounter controls and retain their chosen theme and help preference independently of combat, including presentation before paint.

**Blocked by:** 06 — Duplicate creatures and confirm destructive actions.

**Status:** ready-for-agent

- [ ] Desktop controls and mobile row/app menus expose equivalent applicable encounter actions, including duplication, removal, New Combat, themes, and help.
- [ ] Responsive presentation uses CSS with the same underlying UI at every viewport, retaining existing styling, theme variables, and control alignment where practical. No viewport-conditional rendering or resize handlers are required.
- [ ] Menus and theme pickers support outside-click dismissal and Escape with focus returned to the trigger. They close before invoking actions or opening confirmations, verified through observable sequencing.
- [ ] A single theme registry supplies desktop and mobile choices. Selection persists independently of combat and is applied before paint without a default-theme flash.
- [ ] Help can be dismissed and reopened from available controls. Its dismissal preference persists independently and is applied before paint.
- [ ] New Combat preserves both preferences. Unavailable preference storage leaves controls usable in memory, and the pre-paint handling cannot prevent application startup.
- [ ] Fresh-instance component tests verify preference controls, persistence, help reopening, and reset independence. Chromium verifies menu accessibility/dismissal, confirmation from a menu, and equivalent desktop/mobile workflows.
- [ ] Representative viewport checks use relational assertions for overflow, visibility, and placement, including readable fields and menus; no pixel baselines are introduced. Passing fallback-font checks is not described as proof of real-font equivalence.
- [ ] Applicable checks pass, the legacy application and public deployment remain available, and repository guidance documents theme registration, preferences, pre-paint behavior, and responsive UI ownership.


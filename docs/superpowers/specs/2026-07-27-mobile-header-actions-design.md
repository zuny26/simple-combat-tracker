# Mobile header and action bar — design

Date: 2026-07-27
Branch: `styles`

## Problem

The two-tier top bar was laid out for desktop and only wraps on a phone. At 360px it
costs **four stacked lines** before a single creature is visible:

```
D&D Combat Tracker
( 🎨 Organic Day ⌄ )   ( ? )
[ Next turn ]  Round 2  |
[ + Add creature ]        [ New Combat ]
```

Measured control widths at that viewport: `Next turn` 104px, `Round` 92px,
`+ Add creature` 138px, `New Combat` 126px — 460px of content plus gaps, against roughly
288px of usable width at 320px. Tier 2 has to shed about 200px to fit on one line.

Tier 1 is a second problem of the same kind: the theme pill (153px) and the `?` button
(36px) are *global settings*, touched once a session, yet they occupy a full line beside
the title on every phone.

## Scope

Viewports **≤640px only**. At 641px and above the top bar renders identically to today —
verified by a screenshot at 641px, not assumed.

Touches: `index.html` (markup for both tiers), `styles.css` (one new `@media
(max-width: 640px)` region plus a handful of inert base rules), one new module
`js/appMenu.js`, one exported function added to each of `js/themePicker.js` and
`js/usage.js`, one line added to `renderHeader()` in `js/render.js`, and one
initialisation call in `js/main.js`. No changes to state, HP, ordering, turn logic, or the
table's event routing.

The 1400px card layout is untouched. This is the header above it.

## Design

### 1. Tier 1 collapses to title + ☰

`index.html` keeps `.theme-picker` and `#usage-help-btn` exactly where they are and gains
a third control after them:

```html
<div class="tier1">
  <h1 class="app-title">D&amp;D Combat Tracker</h1>
  <span class="spacer"></span>
  <div class="theme-picker" id="theme-picker">…</div>
  <button type="button" id="usage-help-btn" class="btn btn-icon">?</button>
  <button type="button" id="app-menu-btn" class="app-menu-trigger"
          aria-haspopup="menu" aria-expanded="false" aria-label="Menu"><svg …/></button>
</div>
```

Base CSS hides `#app-menu-btn`; the 640px block hides `.theme-picker` and
`#usage-help-btn` and shows it. **Both variants are always in the DOM and CSS picks one**
— the same contract the card layout's ⋮ row menu already follows, so nothing about the
DOM depends on the viewport and no resize handler is needed.

The trigger is sized off `--control-h-sm` (36px), the tier-1 token the theme pill and `?`
already share, and uses the same 1.5px divider border and `--color-bg` fill so it reads
as the same utility family.

**The title has to give way.** At 320px the burger plus tier padding leaves ~236px, and
the title measures 266px at 24px Caprasimo. Below 640px `.app-title` drops to 20px and
gains `min-width: 0` with normal wrapping, so a longer fallback font wraps to two lines
rather than pushing the burger off-screen. The exact size is confirmed against the
overflow scan at 320px during implementation; 20px is the starting value, not a
guaranteed one.

### 2. New module `js/appMenu.js`

The panel behind ☰. Same shape as `rowMenu.js`: a fixed-position panel plus a
full-viewport backdrop that closes it on any outside click, Escape closes from anywhere
and returns focus to the trigger, and **nothing is persisted**. It closes before running
an action, so no callout toggle or repaint happens under an open popover.

Panel contents, built on open:

```
┌──────────────────────────┐
│ THEME                    │
│ ◒ Organic Day         ✓  │
│ ◒ Organic Night          │
│ ◒ Dracula                │
│ ────────────────────────  │
│ ?  How to run a fight    │
└──────────────────────────┘
```

- Theme rows are built from `THEMES` imported from `theme.js`, so **adding a theme there
  still lights it up in both the desktop pill and this panel for free**. Each row is
  `role="menuitemradio"` with `aria-checked`, carrying the same swatch markup
  (`--sw-bg` / `--sw-dot`) and check glyph the picker menu uses.
- **How to run a fight** closes the panel and then does exactly what `#usage-help-btn`
  does today: removes `.usage-dismissed` from `<html>` and clears the
  `sct-usage-dismissed` key. To keep one implementation, `usage.js` exports that body as
  `showUsageCallout()`; its own click handler and `appMenu.js` both call it.
- Keyboard: ArrowUp / ArrowDown / Home / End move between rows and Enter / Space
  activates, matching `themePicker.js`'s handler. Focus lands on the checked theme row on
  open.

Choosing a theme calls a new `selectTheme(id)` exported from `themePicker.js` — the
existing private `choose()` minus its menu-closing, i.e. `setTheme` plus `reflect()`. Going
through the picker rather than calling `setTheme` directly is what keeps the desktop
pill's label correct if the window is later widened or the phone rotated.

Panel width, offset clamping to the viewport, and the backdrop element are lifted from
`rowMenu.js`'s approach; it is right-aligned to the trigger, which sits at the tier's
right edge.

### 3. Tier 2 — four controls, one line

The chosen shape (mocked and picked in brainstorming) is:

```
[ Next turn │ 2 ]───stretches───  [ + Add ]  │  [ ↻ ]
```

The round counter stops being a free-floating text pill and **welds onto the turn button
as its right-hand segment**, so the pair reads as one object — "advance the fight". The
resulting pill takes all the spare width, making the button pressed dozens of times per
fight the largest target on the line. `+ Add` and the `↻` New Combat icon sit at natural
size on the right, with the tier's existing hairline between Add and `↻` keeping the
destructive control visibly out of the group beside it.

Estimated width at 320px: 140 + 74 + 1 + 38 plus gaps ≈ 275px against 288px usable — the
turn pill is the flexible item, so any shortfall comes out of its label side rather than
wrapping the line.

**Markup — one wrapper added:**

```html
<div class="turn-group">
  <button type="button" id="start-next-btn" class="btn btn-primary">Start</button>
  <div class="round" role="status" aria-live="polite">
    <span class="round-label">Round </span><span id="round-value">0</span>
  </div>
</div>
```

`.turn-group` is `display: contents` in the base stylesheet, so it contributes no box and
the desktop bar lays out exactly as it does today. Inside the 640px block it becomes the
welded pill: a flex row, `flex: 1`, `border-radius: 999px`, `overflow: hidden`, with
`.round` restyled as the darker right segment on `--color-accent-700`.

The counter deliberately stays a **sibling** of the button rather than a child:
`renderHeader()` writes the button label with `textContent` (`render.js:55`), which would
destroy any element nested inside it.

**Line order** is set with `order` — the card layout's existing idiom — rather than by
moving nodes: `.turn-group` 1, `#add-btn` 2, `.sep` 3, `#reset-btn` 4, and `.spacer`
hidden. The single hairline already in the markup therefore *moves* from between Round
and Add to just before New Combat; no second separator is added.

**Labels shrink without losing their accessible names.** Every hidden label uses a
visually-hidden treatment (clip, not `display: none`), so the accessibility tree is
identical at every width:

| Control | ≥641px | ≤640px | Mechanism |
| --- | --- | --- | --- |
| Add | `+ Add creature` | `+ Add` | `+ Add<span class="lbl-long"> creature</span>`, tail clipped |
| New Combat | `New Combat` | `↻` icon | button holds an `↻` svg (hidden ≥641px) plus `<span class="lbl-long">New Combat</span>` (clipped ≤640px) |
| Round | `Round 3` | `3` | `.round-label` clipped; live region still announces "Round 3" |

The `↻` glyph is a stroked circular-arrow in the same idiom as the existing header icons
(24 viewBox, `stroke-width: 2`, round caps and joins), `aria-hidden`.

### 4. Pre-combat state

`state.round` is `0` until Start is pressed (`turns.js:16`), so a permanently visible
counter would read a meaningless "0". Below 640px the counter segment is therefore
**absent until combat starts** — the pill is a plain `Start` button, and pressing Start
grows the counter showing `1`. New Combat collapses it again. Above 640px the round text
is always visible, exactly as today.

The hook is one line in `renderHeader()` (`render.js:52-56`):

```js
document.documentElement.classList.toggle('combat-started', state.started);
```

`renderHeader()` is already the single place the round number and the Start/Next label are
written, and it runs on every start, advance, reset and auto-stop — so no call site has to
be found or added. `<html>` is the same element the pre-paint script already flags with
`usage-dismissed`. CSS: inside the 640px block, `.round` is `display: none` unless
`html.combat-started`.

## Accessibility

- Both hidden-label mechanisms above use clipping, never `display: none`, so button names
  and the round live region are unchanged at every width.
- `#app-menu-btn` carries `aria-label="Menu"`, `aria-haspopup="menu"`, and an
  `aria-expanded` that tracks open state.
- The panel is `role="menu"`; theme rows are `role="menuitemradio"` + `aria-checked`; the
  help row is `role="menuitem"`.
- Escape closes the panel from anywhere and returns focus to ☰ (`rowMenu.js`'s pattern).
- Every control on the tier-2 line keeps a ≥36px hit target; the `↻` and ☰ buttons are
  38px and 36px square respectively.

## Risks and edge cases

- **641px is the tight point** — every full-length label has to fit on one line again
  there. ~500px of content against ~606px usable, so it should hold, but it is the width
  most likely to regress and is explicitly in the screenshot matrix.
- **A three-digit round** (`Round 100`) widens the counter segment. The turn pill is the
  flex-growing item, so it absorbs this by shrinking its label side; the fixed-size
  neighbours are unaffected.
- **Growing the counter on Start shifts the line** by ~30px. Accepted: it is a one-time
  transition that signals the fight has begun.
- **Theme changed from the menu, then the window widened** — covered by routing through
  `themePicker.selectTheme()` rather than `setTheme()`.
- **Longer theme labels** in a future `THEMES` entry make the panel wider, not broken; the
  panel clamps to the viewport as `rowMenu.js` does.

## Verification

There is no test suite. Verification is:

1. `node --check` on `js/appMenu.js`, `js/themePicker.js`, `js/usage.js`, `js/render.js`,
   `js/main.js`.
2. The `run-and-screenshot` skill at **320, 360, 390, 430, 640, 641, 900, 1600**, each
   with the `getBoundingClientRect()` horizontal-overflow scan — the scan is what actually
   catches a pill spilling past the edge, not the eyeballed screenshot. Every phone width
   must show tier 1 and tier 2 as **one line each**.
3. Screenshots read at 641px and 1600px to confirm the desktop bar is unchanged.
4. Manual pass on a phone width: open ☰ / Escape / outside-click / focus returns to the
   trigger; switch theme from the panel and confirm the check mark and the applied theme;
   widen the window and confirm the desktop pill's label matches; **How to run a fight**
   re-shows the callout; the Start pill grows its counter on Start and loses it on New
   Combat.

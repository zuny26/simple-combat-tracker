# Tablet encounter layout

Status: implemented and validated. The tablet range remains 768px through 1400px.

## Problem

The current layout changes from a desktop table to full-width creature cards at 1400px. At tablet widths, separate full-width sections and capped input widths leave substantial empty space and reduce the number of creatures visible together.

## Agreed direction

- Use compact full-width creature rows with two lines of controls in the usual case and one clear top-to-bottom turn order.
- Keep name, initiative, HP, damage/healing, and existing conditions visible and directly usable.
- Put less frequent actions, such as removing a creature, in the creature menu.

## Field arrangement

| Line   | Fields in order                                                  |
| ------ | ---------------------------------------------------------------- |
| First  | Initiative, name, AC, Max HP, Temp HP, current HP, creature menu |
| Second | Damage/healing, Conditions, Other                                |

Give name and current HP flexible space and keep numeric inputs compact. Retain the existing HP bar and current HP display.

Conditions and Other each occupy half of the space beside Damage/healing, with a gap between them.

Keep tablet controls approximately 46–48px tall. Gain density through horizontal arrangement and tighter spacing. Conditions and notes wrap naturally; a crowded creature grows taller so all tags remain visible. Two lines are the normal arrangement, not a fixed row height.

## Responsive behavior

Initially target tablet rows at browser widths from 768px through 1400px, retaining phone cards below the tablet range and the desktop table above it. Select the layout by available browser width, including rotation and split-screen, rather than by device identity. Retain the existing app-menu breakpoint at 640px.

The lower tablet boundary is provisional until populated rows demonstrate that the controls fit. If 768px cannot support this arrangement with the agreed touch sizes, bring the boundary adjustment back for review.

## Existing constraints

Use the same DOM at every viewport and CSS for responsive layout, without resize handlers or viewport-conditional rendering. Keep combat actions and persistence behavior independent of presentation.

## Validation before completion

- Verify populated encounters at 768px, 1024px, and 1366px, including long creature names, populated HP, multiple conditions, and long notes.
- Verify widths immediately around the tablet boundaries, plus existing phone and desktop coverage.
- Check field grouping, visible controls, touch target sizes, and absence of horizontal page overflow with relational browser assertions.
- Check that condition pickers and creature menus remain usable and within the viewport.
- Verify active-creature and downed indicators remain clear, and crowded rows grow without overlapping controls.
- Run the repository's full UI validation command, `npm run check:all`, before committing an implementation.

## Implementation validation

- Populated rows pass relational Chromium checks at 768px, 1024px, and 1366px, with boundary coverage at 767px, 769px, 1399px, 1400px, and 1401px, plus phone and desktop coverage at 320px and 1600px.
- Compact controls retain 46–48px heights; conditions and long notes grow the row without overlap or horizontal overflow. Creature menus, condition pickers, and growing note pickers stay within the viewport.
- `npm run check:all` passes on Node 24.15.0: lint, strict type checking, 97 unit/component tests, production build, and 14 Chromium acceptance tests.

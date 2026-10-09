# Tablet encounter layout

Status: final design. The tablet range remains 768px through 1400px.

## Layout

Use a continuous table with small column captions above each creature and horizontal creature separators. Each creature wraps onto three lines without card borders, rounded containers, or gaps between creatures.

| Line   | Fields in order                                                                  |
| ------ | -------------------------------------------------------------------------------- |
| First  | Initiative, name, AC, Max HP, Temp HP, current HP, damage/healing, creature menu |
| Second | Conditions, across the full row                                                  |
| Third  | Other, across the full row                                                       |

Current HP sits beside damage/healing. Keep the amount input compact, numeric columns narrow, and the name column flexible. Current HP gains space at wider tablet widths. Main controls retain 46–48px heights; tag controls use the compact desktop style. Conditions and Other have inline captions that anchor their empty Add controls. Tags wrap naturally and crowded creatures grow taller.

Keep the existing HP bar, active-turn stripe and TURN flag, downed indicator, and creature menu. Each creature has captions above its primary controls, including when fields are populated. Tablet inputs use no text labels as placeholders.

## Responsive behavior

Below 768px, keep phone cards. Above 1400px, keep the desktop table. Retain the app-menu breakpoint at 640px. Use the same DOM at every viewport, with CSS controlling layout and no resize handlers or viewport-conditional rendering.

Combat actions and browser persistence remain independent of presentation. Damage/healing requires an explicit action, and the existing keyboard and editing behavior continues to apply.

## Validation

Check populated and crowded encounters at 768px, 1024px, and 1366px, plus widths immediately around the tablet boundaries and existing phone/desktop coverage. Assert per-creature captions, adjacent health controls, full-width tag lines, visible tags, growing row height, and absence of overflow. Verify menus and pickers remain within the viewport, along with focus restoration, active/downed indicators, and turn order.

Run `npm run check:all` before committing UI changes.

## Design source

The selected wrapped-table prototype, including the final column widths, is preserved on the local branch `prototype/tablet-layout-20261009`. The production application contains the chosen layout without sample data or prototype controls.

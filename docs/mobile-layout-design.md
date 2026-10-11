# Mobile encounter layout

Status: accepted design. Mobile remains below 768px; tablet and desktop layouts keep their existing ranges and arrangement.

## Layout

Use continuous creature rows with horizontal separators, repeated field captions, and the tablet's controls. Mobile inputs have subtle always-visible outlines and a light fill to identify editable fields; retain the tablet's hover and focus feedback. Keep the active-turn stripe, TURN flag, downed indicator, and creature actions menu.

| Line   | Fields in order                             |
| ------ | ------------------------------------------- |
| First  | Initiative, name, AC, creature actions menu |
| Second | Max HP, Temp HP, Damage / Heal              |
| Third  | Current HP bar                              |
| Fourth | Conditions                                  |
| Fifth  | Other                                       |

Max HP and Temp HP share equal widths; Damage / Heal takes the remaining space. Its amount input, Dmg button, and Heal button each occupy one third of the control. When the two HP fields and the complete Damage / Heal control cannot fit comfortably, the HP fields share one line and Damage / Heal fills the following line. Conditions and Other retain their lines and Add controls when empty. The Current HP caption has the same gap below the preceding inputs as the Max HP caption.

The UI's Max HP label refers to Total HP in the glossary. The responsive layout changes presentation only, using the same DOM at every viewport. Combat actions, keyboard editing behavior, and persistence keep their existing behavior.

## Validation

Compare populated, empty, active, downed, and crowded rows at 320px, 360px, 375px, 390px, and 767px. Check that the HP controls wrap together as agreed, the HP bar spans the row below them, and tags, menus, and pickers stay usable without horizontal overflow. Also check the 768px tablet boundary and desktop layout.

Run `npm run check:all` to validate the application.

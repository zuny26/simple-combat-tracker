# 02: Confirm profile overwrites

**What to build:** Let the DM update an existing saved profile by bookmarking a creature with changed AC or Max HP, reviewing the precise changes before accepting or canceling.

**Blocked by:** 01: Save profiles and show bookmark states.

**Status:** completed

- [x] Bookmarking an existing normalized name with changed AC or Max HP opens a confirmation identifying the saved profile and highlighting each changed value with its existing and proposed values; unchanged stats are not presented as changes.
- [x] Saving Goblin 2 with AC 15 and Max HP 12 against saved Goblin with AC 13 and Max HP 7 shows AC: 13 → 15 and Max HP: 7 → 12. A change to either stat alone also prompts correctly.
- [x] Confirming updates the existing saved profile and persists it without creating another profile. Canceling leaves the saved profile unchanged. Neither operation changes any encounter creature.
- [x] Encounter edits never update saved profiles automatically. Bookmark states on all affected rows refresh after confirmation; matching equivalent-name saves remain no-ops.
- [x] Confirmation supports keyboard access, Escape cancellation, modal focus containment, and focus restoration consistent with existing encounter confirmations.
- [x] Cover confirmation content, acceptance, cancellation, profile persistence, and encounter isolation at their owning seams, with Chromium coverage of modal focus behavior. Run the full required validation.

## Implementation

Implemented in `53f33db` and refined in `44cd633`. The confirmation uses one heading identifying the saved profile and lists only changed AC and Max HP values. Accepting persists the existing profile; canceling preserves it. Encounter creatures remain unchanged, and bookmark states refresh across equivalent names.

**Validation:** `npm run check:all` passed on Node 24.15.0: formatting, lint, strict type checking, 177 Vitest tests, production build, and 28 Chromium tests, including modal keyboard access, Escape cancellation, focus containment, and restoration at mobile and desktop widths. Standards and spec reviews reported no findings for the implementation.

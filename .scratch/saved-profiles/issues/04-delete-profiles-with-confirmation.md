# 04: Delete profiles with confirmation

**What to build:** Let the DM delete a saved profile from its Name autocomplete suggestion after confirmation, keeping encounter creatures unchanged.

**Blocked by:** 03: Reuse profiles through Name autocomplete.

**Status:** implemented

- [x] Every suggestion has an accessible trashcan button. Activating it identifies the profile in a deletion confirmation without applying the suggestion or changing the current creature's Name, AC, or Max HP.
- [x] Close the autocomplete before opening confirmation. Keyboard and pointer activation both keep deletion distinct from selecting a suggestion.
- [x] Canceling, including Escape cancellation, retains the profile. Confirming removes only the identified profile and persists deletion across reloads.
- [x] Updating autocomplete contents and bookmark states reflects confirmed deletion immediately; every creature already in the encounter keeps its values, including creatures previously filled from the deleted profile.
- [x] Confirmation uses the existing modal focus behavior and returns focus to a sensible connected control when the suggestion or its trashcan button is no longer present.
- [x] Cover cancellation, confirmed deletion, persistence, bookmark refresh, and encounter isolation at their owning seams. Chromium verifies picker closure before confirmation, keyboard/focus behavior, and that deletion never applies a suggestion. Run the full required validation.

## Completed implementation

- Every Name suggestion has a labeled trashcan button that closes the picker before opening the existing deletion confirmation. Arrow keys select a suggestion; Right Arrow focuses its trashcan, and Enter or Space requests deletion without applying the suggestion. Tab, Shift+Tab, and Escape preserve dismissal and focus behavior.
- Cancel and Escape retain profiles. Confirm deletes only the identified profile, persists the deletion, updates autocomplete contents and bookmarks immediately, and preserves all encounter values and undo history. Modal dismissal restores focus to the connected Name input without reopening suggestions.

## Validation

`npm run check:all` passed with Node 24.15.0: formatting, lint, strict type checking, 185 Vitest tests, production build, and 31 Chromium tests. Registry, component, and browser coverage verifies cancellation, confirmation, persistence, bookmark refresh, encounter isolation, picker removal before dialog insertion, keyboard activation, focus restoration, and mobile/desktop behavior. Standards and spec reviews found no remaining issues after correcting Escape dismissal from a focused trashcan.

Implemented on `feat/saving-profiles` in commit `a0cb060`.

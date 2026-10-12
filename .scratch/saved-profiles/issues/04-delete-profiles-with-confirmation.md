# 04: Delete profiles with confirmation

**What to build:** Let the DM delete a saved profile from its Name autocomplete suggestion after confirmation, keeping encounter creatures unchanged.

**Blocked by:** 03: Reuse profiles through Name autocomplete.

**Status:** ready-for-agent

- [ ] Every suggestion has an accessible trashcan button. Activating it identifies the profile in a deletion confirmation without applying the suggestion or changing the current creature's Name, AC, or Max HP.
- [ ] Close the autocomplete before opening confirmation. Keyboard and pointer activation both keep deletion distinct from selecting a suggestion.
- [ ] Canceling, including Escape cancellation, retains the profile. Confirming removes only the identified profile and persists deletion across reloads.
- [ ] Updating autocomplete contents and bookmark states reflects confirmed deletion immediately; every creature already in the encounter keeps its values, including creatures previously filled from the deleted profile.
- [ ] Confirmation uses the existing modal focus behavior and returns focus to a sensible connected control when the suggestion or its trashcan button is no longer present.
- [ ] Cover cancellation, confirmed deletion, persistence, bookmark refresh, and encounter isolation at their owning seams. Chromium verifies picker closure before confirmation, keyboard/focus behavior, and that deletion never applies a suggestion. Run the full required validation.

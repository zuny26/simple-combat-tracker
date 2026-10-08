# Issue tracker: Local Markdown

Specs and issues live under `.scratch/<feature>/`.

## Conventions

- One feature per directory, using a descriptive slug.
- Spec: `.scratch/<feature>/spec.md`.
- Tickets: `.scratch/<feature>/issues/<NN>-<slug>.md`, numbered from `01`,
  with one file per ticket.
- Triage role: a `Status:` line near the top, using `triage-labels.md`.
- Comments: append under `## Comments`.

When a skill says to publish to the issue tracker, create the appropriate
file here. When it says to fetch a ticket, read the referenced file.

## Wayfinding

- Map: `.scratch/<feature>/map.md`, containing Notes, Decisions-so-far,
  and Fog.
- Decision tickets use the same numbered issue files, with a `Type:` line:
  `research`, `prototype`, `grilling`, or `task`.
- Dependencies: `Blocked by: NN, NN` near the top. A ticket is unblocked
  when every listed blocker is resolved.
- Select the first open, unblocked, unclaimed ticket by number.
- Claim: set `Status: claimed` before working.
- Resolve: append `## Answer`, set `Status: resolved`, and add a summary
  and link to the map's Decisions-so-far.

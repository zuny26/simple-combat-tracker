# Issue tracker: GitHub

Specs and tickets live in GitHub Issues for `zuny26/simple-combat-tracker`.
Use the `gh` CLI from this clone; pass `--repo zuny26/simple-combat-tracker`
when running elsewhere.

## Conventions

- Create: `gh issue create --title "..." --body-file <file>`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,body,labels`,
  adding `--label` or changing `--state` as needed.
- Update: `gh issue edit <number> --body-file <file>`.
- Comment: `gh issue comment <number> --body-file <file>`.
- Apply/remove labels: `gh issue edit <number> --add-label "..."`
  or `--remove-label "..."`. Use `triage-labels.md` for role names.
- Close: `gh issue close <number> --comment "..."`.

For multiline bodies and comments, write the exact Markdown to a temporary
file and use `--body-file`. Reference tickets by issue number or URL.

When a skill says to publish to the issue tracker, create a GitHub issue.
When it says to fetch a ticket, read the referenced GitHub issue.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Wayfinding

- Map: one issue labelled `wayfinder:map`, containing Notes,
  Decisions-so-far, and Fog.
- Tickets: separate issues labelled `wayfinder:<type>` (`research`,
  `prototype`, `grilling`, or `task`), linked as sub-issues when available.
  Otherwise, put `Part of #<map>` at the top of each ticket and add it
  to a task list in the map body. Create missing wayfinding labels when used.
- Dependencies: use native GitHub issue dependencies when available;
  otherwise put `Blocked by: #<number>, #<number>` near the top.
  A ticket is unblocked when every listed blocker is closed.
- Select the first open, unblocked, unassigned ticket in map order.
- Claim: `gh issue edit <number> --add-assignee @me` before working.
- Resolve: comment with the answer, close the ticket, and add a summary
  and issue link to the map's Decisions-so-far.

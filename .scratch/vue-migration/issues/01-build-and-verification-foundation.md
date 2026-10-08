# 01: Establish Vite tooling and pushed-commit verification

**What to build:** Keep the existing tracker usable while introducing the development, build, and verification tools needed for the Vue replacement. The public tracker continues using its existing deployment until cutover.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The existing application is served and built with Vite, and its encounter workflows remain runnable with passing applicable checks.
- [x] Vue Composition API, TypeScript single-file component tooling, strict TypeScript checking, Vitest, and Vue Test Utils are available. Type checking runs explicitly; a successful Vite build does not substitute for it.
- [x] ESLint covers the introduced TypeScript and Vue code as well as still-active legacy code.
- [x] GitHub Actions verifies pushed commits, retaining applicable legacy unit, DOM, and Chromium checks. No local hooks or required pull-request workflow are introduced.
- [x] Every existing test is audited by the failure it detects, with a recorded decision to retain, port, consolidate, or retire it as the relevant implementation migrates. Browser focus and geometry remain browser responsibilities.
- [x] Generated build, test-report, and cache output is ignored. Public deployment configuration and behavior are unchanged; automatic replacement deployment is not enabled.
- [x] Repository guidance describes the actual development, build, preview, and verification commands available at this milestone and links to the governing migration decisions.

## Answer

Established Vite development/build/preview for the existing tracker at the expected
`/simple-combat-tracker/` base. Added Vue, strict explicit Vue/TypeScript checking,
Vitest/Vue Test Utils with a typed test-only Composition API SFC, and ESLint coverage
for the introduced files. Push-only GitHub Actions runs the complete checks; deployment
configuration and the public application remain unchanged.

All 108 existing tests are retained and individually audited in
[the test responsibility audit](../../../docs/migrations/test-audit.md). Chromium now
runs against generated output, with an additional real-UI encounter/HP/reload check
that does not reseed storage. Generated output is ignored, and `AGENTS.md` documents
the milestone's commands and governing decisions.

Validation: `npm run check:all` passed lint, explicit strict typechecking, 76 legacy
unit/DOM tests, one Vitest mounted-SFC test, production build, and 33 Chromium cases.
Typechecking also passed after aligning Node type definitions with CI's Node 24.
The artifact-path acceptance test failed against the former source server before
passing against Vite preview; the SFC test failed before its fixture was introduced.

### Standards review

No documented-standard violations or actionable baseline smells found (0 findings).

### Spec review

No missing/partial requirements, scope creep, or incorrect implementations found
(0 findings). Reviewed against starting commit `8c383bd`.

Decision summary: [migration map — Decisions-so-far](../map.md#decisions-so-far).

# Own combat state through an app-scoped module

Each app/test creates one combat instance. Named actions own encounter invariants and centrally save completed changes; callers read state and request actions. Combat rules stay independent of Vue and browser globals. Inject storage so persistence and failure recovery can be tested without browser setup.

Vue's built-in reactivity is sufficient for this encounter; a separate state-management library is unnecessary. Drafts, menus, picker queries, and confirmation belong to the UI and never persist. Encounter and preference storage remain independent so combat reset preserves theme/help settings.

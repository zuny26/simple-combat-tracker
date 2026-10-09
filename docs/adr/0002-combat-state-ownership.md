# Own combat state through an app-scoped module

One combat module owns the encounter state and exposes named actions. UI modules read state and request changes through those actions; combat rules remain independent of Vue, and persistence is coordinated centrally after changes. Each application or test creates its own instance, avoiding shared module-level state and global browser setup.

Vue's built-in reactivity connects the combat module to the UI. Transient interaction state, including open menus, search text, and pending damage amounts, belongs to the UI. Built-in reactivity is sufficient for the app-scoped encounter, so a separate state-management library is unnecessary.

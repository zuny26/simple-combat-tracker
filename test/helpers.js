// helpers.js — test-only utilities. NOT a test file; the `test/*.test.js` glob
// deliberately excludes it.

// Install an in-memory localStorage on globalThis. state.js reads storage only
// inside save()/load(), never at module load, so this may be called at any point
// before those run. Each call starts from an empty store.
export function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => { store.set(String(k), String(v)); },
    removeItem: (k) => { store.delete(String(k)); },
    clear: () => { store.clear(); },
  };
  return globalThis.localStorage;
}

/**
 * Tiny reactive store — no framework needed.
 * Usage:
 *   import { store } from '/js/state.js';
 *   store.subscribe(state => console.log(state));
 *   store.set({ unread: store.get().unread + 1 });
 */
function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();

  return {
    get() { return state; },
    set(partial) {
      state = { ...state, ...partial };
      listeners.forEach(fn => fn(state));
    },
    subscribe(fn) {
      listeners.add(fn);
      fn(state);
      return () => listeners.delete(fn);
    },
  };
}

export const store = createStore({
  user: null,
  profile: null,
  unread: 0,
});

import { w as writable } from "./index.js";
let nextId = 0;
function createToastStore() {
  const { subscribe, update } = writable([]);
  return {
    subscribe,
    add(type, message, duration = 5e3) {
      const id = nextId++;
      update((items) => [...items, { id, type, message }]);
      if (duration > 0) {
        setTimeout(() => this.remove(id), duration);
      }
    },
    remove(id) {
      update((items) => items.filter((t) => t.id !== id));
    }
  };
}
const toasts = createToastStore();
export {
  toasts as t
};

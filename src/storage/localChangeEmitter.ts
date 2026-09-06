// src/storage/localChangeEmitter.ts
type Listener = () => void;
const listeners: Listener[] = [];

export function onLocalChange(fn: Listener) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function emitLocalChange() {
  listeners.forEach((fn) => fn());
}

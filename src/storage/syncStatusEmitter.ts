// src/storage/syncStatusEmitter.ts
type Listener = (emAndamento: boolean) => void;
const listeners: Listener[] = [];

export function onSyncStatusChange(fn: Listener) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function emitSyncStatusChange(emAndamento: boolean) {
  listeners.forEach((fn) => fn(emAndamento));
}

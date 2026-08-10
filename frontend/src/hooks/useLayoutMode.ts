import { useSyncExternalStore } from 'react';

export type LayoutMode = 'auto' | 'mobile' | 'web';

const STORAGE_KEY = 'logger_layout_mode';

function readStored(): LayoutMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'mobile' || v === 'web' || v === 'auto') return v;
  } catch {}
  return 'auto';
}

function applyToDom(mode: LayoutMode) {
  const root = document.documentElement;
  if (mode === 'auto') {
    root.removeAttribute('data-layout');
  } else {
    root.setAttribute('data-layout', mode);
  }
}

let currentMode: LayoutMode = readStored();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

export function setLayoutMode(mode: LayoutMode) {
  if (mode === currentMode) return;
  currentMode = mode;
  applyToDom(mode);
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): LayoutMode {
  return currentMode;
}

export function useLayoutMode() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { mode, setMode: setLayoutMode };
}

export function getStoredLayoutMode(): LayoutMode {
  return readStored();
}

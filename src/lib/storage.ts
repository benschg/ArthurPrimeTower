/** localStorage that never throws: without storage (prerender, private mode, blocked) reads are empty and writes are dropped. */
export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

/** A game's best score (or time) under `key`; 0 when there is none yet. */
export function bestScore(key: string) {
  return {
    read: (): number => Number(readStored(key)) || 0,
    write: (v: number): void => writeStored(key, String(v)),
  };
}

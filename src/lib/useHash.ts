"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const read = () => window.location.hash.slice(1);
const server = () => "";

/** The URL hash without its "#", kept in step with hashchange; empty while prerendering, so it hydrates cleanly. */
export function useHash(): string {
  return useSyncExternalStore(subscribe, read, server);
}

import { useEffect } from "react";

type StaticLoader = () => Promise<unknown>;

/** Warm only code assets; API responses and private user data are never prefetched. */
export async function warmStaticRoutes(loaders: readonly StaticLoader[], active: () => boolean, loaded: Set<StaticLoader>) {
  let failed = 0;
  for (const load of loaders) {
    if (!active()) break;
    if (loaded.has(load)) continue;
    try {
      await load();
      loaded.add(load);
    } catch {
      failed += 1; // Keep this asset eligible for the next online event.
    }
  }
  return { loaded: loaded.size, failed };
}

export function useStaticRouteWarmup(loaders: readonly StaticLoader[]) {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let active = true;
    let running = false;
    let timer: number | undefined;
    let idle: number | undefined;
    const loaded = new Set<StaticLoader>();
    const canWarm = () => active && navigator.onLine && !!navigator.serviceWorker.controller;
    const run = async () => {
      if (!canWarm() || running) return;
      running = true;
      try { await warmStaticRoutes(loaders, canWarm, loaded); }
      finally { running = false; }
    };
    const schedule = () => {
      if (!canWarm() || running || timer !== undefined || idle !== undefined || loaded.size === loaders.length) return;
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(() => { idle = undefined; void run(); });
      } else {
        timer = window.setTimeout(() => { timer = undefined; void run(); }, 1500);
      }
    };
    schedule();
    navigator.serviceWorker.addEventListener("controllerchange", schedule);
    window.addEventListener("online", schedule);
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      navigator.serviceWorker.removeEventListener("controllerchange", schedule);
      window.removeEventListener("online", schedule);
    };
  }, [loaders]);
}

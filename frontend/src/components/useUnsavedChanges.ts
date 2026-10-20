import { useEffect } from "react";

type Guard = { message: string; route: string; index: number | undefined; state: unknown };
const guards = new Map<symbol, Guard>();
let installed = false;
let restoring = false;

/** Install before BrowserRouter's history listener so a cancelled traversal
 * cannot schedule a route transition and unmount the editor. */
export function installUnsavedChangesGuard() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const current = () => Array.from(guards.values()).at(-1);
  window.addEventListener("beforeunload", (event) => {
    if (!current()) return;
    event.preventDefault(); event.returnValue = "";
  });
  document.addEventListener("click", (event) => {
    const guard = current();
    if (!guard || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
    const target = new URL(anchor.href, window.location.href);
    if (target.origin === window.location.origin && target.pathname + target.search === guard.route) return;
    if (!window.confirm(guard.message)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  window.addEventListener("popstate", (event) => {
    if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
    const guard = current();
    if (!guard) return;
    const nextIndex = event.state?.idx as number | undefined;
    if (window.location.pathname + window.location.search === guard.route) { guard.index = nextIndex; return; }
    if (window.confirm(guard.message)) return;
    event.stopImmediatePropagation();
    if (typeof guard.index === "number" && typeof nextIndex === "number" && guard.index !== nextIndex) {
      restoring = true;
      window.history.go(guard.index - nextIndex);
    } else {
      window.history.replaceState(guard.state, "", guard.route);
    }
  }, true);
}

/** Editors register only while their local draft is dirty. Credentials remain
 * in component memory; no password is persisted by this guard. */
export function useUnsavedChanges(active: boolean, message: string) {
  useEffect(() => {
    installUnsavedChangesGuard();
    if (!active) return;
    const key = Symbol("unsaved-editor");
    guards.set(key, { message, route: window.location.pathname + window.location.search, index: window.history.state?.idx, state: window.history.state });
    return () => { guards.delete(key); };
  }, [active, message]);
}

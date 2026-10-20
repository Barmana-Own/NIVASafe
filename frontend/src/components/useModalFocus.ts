import { useEffect, useRef, type RefObject } from "react";

const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';

export function modalFocusableElements(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => element.getClientRects().length > 0 && !element.closest('[inert], [hidden], [aria-hidden="true"]') && element.tabIndex >= 0);
}

/** Owns keyboard focus only while this visible modal scope is active. */
export function useModalFocus<T extends HTMLElement>(scope: RefObject<T | null>, active: boolean, onDismiss: () => void) {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    const element = scope.current;
    if (!active || !element) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const initial = element.querySelector<HTMLElement>('[data-autofocus="true"]') ?? modalFocusableElements(element)[0] ?? element;
      initial.focus({ preventScroll: true });
    });
    function keyboard(event: KeyboardEvent) {
      if (event.defaultPrevented || !element) return;
      // A nested body-part editor owns Escape and Tab while focus is inside it.
      const focusedDialog = document.activeElement instanceof HTMLElement ? document.activeElement.closest('[role="dialog"][aria-modal="true"]') : null;
      if (focusedDialog && focusedDialog !== element && element.contains(focusedDialog)) return;
      const focusLost = document.activeElement === document.body || document.activeElement === document.documentElement;
      if (!element.contains(document.activeElement)) {
        const modals = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')).filter((modal) => modal.getClientRects().length > 0);
        if (!focusLost || modals.at(-1) !== element) return;
      }
      if (event.key === "Escape") {
        if (element.querySelector('[aria-expanded="true"][aria-haspopup]')) return;
        event.preventDefault();
        event.stopPropagation();
        dismiss.current();
      }
      if (event.key !== "Tab") return;
      const controls = modalFocusableElements(element);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) { event.preventDefault(); element.focus(); return; }
      if (focusLost) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [active, scope]);
}

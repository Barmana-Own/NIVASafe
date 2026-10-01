import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";

export const OVERLAY_ROOT_ID = "nivasafe-overlay-root";

export function getOverlayRoot() {
  if (typeof document === "undefined") return null;
  const root = document.getElementById(OVERLAY_ROOT_ID) ?? document.createElement("div");
  if (!root.id) {
    root.id = OVERLAY_ROOT_ID;
    root.setAttribute("data-overlay-root", "true");
    document.body.appendChild(root);
  }
  const themedApp = document.querySelector<HTMLElement>(".app[data-theme]");
  if (themedApp?.dataset.theme) root.dataset.theme = themedApp.dataset.theme;
  else delete root.dataset.theme;
  const direction = document.documentElement.dir || themedApp?.dir;
  if (direction) root.dir = direction;
  return root;
}

export function OverlayPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  const root = getOverlayRoot();
  return root ? createPortal(children, root) : null;
}

export type FloatingPlacement = "auto" | "bottom" | "top";
export type FloatingPosition = { top: number; left: number; width: number; maxHeight: number; direction: "ltr" | "rtl" };

export function getFloatingPosition(trigger: HTMLElement, options: { minWidth?: number; maxHeight?: number; placement?: FloatingPlacement; gap?: number; margin?: number } = {}): FloatingPosition {
  const { minWidth = 0, maxHeight: requestedMaxHeight = 320, placement = "auto", gap = 6, margin = 8 } = options;
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight;
  const availableWidth = Math.max(0, viewportWidth - margin * 2);
  const width = Math.min(Math.max(rect.width, minWidth), availableWidth);
  const below = Math.max(0, viewportHeight - rect.bottom - gap - margin);
  const above = Math.max(0, rect.top - gap - margin);
  const maxHeight = Math.max(96, Math.min(requestedMaxHeight, Math.max(below, above, 96)));
  const opensAbove = placement === "top" || (placement === "auto" && below < Math.min(180, maxHeight) && above > below);
  const top = opensAbove
    ? Math.max(margin, rect.top - gap - maxHeight)
    : Math.min(Math.max(margin, rect.bottom + gap), Math.max(margin, viewportHeight - margin - maxHeight));
  const left = Math.min(Math.max(margin, rect.left), Math.max(margin, viewportWidth - margin - width));
  const direction = getComputedStyle(trigger).direction === "rtl" ? "rtl" : "ltr";
  return { top, left, width, maxHeight, direction };
}

export function useFloatingPosition(triggerRef: RefObject<HTMLElement | null>, open: boolean, options: { minWidth?: number; maxHeight?: number; placement?: FloatingPlacement; gap?: number; margin?: number } = {}) {
  const { minWidth = 0, maxHeight = 320, placement = "auto", gap = 6, margin = 8 } = options;
  const [position, setPosition] = useState<FloatingPosition | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }
    const update = () => {
      if (triggerRef.current) setPosition(getFloatingPosition(triggerRef.current, { minWidth, maxHeight, placement, gap, margin }));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [gap, margin, maxHeight, minWidth, open, placement, triggerRef]);
  return position;
}

let scrollLockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingInlineEnd = "";
let previousDocumentOverflow = "";

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return undefined;
    if (scrollLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      previousBodyPaddingInlineEnd = document.body.style.paddingInlineEnd;
      previousDocumentOverflow = document.documentElement.style.overflow;
      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      if (scrollbarWidth > 0) document.body.style.paddingInlineEnd = `calc(${previousBodyPaddingInlineEnd || "0px"} + ${scrollbarWidth}px)`;
    }
    scrollLockCount += 1;
    return () => {
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.body.style.paddingInlineEnd = previousBodyPaddingInlineEnd;
        document.documentElement.style.overflow = previousDocumentOverflow;
      }
    };
  }, [locked]);
}

export function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>([
    "a[href]",
    "area[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type=hidden])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[contenteditable=true]",
    "[tabindex]:not([tabindex='-1'])",
  ].join(","))).filter((element) => element.getClientRects().length > 0);
}

function hasOpenFloatingOverlay() {
  return Boolean(document.querySelector(`#${OVERLAY_ROOT_ID} .styled-select-menu, #${OVERLAY_ROOT_ID} .localized-date-popover, #${OVERLAY_ROOT_ID} .language-menu, #${OVERLAY_ROOT_ID} .theme-options-menu, #${OVERLAY_ROOT_ID} .report-inline-details-popover`));
}

const floatingFocusSelector = `#${OVERLAY_ROOT_ID} .styled-select-menu, #${OVERLAY_ROOT_ID} .localized-date-popover, #${OVERLAY_ROOT_ID} .language-menu, #${OVERLAY_ROOT_ID} .theme-options-menu, #${OVERLAY_ROOT_ID} .report-inline-details-popover`;

function focusScopeElements(dialog: HTMLElement) {
  const elements = focusableElements(dialog);
  document.querySelectorAll<HTMLElement>(floatingFocusSelector).forEach((overlay) => {
    elements.push(...focusableElements(overlay));
  });
  return Array.from(new Set(elements));
}

function isInFocusScope(dialog: HTMLElement, element: Element | null) {
  return Boolean(element && (dialog.contains(element) || (element instanceof HTMLElement && element.closest(floatingFocusSelector))));
}

export function useOverlayDialog(open: boolean, onClose: (() => void) | undefined, dialogRef: RefObject<HTMLElement | null>) {
  const onCloseRef = useRef(onClose);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  useBodyScrollLock(open);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        if (hasOpenFloatingOverlay()) return;
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const elements = focusScopeElements(dialogRef.current);
      if (!elements.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const activeIndex = active ? elements.indexOf(active) : -1;
      if (!isInFocusScope(dialogRef.current, active) || activeIndex < 0) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      const nextIndex = activeIndex + (event.shiftKey ? -1 : 1);
      if (nextIndex < 0 || nextIndex >= elements.length) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    const focusTimer = window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>("[autofocus]") ?? dialogRef.current;
      target?.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocusedRef.current?.focus({ preventScroll: true });
      previouslyFocusedRef.current = null;
    };
  }, [dialogRef, open]);
}

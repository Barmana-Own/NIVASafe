import { useLayoutEffect, useState, type RefObject } from "react";

type MenuPlacement = { side: "top" | "bottom"; maxHeight: number };

export function menuContentHeight(menu: { scrollHeight: number; offsetHeight: number; clientHeight: number; children: ArrayLike<{ scrollHeight: number; clientHeight: number }> }) {
  const childOverflow = Array.from(menu.children).reduce((height, child) => height + Math.max(0, child.scrollHeight - child.clientHeight), 0);
  return menu.scrollHeight + menu.offsetHeight - menu.clientHeight + childOverflow;
}

export function calculateMenuPlacement(anchor: { top: number; bottom: number }, bounds: { top: number; bottom: number }, desiredHeight: number, gap = 6): MenuPlacement {
  const above = Math.max(0, anchor.top - bounds.top - gap);
  const below = Math.max(0, bounds.bottom - anchor.bottom - gap);
  const side = below >= desiredHeight || below >= above ? "bottom" : "top";
  return { side, maxHeight: Math.max(0, Math.min(desiredHeight, side === "top" ? above : below)) };
}

/** Keep an inline menu inside the visible viewport and any clipping scroll container. */
export function useMenuPlacement(open: boolean, anchorRef: RefObject<HTMLElement | null>, menuRef: RefObject<HTMLElement | null>, heightLimit = 320, gap = 6) {
  const [placement, setPlacement] = useState<(MenuPlacement & { visible: boolean }) | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!open || !anchor || !menu) return;
    const containers: HTMLElement[] = [];
    for (let parent = anchor.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) containers.push(parent);
    }
    const update = () => {
      const viewport = window.visualViewport;
      let top = (viewport?.offsetTop ?? 0) + 8;
      let bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? document.documentElement.clientHeight) - 8;
      for (const container of containers) {
        const rect = container.getBoundingClientRect();
        top = Math.max(top, rect.top + container.clientTop + 8);
        bottom = Math.min(bottom, rect.top + container.clientTop + container.clientHeight - 8);
      }
      // A flex popup can constrain its scrolling child during the loading state.
      // Include that child's overflow so arriving content can grow the popup again.
      const naturalHeight = menuContentHeight(menu);
      const desiredHeight = Math.min(naturalHeight, heightLimit, (viewport?.height ?? document.documentElement.clientHeight) * .52);
      const rect = anchor.getBoundingClientRect();
      const next = { ...calculateMenuPlacement(rect, { top, bottom }, desiredHeight, gap), visible: rect.bottom > top && rect.top < bottom && bottom > top };
      setPlacement((previous) => previous?.side === next.side && previous.maxHeight === next.maxHeight && previous.visible === next.visible ? previous : next);
    };
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    const observer = new ResizeObserver(schedule);
    [anchor, menu, ...containers].forEach((element) => observer.observe(element));
    const contentObserver = new MutationObserver(schedule);
    contentObserver.observe(menu, { childList: true, subtree: true, characterData: true });
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      contentObserver.disconnect();
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
    };
  }, [open, anchorRef, menuRef, heightLimit, gap]);

  return { "data-placement": placement?.side ?? "bottom", style: placement ? { maxHeight: placement.maxHeight, visibility: placement.visible ? "visible" as const : "hidden" as const } : undefined };
}

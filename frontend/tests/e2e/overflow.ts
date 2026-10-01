import type { Page } from "@playwright/test";

/**
 * Deliberately small overflow allowlist:
 * - the closed mobile drawer is positioned outside the viewport by design;
 * - the closed assistant conversation drawer is positioned outside the
 *   assistant viewport by design;
 * - descendants of a bounded table scroller may be wider than the viewport on
 *   tablet/desktop, but the scroller itself must remain inside the viewport;
 * - no allowance is made for a horizontal scroller below 768px.
 */
export const OVERFLOW_ALLOWLIST = [
  "#app-sidebar:not(.open) (closed off-canvas drawer)",
  ".assistant-layout:not(.history-open) .conversation-panel (closed off-canvas history drawer)",
  ".table-wrap / [data-overflow-container=horizontal] descendants at >=768px (bounded data scroller)",
] as const;

export const OVERFLOW_TOLERANCE = 2;

export type OverflowDiagnostic = {
  selector: string;
  tag: string;
  className: string;
  left: number;
  right: number;
  width: number;
  viewportWidth: number;
  display: string;
  overflow: string;
  position: string;
  cssLeft: string;
  cssRight: string;
  transform: string;
  direction: string;
  whiteSpace: string;
  minWidth: string;
  maxWidth: string;
  text: string;
};

export type InternalScrollerDiagnostic = {
  selector: string;
  left: number;
  right: number;
  width: number;
  clientWidth: number;
  scrollWidth: number;
  overflowX: string;
  focusableCount: number;
};

export type OverflowReport = {
  viewport: { width: number; height: number };
  document: { scrollWidth: number; clientWidth: number; bodyScrollWidth: number; bodyClientWidth: number };
  pageOverflow: Array<{ source: string; scrollWidth: number; clientWidth: number; limit: number }>;
  viewportEscapes: OverflowDiagnostic[];
  intentionalScrollers: InternalScrollerDiagnostic[];
  phoneScrollers: InternalScrollerDiagnostic[];
  responsiveTables: Array<{ selector: string; dataResponsive: string; tableDisplay: string; tableMinWidth: string; tableScrollWidth: number; tableClientWidth: number }>;
};

export async function collectOverflowReport(page: Page, tolerance = OVERFLOW_TOLERANCE): Promise<OverflowReport> {
  return page.evaluate(({ tolerance }) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const root = document.documentElement;
    const body = document.body;
    const numeric = (value: number) => Math.round(value * 100) / 100;
    const selectorFor = (element: Element) => {
      const parts: string[] = [];
      let current: Element | null = element;
      let depth = 0;
      while (current && current !== document.body && depth < 5) {
        const node = current as HTMLElement;
        let part = current.tagName.toLowerCase();
        if (node.id) part += `#${node.id}`;
        if (node.classList.length) part += `.${Array.from(node.classList).slice(0, 3).join(".")}`;
        const parent = current.parentElement;
        if (parent) {
          const sameTag = Array.from(parent.children).filter((child) => child.tagName === current?.tagName);
          if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
        }
        parts.unshift(part);
        current = current.parentElement;
        depth += 1;
      }
      return parts.join(" > ") || element.tagName.toLowerCase();
    };
    const visible = (element: HTMLElement, rect: DOMRect, style: CSSStyleDeclaration) => {
      if (style.display === "none" || style.visibility === "hidden" || style.contentVisibility === "hidden") return false;
      if (Number.parseFloat(style.opacity || "1") === 0) return false;
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (element.matches(".sr-only, .visually-hidden, [hidden]")) return false;
      let ancestor: Element | null = element.parentElement;
      while (ancestor && ancestor !== document.body) {
        const ancestorStyle = getComputedStyle(ancestor);
        const ancestorRect = ancestor.getBoundingClientRect();
        const isVisuallyHidden = ancestor.matches(".sr-only, .visually-hidden, [hidden]")
          || (ancestorStyle.position === "absolute"
            && ancestorRect.width <= 1
            && ancestorRect.height <= 1
            && (ancestorStyle.clip !== "auto" || ancestorStyle.clipPath !== "none"));
        if (isVisuallyHidden) return false;
        ancestor = ancestor.parentElement;
      }
      return rect.bottom >= 0 && rect.top <= viewportHeight;
    };
    const closedDrawer = (element: Element) => Boolean(element.closest("#app-sidebar:not(.open)"));
    const closedAssistantHistory = (element: Element) => Boolean(element.closest(".assistant-layout:not(.history-open) .conversation-panel"));
    const horizontalScroller = (element: Element) => element.closest<HTMLElement>(".table-wrap, [data-overflow-container='horizontal']");
    const scrollerIsBounded = (scroller: HTMLElement) => {
      const style = getComputedStyle(scroller);
      return style.overflowX === "auto" || style.overflowX === "scroll"
        ? scroller.scrollWidth > scroller.clientWidth + tolerance
        : false;
    };
    const textSnippet = (element: HTMLElement) => (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 180);
    const diagnostics: OverflowDiagnostic[] = [];
    const scrollers: InternalScrollerDiagnostic[] = [];
    const responsiveTables: OverflowReport["responsiveTables"] = [];

    document.querySelectorAll<HTMLElement>(".responsive-table-container").forEach((container) => {
      const table = container.querySelector<HTMLElement>("table");
      if (!table) return;
      const tableStyle = getComputedStyle(table);
      responsiveTables.push({
        selector: selectorFor(container),
        dataResponsive: container.dataset.responsive || "",
        tableDisplay: tableStyle.display,
        tableMinWidth: tableStyle.minWidth,
        tableScrollWidth: table.scrollWidth,
        tableClientWidth: table.clientWidth,
      });
    });

    document.querySelectorAll<HTMLElement>(".table-wrap, [data-overflow-container='horizontal']").forEach((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const scrollable = scrollerIsBounded(element);
      if (!scrollable) return;
      scrollers.push({
        selector: selectorFor(element),
        left: numeric(rect.left),
        right: numeric(rect.right),
        width: numeric(rect.width),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflowX: style.overflowX,
        focusableCount: element.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])").length,
      });
    });

    document.querySelectorAll<HTMLElement>("body *").forEach((element) => {
      // SVG path/shape nodes inherit the geometry of their parent artwork and
      // can number in the thousands on the public shell. Inspect the SVG as a
      // single visible unit instead of repeating computed-style work for every
      // child node.
      if (element.tagName.toLowerCase() !== "svg" && element.closest("svg")) return;
      // Skip whole intentionally off-canvas subtrees before layout/style work.
      if (closedDrawer(element) || closedAssistantHistory(element)) return;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!visible(element, rect, style)) return;
      const scroller = horizontalScroller(element);
      const isBoundedScrollerDescendant = Boolean(scroller && scrollerIsBounded(scroller) && viewportWidth >= 768);
      if (isBoundedScrollerDescendant) return;
      if (rect.left >= -tolerance && rect.right <= viewportWidth + tolerance) return;
      diagnostics.push({
        selector: selectorFor(element),
        tag: element.tagName.toLowerCase(),
        className: element.className instanceof SVGAnimatedString ? element.className.baseVal : String(element.className || ""),
        left: numeric(rect.left),
        right: numeric(rect.right),
        width: numeric(rect.width),
        viewportWidth,
        display: style.display,
        overflow: style.overflow,
        position: style.position,
        cssLeft: style.left,
        cssRight: style.right,
        transform: style.transform,
        direction: style.direction,
        whiteSpace: style.whiteSpace,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        text: textSnippet(element),
      });
    });

    const pageOverflow: Array<{ source: string; scrollWidth: number; clientWidth: number; limit: number }> = [];
    if (root.scrollWidth > root.clientWidth + tolerance) pageOverflow.push({ source: "documentElement", scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, limit: root.clientWidth + tolerance });
    if (body.scrollWidth > viewportWidth + tolerance) pageOverflow.push({ source: "body", scrollWidth: body.scrollWidth, clientWidth: body.clientWidth, limit: viewportWidth + tolerance });
    const phoneScrollers = viewportWidth < 768 ? scrollers : [];
    const outOfViewportScrollers = scrollers.filter((item) => item.left < -tolerance || item.right > viewportWidth + tolerance);
    outOfViewportScrollers.forEach((item) => diagnostics.push({
      selector: item.selector,
      tag: "scroller",
      className: "",
      left: item.left,
      right: item.right,
      width: item.width,
      viewportWidth,
      display: "",
      overflow: item.overflowX,
      position: "",
      cssLeft: "",
      cssRight: "",
      transform: "",
      direction: "",
      whiteSpace: "",
      minWidth: "",
      maxWidth: "",
      text: `bounded scroller ${item.scrollWidth}px/${item.clientWidth}px`,
    }));

    return {
      viewport: { width: viewportWidth, height: viewportHeight },
      document: { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, bodyScrollWidth: body.scrollWidth, bodyClientWidth: body.clientWidth },
      pageOverflow,
      viewportEscapes: diagnostics,
      intentionalScrollers: scrollers,
      phoneScrollers,
      responsiveTables,
    } satisfies OverflowReport;
  }, { tolerance });
}

export function formatOverflowReport(label: string, report: OverflowReport) {
  return `${label}\nAllowlist:\n- ${OVERFLOW_ALLOWLIST.join("\n- ")}\nDiagnostics:\n${JSON.stringify(report, null, 2)}`;
}

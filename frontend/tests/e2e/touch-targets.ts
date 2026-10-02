import type { Page } from "@playwright/test";

export type TouchTargetFinding = {
  kind: "size" | "name" | "overlap";
  route: string;
  viewport: { width: number; height: number };
  selector: string;
  name: string;
  width?: number;
  height?: number;
  relatedSelector?: string;
  relatedName?: string;
  rect?: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  relatedRect?: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  message: string;
};

type TouchTargetAllowlistEntry = {
  selector: string;
  reason: string;
};

const defaultAllowlist: TouchTargetAllowlistEntry[] = [];

export const actionableSelector = [
  "button",
  "a[href]",
  "[role=button]",
  "[role=tab]",
  "[role=menuitem]",
  "[role=menuitemradio]",
  "[role=option]",
  "input[type=checkbox]",
  "input[type=radio]",
  "select",
  "summary",
  "label.dropzone",
  "label.rula-posture-dropzone",
  "label.fmea-process-image-dropzone",
  "label.knowledge-attachment-upload",
  ".fake-button",
].join(",");

function findingKey(finding: TouchTargetFinding) {
  return [finding.kind, finding.route, finding.viewport.width, finding.viewport.height, finding.selector, finding.relatedSelector || "", finding.name].join("|");
}

export async function collectTouchTargetFindings(
  page: Page,
  allowlist: TouchTargetAllowlistEntry[] = defaultAllowlist,
  candidateIndex?: number,
): Promise<TouchTargetFinding[]> {
  const rawFindings = await page.evaluate(({ selector, allowlist: entries, candidateIndex }) => {
    type RawFinding = Omit<TouchTargetFinding, "route" | "viewport">;

    const minimum = 44;
    const isInert = (element: Element) => Boolean(element.closest("[hidden], [inert], [aria-hidden=\"true\"]"));
    const isVisuallyHidden = (element: Element) => {
      const className = typeof (element as HTMLElement).className === "string" ? (element as HTMLElement).className : "";
      if (/sr-only|screen-reader|visually-hidden|styled-select-native/.test(className)) return true;
      const style = window.getComputedStyle(element);
      return style.display === "none" || style.visibility === "hidden" || style.opacity === "0" || style.contentVisibility === "hidden";
    };
    const isDisabled = (element: Element) => element instanceof HTMLButtonElement || element instanceof HTMLInputElement || element instanceof HTMLSelectElement
      ? element.disabled
      : element.getAttribute("aria-disabled") === "true";
    const text = (element: Element) => (element.textContent ?? "").replace(/\s+/g, " ").trim();
    const selectorFor = (element: Element) => {
      const withId = element.id ? `#${CSS.escape(element.id)}` : "";
      if (withId) return withId;
      const parts: string[] = [];
      let current: Element | null = element;
      while (current && current !== document.body && parts.length < 5) {
        const tagName = current.tagName;
        const tag = tagName.toLowerCase();
        const classNames = Array.from(current.classList).slice(0, 2).map((name) => `.${CSS.escape(name)}`).join("");
        const parentElement: Element | null = current.parentElement;
        const siblings: Element[] = parentElement ? Array.from(parentElement.children).filter((child: Element) => child.tagName === tagName) : [];
        const index = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : "";
        parts.unshift(`${tag}${classNames}${index}`);
        current = parentElement;
      }
      return parts.join(" > ");
    };
    const unionRect = (first: DOMRect, second: DOMRect) => {
      const left = Math.min(first.left, second.left);
      const top = Math.min(first.top, second.top);
      const right = Math.max(first.right, second.right);
      const bottom = Math.max(first.bottom, second.bottom);
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    const associatedLabel = (element: HTMLInputElement) => {
      if (element.id) {
        const explicit = document.querySelector(`label[for=\"${CSS.escape(element.id)}\"]`);
        if (explicit) return explicit;
      }
      return element.closest("label");
    };
    const accessibleName = (element: Element) => {
      const ariaLabel = element.getAttribute("aria-label")?.trim();
      if (ariaLabel) return ariaLabel;
      const labelledBy = element.getAttribute("aria-labelledby")?.trim();
      if (labelledBy) {
        const value = labelledBy.split(/\s+/).map((id) => document.getElementById(id)).filter(Boolean).map((node) => text(node as Element)).join(" ").trim();
        if (value) return value;
      }
      if (element instanceof HTMLInputElement) {
        const label = associatedLabel(element);
        const labelText = label ? text(label) : "";
        if (labelText) return labelText;
        if (element.value) return element.value;
      }
      const ownText = text(element);
      if (ownText) return ownText;
      return "";
    };
    const isStandaloneLink = (element: Element) => Boolean(element.closest(
      ".page-actions, .page-actions-inline, .surface-actions, .form-actions, .wizard-actions, .modal-actions, .dialog-actions, .file-actions, .report-table-actions, .side-nav, .topbar, .app-sidebar, .rula-side-tabs, .path-nav, .button-link, .text-link",
    )) || element.classList.toString().split(/\s+/).some((name) => /button|action|nav|menu|toggle|download/.test(name));
    const isActionable = (element: Element) => {
      if (element.matches("a[href]")) return isStandaloneLink(element);
      if (element.matches(".fake-button")) return true;
      return true;
    };
    const isAllowed = (element: Element) => entries.some((entry) => {
      try {
        return element.matches(entry.selector);
      } catch {
        return false;
      }
    });
    // Portal content is deliberately layered above the page. Keep auditing
    // its own names and dimensions, but do not treat its intended visual
    // overlap with the inert page beneath it as sibling hit-area overlap.
    const isFloatingOverlay = (element: Element) => Boolean(element.closest("#nivasafe-overlay-root"));
    // The mobile drawer is another intentional overlay: its backdrop covers
    // the page, and the drawer covers the page controls beneath it. Keep
    // auditing controls inside the drawer against one another, but do not
    // report the designed cross-layer overlap as a hit-area defect.
    const isSidebarBackdrop = (element: Element) => element.matches(".sidebar-backdrop");
    const isOpenDrawer = (element: Element) => Boolean(element.closest(".app-sidebar.open"));
    const isDrawerLayerOverlap = (first: Element, second: Element) =>
      isSidebarBackdrop(first) || isSidebarBackdrop(second) || isOpenDrawer(first) !== isOpenDrawer(second);
    const rectFor = (element: Element) => {
      const rect = element.getBoundingClientRect();
      if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
        const label = associatedLabel(element);
        if (label && !isVisuallyHidden(label)) return unionRect(rect, label.getBoundingClientRect());
      }
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const allCandidates = Array.from(document.querySelectorAll(selector));
    const candidates = allCandidates.filter((element, index) => {
      if (candidateIndex !== undefined && index !== candidateIndex) return false;
      if (!isActionable(element) || isInert(element) || isVisuallyHidden(element) || isDisabled(element) || isAllowed(element)) return false;
      const rect = rectFor(element);
      return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
    });
    const findings: RawFinding[] = [];
    const seen = new Set<string>();
    for (const element of candidates) {
      const selectorText = selectorFor(element);
      if (seen.has(selectorText)) continue;
      seen.add(selectorText);
      const rect = rectFor(element);
      const name = accessibleName(element);
      if (!name) {
        findings.push({ kind: "name", selector: selectorText, name, rect, message: "Visible actionable control has no accessible name." });
      }
      if (rect.width + 0.5 < minimum || rect.height + 0.5 < minimum) {
        findings.push({ kind: "size", selector: selectorText, name, rect, width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100, message: `Visible actionable control is smaller than ${minimum}×${minimum}px.` });
      }
    }
    for (let index = 0; index < candidates.length; index += 1) {
      const first = candidates[index];
      const firstRect = rectFor(first);
      for (let nextIndex = index + 1; nextIndex < candidates.length; nextIndex += 1) {
        const second = candidates[nextIndex];
        if (first.contains(second) || second.contains(first)) continue;
        if (isFloatingOverlay(first) !== isFloatingOverlay(second)) continue;
        if (isDrawerLayerOverlap(first, second)) continue;
        const secondRect = rectFor(second);
        const overlapWidth = Math.min(firstRect.right, secondRect.right) - Math.max(firstRect.left, secondRect.left);
        const overlapHeight = Math.min(firstRect.bottom, secondRect.bottom) - Math.max(firstRect.top, secondRect.top);
        if (overlapWidth > 1 && overlapHeight > 1) {
          findings.push({ kind: "overlap", selector: selectorFor(first), name: accessibleName(first), relatedSelector: selectorFor(second), relatedName: accessibleName(second), rect: firstRect, relatedRect: secondRect, message: "Visible actionable sibling targets overlap." });
        }
      }
    }
    return findings;
  }, { selector: actionableSelector, allowlist, candidateIndex });

  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  const currentUrl = new URL(page.url());
  const route = `${currentUrl.pathname}${currentUrl.search}`;
  return rawFindings.map((finding) => ({
    ...finding,
    route,
    viewport,
  }));
}

/**
 * Audits controls that are initially outside a bounded scroll region by
 * bringing each rendered candidate into view before collecting geometry. This
 * keeps the default audit focused on controls a user can currently reach,
 * while still exercising every control in scrollable navigation/data regions.
 */
export async function collectTouchTargetFindingsAcrossScrollableRegions(
  page: Page,
  allowlist: TouchTargetAllowlistEntry[] = defaultAllowlist,
): Promise<TouchTargetFinding[]> {
  const candidateCount = await page.locator(actionableSelector).count();
  const findings = new Map<string, TouchTargetFinding>();
  for (let index = 0; index < candidateCount; index += 1) {
    const candidate = page.locator(actionableSelector).nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
    const current = await collectTouchTargetFindings(page, allowlist, index);
    for (const finding of current) findings.set(findingKey(finding), finding);
  }
  return [...findings.values()];
}

export function formatTouchTargetFindings(findings: TouchTargetFinding[]) {
  return findings.map((finding) => {
    const size = finding.width === undefined ? "" : ` ${finding.width}×${finding.height}px`;
    const related = finding.relatedSelector ? `; related=${finding.relatedSelector} (${finding.relatedName || "unnamed"})` : "";
    const rect = finding.rect ? ` rect=${Math.round(finding.rect.left)},${Math.round(finding.rect.top)}–${Math.round(finding.rect.right)},${Math.round(finding.rect.bottom)}` : "";
    const relatedRect = finding.relatedRect ? ` relatedRect=${Math.round(finding.relatedRect.left)},${Math.round(finding.relatedRect.top)}–${Math.round(finding.relatedRect.right)},${Math.round(finding.relatedRect.bottom)}` : "";
    return `${finding.kind} ${finding.route} @ ${finding.viewport.width}×${finding.viewport.height}px ${finding.selector} (${finding.name || "unnamed"})${size}${rect}${related}${relatedRect}: ${finding.message}`;
  }).join("\n");
}

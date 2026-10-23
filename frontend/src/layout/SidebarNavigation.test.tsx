import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SidebarNavigation } from "./SidebarNavigation";
import { getActiveNavigationTrail, getNavigationForRole, getNavigationHref, type NavigationNode } from "./navigation";

const disclosureIds = ["assessments-create", "assessments-saved", "exposure-measurements"] as const;

function expectedHrefs(nodes: readonly NavigationNode[]): string[] {
  return nodes.flatMap((node) => node.kind === "group" || node.kind === "disclosure"
    ? expectedHrefs(node.children)
    : node.kind === "link" ? [getNavigationHref(node)] : []);
}

function renderNavigation(role = "SUPER_ADMIN", destination = "/", collapsed = false) {
  const location = new URL(destination, "https://nivasafe.test");
  const activeIds = new Set(getActiveNavigationTrail(location, role).map(item => item.id));
  return renderToStaticMarkup(<MemoryRouter initialEntries={[destination]}><SidebarNavigation
    groups={getNavigationForRole(role)} location={location} collapsed={collapsed}
    activeIds={activeIds} onNavigate={() => undefined} t={(key) => key}
  /></MemoryRouter>);
}

function renderedHrefs(html: string) {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1].replaceAll("&amp;", "&"));
}

function elementTag(html: string, element: "button" | "div" | "h3", id: string) {
  const matches = [...html.matchAll(new RegExp(`<${element}\\b[^>]*>`, "g"))].filter(match => match[0].includes(`id="${id}"`));
  expect(matches).toHaveLength(1);
  return matches[0]?.[0] ?? "";
}

function assertDisclosure(html: string, id: string, expanded: boolean) {
  const heading = elementTag(html, "h3", `nav-heading-${id}`);
  expect(heading).toContain('class="nav-disclosure-title"');
  const button = elementTag(html, "button", `nav-toggle-${id}`);
  expect(button).toContain('type="button"');
  expect(button).toContain(`aria-expanded="${expanded}"`);
  expect(button).toContain(`aria-controls="nav-panel-${id}"`);
  const panel = elementTag(html, "div", `nav-panel-${id}`);
  expect(/\shidden(?:=|[>\s])/.test(panel)).toBe(!expanded);
}

describe("sidebar disclosure navigation", () => {
  it("keeps primary headings and mounts exactly three initially closed disclosure controls and their child destinations", () => {
    const html = renderNavigation();
    expect(html).toMatch(/<h2[^>]*class="nav-group-title"[^>]*>group.management<\/h2>/);
    expect([...html.matchAll(/<button\b[^>]*>/g)]).toHaveLength(3);
    for (const id of disclosureIds) assertDisclosure(html, id, false);
    expect(html).toContain("nav.newAssessment");
    expect(html).toContain("nav.savedAssessments");
    expect(html).toContain("nav.exposureMeasurements");
    expect(html).toContain('href="/choose-path?category=safety&amp;mode=new"');
    expect(html).toContain('href="/choose-path?category=ergonomics&amp;mode=saved"');
  });

  it.each(["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "PERSONNEL", "VIEWER"])("preserves every authorized destination for %s", (role) => {
    expect(renderedHrefs(renderNavigation(role))).toEqual(expectedHrefs(getNavigationForRole(role)));
  });

  it("does not expose administrative destinations to an ordinary member", () => {
    const destinations = renderedHrefs(renderNavigation("PERSONNEL"));
    expect(destinations).not.toContain("/admin");
    expect(destinations).not.toContain("/organizations");
    expect(destinations).not.toContain("/members");
    expect(destinations).not.toContain("/health");
  });

  it("preserves direct child destinations and accessible names with every disclosure panel available in the collapsed desktop rail", () => {
    const html = renderNavigation("SUPER_ADMIN", "/", true);
    expect(renderedHrefs(html)).toEqual(expectedHrefs(getNavigationForRole("SUPER_ADMIN")));
    expect(html).toContain('aria-label="nav.profile"');
    expect(html).toContain('title="nav.profile"');
    for (const id of disclosureIds) assertDisclosure(html, id, true);
  });

  it.each([
    ["/fmea", "assessments-create", "/choose-path?category=safety&amp;mode=new"],
    ["/fmea?view=registered", "assessments-saved", "/choose-path?category=safety&amp;mode=saved"],
    ["/rula/example/report", "assessments-saved", "/choose-path?category=ergonomics&amp;mode=saved"],
    ["/choose-path?category=ergonomics&mode=new", "assessments-create", "/choose-path?category=ergonomics&amp;mode=new"],
    ["/rula?edit=example&step=2", "assessments-saved", "/choose-path?category=ergonomics&amp;mode=saved"],
  ])("opens only the active branch and keeps exactly the correct leaf active for %s", (destination, branch, href) => {
    const html = renderNavigation("SUPER_ADMIN", destination);
    const activeLinks = [...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)];
    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0][0]).toContain(`href="${href}"`);
    for (const id of disclosureIds) assertDisclosure(html, id, id === branch);
    expect(renderedHrefs(html)).toEqual(expectedHrefs(getNavigationForRole("SUPER_ADMIN")));
  });

  it("preserves coming-soon entries as mounted noninteractive content even inside closed branches", () => {
    const html = renderNavigation();
    expect(html).toContain('class="side-nav-pending"');
    expect(html).toContain("navigation.backendPending");
    expect(html).toContain('data-navigation-id="chemical-risk-new"');
    expect(html).toContain('data-navigation-id="exposure-records"');
    expect(html).not.toContain('href="/chemical-risk"');
    expect(html).not.toContain('href="/work-permits"');
    expect(html).not.toMatch(/<(?:button|a)\b[^>]*data-navigation-id="(?:chemical-risk-new|chemical-risk-saved|exposure-records|exposure-guidance|work-permits)"/);
  });
});

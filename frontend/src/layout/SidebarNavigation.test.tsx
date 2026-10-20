import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SidebarNavigation } from "./SidebarNavigation";
import { getNavigationForRole, getNavigationHref, type NavigationNode } from "./navigation";

function expectedHrefs(nodes: readonly NavigationNode[]): string[] {
  return nodes.flatMap((node) => node.kind === "group" || node.kind === "disclosure"
    ? expectedHrefs(node.children)
    : node.kind === "link" ? [getNavigationHref(node)] : []);
}

function renderNavigation(role = "SUPER_ADMIN", destination = "/", collapsed = false) {
  const location = new URL(destination, "https://nivasafe.test");
  return renderToStaticMarkup(<MemoryRouter initialEntries={[destination]}><SidebarNavigation
    groups={getNavigationForRole(role)} location={location} collapsed={collapsed}
    activeIds={new Set()} onNavigate={() => undefined} t={(key) => key}
  /></MemoryRouter>);
}

function renderedHrefs(html: string) {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1].replaceAll("&amp;", "&"));
}

describe("static sidebar navigation", () => {
  it("renders primary and nested parents as headings with every child permanently available", () => {
    const html = renderNavigation();
    expect(html).toMatch(/<h2[^>]*class="nav-group-title"[^>]*>group.management<\/h2>/);
    expect(html).toMatch(/<h3[^>]*class="nav-disclosure-title"[^>]*>nav.newAssessment<\/h3>/);
    expect(html).toContain('href="/choose-path?category=safety&amp;mode=new"');
    expect(html).toContain('href="/choose-path?category=ergonomics&amp;mode=saved"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("aria-expanded");
    expect(html).not.toMatch(/\shidden(?:=|[>\s])/);
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

  it("preserves direct child destinations and accessible names when the whole sidebar is collapsed", () => {
    const html = renderNavigation("SUPER_ADMIN", "/", true);
    expect(renderedHrefs(html)).toEqual(expectedHrefs(getNavigationForRole("SUPER_ADMIN")));
    expect(html).toContain('aria-label="nav.profile"');
    expect(html).toContain('title="nav.profile"');
    expect(html).not.toContain("<button");
  });

  it.each([
    ["/fmea", "/choose-path?category=safety&amp;mode=new"],
    ["/fmea?view=registered", "/choose-path?category=safety&amp;mode=saved"],
    ["/rula/example/report", "/choose-path?category=ergonomics&amp;mode=saved"],
  ])("keeps exactly the correct leaf active for %s", (destination, href) => {
    const html = renderNavigation("SUPER_ADMIN", destination);
    const activeLinks = [...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)];
    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0][0]).toContain(`href="${href}"`);
  });

  it("preserves coming-soon entries as noninteractive content", () => {
    const html = renderNavigation();
    expect(html).toContain('class="side-nav-pending"');
    expect(html).toContain("navigation.backendPending");
    expect(html).not.toContain('href="/chemical-risk"');
    expect(html).not.toContain('href="/work-permits"');
  });
});

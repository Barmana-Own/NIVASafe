import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, translate } from "../../i18n";
import { getActiveNavigationTrail, getNavigationForRole, getNavigationHref, type NavigationNode } from "../../layout/navigation";
import { AssessmentMethodSelection } from "./AssessmentMethodSelection";
import { getAssessmentMethods, readAssessmentMethodSelection, type AssessmentCategory, type AssessmentSelectionMode } from "./assessmentMethods";

function leaves(nodes: readonly NavigationNode[]): { id: string; labelKey: string; href: string }[] {
  return nodes.flatMap(node=>node.kind==="group"||node.kind==="disclosure"?leaves(node.children):node.kind==="link"?[{id:node.id,labelKey:node.labelKey,href:getNavigationHref(node)}]:[]);
}

describe("assessment category and method selection", () => {
  beforeEach(() => {
    const values=new Map<string,string>([["nivasafe-locale","fa"]]);
    vi.stubGlobal("localStorage", {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});
  });
  afterEach(() => vi.unstubAllGlobals());
  it.each([
    ["safety", "new", "fmea", "/fmea", "hazop"],
    ["safety", "saved", "fmea", "/fmea?view=registered", "hazop"],
    ["ergonomics", "new", "rula", "/rula", "reba"],
    ["ergonomics", "saved", "rula", "/rula?view=results", "reba"],
  ] as const)("offers only the correct methods and destination for %s/%s", (category, mode, active, href, planned) => {
    expect(getAssessmentMethods(category, mode)).toEqual([
      { id: active, available: true, href }, { id: planned, available: false },
    ]);
  });

  it.each(["safety", "ergonomics"] as const)("parses %s and keeps saved/new mode independent", category => {
    expect(readAssessmentMethodSelection(`?category=${category}&mode=saved`)).toEqual({ category, mode: "saved" });
    expect(readAssessmentMethodSelection(`?category=${category}`)).toEqual({ category, mode: "new" });
    expect(readAssessmentMethodSelection(`?category=${category}&mode=unsupported`)).toEqual({ category, mode: "new" });
  });

  it.each(["", "?category=hazop", "?category=https://example.com", "?mode=saved"])("does not invent an assessment flow for %s", search => {
    expect(readAssessmentMethodSelection(search)).toBeNull();
  });

  it("keeps concise category labels in Persian and English", () => {
    expect(translate("nav.fmeaType", "fa")).toBe("ریسک ایمنی");
    expect(translate("nav.rulaType", "fa")).toBe("پوسچر ارگونومی");
    expect(translate("nav.fmeaType", "en")).toBe("Safety risk");
    expect(translate("nav.rulaType", "en")).toBe("Posture ergonomics");
  });

  it.each(["SUPER_ADMIN", "PERSONNEL", "VIEWER"])("routes the existing four category links through the chooser for %s", role => {
    const entries=leaves(getNavigationForRole(role));
    expect(entries.filter(x=>["fmea-new","rula-new","fmea-saved","rula-saved"].includes(x.id))).toEqual([
      {id:"fmea-new",labelKey:"nav.fmeaType",href:"/choose-path?category=safety&mode=new"},
      {id:"rula-new",labelKey:"nav.rulaType",href:"/choose-path?category=ergonomics&mode=new"},
      {id:"fmea-saved",labelKey:"nav.fmeaType",href:"/choose-path?category=safety&mode=saved"},
      {id:"rula-saved",labelKey:"nav.rulaType",href:"/choose-path?category=ergonomics&mode=saved"},
    ]);
    expect(entries.some(x=>/\/(?:hazop|reba)(?:[/?]|$)/u.test(x.href))).toBe(false);
  });

  it.each([
    ["safety", "new", "assessments-create", "fmea-new"],
    ["safety", "saved", "assessments-saved", "fmea-saved"],
    ["ergonomics", "new", "assessments-create", "rula-new"],
    ["ergonomics", "saved", "assessments-saved", "rula-saved"],
  ] as const)("keeps correct breadcrumbs and exactly one active category for %s/%s", (category, mode, parent, leaf) => {
    expect(getActiveNavigationTrail({pathname:"/choose-path",search:`?category=${category}&mode=${mode}`} ).map(x=>x.id)).toEqual(["assessments",parent,leaf]);
  });

  it.each([["safety","new"],["safety","saved"],["ergonomics","new"],["ergonomics","saved"]] as const)("renders %s/%s without enabling unfinished methods", (category: AssessmentCategory,mode: AssessmentSelectionMode) => {
    const html=renderToStaticMarkup(<LocaleProvider><MemoryRouter><AssessmentMethodSelection category={category} mode={mode}/></MemoryRouter></LocaleProvider>);
    const methods=getAssessmentMethods(category,mode),active=methods.find(x=>x.available)!,planned=methods.find(x=>!x.available)!;
    expect(html).toContain(active.id.toUpperCase());
    expect(html).toContain(planned.id.toUpperCase());
    expect(html).toContain(`href="${active.href}"`);
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain("به‌زودی");
    expect([...html.matchAll(/<a\b/g)]).toHaveLength(1);
    expect(html).not.toContain(`href="/${planned.id}"`);
  });
});

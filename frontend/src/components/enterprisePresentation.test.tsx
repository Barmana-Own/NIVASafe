import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, translate } from "../i18n";
import { redesignMessages } from "../redesignMessages";
import { LoadState } from "./LoadState";
import { RouteLoadFailure } from "./RouteRecovery";
import { EmptyState, LoadingState, StyledSelect, TableRegion } from "./UI";

afterEach(() => vi.unstubAllGlobals());

describe("compact enterprise density", () => {
  const foundationStyles = readFileSync(new URL("../styles/foundations.css", import.meta.url), "utf8");
  const managementStyles = readFileSync(new URL("../styles/management.css", import.meta.url), "utf8");
  const shellStyles = readFileSync(new URL("../styles/shell.css", import.meta.url), "utf8");
  const assessmentStyles = readFileSync(new URL("../styles/assessments.css", import.meta.url), "utf8");
  const dashboardSource = readFileSync(new URL("../features/general/GeneralPages.tsx", import.meta.url), "utf8");
  const dashboardKpiSource = dashboardSource.match(/const kpis:[\s\S]*?const subscriptionPlanKeys/)?.[0] ?? "";
  const assessmentPagesSource = readFileSync(new URL("../features/assessments/AssessmentPages.tsx", import.meta.url), "utf8");
  const overviewSource = readFileSync(new URL("../features/assessments/RulaReportOverview.tsx", import.meta.url), "utf8");

  it("uses compact desktop controls only for fine pointers and preserves touch-sized defaults", () => {
    expect(foundationStyles).toContain("@media (min-width: 761px) and (hover: hover) and (pointer: fine)");
    expect(foundationStyles).toContain(".app[data-design=\"enterprise\"] :is(.primary, .ghost) { min-height: 40px; padding-block: 8px; }");
    expect(foundationStyles).toContain("min-height: 44px; padding: 10px 12px;");
    expect(shellStyles).toContain(".app[data-design=\"enterprise\"] :is(.header-notifications, .language-switch, .theme-trigger, .mobile-menu) { height: 44px; min-height: 44px;");
  });

  it("keeps narrow dashboard activity rows readable without vertical text wrapping", () => {
    expect(managementStyles).toContain(".app[data-design=\"enterprise\"] .recent-item > div {");
    expect(managementStyles).toContain("grid-template-columns: 42px minmax(0, 1fr);");
    expect(managementStyles).toContain("grid-template-rows: auto auto;");
    expect(managementStyles).toContain(".recent-item :is(strong, small)");
    expect(managementStyles).toContain("white-space: nowrap;");
    expect(managementStyles).toContain("text-overflow: ellipsis;");
  });

  it("keeps the collapsed desktop sidebar icon-only and restores labels in the mobile drawer", () => {
    expect(shellStyles).toContain('.app[data-design="enterprise"].sidebar-collapsed :is(.side-brand-copy, .side-user, .side-logout-label) { display: none; }');
    expect(shellStyles).toContain('.app[data-design="enterprise"].sidebar-collapsed .side-user { display: flex; }');
    expect(shellStyles).toContain('.app[data-design="enterprise"].sidebar-collapsed .side-logout-label { display: inline; }');
  });

  it("balances comparable dashboard panels in width and row height", () => {
    expect(managementStyles).toContain('.app[data-design="enterprise"] .dashboard-widgets { gap: 16px; align-items: stretch; }');
    expect(managementStyles).toContain('.app[data-design="enterprise"] .dashboard-section-widget.risk-panel { grid-column: span 6;');
    expect(managementStyles).toContain('.app[data-design="enterprise"] .dashboard-section-widget.actions-panel { grid-column: span 6;');
  });

  it("keeps mobile dashboard KPI cards in two equal columns", () => {
    expect(managementStyles).toContain("@media (max-width: 1024px) {");
    expect(managementStyles).toContain('section.page-shell.dashboard-page .dashboard-widgets { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-flow: row; grid-auto-columns: minmax(0, 1fr);');
    expect(managementStyles).toContain('.dashboard-page .dashboard-widgets > .dashboard-kpi-widget { grid-column: auto;');
    expect(managementStyles).toContain('.dashboard-page .dashboard-widgets > .dashboard-section-widget { grid-column: 1 / -1;');
  });

  it("keeps dashboard cards focused on titles and values instead of helper paragraphs", () => {
    expect(dashboardSource).not.toContain('description={t("dashboard.description")}');
    expect(dashboardSource).not.toContain('description={t("dashboard.riskDescription")}');
    expect(dashboardSource).not.toContain('description={t("dashboard.actionDescription")}');
    expect(dashboardSource).not.toContain('description={t("dashboard.recentDescription")}');
    expect(dashboardSource).not.toContain('description={t("dashboard.quickDescription")}');
    expect(dashboardSource).not.toContain('<small>{t("dashboard.processRisk")}</small>');
    expect(dashboardSource).not.toContain('<small>{t("dashboard.ergonomics")}</small>');
    expect(dashboardKpiSource).not.toContain("captionKey");
    expect(dashboardSource).not.toContain('t("dashboard.layoutDescription")');
    expect(dashboardSource).not.toContain('t("dashboard.customizerHint")');
    expect(dashboardSource).not.toContain('description={t("dashboard.noRiskDescription")}');
  });

  it("keeps report context fields balanced and preserves long activity details", () => {
    expect(assessmentPagesSource).toContain('className: "rula-report-context-field-wide rula-report-context-job"');
    expect(assessmentPagesSource).toContain('className: "rula-report-context-field-wide rula-report-context-task"');
    expect(assessmentPagesSource).not.toContain('<p>{t("assessment.rulaProcessDetailsHint")}</p>');
    expect(assessmentPagesSource).not.toContain('description={t("report.riskDistributionDescription")}');
    expect(assessmentPagesSource).not.toContain('description={t("report.topFailureModesDescription")}');
    expect(assessmentPagesSource).not.toContain('description={t("report.actionRegisterDescription")}');
    expect(overviewSource).not.toContain('description={t("assessment.rulaRiskDistributionDescription")}');
    expect(overviewSource).not.toContain('description={t("assessment.rulaActionProgressDescription")}');
    expect(assessmentStyles).toContain(".rula-report-context-grid {");
    expect(assessmentStyles).toContain("grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(assessmentStyles).toMatch(/\.rula-report-context-description \{\r?\n  max-height:/);
    expect(assessmentStyles).toContain("overflow-wrap: anywhere;");
  });

  it("reduces dashboard and surface spacing without removing content", () => {
    expect(managementStyles).toContain(".dashboard-kpi-widget { grid-column: span 3; display: flex; flex-direction: row; align-items: flex-start; gap: 10px; padding: 12px; min-height: 96px;");
    expect(managementStyles).toContain(".dashboard-page .dashboard-widgets > .dashboard-kpi-widget { grid-column: auto; width: 100%; min-width: 0; display: grid; gap: 8px; padding: 12px; min-height: 132px;");
    expect(foundationStyles).toContain(".app[data-design=\"enterprise\"] .surface-head { min-height: 64px; padding: 12px 16px;");
    expect(foundationStyles).toContain(".app[data-design=\"enterprise\"] .surface-body { min-width: 0; padding: 16px; }");
  });

  it("keeps RULA overview charts and labels within responsive cards", () => {
    expect(assessmentStyles).toContain("grid-template-columns: repeat(3, minmax(0, 1fr));");
    expect(assessmentStyles).toContain("All report donuts use the FMEA risk chart's intrinsic flex layout and legend.");
    expect(assessmentStyles).toContain('.app[data-design="enterprise"] :is(.rula-overview-distribution-panel, .rula-overview-actions-panel) .surface-body');
    expect(assessmentStyles).toContain("@container (max-width: 330px)");
    expect(assessmentStyles).toContain("@media (max-width: 760px)");
    expect(assessmentStyles).toContain("overflow-wrap: break-word;");
  });

  it("provides spaced RULA fields and token-based surfaces in the dark theme", () => {
    expect(assessmentStyles).toContain("gap: 14px 16px;");
    expect(assessmentStyles).toContain("padding-inline: 14px;");
    expect(assessmentStyles).toContain(".rula-posture-description-field");
    expect(assessmentStyles).toContain("background: var(--color-subtle);");
    expect(foundationStyles).toContain('.app[data-design="enterprise"][data-theme="blue"] :is(input, textarea, select, .styled-select-trigger, .localized-date-trigger)');
    expect(foundationStyles).toContain('.app[data-design="enterprise"][data-theme="blue"] select option');
  });

  it("keeps the RULA detection toggle readable against both theme surfaces", () => {
    expect(foundationStyles).toContain('.app[data-design="enterprise"] .rula-detection-toggle { color: var(--color-ink); background: var(--color-subtle); border-color: var(--color-border); }');
  });
});

function luminance(hex: string) {
  const channels = hex.replace("#", "").match(/.{2}/g)!.map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}

describe("enterprise palette accessibility", () => {
  const stylesheet = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8");
  const themes = stylesheet.split(':root[data-theme="blue"]');
  for (const [name, section] of [["light", themes[0]], ["dark", themes[1]]] as const) {
    const colors = Object.fromEntries([...section.matchAll(/--color-([\w-]+):\s*(#[\da-f]{6})/gi)].map(match => [match[1], match[2]]));
    it(`${name} text and status pairs meet normal-text contrast`, () => {
      for (const surface of ["surface", "subtle", "canvas"]) {
        for (const text of ["ink", "secondary", "muted"]) expect(contrast(colors[text], colors[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const semantic of ["accent", "success", "warning", "danger", "high", "violet"]) {
        expect(contrast(colors[semantic], colors[`${semantic}-soft`]), semantic).toBeGreaterThanOrEqual(4.5);
      }
      expect(contrast(colors["on-primary"], colors.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors["on-primary"], colors["primary-hover"])).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name} field borders and focus remain distinguishable`, () => {
      expect(contrast(colors["control-border"], colors.surface)).toBeGreaterThanOrEqual(3);
      expect(contrast(colors.focus, colors.surface)).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("localized feedback and trust boundaries", () => {
  it("keeps new keys and interpolation parameters equivalent in Persian and English", () => {
    expect(Object.keys(redesignMessages.fa).sort()).toEqual(Object.keys(redesignMessages.en).sort());
    for (const key of Object.keys(redesignMessages.en) as Array<keyof typeof redesignMessages.en>) {
      const params = (value: string) => [...value.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort();
      expect(params(redesignMessages.fa[key])).toEqual(params(redesignMessages.en[key]));
    }
    for (const locale of ["fa", "en"] as const) {
      expect(translate("redesign.dashboardGreeting", locale, { name: "Reviewer" })).toContain("Reviewer");
      expect(translate("redesign.dashboardGreeting", locale, { name: "Reviewer" })).not.toContain("{name}");
    }
  });

  it.each(["fa", "en"] as const)("announces loading and safe retry feedback in %s", locale => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const loading = renderToStaticMarkup(<LocaleProvider><LoadingState/></LocaleProvider>);
    expect(loading).toContain('role="status"');
    expect(loading).toContain('aria-live="polite"');
    const error = renderToStaticMarkup(<LocaleProvider><LoadState state={{ data: null, loading: false, error: "<img src=x onerror=alert(1)>", reload: () => undefined }}>{() => null}</LoadState></LocaleProvider>);
    expect(error).toContain('role="alert"');
    expect(error).toContain(translate("common.retry", locale));
    expect(error).toContain("&lt;img");
    expect(error).not.toContain("<img src=x");
  });

  it("renders the complete table, named select and recoverable empty state", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const markup = renderToStaticMarkup(<LocaleProvider>
      <TableRegion aria-label="Assessment scores"><table><thead><tr><th scope="col">S</th><th scope="col">O</th><th scope="col">D</th><th scope="col">RPN</th></tr></thead><tbody><tr><td>9</td><td>6</td><td>5</td><td>270</td></tr></tbody></table></TableRegion>
      <StyledSelect aria-label="Action status" defaultValue="OPEN"><option value="OPEN">Open</option></StyledSelect>
      <EmptyState title="No assessments" action={<a href="/choose-path">Create assessment</a>}/>
    </LocaleProvider>);
    expect(markup).toContain('role="region" aria-label="Assessment scores"');
    expect(markup.match(/scope="col"/g)).toHaveLength(4);
    expect(markup).toContain("<td>270</td>");
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-label="Action status"');
    expect(markup).toContain('href="/choose-path"');
  });
  it("offers localized recovery without exposing runtime details", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const markup = renderToStaticMarkup(<LocaleProvider><RouteLoadFailure /></LocaleProvider>);
    expect(markup).toContain("This page could not load");
    expect(markup).toContain(translate("common.retry", "en"));
    expect(markup).not.toContain("stack");
  });
});

it("gates unknown RULA presentation by posture review rather than neutral corrective-action rows", () => {
  const source = readFileSync(new URL("../features/assessments/AssessmentPages.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  expect(source).toContain("data-review-complete={reviewComplete}");
  expect(css.includes('.rula-report-view[data-review-complete="false"] .rula-report-score > strong')).toBe(true);
  expect(css.includes(".rula-report-view:has(.rula-table-impact.impact-neutral)")).toBe(false);
});

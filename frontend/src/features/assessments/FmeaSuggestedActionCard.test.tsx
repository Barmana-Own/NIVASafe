import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, translate } from "../../i18n";
import { FmeaSuggestedActionCard } from "./FmeaSuggestedActionCard";
import { mergeFmeaAutomaticSuggestions } from "./fmeaReportCollections";

afterEach(() => vi.unstubAllGlobals());
const suggestion = { id: "synthetic-1", fmeaItemId: "risk-1", title: "Inspect <equipment> before use", description: "Full synthetic instructions & review notes", failureMode: "Synthetic failure", priority: "MEDIUM", status: "SUGGESTED" };

describe("automatic FMEA corrective suggestions", () => {
  it("shows the complete bounded response instead of adding only one result", () => {
    const result = mergeFmeaAutomaticSuggestions([suggestion], [suggestion, { ...suggestion, id: "2", title: "Second action" }, { ...suggestion, id: "3", title: "Third action" }], () => false, 8);
    expect(result.map(item => item.title)).toEqual([suggestion.title, "Second action", "Third action"]);
  });
  it("excludes registered and dismissed suggestions without changing source arrays", () => {
    const existing = [suggestion, { ...suggestion, title: "Removed action" }];
    const incoming = [{ ...suggestion, title: "REGISTERED action" }, { ...suggestion, title: "removed action" }, { ...suggestion, title: "New action" }];
    const excluded = (item: typeof suggestion) => ["registered action", "removed action"].includes(item.title.trim().toLowerCase());
    expect(mergeFmeaAutomaticSuggestions(existing, incoming, excluded, 8).map(item => item.title)).toEqual(["New action", suggestion.title]);
    expect(existing).toHaveLength(2);
    expect(incoming).toHaveLength(3);
  });
  it("keeps same-named actions for different risks and respects the cap", () => {
    expect(mergeFmeaAutomaticSuggestions([suggestion], [{ ...suggestion, fmeaItemId: "risk-2" }], () => false, 8)).toHaveLength(2);
    expect(mergeFmeaAutomaticSuggestions([], Array.from({ length: 12 }, (_, i) => ({ ...suggestion, title: `Action ${i}` })), () => false, 8)).toHaveLength(8);
    expect(mergeFmeaAutomaticSuggestions([suggestion], [], () => false, 0)).toEqual([]);
  });
});

describe("FMEA suggestion reading controls", () => {
  it.each(["fa", "en"] as const)("renders compact controls and an accessible full-text trigger in %s", locale => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const html = renderToStaticMarkup(<LocaleProvider><FmeaSuggestedActionCard item={suggestion} onRegister={() => {}} onDismiss={() => {}} dismissalBusy={false}/></LocaleProvider>);
    expect(html).toContain('class="fmea-suggestion-controls"');
    expect(html).toContain('class="fmea-corrective-suggestion-heading"');
    expect(html).not.toContain('class="fmea-suggestion-heading"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain(translate("report.readFullSuggestion", locale));
    expect(html).toContain("Inspect &lt;equipment&gt; before use");
    expect(html).not.toContain("Inspect <equipment>");
    expect(html).toContain(translate("report.useSuggestion", locale));
    expect(html).toContain(translate("report.removeSuggestion", locale));
    expect(translate("report.proposedActions", locale)).not.toContain("NIVASafe");
  });
  it("preserves read-only access and disables duplicate dismissals", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const readonly = renderToStaticMarkup(<LocaleProvider><FmeaSuggestedActionCard item={suggestion} dismissalBusy={false}/></LocaleProvider>);
    expect(readonly).not.toContain("Register action");
    expect(readonly).not.toContain("Remove action");
    expect(readonly).toContain('aria-haspopup="dialog"');
    const busy = renderToStaticMarkup(<LocaleProvider><FmeaSuggestedActionCard item={suggestion} onDismiss={() => {}} dismissalBusy/></LocaleProvider>);
    expect(busy).toContain('disabled=""');
  });
});

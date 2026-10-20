import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { RulaActionRegister } from "./RulaActionRegister";

afterEach(() => vi.unstubAllGlobals());
describe("RULA action register", () => {
  it.each(["fa", "en"])("renders up to twenty AI rows with priorities and edit/completion controls in %s", (locale) => {
    vi.stubGlobal("localStorage", { getItem: () => locale });
    const actions = Array.from({ length: 20 }, (_, index) => ({
      id: String(index), titleFa: `اقدام ${index}`, titleEn: `Action ${index}`,
      descriptionFa: "شرح اقدام", descriptionEn: "Action description",
      priority: "HIGH" as const, status: index === 0 ? "COMPLETED" : "UNSELECTED",
    }));
    const markup = renderToStaticMarkup(<LocaleProvider><RulaActionRegister actions={actions} onUpdate={async () => {}} onComplete={() => {}}/></LocaleProvider>);
    expect(markup.match(/<tr>/g)).toHaveLength(21);
    expect(markup.match(/<button /g)).toHaveLength(40);
    expect(markup).toContain("assessment-mobile-table");
    expect(markup).toContain("disabled");
    expect(markup).not.toContain("navigate");
  });
  it("does not expose mutations in a read-only report", () => {
    vi.stubGlobal("localStorage", { getItem: () => "en" });
    const markup = renderToStaticMarkup(<LocaleProvider><RulaActionRegister actions={[{
      id: "1", titleFa: "اقدام", titleEn: "<script>unsafe</script>",
      descriptionFa: "شرح", descriptionEn: "Details", priority: "LOW", status: "UNSELECTED",
    }]}/></LocaleProvider>);
    expect(markup).not.toContain("<button");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });
});

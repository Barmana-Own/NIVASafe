import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { RulaCorrectionSuggestionsTable } from "./AssessmentPages";
afterEach(() => vi.unstubAllGlobals());
it("shows five suggestions initially and retains accessible expandable full text", () => {
  vi.stubGlobal("localStorage", { getItem: () => "en" });
  const suggestions: Parameters<typeof RulaCorrectionSuggestionsTable>[0]["suggestions"] = Array.from({ length: 8 }, (_, i) => ({ id: String(i), titleFa: `Title ${i}`, titleEn: `Title ${i}`, descriptionFa: "<script>long</script>", descriptionEn: "<script>long</script>", priority: "HIGH" as const, scoreReduction: 1, affectedParts: ["neck"] }));
  const markup = renderToStaticMarkup(<LocaleProvider><RulaCorrectionSuggestionsTable suggestions={suggestions} selectedActions={[]} bodySide="RIGHT" locale="en"/></LocaleProvider>);
  expect(markup.match(/class="rula-correction-toggle/g)).toHaveLength(5);
  expect(markup).toContain('aria-expanded="false"');
  expect(markup).toContain('Show remaining suggestions');
  expect(markup.match(/class="rula-expandable-action"/g)).toHaveLength(5);
  expect(markup).toContain('&lt;script&gt;long&lt;/script&gt;');
  expect(markup).not.toContain('<script>');
  expect(markup).not.toContain('Title 5');
});

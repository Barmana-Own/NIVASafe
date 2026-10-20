import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../i18n";
import { RulaReportDataTable, rulaReportAnalysisForImages, rulaImageAssessmentResult } from "./AssessmentPages";
afterEach(() => vi.unstubAllGlobals());
it("reports every photo with its own scores without exposing filenames and fits responsive RTL layout", () => {
  vi.stubGlobal("localStorage", { getItem: () => "fa" });
  const row = { angle: 0, score: 1, detected: true, source: "AI" as const, confirmedByUser: false };
  const neutral = { upperArm: row, lowerArm: row, wrist: row, wristTwist: row, neck: row, trunk: row, legs: row };
  const images = [1, 2, 3, 4].map(score => ({ imageKey: String(score), fileName: `image-${score}<script>.png`, analysis: { ...neutral, trunk: { ...row, score }, neck: { ...row, score } }, force: 0, muscleUse: false }));
  const analysis = rulaReportAnalysisForImages(images, "RIGHT", neutral);
  const markup = renderToStaticMarkup(<LocaleProvider><RulaReportDataTable analysis={analysis} factors={[]} selectedActions={[]} imageBodySide="RIGHT" locale="fa"/></LocaleProvider>);
  expect(markup.match(/data-rula-image=/g)).toHaveLength(4);
  expect(markup.match(/<table/g)).toHaveLength(1);
  expect(markup.match(/data-rula-image-part=/g)).toHaveLength(28);
  expect(markup).not.toContain("ارزیابی مستقل تصاویر");
  for (const image of images) { expect(markup).not.toContain(`image-${image.imageKey}&lt;script&gt;.png`); expect(markup).not.toContain(image.fileName); }
  expect(markup).not.toContain("<script>");
  const articles = markup.match(/<tr class="rula-image-table-heading"[\s\S]*?<\/tr>/g) ?? [];
  for (const [index, image] of images.entries()) expect(articles[index]).toContain(`RULA: ${rulaImageAssessmentResult(image, "RIGHT").score.toLocaleString("fa-IR")}`);
  if (process.env.RULA_MULTI_IMAGE_FIXTURE) {
    const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
    writeFileSync(process.env.RULA_MULTI_IMAGE_FIXTURE, `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body class="app" data-theme="blue"><main style="margin:20px;width:calc(100% - 40px);min-width:0">${markup}</main></body></html>`);
  }
});

it("keeps per-image left-side scores independent inside the existing table", () => {
  vi.stubGlobal("localStorage", { getItem: () => "en" });
  const row = { angle: null, score: 1, detected: true, source: "AI" as const, confirmedByUser: false };
  const neutral = { upperArm: row, lowerArm: row, wrist: row, wristTwist: row, neck: row, trunk: row, legs: row };
  const left = { ...neutral, trunk: { ...row, score: 4 } };
  const image = { imageKey: "both", fileName: "two-sides.png", analysis: { ...neutral, sideAnalyses: { LEFT: left, RIGHT: neutral } }, force: 0, muscleUse: false };
  const markup = renderToStaticMarkup(<LocaleProvider><RulaReportDataTable analysis={neutral} imageAssessments={[image]} imageBodySide="LEFT" factors={[]} selectedActions={[]} locale="en"/></LocaleProvider>);
  expect(markup).not.toContain("two-sides.png");
  expect(markup).toContain(`RULA: ${rulaImageAssessmentResult({ ...image, analysis: left }, "LEFT").score}`);
  const trunk = markup.match(/<tr[^>]*data-rula-image-part="trunk"[\s\S]*?<\/tr>/)?.[0];
  expect(trunk).toContain('class="rula-suggested-score">4');
  expect(markup.match(/<table/g)).toHaveLength(1);
  expect(readFileSync(new URL("./AssessmentPages.tsx", import.meta.url), "utf8")).not.toContain("<RulaImageAssessmentSummary");
});

const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || "playwright-core");

(async () => {
  const fixture = process.env.RULA_LAYOUT_FIXTURE;
  assert(fixture, "RULA_LAYOUT_FIXTURE is required; use synthetic data only");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage();
    const results = [];
    for (const width of [390, 768, 769, 1024, 1280, 1554, 1600]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(pathToFileURL(fixture).href);
      await page.evaluate(() => {
        document.body.classList.add("app", "rula-report-page");
        document.body.dataset.theme = "blue";
        document.querySelectorAll(".rula-evaluation-action p").forEach(element => {
          element.textContent += " برای کاهش فشار و بهبود وضعیت بدن، ارتفاع سطح کار و فاصله دسترسی را تنظیم کنید. ".repeat(8);
        });
      });
      const result = await page.evaluate(() => {
        const wrapper = document.querySelector(".rula-report-table-wrap");
        const report = document.querySelector(".rula-report-view");
        const rect = wrapper.getBoundingClientRect();
        return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
          reportWidth: report.getBoundingClientRect().width,
          wrapperWidth: rect.width, wrapperLeft: rect.left, wrapperRight: rect.right,
          tableWidth: wrapper.scrollWidth, actionRows: document.querySelectorAll("[data-action-id]").length };
      });
      assert(result.pageWidth <= width + 1, `Page overflow at ${width}: ${JSON.stringify(result)}`);
      assert(result.wrapperLeft >= -1 && result.wrapperRight <= width + 1, `Table wrapper escaped at ${width}`);
      assert(result.tableWidth <= result.wrapperWidth + 1, `Horizontal table scrolling at ${width}: ${JSON.stringify(result)}`);
      assert.equal(result.actionRows, 3, "Actions were lost while containing the table");
      results.push(result);
      if (process.env.RULA_LAYOUT_SCREENSHOT && width === 1280) {
        await page.screenshot({ path: process.env.RULA_LAYOUT_SCREENSHOT, fullPage: true });
      }
    }
    console.log(JSON.stringify({ status: "PASS", viewports: results }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });

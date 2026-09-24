import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const viteConfig = readFileSync(fileURLToPath(new URL("../vite.config.ts", import.meta.url)), "utf8");

describe("frontend build contract", () => {
  it("forces the production React runtime for production bundles", () => {
    expect(viteConfig).toContain(
      'const productionCommand = process.argv.some((argument) => argument === "build" || argument === "preview");',
    );
    expect(viteConfig).toContain("jsxDev: mode !== \"production\",");
    expect(viteConfig).toContain('process.env.NODE_ENV = mode === "production" ? "production" : "development";');
  });
});

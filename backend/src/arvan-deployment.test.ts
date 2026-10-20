import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

describe("production Arvan model profile", () => {
  it("applies the same non-secret routing to the API and worker", () => {
    const config = createRequire(import.meta.url)("../../deployment/ecosystem.config.cjs");
    for (const app of config.apps) {
      expect(app.env).toMatchObject({ AI_ENABLED: "true", AI_CHAT_PROVIDER: "arvancloud", AI_RISK_PROVIDER: "arvancloud", AI_RISK_FALLBACK_PROVIDER: "arvancloud", ARVAN_BASE_URL: "https://api.arvancloudai.ir/v1" });
      expect(app.env).not.toHaveProperty("ARVAN_API_KEY");
    }
  });
  it("keeps Docker defaults aligned and secrets externally provisioned", () => {
    const source = readFileSync(new URL("../../docker-compose.yml", import.meta.url), "utf8");
    expect(source).not.toMatch(/AI_RISK_MODEL|AI_RISK_FALLBACK_MODEL|AI_CHAT_MODEL/);
    expect(source.match(/ARVAN_API_KEY: \$\{ARVAN_API_KEY:-\}/g)).toHaveLength(2);
  });
});

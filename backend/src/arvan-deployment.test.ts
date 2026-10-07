import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

describe("production Arvan model profile", () => {
  it("applies the same non-secret routing to the API and worker", () => {
    const config = createRequire(import.meta.url)("../../deployment/ecosystem.config.cjs");
    for (const app of config.apps) {
      expect(app.env).toMatchObject({ AI_ENABLED: "true", AI_CHAT_PROVIDER: "arvancloud", AI_CHAT_MODEL: "DeepSeek-V4-Flash", AI_RISK_PROVIDER: "arvancloud", AI_RISK_MODEL: "GPT-5-Mini", ARVAN_BASE_URL: "https://api.arvancloudai.ir/v1" });
      expect(app.env).not.toHaveProperty("ARVAN_API_KEY");
    }
  });
  it("keeps Docker defaults aligned and secrets externally provisioned", () => {
    const source = readFileSync(new URL("../../docker-compose.yml", import.meta.url), "utf8");
    expect(source.match(/AI_RISK_MODEL: \$\{AI_RISK_MODEL:-GPT-5-Mini\}/g)).toHaveLength(2);
    expect(source.match(/AI_CHAT_MODEL: \$\{AI_CHAT_MODEL:-DeepSeek-V4-Flash\}/g)).toHaveLength(2);
    expect(source.match(/ARVAN_API_KEY: \$\{ARVAN_API_KEY:-\}/g)).toHaveLength(2);
  });
});

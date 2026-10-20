import { describe, expect, it } from "vitest";
import { resolveAssistantConnectionStatus } from "./assistantConnectionStatus";

describe("assistant connection status", () => {
  const configuredModel = { name: "arvancloud", available: true, chatModel: "DeepSeek-V4-Flash" };

  it("does not call configured credentials a live connection", () => {
    expect(resolveAssistantConnectionStatus({ loading: false, failed: false, activeProvider: configuredModel })).toEqual({ kind: "configured", tone: "configured" });
  });

  it("reports fallback mode when there is no configured remote model", () => {
    expect(resolveAssistantConnectionStatus({ loading: false, failed: false, activeProvider: { name: "fallback", available: true } })).toEqual({ kind: "fallback", tone: "no" });
  });

  it("reports when the latest completed response used fallback", () => {
    expect(resolveAssistantConnectionStatus({ loading: false, failed: false, activeProvider: configuredModel, latestResponseProvider: "fallback" })).toEqual({ kind: "lastFallback", tone: "no" });
  });

  it("identifies a provider only after a response actually came from it", () => {
    expect(resolveAssistantConnectionStatus({ loading: false, failed: false, activeProvider: configuredModel, latestResponseProvider: "arvancloud" })).toEqual({ kind: "lastResponse", tone: "yes", provider: "arvancloud" });
  });

  it("keeps loading and status-service errors distinct", () => {
    expect(resolveAssistantConnectionStatus({ loading: true, failed: false, activeProvider: null })).toEqual({ kind: "checking", tone: "configured" });
    expect(resolveAssistantConnectionStatus({ loading: false, failed: true, activeProvider: null })).toEqual({ kind: "unavailable", tone: "no" });
  });
});

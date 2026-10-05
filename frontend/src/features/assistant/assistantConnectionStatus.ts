export type AssistantProviderSummary = {
  name: string;
  available: boolean;
  chatModel?: string | null;
};

export type AssistantConnectionStatus =
  | { kind: "checking"; tone: "configured" }
  | { kind: "unavailable"; tone: "no" }
  | { kind: "fallback"; tone: "no" }
  | { kind: "configured"; tone: "configured" }
  | { kind: "lastFallback"; tone: "no" }
  | { kind: "lastResponse"; tone: "yes"; provider: string };

export function resolveAssistantConnectionStatus(input: {
  loading: boolean;
  failed: boolean;
  activeProvider: AssistantProviderSummary | null;
  latestResponseProvider?: string | null;
}): AssistantConnectionStatus {
  if (input.loading) return { kind: "checking", tone: "configured" };
  if (input.failed) return { kind: "unavailable", tone: "no" };

  const latestProvider = input.latestResponseProvider?.trim().toLocaleLowerCase();
  if (latestProvider === "fallback") return { kind: "lastFallback", tone: "no" };
  if (latestProvider) return { kind: "lastResponse", tone: "yes", provider: latestProvider };

  if (!input.activeProvider || !input.activeProvider.available || input.activeProvider.name === "fallback") {
    return { kind: "fallback", tone: "no" };
  }

  return { kind: "configured", tone: "configured" };
}

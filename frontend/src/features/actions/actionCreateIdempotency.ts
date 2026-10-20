function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export class ActionCreateIdempotency {
  private readonly pending = new Map<string, Map<string, string>>();

  constructor(private readonly createId: () => string = () => globalThis.crypto.randomUUID()) {}

  keyFor(scope: string, payload: unknown): string {
    const fingerprint = stableJson(payload);
    const scopeKeys = this.pending.get(scope);
    const current = scopeKeys?.get(fingerprint);
    if (current) return current;

    const key = `nivasafe-action:${this.createId()}`;
    const nextScopeKeys = scopeKeys ?? new Map<string, string>();
    nextScopeKeys.set(fingerprint, key);
    this.pending.set(scope, nextScopeKeys);
    return key;
  }

  complete(scope: string, payload: unknown): void {
    const scopeKeys = this.pending.get(scope);
    if (!scopeKeys) return;
    scopeKeys.delete(stableJson(payload));
    if (!scopeKeys.size) this.pending.delete(scope);
  }
}

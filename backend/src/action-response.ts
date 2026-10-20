/** Keep the server-only idempotency fingerprint out of every API/report payload. */
export function withoutActionCreateRequestHash<T extends { createRequestHash?: string | null }>(action: T): Omit<T, "createRequestHash"> {
  const response = { ...action } as Record<string, unknown>;
  delete response.createRequestHash;
  return response as Omit<T, "createRequestHash">;
}

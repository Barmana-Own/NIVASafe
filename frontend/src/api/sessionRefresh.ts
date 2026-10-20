/** This reads an expiry hint only. Signature, identity and access checks remain on the server. */
export function accessTokenNeedsRefresh(token: string, now = Date.now()): boolean {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[1].length > 4096 || !/^[A-Za-z0-9_-]+={0,2}$/.test(parts[1])) return false;
  try {
    const encoded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="))) as { exp?: unknown };
    return typeof payload?.exp === "number" && Number.isFinite(payload.exp) && payload.exp >= 0 && payload.exp * 1000 <= now + 60_000;
  } catch { return false; }
}

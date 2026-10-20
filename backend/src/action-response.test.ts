import { describe, expect, it } from "vitest";
import { withoutActionCreateRequestHash } from "./action-response.js";

describe("corrective action API projection", () => {
  it("strips the server-only idempotency fingerprint and preserves public action data", () => {
    expect(withoutActionCreateRequestHash({ id: "action-1", title: "Inspect guard", createRequestHash: "private-hash" }))
      .toEqual({ id: "action-1", title: "Inspect guard" });
  });
});

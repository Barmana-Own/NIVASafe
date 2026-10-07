import { describe, expect, it } from "vitest";
import { notificationLink } from "./notificationModel";

describe("notification destinations", () => {
  it("allows assessment reports and known local notification destinations", () => {
    for (const link of ["/actions", "/fmea", "/rula", "/notifications", "/rula/00000000-0000-4000-8000-000000000001/report"]) expect(notificationLink(link)).toBe(link);
  });
  it("rejects external, executable, encoded, privileged and malformed destinations", () => {
    for (const link of [undefined, null, "", "//example.com", "https://example.com", "javascript:alert(1)", "/%2fexample.com", "/admin", "/rula/../admin/report", "/actions?redirect=https://example.com", "/actions#unsafe", "/rula/not-an-id/report", " /actions"]) expect(notificationLink(link)).toBeNull();
  });
});

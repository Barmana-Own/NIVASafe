import { describe, expect, it } from "vitest";
import { notificationLink } from "./notificationModel";

describe("notification destinations", () => {
  it("allows assessment reports and known local notification destinations", () => {
    for (const link of ["/actions", "/fmea", "/rula", "/notifications", "/support", "/rula/00000000-0000-4000-8000-000000000001/report"]) expect(notificationLink(link)).toBe(link);
  });
  it("allows only a UUID support ticket deep-link without unrelated URL parameters", () => {
    const ticket = "/support?ticket=00000000-0000-4000-8000-000000000001";
    expect(notificationLink(ticket)).toBe(ticket);
    for (const link of ["/support?ticket=not-an-id", `${ticket}&redirect=https://example.com`, `${ticket}#unsafe`, "/support?ticket=%2f%2fexample.com", "/support?ticket=", "/support?redirect=/admin"]) expect(notificationLink(link)).toBeNull();
  });
  it("rejects external, executable, encoded, privileged and malformed destinations", () => {
    for (const link of [undefined, null, "", "//example.com", "https://example.com", "javascript:alert(1)", "/%2fexample.com", "/admin", "/rula/../admin/report", "/actions?redirect=https://example.com", "/actions#unsafe", "/rula/not-an-id/report", " /actions"]) expect(notificationLink(link)).toBeNull();
  });
});

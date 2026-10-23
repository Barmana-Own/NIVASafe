import { describe, expect, it } from "vitest";
import { eligibleOrganizationImage, organizationImageFile } from "./OrganizationImagePicker";
import { organizationImageSource } from "./organizationImageSource";
const item = { id: "test-image", originalName: "posture.png", mimeType: "image/png", size: 3, createdAt: "2026-10-09T10:00:00Z" };
describe("organization image reuse", () => {
  it("filters documents, invalid identifiers, empty and oversized images", () => {
    expect(eligibleOrganizationImage(item, 10)).toBe(true);
    for (const change of [{ mimeType: "application/pdf" }, { id: "../secret" }, { size: 0 }, { size: 11 }]) expect(eligibleOrganizationImage({ ...item, ...change }, 10)).toBe(false);
  });
  it("validates actual downloaded type and size instead of trusting metadata", () => {
    expect(() => organizationImageFile(item, new Blob(["bad"], { type: "text/html" }), 10)).toThrow();
    expect(() => organizationImageFile(item, new Blob([new Uint8Array(11)], { type: "image/png" }), 10)).toThrow();
    expect(() => organizationImageFile(item, new Blob([], { type: "image/png" }), 10)).toThrow();
  });
  it("preserves filename, MIME type and stable duplicate identity for the existing assessment pipeline", () => {
    const file = organizationImageFile(item, new Blob([new Uint8Array(3)], { type: "image/png" }), 10);
    expect(file.name).toBe(item.originalName); expect(file.type).toBe(item.mimeType); expect(file.size).toBe(3); expect(file.lastModified).toBe(Date.parse(item.createdAt));
    expect(organizationImageSource(file)).toEqual(item);
  });
});

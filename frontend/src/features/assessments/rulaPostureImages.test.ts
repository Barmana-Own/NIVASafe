import { describe, expect, it } from "vitest";
import { appendRulaPostureImages, RULA_POSTURE_IMAGE_MAX_COUNT } from "./rulaPostureImages.js";

function image(name: string, type = "image/jpeg", size = 128, lastModified = 1) {
  return new File([new Uint8Array(size)], name, { type, lastModified });
}

describe("RULA posture image selection", () => {
  it("allows up to four distinct supported images", () => {
    const result = appendRulaPostureImages([], [image("one.jpg"), image("two.png", "image/png"), image("three.webp", "image/webp"), image("four.jpg", "image/jpeg", 128, 2)]);

    expect(RULA_POSTURE_IMAGE_MAX_COUNT).toBe(4);
    expect(result.files).toHaveLength(4);
    expect(result.issue).toBeNull();
  });

  it("rejects images beyond the four-image total, including saved attachments", () => {
    const result = appendRulaPostureImages([image("new.jpg")], [image("fifth.jpg")], 3);

    expect(result.files).toHaveLength(1);
    expect(result.issue).toBe("tooMany");
  });

  it("skips duplicate selections and rejects unsupported or oversized files", () => {
    const original = image("one.jpg");
    const result = appendRulaPostureImages([original], [image("one.jpg"), image("notes.gif", "image/gif"), image("large.png", "image/png", 10 * 1024 * 1024 + 1)]);

    expect(result.files).toEqual([original]);
    expect(result.issue).toBe("invalidType");
    expect(appendRulaPostureImages([], [image("large.png", "image/png", 10 * 1024 * 1024 + 1)]).issue).toBe("tooLarge");
  });
});

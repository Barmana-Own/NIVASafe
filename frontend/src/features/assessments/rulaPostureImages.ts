export const RULA_POSTURE_IMAGE_MAX_COUNT = 4;
export const RULA_POSTURE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type RulaPostureImageSelectionIssue = "invalidType" | "tooLarge" | "tooMany";

export function rulaPostureImageFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function appendRulaPostureImages(
  current: File[],
  selected: File[],
  reservedCount = 0,
) {
  const files = [...current];
  const keys = new Set(files.map(rulaPostureImageFileKey));
  let issue: RulaPostureImageSelectionIssue | null = null;

  for (const file of selected) {
    if (!allowedImageTypes.has(file.type)) {
      issue ??= "invalidType";
      continue;
    }
    if (file.size > RULA_POSTURE_IMAGE_MAX_BYTES) {
      issue ??= "tooLarge";
      continue;
    }

    const key = rulaPostureImageFileKey(file);
    if (keys.has(key)) continue;
    if (reservedCount + files.length >= RULA_POSTURE_IMAGE_MAX_COUNT) {
      issue ??= "tooMany";
      continue;
    }

    files.push(file);
    keys.add(key);
  }

  return { files, issue };
}

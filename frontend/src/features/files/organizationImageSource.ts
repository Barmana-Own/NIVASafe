export type OrganizationImage = { id: string; originalName: string; mimeType: string; size: number; createdAt: string };

// Only validated organization downloads receive provenance. Copying or editing
// the bytes into a new File deliberately produces a new local image instead.
const sources = new WeakMap<File, Readonly<OrganizationImage>>();

export function registerOrganizationImage(file: File, image: OrganizationImage) {
  sources.set(file, Object.freeze({ ...image }));
  return file;
}

export function organizationImageSource(file: File) {
  return sources.get(file);
}

export function assessmentImageFileKey(file: File) {
  const source = organizationImageSource(file);
  return source ? `organization:${source.id}` : `${file.name}:${file.size}:${file.lastModified}`;
}

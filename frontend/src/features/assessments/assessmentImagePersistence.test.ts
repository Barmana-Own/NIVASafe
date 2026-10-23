import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, getSession } from "../../api/client";
import { organizationImageFile } from "../files/OrganizationImagePicker";
import { assessmentImageFileKey, organizationImageSource } from "../files/organizationImageSource";
import { persistAssessmentImage } from "./assessmentImagePersistence";

vi.mock("../../api/client", () => ({ api: vi.fn(), getSession: vi.fn() }));
const image = { id: "original-photo", originalName: "posture.png", mimeType: "image/png", size: 3, createdAt: "2026-10-22T12:00:00Z" };
const localFile = () => new File([new Uint8Array(3)], image.originalName, { type: image.mimeType, lastModified: Date.parse(image.createdAt) });
const organizationFile = (id = image.id) => organizationImageFile({ ...image, id }, new Blob([new Uint8Array(3)], { type: image.mimeType }), 10);
const session = (orgId = "org-one") => ({ orgId, session: { user: { id: "user-one" } } } as ReturnType<typeof getSession>);

beforeEach(() => { vi.mocked(api).mockReset(); vi.mocked(getSession).mockReturnValue(session()); });

describe("assessment image provenance", () => {
  it("identifies a library selection by its original ID instead of mutable or colliding file metadata", () => {
    const first = organizationFile();
    const repeated = organizationFile();
    const other = organizationFile("different-photo");
    expect(assessmentImageFileKey(first)).toBe(assessmentImageFileKey(repeated));
    expect(assessmentImageFileKey(first)).not.toBe(assessmentImageFileKey(other));
    expect(assessmentImageFileKey(first)).not.toBe(assessmentImageFileKey(localFile()));
    expect(organizationImageSource(first)?.id).toBe(image.id);
  });

  it("does not transfer original identity to a new File containing copied or edited bytes", () => {
    const source = organizationFile();
    const derived = new File([source], source.name, { type: source.type, lastModified: source.lastModified });
    expect(organizationImageSource(derived)).toBeUndefined();
    expect(organizationImageSource(source)?.id).toBe(image.id);
  });
});

describe.each(["FmeaAssessment", "RulaAssessment"] as const)("%s image persistence", entityType => {
  it("links the original canonical attachment without uploading or reparenting its bytes", async () => {
    const file = organizationFile();
    vi.mocked(api).mockResolvedValue({ data: { id: image.id } });
    expect(await persistAssessmentImage(entityType, "assessment-one", file)).toEqual({ id: image.id });
    expect(api).toHaveBeenCalledExactlyOnceWith(`/files/${image.id}/assessment-links`, { method: "POST", body: JSON.stringify({ entityType, entityId: "assessment-one" }) });
  });

  it("retries failed links without falling back to duplicate uploads and retains provenance", async () => {
    const file = organizationFile();
    vi.mocked(api).mockRejectedValueOnce(new Error("Forbidden")).mockResolvedValue({ data: { id: image.id } });
    await expect(persistAssessmentImage(entityType, "assessment-one", file)).rejects.toThrow("Forbidden");
    expect(organizationImageSource(file)?.id).toBe(image.id);
    await expect(persistAssessmentImage(entityType, "assessment-one", file)).resolves.toEqual({ id: image.id });
    expect(vi.mocked(api).mock.calls.map(([path]) => path)).toEqual([`/files/${image.id}/assessment-links`, `/files/${image.id}/assessment-links`]);
  });

  it("uploads genuine new local files once per assessment and shares an in-flight retry", async () => {
    const file = localFile();
    let complete!: (value: { data: { id: string } }) => void;
    vi.mocked(api).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const first = persistAssessmentImage(entityType, "assessment-one", file);
    const duplicate = persistAssessmentImage(entityType, "assessment-one", file);
    expect(api).toHaveBeenCalledTimes(1);
    const [path, options] = vi.mocked(api).mock.calls[0];
    expect(path).toBe("/files");
    const body = options?.body as FormData;
    expect(body.get("entityType")).toBe(entityType);
    expect(body.get("entityId")).toBe("assessment-one");
    expect(body.get("file")).toBe(file);
    complete({ data: { id: "new-upload" } });
    await expect(first).resolves.toEqual({ id: "new-upload" });
    await expect(duplicate).resolves.toEqual({ id: "new-upload" });
    await persistAssessmentImage(entityType, "assessment-one", file);
    expect(api).toHaveBeenCalledTimes(1);
    expect(organizationImageSource(file)).toBeUndefined();
  });

  it("does not cache failed uploads or reuse a success for a different assessment or workspace", async () => {
    const file = localFile();
    vi.mocked(api).mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValue({ data: { id: "new-upload" } });
    await expect(persistAssessmentImage(entityType, "assessment-one", file)).rejects.toThrow("Unavailable");
    await persistAssessmentImage(entityType, "assessment-one", file);
    await persistAssessmentImage(entityType, "assessment-two", file);
    vi.mocked(getSession).mockReturnValue(session("org-two"));
    await persistAssessmentImage(entityType, "assessment-one", file);
    expect(api).toHaveBeenCalledTimes(4);
    expect(vi.mocked(api).mock.calls.every(([path]) => path === "/files")).toBe(true);
  });
});

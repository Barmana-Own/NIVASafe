import { readFileSync } from "node:fs";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, getSession } from "../../api/client";
import { organizationImageFile } from "../files/OrganizationImagePicker";
import { assessmentImageFileKey } from "../files/organizationImageSource";
import { persistAssessmentImage } from "./assessmentImagePersistence";

vi.mock("../../api/client", () => ({ api: vi.fn(), getSession: vi.fn() }));
const original = { id: "original-image", originalName: "posture.png", mimeType: "image/png", size: 3, createdAt: "2026-10-22T12:00:00Z" };
const organizationFile = () => organizationImageFile(original, new Blob([new Uint8Array(3)], { type: original.mimeType }), 10);
const localFile = () => new File([new Uint8Array(3)], "local.png", { type: "image/png" });
const source = ts.createSourceFile("AssessmentPages.tsx", readFileSync(new URL("./AssessmentPages.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

// Execute the actual page persistence functions, with only their outer browser
// state and API boundary supplied. This verifies page wiring without duplicating
// either loop or mounting unrelated AI/review workflows.
function pageFunction(name: string, bindings: Record<string, unknown>) {
  let declaration: ts.FunctionDeclaration | undefined;
  const find = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node; else ts.forEachChild(node, find); };
  find(source);
  if (!declaration) throw new Error(`Missing production function: ${name}`);
  const code = ts.transpileModule(declaration.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(bindings), `${code}\nreturn ${name};`)(...Object.values(bindings)) as (...args: unknown[]) => Promise<boolean>;
}

beforeEach(() => {
  vi.mocked(api).mockReset();
  vi.mocked(getSession).mockReturnValue({ orgId: "test-org", session: { user: { id: "test-user" } } } as ReturnType<typeof getSession>);
  vi.mocked(api).mockImplementation(async path => ({ data: { id: path === "/files" ? "local-upload" : original.id } }));
});

describe("active assessment page persistence wiring", () => {
  it("FMEA attaches the original and uploads only a genuinely new local image", async () => {
    const files = [organizationFile(), localFile()];
    const persist = pageFunction("uploadFmeaProcessImages", { processImages: files, persistAssessmentImage });
    expect(await persist("assessment-one")).toBe(false);
    expect(vi.mocked(api).mock.calls.map(([path]) => path)).toEqual([`/files/${original.id}/assessment-links`, "/files"]);
    expect(JSON.parse(String(vi.mocked(api).mock.calls[0][1]?.body))).toEqual({ entityType: "FmeaAssessment", entityId: "assessment-one" });
    expect((vi.mocked(api).mock.calls[1][1]?.body as FormData).get("file")).toBe(files[1]);
  });

  it("RULA persists original IDs into snapshots and the highest-risk primary image", async () => {
    const files = [organizationFile(), localFile()];
    const images = files.map((file, index) => ({ imageKey: assessmentImageFileKey(file), fileName: file.name, analysis: { score: index === 0 ? 7 : 3 } }));
    const persist = pageFunction("persistRulaPostureImages", { persistAssessmentImage, api, reportImageAssessments: images, rulaPostureImageFileKey: assessmentImageFileKey, rulaBodySide: "RIGHT", postureAnalysis: {}, rulaImageAssessmentResult: (image: { analysis: unknown }) => image.analysis, rulaReportAnalysisForImages: (snapshots: unknown) => ({ imageAssessments: snapshots }) });
    expect(await persist("assessment-one", files, { jobTitle: "Synthetic", taskDescription: "Synthetic task" })).toBe(false);
    const calls = vi.mocked(api).mock.calls;
    expect(calls.map(([path]) => path)).toEqual([`/files/${original.id}/assessment-links`, "/files", "/rula/assessment-one"]);
    const patch = JSON.parse(String(calls[2][1]?.body));
    expect(patch.activityInfo.postureImageAttachmentId).toBe(original.id);
    expect(patch.postureAnalysis.imageAssessments.map((image: { attachmentId: string }) => image.attachmentId)).toEqual([original.id, "local-upload"]);
    expect(images.some(image => "attachmentId" in image)).toBe(false);
  });

  for (const type of ["FMEA", "RULA"] as const) {
    it(`${type} reports a failed original link without attempting a duplicate multipart upload`, async () => {
      vi.mocked(api).mockRejectedValue(new Error("Forbidden source"));
      const files = [organizationFile()];
      const persist = type === "FMEA" ? pageFunction("uploadFmeaProcessImages", { processImages: files, persistAssessmentImage }) : pageFunction("persistRulaPostureImages", { persistAssessmentImage, api, reportImageAssessments: [] });
      expect(await persist("assessment-one", files, {})).toBe(true);
      expect(api).toHaveBeenCalledTimes(1);
      expect(vi.mocked(api).mock.calls[0][0]).toBe(`/files/${original.id}/assessment-links`);
    });
  }

  it("RULA retries a later patch failure without uploading the same successful local image twice", async () => {
    const files = [localFile()];
    const images = [{ imageKey: assessmentImageFileKey(files[0]), analysis: { score: 4 } }];
    let patches = 0;
    vi.mocked(api).mockImplementation(async path => { if (path === "/rula/assessment-one" && ++patches === 1) throw new Error("Temporary patch failure"); return { data: { id: "local-upload" } }; });
    const persist = pageFunction("persistRulaPostureImages", { persistAssessmentImage, api, reportImageAssessments: images, rulaPostureImageFileKey: assessmentImageFileKey, rulaBodySide: "RIGHT", postureAnalysis: {}, rulaImageAssessmentResult: (image: { analysis: unknown }) => image.analysis, rulaReportAnalysisForImages: (snapshots: unknown) => ({ imageAssessments: snapshots }) });
    expect(await persist("assessment-one", files, {})).toBe(true);
    expect(await persist("assessment-one", files, {})).toBe(false);
    expect(vi.mocked(api).mock.calls.filter(([path]) => path === "/files")).toHaveLength(1);
    expect(vi.mocked(api).mock.calls.filter(([path]) => path === "/rula/assessment-one")).toHaveLength(2);
  });
});

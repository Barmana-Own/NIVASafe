import { api, getSession } from "../../api/client";
import { organizationImageSource } from "../files/organizationImageSource";

type AssessmentImageTarget = "FmeaAssessment" | "RulaAssessment";
type Attachment = { id: string };
const uploaded = new WeakMap<File, Map<string, Attachment>>();
const pending = new WeakMap<File, Map<string, Promise<Attachment>>>();

export async function persistAssessmentImage(entityType: AssessmentImageTarget, entityId: string, file: File): Promise<Attachment> {
  const { session, orgId } = getSession();
  const target = `${session?.user.id ?? ""}:${orgId}:${entityType}:${entityId}`;
  const source = organizationImageSource(file);
  const previous = uploaded.get(file)?.get(target);
  if (!source && previous) return previous;
  const existing = pending.get(file)?.get(target);
  if (existing) return existing;
  const requests = pending.get(file) ?? new Map<string, Promise<Attachment>>();
  pending.set(file, requests);
  const request = (async () => {
    if (source) {
      const response = await api<Attachment>(`/files/${encodeURIComponent(source.id)}/assessment-links`, { method: "POST", body: JSON.stringify({ entityType, entityId }) });
      return response.data;
    }
    const body = new FormData();
    body.append("entityType", entityType);
    body.append("entityId", entityId);
    body.append("file", file);
    const response = await api<Attachment>("/files", { method: "POST", body });
    const completed = uploaded.get(file) ?? new Map<string, Attachment>();
    completed.set(target, response.data);
    uploaded.set(file, completed);
    return response.data;
  })();
  requests.set(target, request);
  try { return await request; }
  finally { requests.delete(target); }
}


import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, download, getCurrentRole, getSession, useLoad } from "../../api/client";
import { Alert, Button, EmptyState, FormField, Icon, IconButton, LoadingState, Modal, PageHeader, SectionCard, formatDate, useDialog } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { useI18n } from "../../i18n";

type FileReference = { type: "FMEA" | "RULA" | "KNOWLEDGE" | "OTHER"; title: string | null; code: string | null };
type FileItem = { id: string; originalName: string; mimeType: string; size: number; kind: string; createdAt: string; reference?: FileReference | null };
type RegisteredReport = { id: string; type: "FMEA" | "RULA"; title: string; code: string | null; projectName: string; projectCode: string | null; finalizedAt: string };
type FilePreview = { item: FileItem; url: string; mode: "image" | "video" | "pdf" | "fallback" };
const sizeLabel = (size: number) => size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;

function fileReferenceLabel(reference: FileReference | null | undefined, t: (key: string) => string) {
  if (!reference) return t("files.referenceNone");
  const typeLabel = ({ FMEA: t("files.referenceFmea"), RULA: t("files.referenceRula"), KNOWLEDGE: t("files.referenceKnowledge"), OTHER: t("files.referenceOther") } as Record<FileReference["type"], string>)[reference.type];
  const target = [reference.title, reference.code].filter((value): value is string => Boolean(value?.trim())).join(" · ");
  return target ? `${typeLabel} · ${target}` : typeLabel;
}

export function FilesPage() {
  const state = useLoad<FileItem[]>("/files");
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const uploadSubmittingRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);
  const previewRequestRef = useRef(0);
  const dialog = useDialog();
  const role = getCurrentRole();
  const { session, orgId } = getSession();
  const uploadDraftKey = scopedDraftKey("file-upload", session?.user.id, orgId);
  const canUpload = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "ASSISTANT", "ASSESSOR"].includes(role);
  const canViewReports = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "ASSISTANT", "ASSESSOR"].includes(role);
  const reports = useLoad<RegisteredReport[]>(canViewReports ? "/reports/registered" : null);
  const canDelete = ["SUPER_ADMIN", "ORG_ADMIN"].includes(role);
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  }, []);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadSubmittingRef.current) return;
    uploadSubmittingRef.current = true;
    setUploading(true);
    const element = event.currentTarget; const form = new FormData(element); setError(""); setMessage("");
    try { await api("/files", { method: "POST", body: form }); await clearAutoSaveDraft(uploadDraftKey); element.reset(); setFileName(""); state.reload(); setMessage(t("files.uploaded")); }
    catch (reason) { setError((reason as Error).message); }
    finally { uploadSubmittingRef.current = false; setUploading(false); }
  }
  async function remove(id: string) { if (!(await dialog.confirm(`${t("common.delete")}؟`))) return; try { setError(""); await api(`/files/${id}`, { method: "DELETE" }); state.reload(); setMessage(t("files.deleted")); } catch (reason) { setError((reason as Error).message); } }
  async function getFile(item: FileItem) { try { setError(""); const blob = await download(`/files/${item.id}/download`); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = item.originalName; anchor.click(); URL.revokeObjectURL(url); } catch (reason) { setError((reason as Error).message); } }
  function replacePreview(next: FilePreview | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = next?.url ?? null;
    setFilePreview(next);
  }
  function closePreview() {
    previewRequestRef.current += 1;
    replacePreview(null);
  }
  function downloadPreview() {
    if (!filePreview) return;
    const anchor = document.createElement("a");
    anchor.href = filePreview.url;
    anchor.download = filePreview.item.originalName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
  function markPreviewFallback(url: string) {
    setFilePreview((current) => current?.url === url ? { ...current, mode: "fallback" } : current);
  }
  async function preview(item: FileItem) {
    const requestId = ++previewRequestRef.current;
    try {
      setError("");
      const blob = await download(`/files/${item.id}/download`);
      const url = URL.createObjectURL(blob);
      if (requestId !== previewRequestRef.current) {
        URL.revokeObjectURL(url);
        return;
      }
      const mimeType = item.mimeType.toLowerCase();
      const mode = item.kind === "IMAGE" || mimeType.startsWith("image/") ? "image" : item.kind === "VIDEO" || mimeType.startsWith("video/") ? "video" : mimeType === "application/pdf" ? "pdf" : "fallback";
      replacePreview({ item, url, mode });
    } catch (reason) {
      if (requestId === previewRequestRef.current) setError((reason as Error).message);
    }
  }
  return <section className="page-shell">
    <PageHeader eyebrow={t("files.eyebrow")} title={t("files.title")} description={t("files.description")}/>
    {error && <Alert tone="error">{error}</Alert>}{message && <Alert tone="success">{message}</Alert>}
    {canUpload && <SectionCard title={t("files.upload")} description={t("files.uploadDescription")} icon="plus">
      <AutoSaveForm storageKey={uploadDraftKey} className="upload-form" onSubmit={upload} excludeFields={["file"]}>
        <label className="dropzone"><input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf,.doc,.docx,.xlsx,.csv,.txt" required aria-label={t("files.choose")} onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}/><span className="upload-icon"><Icon name="files" size={30}/></span><strong dir="auto" title={fileName || undefined}>{fileName || t("files.choose")}</strong><small>{t("files.fileTypes")}</small><span className="ghost fake-button">{t("files.chooseButton")}</span></label>
        <FormField label={t("files.referenceType")} htmlFor="file-reference"><input id="file-reference" name="entityType" placeholder={t("files.referencePlaceholder")}/></FormField><Button type="submit" disabled={uploading} aria-busy={uploading}><Icon name="plus"/> {t("files.uploadButton")}</Button>
      </AutoSaveForm>
    </SectionCard>}
    {canViewReports && <SectionCard title={t("files.reportsSection")} description={t("files.reportsDescription")} icon="chart">
      {reports.loading ? <LoadingState compact/> : reports.error ? <Alert tone="error">{reports.error}</Alert> : !reports.data?.length ? <EmptyState title={t("files.noReports")} description={t("files.noReportsDescription")} icon="chart"/> : <div className="registered-report-list">{reports.data.map((report) => <button type="button" className="registered-report-card" key={`${report.type}-${report.id}`} onClick={() => navigate(`/${report.type.toLowerCase()}/${encodeURIComponent(report.id)}/report`)} aria-label={`${report.title} — ${t("files.openReport")}`}><span className={`registered-report-icon ${report.type.toLowerCase()}`}><Icon name={report.type === "FMEA" ? "fmea" : "rula"} size={20}/></span><span className="registered-report-copy"><strong>{report.title}</strong><small>{report.type} · {report.projectName}{report.projectCode ? ` · ${report.projectCode}` : ""}</small><small>{t("files.reportFinalizedAt")}: {formatDate(report.finalizedAt, true)}</small></span><span className="registered-report-open"><span>{t("files.openReport")}</span><Icon name="arrow"/></span></button>)}</div>}
    </SectionCard>}
    <SectionCard title={t("files.organizationFiles")} description={`${(state.data?.length ?? 0).toLocaleString(numberLocale)} ${t("files.registeredCount")}`} icon="files">
      {state.loading ? <LoadingState/> : state.error ? <Alert tone="error">{state.error}</Alert> : !state.data?.length ? <EmptyState title={t("files.noFiles")} description={t("files.noFilesDescription")} icon="files"/> : <div className="file-grid">{state.data.map((item) => <article className="file-card" key={item.id}><span className="file-icon"><Icon name={item.kind === "IMAGE" ? "folder" : "files"}/></span><div className="file-copy"><h3 title={item.originalName}>{item.originalName}</h3><p>{t(({ IMAGE: "files.image", VIDEO: "files.video", DOCUMENT: "files.document", OTHER: "files.file" } as Record<string, string>)[item.kind] ?? "common.file")} · {sizeLabel(item.size)}</p><small className="file-reference"><span>{t("files.referenceLabel")}:</span> {fileReferenceLabel(item.reference, t)}</small><small>{formatDate(item.createdAt, true)}</small></div><div className="file-actions"><IconButton icon="search" label={t("common.preview")} onClick={() => void preview(item)}/><IconButton icon="download" label={t("common.download")} onClick={() => void getFile(item)}/>{canDelete && <IconButton icon="trash" tone="danger" label={t("common.delete")} onClick={() => void remove(item.id)}/>}</div></article>)}</div>}
    </SectionCard>
    <Modal open={Boolean(filePreview)} title={filePreview?.item.originalName ?? t("common.preview")} closeLabel={t("common.close")} size="large" className="file-preview-dialog" onClose={closePreview} actions={<><Button variant="secondary" onClick={downloadPreview}><Icon name="download"/> {t("common.download")}</Button><Button variant="ghost" onClick={closePreview}>{t("common.close")}</Button></>}>
      {filePreview && <div className={`file-preview-content file-preview-${filePreview.mode}`}>
        {filePreview.mode === "image" && <img src={filePreview.url} alt={filePreview.item.originalName} onError={() => markPreviewFallback(filePreview.url)} />}
        {filePreview.mode === "video" && <video src={filePreview.url} controls playsInline preload="metadata" aria-label={filePreview.item.originalName} onError={() => markPreviewFallback(filePreview.url)} />}
        {filePreview.mode === "pdf" && <object data={filePreview.url} type="application/pdf" aria-label={filePreview.item.originalName} onError={() => markPreviewFallback(filePreview.url)}><Alert tone="info">{t("files.previewUnavailable")}</Alert></object>}
        {filePreview.mode === "fallback" && <Alert tone="info">{t("files.previewUnavailable")}</Alert>}
      </div>}
    </Modal>
  </section>;
}

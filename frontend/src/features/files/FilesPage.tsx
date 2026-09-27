import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, download, getCurrentRole, getSession, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, formatDate, useDialog } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { useI18n } from "../../i18n";

type FileReference = { type: "FMEA" | "RULA" | "KNOWLEDGE" | "OTHER"; title: string | null; code: string | null };
type FileItem = { id: string; originalName: string; mimeType: string; size: number; kind: string; createdAt: string; reference?: FileReference | null };
type RegisteredReport = { id: string; type: "FMEA" | "RULA"; title: string; code: string | null; projectName: string; projectCode: string | null; finalizedAt: string };
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
  const dialog = useDialog();
  const role = getCurrentRole();
  const { session, orgId } = getSession();
  const uploadDraftKey = scopedDraftKey("file-upload", session?.user.id, orgId);
  const canUpload = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "ASSISTANT", "ASSESSOR"].includes(role);
  const canViewReports = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "ASSISTANT", "ASSESSOR"].includes(role);
  const reports = useLoad<RegisteredReport[]>(canViewReports ? "/reports/registered" : null);
  const canDelete = ["SUPER_ADMIN", "ORG_ADMIN"].includes(role);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); setError(""); setMessage("");
    try { await api("/files", { method: "POST", body: form }); await clearAutoSaveDraft(uploadDraftKey); element.reset(); setFileName(""); state.reload(); setMessage(t("files.uploaded")); }
    catch (reason) { setError((reason as Error).message); }
  }
  async function remove(id: string) { if (!(await dialog.confirm(`${t("common.delete")}؟`))) return; try { setError(""); await api(`/files/${id}`, { method: "DELETE" }); state.reload(); setMessage(t("files.deleted")); } catch (reason) { setError((reason as Error).message); } }
  async function getFile(item: FileItem) { try { setError(""); const blob = await download(`/files/${item.id}/download`); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = item.originalName; anchor.click(); URL.revokeObjectURL(url); } catch (reason) { setError((reason as Error).message); } }
  async function preview(item: FileItem) { try { setError(""); const blob = await download(`/files/${item.id}/download`); const url = URL.createObjectURL(blob); const opened = window.open(url, "_blank", "noopener,noreferrer"); if (!opened) URL.revokeObjectURL(url); else window.setTimeout(() => URL.revokeObjectURL(url), 60_000); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell">
    <PageHeader eyebrow={t("files.eyebrow")} title={t("files.title")} description={t("files.description")}/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    {canUpload && <SectionCard title={t("files.upload")} description={t("files.uploadDescription")} icon="plus">
      <AutoSaveForm storageKey={uploadDraftKey} className="upload-form" onSubmit={upload} excludeFields={["file"]}>
        <label className="dropzone"><input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf,.doc,.docx,.xlsx,.csv,.txt" required onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}/><span className="upload-icon"><Icon name="files" size={30}/></span><strong>{fileName || t("files.choose")}</strong><small>{t("files.fileTypes")}</small><span className="ghost fake-button">{t("files.chooseButton")}</span></label>
        <label>{t("files.referenceType")}<input name="entityType" placeholder={t("files.referencePlaceholder")}/></label><button className="primary"><Icon name="plus"/> {t("files.uploadButton")}</button>
      </AutoSaveForm>
    </SectionCard>}
    {canViewReports && <SectionCard title={t("files.reportsSection")} description={t("files.reportsDescription")} icon="chart">
      {reports.loading ? <div className="state compact"><div className="spinner"/></div> : reports.error ? <div className="alert error" role="alert"><Icon name="warning"/>{reports.error}</div> : !reports.data?.length ? <EmptyState title={t("files.noReports")} description={t("files.noReportsDescription")} icon="chart"/> : <div className="registered-report-list">{reports.data.map((report) => <button type="button" className="registered-report-card" key={`${report.type}-${report.id}`} onClick={() => navigate(`/${report.type.toLowerCase()}/${encodeURIComponent(report.id)}/report`)} aria-label={`${report.title} — ${t("files.openReport")}`}><span className={`registered-report-icon ${report.type.toLowerCase()}`}><Icon name={report.type === "FMEA" ? "fmea" : "rula"} size={20}/></span><span className="registered-report-copy"><strong>{report.title}</strong><small>{report.type} · {report.projectName}{report.projectCode ? ` · ${report.projectCode}` : ""}</small><small>{t("files.reportFinalizedAt")}: {formatDate(report.finalizedAt, true)}</small></span><span className="registered-report-open"><span>{t("files.openReport")}</span><Icon name="arrow"/></span></button>)}</div>}
    </SectionCard>}
    <SectionCard title={t("files.organizationFiles")} description={`${(state.data?.length ?? 0).toLocaleString(numberLocale)} ${t("files.registeredCount")}`} icon="files">
      {state.loading ? <div className="state"><div className="spinner"/></div> : state.error ? <div className="alert error">{state.error}</div> : !state.data?.length ? <EmptyState title={t("files.noFiles")} description={t("files.noFilesDescription")} icon="files"/> : <div className="file-grid">{state.data.map((item) => <article className="file-card" key={item.id}><span className="file-icon"><Icon name={item.kind === "IMAGE" ? "folder" : "files"}/></span><div className="file-copy"><h3 title={item.originalName}>{item.originalName}</h3><p>{t(({ IMAGE: "files.image", VIDEO: "files.video", DOCUMENT: "files.document", OTHER: "files.file" } as Record<string, string>)[item.kind] ?? "common.file")} · {sizeLabel(item.size)}</p><small className="file-reference"><span>{t("files.referenceLabel")}:</span> {fileReferenceLabel(item.reference, t)}</small><small>{formatDate(item.createdAt, true)}</small></div><div className="file-actions">{(item.kind === "IMAGE" || item.kind === "VIDEO" || item.mimeType === "application/pdf") && <button className="icon-button" title={t("common.preview")} onClick={() => void preview(item)}><Icon name="search"/></button>}<button className="icon-button" title={t("common.download")} onClick={() => void getFile(item)}><Icon name="download"/></button>{canDelete && <button className="icon-button danger" title={t("common.delete")} onClick={() => void remove(item.id)}><Icon name="trash"/></button>}</div></article>)}</div>}
    </SectionCard>
  </section>;
}

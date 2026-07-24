import { useState, type FormEvent } from "react";
import { api, download, getCurrentRole, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, formatDate } from "../../components/UI";

type FileItem = { id: string; originalName: string; mimeType: string; size: number; kind: string; createdAt: string };
const kindLabel: Record<string, string> = { IMAGE: "تصویر", VIDEO: "ویدیو", DOCUMENT: "سند", OTHER: "فایل" };
const sizeLabel = (size: number) => size > 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;

export function FilesPage() {
  const state = useLoad<FileItem[]>("/files");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const role = getCurrentRole();
  const canUpload = ["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER", "ASSESSOR"].includes(role);
  const canDelete = ["SUPER_ADMIN", "ORG_ADMIN"].includes(role);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); setError(""); setMessage("");
    try { await api("/files", { method: "POST", body: form }); element.reset(); setFileName(""); state.reload(); setMessage("فایل با موفقیت بارگذاری شد."); }
    catch (reason) { setError((reason as Error).message); }
  }
  async function remove(id: string) { if (!confirm("این فایل حذف شود؟")) return; try { setError(""); await api(`/files/${id}`, { method: "DELETE" }); state.reload(); setMessage("فایل حذف شد."); } catch (reason) { setError((reason as Error).message); } }
  async function getFile(item: FileItem) { try { setError(""); const blob = await download(`/files/${item.id}/download`); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = item.originalName; anchor.click(); URL.revokeObjectURL(url); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell">
    <PageHeader eyebrow="اسناد و رسانه" title="مدیریت فایل‌ها" description="تصاویر، ویدیوها، گزارش‌ها و مستندات مرتبط با ارزیابی‌ها را در یک محل نگهداری کنید."/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}{message && <div className="alert success"><Icon name="check"/>{message}</div>}
    {canUpload && <SectionCard title="بارگذاری فایل" description="حداکثر حجم هر فایل ۱۰ مگابایت است." icon="plus">
      <form className="upload-form" onSubmit={upload}>
        <label className="dropzone"><input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf,.xlsx,.csv" required onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}/><span className="upload-icon"><Icon name="files" size={30}/></span><strong>{fileName || "فایل را انتخاب کنید"}</strong><small>JPG، PNG، WEBP، MP4، PDF، Excel یا CSV</small><span className="ghost fake-button">انتخاب فایل</span></label>
        <label>نوع مرجع (اختیاری)<input name="entityType" placeholder="مثلاً FMEA یا RULA"/></label><button className="primary"><Icon name="plus"/> بارگذاری فایل</button>
      </form>
    </SectionCard>}
    <SectionCard title="فایل‌های سازمان" description={`${(state.data?.length ?? 0).toLocaleString("fa-IR")} فایل ثبت‌شده`} icon="files">
      {state.loading ? <div className="state"><div className="spinner"/></div> : state.error ? <div className="alert error">{state.error}</div> : !state.data?.length ? <EmptyState title="فایلی بارگذاری نشده است" description="فایل‌های ارزیابی و مستندات در این بخش نمایش داده می‌شوند." icon="files"/> : <div className="file-grid">{state.data.map((item) => <article className="file-card" key={item.id}><span className="file-icon"><Icon name={item.kind === "IMAGE" ? "folder" : "files"}/></span><div className="file-copy"><h3 title={item.originalName}>{item.originalName}</h3><p>{kindLabel[item.kind] ?? item.kind} · {sizeLabel(item.size)}</p><small>{formatDate(item.createdAt, true)}</small></div><div className="file-actions"><button className="icon-button" title="دانلود" onClick={() => getFile(item)}><Icon name="download"/></button>{canDelete && <button className="icon-button danger" title="حذف" onClick={() => remove(item.id)}><Icon name="trash"/></button>}</div></article>)}</div>}
    </SectionCard>
  </section>;
}

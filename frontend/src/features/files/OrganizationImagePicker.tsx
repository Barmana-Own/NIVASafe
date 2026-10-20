import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, download } from "../../api/client";
import { Icon } from "../../components/UI";
import { useI18n } from "../../i18n";

export type OrganizationImage = { id: string; originalName: string; mimeType: string; size: number; createdAt: string };
export function eligibleOrganizationImage(item: OrganizationImage, maxBytes: number) {
  return /^[a-zA-Z0-9-]+$/.test(item.id) && ["image/jpeg", "image/png", "image/webp"].includes(item.mimeType) && item.size > 0 && item.size <= maxBytes;
}
export function organizationImageFile(item: OrganizationImage, blob: Blob, maxBytes: number) {
  if (!eligibleOrganizationImage(item, maxBytes) || blob.size === 0 || blob.size > maxBytes || blob.type.split(";")[0] !== item.mimeType) throw new Error("Invalid image file");
  return new File([blob], item.originalName, { type: item.mimeType, lastModified: Date.parse(item.createdAt) || 0 });
}

type Props = { maxCount: number; maxBytes: number; disabled?: boolean; onSelect: (files: File[]) => void };
export function OrganizationImageButton(props: Props) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  return <><button type="button" className="ghost" disabled={props.disabled || props.maxCount <= 0} onClick={event => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}><Icon name="folder"/>{locale === "fa" ? "عکس‌های سازمان" : "Organization images"}</button>{open && <OrganizationImagePicker {...props} onClose={() => setOpen(false)}/>}</>;
}

export function OrganizationImagePicker({ maxCount, maxBytes, onSelect, onClose }: Props & { onClose: () => void }) {
  const { locale } = useI18n();
  const fa = locale === "fa";
  const titleId = useId();
  const dialog = useRef<HTMLElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<OrganizationImage[]>([]);
  const [images, setImages] = useState<Record<string, { file: File; url: string }>>({});
  const [selected, setSelected] = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const urls: string[] = [];
    setLoading(true); setError(""); setImages({}); setItems([]);
    void (async () => {
      try {
        const result = await api<OrganizationImage[]>(`/files?page=${page}&limit=8`, { signal: controller.signal });
        if (!active) return;
        const eligible = result.data.filter(item => eligibleOrganizationImage(item, maxBytes));
        setItems(eligible); setTotal(result.meta?.total ?? result.data.length);
        let cursor = 0;
        await Promise.all([0, 1].map(async () => {
          while (active && cursor < eligible.length) {
            const item = eligible[cursor++];
            try {
              const blob = await download(`/files/${encodeURIComponent(item.id)}/download`);
              if (!active) return;
              const file = organizationImageFile(item, blob, maxBytes);
              const url = URL.createObjectURL(file); urls.push(url);
              setImages(current => ({ ...current, [item.id]: { file, url } }));
            } catch {
              if (active) setError(fa ? "دریافت بعضی تصاویر ناموفق بود؛ دوباره تلاش کنید." : "Some images could not be loaded. Please retry.");
            }
          }
        }));
      } catch (reason) { if (active) setError(reason instanceof Error ? reason.message : "Unable to load images"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; controller.abort(); urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [page, retry, maxBytes, fa]);
  const count = Object.keys(selected).length;
  return createPortal(<div className="fmea-report-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialog} className="fmea-report-editor-dialog organization-image-picker" role="dialog" aria-modal="true" aria-labelledby={titleId} dir={fa ? "rtl" : "ltr"}>
      <div className="risk-item-editor-head"><div><strong id={titleId}>{fa ? "انتخاب عکس از فایل‌های سازمان" : "Choose organization images"}</strong><small>{fa ? `حداکثر ${maxCount} عکس، هر عکس تا ${maxBytes / 1024 / 1024} مگابایت` : `Up to ${maxCount} images, ${maxBytes / 1024 / 1024} MB each`}</small></div><button type="button" className="icon-button" onClick={onClose} aria-label={fa ? "بستن" : "Close"}>×</button></div>
      {error && <div className="alert error" role="alert">{error}<button type="button" className="text-button" onClick={() => setRetry(value => value + 1)}>{fa ? "تلاش دوباره" : "Retry"}</button></div>}
      <div className="organization-image-grid" aria-busy={loading}>{items.map(item => <button key={item.id} type="button" className="organization-image-card" aria-pressed={Boolean(selected[item.id])} disabled={!images[item.id] || (!selected[item.id] && count >= maxCount)} onClick={() => setSelected(current => { const next = { ...current }; if (next[item.id]) delete next[item.id]; else if (Object.keys(next).length < maxCount) next[item.id] = images[item.id].file; return next; })}>
        {images[item.id] ? <img src={images[item.id].url} alt={item.originalName}/> : <Icon name="files" size={32}/>}<span title={item.originalName}>{item.originalName}</span>{selected[item.id] && <Icon name="check"/>}
      </button>)}</div>
      {loading && <div role="status">{fa ? "در حال دریافت تصاویر…" : "Loading images…"}</div>}
      {!loading && !items.length && <p>{fa ? "در این صفحه عکس سازگار با محدودیت‌های ارزیابی وجود ندارد." : "No compatible images on this page."}</p>}
      <div className="organization-image-picker-actions"><button type="button" className="ghost" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>{fa ? "صفحه قبل" : "Previous"}</button><span>{page}</span><button type="button" className="ghost" disabled={page * 8 >= total || loading} onClick={() => setPage(value => value + 1)}>{fa ? "صفحه بعد" : "Next"}</button><button type="button" className="primary" disabled={!count} onClick={() => { onSelect(Object.values(selected)); onClose(); }}>{fa ? `انتخاب ${count} عکس` : `Use ${count} images`}</button></div>
    </section>
  </div>, document.querySelector(".app") ?? document.body);
}

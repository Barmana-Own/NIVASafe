import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, StatusBadge, formatDate } from "../../components/UI";

type Conversation = { id: string; title: string; updatedAt?: string };
type Message = { id: string; role: string; content: string; provider?: string; createdAt: string };
type AIRequest = { id: string; type: string; provider: string; status: string; error?: string; createdAt: string };
type AIProvider = { name: string; available: boolean; reason?: string | null };

export function AssistantPage() {
  const conversations = useLoad<Conversation[]>("/chat/conversations");
  const requests = useLoad<AIRequest[]>("/ai/requests");
  const providers = useLoad<AIProvider[]>("/ai/providers");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const messages = useLoad<Message[]>(selected ? `/chat/conversations/${selected}/messages` : null, [selected]);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!selected && conversations.data?.length) setSelected(conversations.data[0]!.id); }, [conversations.data, selected]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [messages.data]);

  async function createConversation() { try { const result = await api<Conversation>("/chat/conversations", { method: "POST", body: JSON.stringify({ title: `گفتگو ${new Date().toLocaleDateString("fa-IR")}` }) }); setSelected(result.data.id); conversations.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function send(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); const content = String(form.get("content") || "").trim(); if (!content) return; let id = selected; setError(""); try { if (!id) { const created = await api<Conversation>("/chat/conversations", { method: "POST", body: JSON.stringify({ title: content.slice(0, 40) }) }); id = created.data.id; setSelected(id); } await api(`/chat/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) }); element.reset(); messages.reload(); conversations.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function analyze(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); try { await api("/ai/requests", { method: "POST", body: JSON.stringify({ type: "RISK_GUIDANCE", provider: form.get("provider"), message: form.get("message") }) }); element.reset(); requests.reload(); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell assistant-page">
    <PageHeader eyebrow="راهنمای تخصصی HSE" title="دستیار هوشمند" description="بر اساس پایگاه دانش سازمان، درباره ریسک‌ها، کنترل‌ها و ارزیابی‌ها راهنمایی دریافت کنید."/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
    <div className="assistant-layout">
      <section className="conversation-panel">
        <div className="conversation-head"><div><h3>گفتگوها</h3><small>{(conversations.data?.length ?? 0).toLocaleString("fa-IR")} گفتگو</small></div><button className="icon-button accent" onClick={createConversation} title="گفتگوی جدید"><Icon name="plus"/></button></div>
        <div className="conversation-list">{conversations.loading ? <div className="state compact"><div className="spinner"/></div> : !conversations.data?.length ? <EmptyState title="گفتگویی وجود ندارد" icon="assistant"/> : conversations.data.map((item) => <button className={selected === item.id ? "active" : ""} key={item.id} onClick={() => setSelected(item.id)}><span className="conversation-icon"><Icon name="assistant" size={17}/></span><span><strong>{item.title}</strong><small>{formatDate(item.updatedAt)}</small></span></button>)}</div>
      </section>
      <section className="chat-panel">
        <div className="chat-header"><span className="ai-orb"><Icon name="sparkles"/></span><div><h3>دستیار NIVASafe</h3><p>پاسخ‌ها با استفاده از دانش سازمان و حالت Fallback تولید می‌شوند.</p></div><span className="online yes"><span className="online-dot"/>آماده</span></div>
        <div className="chat-log" ref={logRef}>{!selected ? <EmptyState title="یک گفتگو را انتخاب کنید" description="یا با دکمه + گفتگوی جدید بسازید." icon="assistant"/> : messages.loading ? <div className="state"><div className="spinner"/></div> : !messages.data?.length ? <div className="chat-welcome"><span className="ai-orb large"><Icon name="sparkles" size={28}/></span><h3>چطور می‌توانم کمک کنم؟</h3><p>درباره کنترل ریسک، FMEA، RULA یا اقدامات اصلاحی سؤال کنید.</p><div className="suggestions"><button onClick={() => { const input = document.querySelector<HTMLInputElement>('input[name="content"]'); if (input) input.value = "برای کاهش ریسک جابه‌جایی دستی بار چه کنترل‌هایی پیشنهاد می‌شود؟"; }}>کنترل ریسک جابه‌جایی بار</button><button onClick={() => { const input = document.querySelector<HTMLInputElement>('input[name="content"]'); if (input) input.value = "سطح اقدام RULA 4 چه معنایی دارد؟"; }}>تفسیر سطح اقدام RULA</button></div></div> : messages.data.map((item) => <div className={`message ${item.role}`} key={item.id}><div className="message-avatar">{item.role === "user" ? "ش" : <Icon name="sparkles" size={16}/>}</div><div className="message-bubble"><strong>{item.role === "user" ? "شما" : "دستیار"}</strong><p>{item.content}</p><small>{item.provider || formatDate(item.createdAt, true)}</small></div></div>)}</div>
        <form className="composer" onSubmit={send}><input name="content" placeholder="پرسش HSE خود را بنویسید…" autoComplete="off" required/><button className="primary" aria-label="ارسال"><Icon name="arrow"/></button></form>
        <small className="assistant-note">پیشنهادهای هوشمند جایگزین قضاوت متخصص HSE نیستند.</small>
      </section>
    </div>
    <SectionCard title="تحلیل صف‌شده" description="درخواست تحلیل مستقل برای سرویس هوش مصنوعی یا حالت پایگاه دانش" icon="sparkles">
      <form className="analysis-form" onSubmit={analyze}><label>ارائه‌دهنده<select name="provider">{(providers.data ?? [{ name: "fallback", available: true }]).map((provider) => <option key={provider.name} value={provider.name} disabled={!provider.available}>{provider.name === "fallback" ? "Fallback + Knowledge" : provider.name} {!provider.available ? "(غیرفعال)" : ""}</option>)}</select></label><label className="wide">متن تحلیل<input name="message" placeholder="موضوع یا متن موردنظر برای تحلیل" required/></label><button className="primary"><Icon name="arrow"/> ارسال به صف</button></form>
      {!requests.data?.length ? <EmptyState title="درخواست تحلیلی ثبت نشده است" icon="sparkles"/> : <div className="request-list">{requests.data.map((item) => <article key={item.id}><span className="request-icon"><Icon name="sparkles"/></span><div><strong>{item.type}</strong><small>{formatDate(item.createdAt, true)} · {item.provider}</small>{item.error && <p>{item.error}</p>}</div><StatusBadge value={item.status}/>{["FAILED", "WAITING_FOR_PROVIDER"].includes(item.status) && <button className="ghost" onClick={async () => { try { setError(""); await api(`/ai/requests/${item.id}/retry`, { method: "POST" }); requests.reload(); } catch (reason) { setError((reason as Error).message); } }}>تلاش دوباره</button>}</article>)}</div>}
    </SectionCard>
  </section>;
}

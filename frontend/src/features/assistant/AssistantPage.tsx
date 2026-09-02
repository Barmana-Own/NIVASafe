import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, getSession, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, SectionCard, StatusBadge, formatDate } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { useI18n } from "../../i18n";

type Conversation = { id: string; title: string; updatedAt?: string };
type Message = { id: string; role: string; content: string; provider?: string; createdAt: string };
type AIRequest = { id: string; type: string; provider: string; status: string; error?: string; createdAt: string };
type AIProvider = { name: string; available: boolean; reason?: string | null };

export function AssistantPage() {
  const conversations = useLoad<Conversation[]>("/chat/conversations");
  const requests = useLoad<AIRequest[]>("/ai/requests");
  const providers = useLoad<AIProvider[]>("/ai/providers");
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const { session, orgId } = getSession();
  const composerDraftKey = scopedDraftKey(`chat-composer:${selected || "new"}`, session?.user.id, orgId);
  const analysisDraftKey = scopedDraftKey("ai-analysis", session?.user.id, orgId);
  const messages = useLoad<Message[]>(selected ? `/chat/conversations/${selected}/messages` : null, [selected]);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!selected && conversations.data?.length) setSelected(conversations.data[0]!.id); }, [conversations.data, selected]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [messages.data]);

  async function createConversation() { try { const result = await api<Conversation>("/chat/conversations", { method: "POST", body: JSON.stringify({ title: `${t("assistant.newConversation")} ${new Date().toLocaleDateString(numberLocale)}` }) }); setSelected(result.data.id); conversations.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function send(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); const content = String(form.get("content") || "").trim(); if (!content) return; let id = selected; setError(""); try { if (!id) { const created = await api<Conversation>("/chat/conversations", { method: "POST", body: JSON.stringify({ title: content.slice(0, 40) }) }); id = created.data.id; setSelected(id); } await api(`/chat/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) }); await clearAutoSaveDraft(composerDraftKey); element.reset(); messages.reload(); conversations.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function analyze(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); try { await api("/ai/requests", { method: "POST", body: JSON.stringify({ type: "RISK_GUIDANCE", provider: form.get("provider"), message: form.get("message") }) }); await clearAutoSaveDraft(analysisDraftKey); element.reset(); requests.reload(); } catch (reason) { setError((reason as Error).message); } }
  return <section className="page-shell assistant-page">
    <PageHeader eyebrow={t("assistant.eyebrow")} title={t("assistant.title")} description={t("assistant.description")}/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
    <div className="assistant-layout">
      <section className="conversation-panel">
        <div className="conversation-head"><div><h3>{t("assistant.conversations")}</h3><small>{(conversations.data?.length ?? 0).toLocaleString(numberLocale)} {t("assistant.conversationCount")}</small></div><button className="icon-button accent" onClick={createConversation} title={t("assistant.newConversation")}><Icon name="plus"/></button></div>
        <div className="conversation-list">{conversations.loading ? <div className="state compact"><div className="spinner"/></div> : !conversations.data?.length ? <EmptyState title={t("assistant.noConversation")} icon="assistant"/> : conversations.data.map((item) => <button className={selected === item.id ? "active" : ""} key={item.id} onClick={() => setSelected(item.id)}><span className="conversation-icon"><Icon name="assistant" size={17}/></span><span><strong>{item.title}</strong><small>{formatDate(item.updatedAt)}</small></span></button>)}</div>
      </section>
      <section className="chat-panel">
        <div className="chat-header"><span className="ai-orb"><Icon name="sparkles"/></span><div><h3>{t("assistant.chatTitle")}</h3><p>{t("assistant.chatDescription")}</p></div><span className="online yes"><span className="online-dot"/>{t("assistant.ready")}</span></div>
        <div className="chat-log" ref={logRef}>{!selected ? <EmptyState title={t("assistant.chooseConversation")} description={t("assistant.chooseConversationDescription")} icon="assistant"/> : messages.loading ? <div className="state"><div className="spinner"/></div> : !messages.data?.length ? <div className="chat-welcome"><span className="ai-orb large"><Icon name="sparkles" size={28}/></span><h3>{t("assistant.welcome")}</h3><p>{t("assistant.welcomeDescription")}</p><div className="suggestions"><button onClick={() => { const input = document.querySelector<HTMLInputElement>('input[name="content"]'); if (input) input.value = t("assistant.suggestionOneText"); }}>{t("assistant.suggestionOne")}</button><button onClick={() => { const input = document.querySelector<HTMLInputElement>('input[name="content"]'); if (input) input.value = t("assistant.suggestionTwoText"); }}>{t("assistant.suggestionTwo")}</button></div></div> : messages.data.map((item) => <div className={`message ${item.role}`} key={item.id}><div className="message-avatar">{item.role === "user" ? (locale === "en" ? "Y" : "ش") : <Icon name="sparkles" size={16}/>}</div><div className="message-bubble"><strong>{item.role === "user" ? t("assistant.you") : t("assistant.assistant")}</strong><p>{item.content}</p><small>{item.provider || formatDate(item.createdAt, true)}</small></div></div>)}</div>
        <AutoSaveForm storageKey={composerDraftKey} className="composer" onSubmit={send}><input name="content" placeholder={t("assistant.questionPlaceholder")} autoComplete="off" required/><button className="primary" aria-label={t("assistant.send")}><Icon name="arrow"/></button></AutoSaveForm>
        <small className="assistant-note">{t("assistant.disclaimer")}</small>
      </section>
    </div>
    <SectionCard title={t("assistant.queued")} description={t("assistant.queuedDescription")} icon="sparkles">
      <AutoSaveForm storageKey={analysisDraftKey} className="analysis-form" onSubmit={analyze}><label>{t("assistant.provider")}<select name="provider">{(providers.data ?? [{ name: "fallback", available: true }]).map((provider) => <option key={provider.name} value={provider.name} disabled={!provider.available}>{provider.name === "fallback" ? t("assistant.fallback") : provider.name} {!provider.available ? `(${t("assistant.disabled")})` : ""}</option>)}</select></label><label className="wide">{t("assistant.analysisText")}<input name="message" placeholder={t("assistant.analysisPlaceholder")} required/></label><button className="primary"><Icon name="arrow"/> {t("assistant.sendToQueue")}</button></AutoSaveForm>
      {!requests.data?.length ? <EmptyState title={t("assistant.noRequests")} icon="sparkles"/> : <div className="request-list">{requests.data.map((item) => <article key={item.id}><span className="request-icon"><Icon name="sparkles"/></span><div><strong>{item.type}</strong><small>{formatDate(item.createdAt, true)} · {item.provider}</small>{item.error && <p>{item.error}</p>}</div><StatusBadge value={item.status}/>{["FAILED", "WAITING_FOR_PROVIDER"].includes(item.status) && <button className="ghost" onClick={async () => { try { setError(""); await api(`/ai/requests/${item.id}/retry`, { method: "POST" }); requests.reload(); } catch (reason) { setError((reason as Error).message); } }}>{t("assistant.retry")}</button>}</article>)}</div>}
    </SectionCard>
  </section>;
}

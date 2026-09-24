import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, getSession, useLoad } from "../../api/client";
import { EmptyState, Icon, PageHeader, formatDate } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { useI18n } from "../../i18n";

type Conversation = { id: string; title: string; updatedAt?: string };
type Message = { id: string; role: string; content: string; provider?: string; createdAt: string };
type AIProvider = { name: string; available: boolean; reason?: string | null; riskModel?: string | null; chatModel?: string | null; configuredForRisk?: boolean; configuredForChat?: boolean };

export function AssistantPage() {
  const conversations = useLoad<Conversation[]>("/chat/conversations");
  const providers = useLoad<AIProvider[]>("/ai/providers");
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [pendingResponse, setPendingResponse] = useState<Message | null>(null);
  const sendingRef = useRef(false);
  const { session, orgId } = getSession();
  const composerDraftKey = scopedDraftKey(`chat-composer:${selected || "new"}`, session?.user.id, orgId);
  const configuredChatProvider = providers.data?.find((provider) => provider.configuredForChat) ?? providers.data?.find((provider) => provider.name === "arvancloud" && provider.available);
  const activeChatProvider = configuredChatProvider?.available ? configuredChatProvider : providers.data?.find((provider) => provider.name === "fallback" && provider.available);
  const chatUsesRemoteProvider = Boolean(activeChatProvider && activeChatProvider.name !== "fallback");
  const chatProviderLabel = activeChatProvider?.name === "arvancloud" ? "ArvanCloud AI" : activeChatProvider?.name ?? "Fallback";
  const chatModel = activeChatProvider?.chatModel ?? "API";
  const chatStatus = providers.loading
    ? t("assistant.providerChecking")
    : providers.error
      ? t("assistant.providerUnavailable")
      : chatUsesRemoteProvider
        ? t("assistant.providerConnected", { provider: chatProviderLabel, model: chatModel })
        : t("assistant.providerFallback");
  const chatDescription = chatUsesRemoteProvider ? t("assistant.chatDescriptionAi", { provider: chatProviderLabel, model: chatModel }) : t("assistant.chatDescription");
  const messages = useLoad<Message[]>(selected ? `/chat/conversations/${selected}/messages` : null, [selected]);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!selected && conversations.data?.length) setSelected(conversations.data[0]!.id); }, [conversations.data, selected]);
  useEffect(() => { setPendingResponse(null); }, [selected]);
  useEffect(() => { if (pendingResponse && messages.data?.some((item) => item.id === pendingResponse.id)) setPendingResponse(null); }, [messages.data, pendingResponse]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [messages.data, pendingMessage, pendingResponse, sending]);

  async function createConversation() { if (sendingRef.current) return; try { const result = await api<Conversation>("/chat/conversations", { method: "POST", body: JSON.stringify({ title: `${t("assistant.newConversation")} ${new Date().toLocaleDateString(numberLocale)}` }) }); setSelected(result.data.id); conversations.reload(); } catch (reason) { setError((reason as Error).message); } }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const content = String(form.get("content") || "").trim();
    if (!content) return;
    if (content.length < 2) { setError(t("assistant.messageTooShort")); return; }
    sendingRef.current = true;
    setSending(true);
    setPendingMessage(content);
    setError("");
    let id = selected;
    try {
      if (!id) {
        const created = await api<Conversation>("/chat/conversations", { method: "POST", body: JSON.stringify({ title: content.slice(0, 40) }) });
        id = created.data.id;
        setSelected(id);
      }
      const response = await api<Message>(`/chat/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) });
      await clearAutoSaveDraft(composerDraftKey);
      element.reset();
      setPendingResponse(response.data);
      setPendingMessage(null);
      messages.reload();
      conversations.reload();
    } catch (reason) {
      setPendingMessage(null);
      setPendingResponse(null);
      setError((reason as Error).message);
      if (id) messages.reload();
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function fillSuggestion(value: string) {
    const input = document.querySelector<HTMLInputElement>('input[name="content"]');
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }
  }

  function renderMessage(item: Message) {
    return <div className={"message " + item.role} key={item.id}><div className="message-avatar">{item.role === "user" ? (locale === "en" ? "Y" : "ش") : <Icon name="sparkles" size={16}/>}</div><div className="message-bubble"><strong>{item.role === "user" ? t("assistant.you") : t("assistant.assistant")}</strong><p>{item.content}</p><small>{item.provider || formatDate(item.createdAt, true)}</small></div></div>;
  }
  return <section className="page-shell assistant-page">
    <PageHeader eyebrow={t("assistant.eyebrow")} title={t("assistant.title")} description={t("assistant.description")}/>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
    <div className="assistant-layout">
      <section className="conversation-panel">
        <div className="conversation-head"><div><h3>{t("assistant.conversations")}</h3><small>{(conversations.data?.length ?? 0).toLocaleString(numberLocale)} {t("assistant.conversationCount")}</small></div><button type="button" className="icon-button accent" onClick={createConversation} title={t("assistant.newConversation")} disabled={sending}><Icon name="plus"/></button></div>
        <div className="conversation-list">{conversations.loading ? <div className="state compact"><div className="spinner"/></div> : !conversations.data?.length ? <EmptyState title={t("assistant.noConversation")} icon="assistant"/> : conversations.data.map((item) => <button type="button" className={selected === item.id ? "active" : ""} key={item.id} onClick={() => setSelected(item.id)} disabled={sending}><span className="conversation-icon"><Icon name="assistant" size={17}/></span><span><strong>{item.title}</strong><small>{formatDate(item.updatedAt)}</small></span></button>)}</div>
      </section>
      <section className="chat-panel">
        <div className="chat-header"><span className="ai-orb"><Icon name="sparkles"/></span><div><h3>{t("assistant.chatTitle")}</h3><p>{chatDescription}</p></div><span className={`online ${providers.loading || providers.error || !chatUsesRemoteProvider ? "no" : "yes"}`}><span className="online-dot"/>{chatStatus}</span></div>
        <div className="chat-log" ref={logRef} aria-busy={sending}>{!selected && !pendingMessage ? <EmptyState title={t("assistant.chooseConversation")} description={t("assistant.chooseConversationDescription")} icon="assistant"/> : selected && messages.loading && !pendingMessage ? <div className="state"><div className="spinner"/></div> : !messages.data?.length && !pendingMessage && !pendingResponse ? <div className="chat-welcome"><span className="ai-orb large"><Icon name="sparkles" size={28}/></span><h3>{t("assistant.welcome")}</h3><p>{t("assistant.welcomeDescription")}</p><div className="suggestions"><button type="button" onClick={() => fillSuggestion(t("assistant.suggestionOneText"))}>{t("assistant.suggestionOne")}</button><button type="button" onClick={() => fillSuggestion(t("assistant.suggestionTwoText"))}>{t("assistant.suggestionTwo")}</button></div></div> : <>{messages.data?.map(renderMessage)}{pendingResponse && renderMessage(pendingResponse)}{pendingMessage && <div className="message user pending-message"><div className="message-avatar">{locale === "en" ? "Y" : "ش"}</div><div className="message-bubble"><strong>{t("assistant.you")}</strong><p>{pendingMessage}</p><small>{t("assistant.sending")}</small></div></div>}{sending && <div className="message assistant pending-message"><div className="message-avatar"><Icon name="sparkles" size={16}/></div><div className="message-bubble"><strong>{t("assistant.assistant")}</strong><p>{t("assistant.waitingForResponse")}</p><span className="assistant-typing" aria-hidden="true"><i/><i/><i/></span></div></div>}</>}</div>
        <AutoSaveForm storageKey={composerDraftKey} className="composer" onSubmit={send}><input name="content" placeholder={t("assistant.questionPlaceholder")} autoComplete="off" minLength={2} maxLength={4000} required disabled={sending}/><button type="submit" className="primary" aria-label={t("assistant.send")} disabled={sending}><Icon name="arrow"/></button>{sending && <small className="composer-send-status" role="status"><span className="composer-spinner" aria-hidden="true"/>{t("assistant.waitingForResponse")}</small>}</AutoSaveForm>
        <small className="assistant-note">{t("assistant.disclaimer")}</small>
      </section>
    </div>
  </section>;
}

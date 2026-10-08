import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, getSession, useLoad } from "../../api/client";
import { EmptyState, Icon, formatDate } from "../../components/UI";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { useI18n } from "../../i18n";
import { resolveAssistantConnectionStatus } from "./assistantConnectionStatus";

type Conversation = { id: string; title: string; updatedAt?: string };
type Message = { id: string; role: string; content: string; provider?: string; createdAt: string; citations?: Array<{ id: string; title: string }> };
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
  const [mobileConversationsOpen, setMobileConversationsOpen] = useState(false);
  const sendingRef = useRef(false);
  const newChatDraftId = useRef(crypto.randomUUID());
  const { session, orgId } = getSession();
  const composerDraftKey = scopedDraftKey(`chat-composer:${selected || `new:${newChatDraftId.current}`}`, session?.user.id, orgId);
  const configuredChatProvider = providers.data?.find((provider) => provider.configuredForChat) ?? providers.data?.find((provider) => provider.name === "arvancloud" && provider.available);
  const activeChatProvider = configuredChatProvider?.available ? configuredChatProvider : providers.data?.find((provider) => provider.name === "fallback" && provider.available);
  const messages = useLoad<Message[]>(selected ? `/chat/conversations/${selected}/messages` : null, [selected]);
  const latestAssistantMessage = pendingResponse?.role === "assistant"
    ? pendingResponse
    : [...(messages.data ?? [])].reverse().find((item) => item.role !== "user") ?? null;
  const connectionStatus = resolveAssistantConnectionStatus({
    loading: providers.loading,
    failed: Boolean(providers.error),
    activeProvider: activeChatProvider ? { name: activeChatProvider.name, available: activeChatProvider.available, chatModel: activeChatProvider.chatModel } : null,
    latestResponseProvider: latestAssistantMessage?.provider,
  });
  const chatStatus = connectionStatus.kind === "lastResponse"
    ? t("assistant.lastResponse", { provider: connectionStatus.provider === "arvancloud" ? "ArvanCloud AI" : connectionStatus.provider })
    : t(connectionStatus.kind === "fallback" ? "assistant.fallbackActive" : `assistant.${connectionStatus.kind}`);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (pendingResponse && messages.data?.some((item) => item.id === pendingResponse.id)) setPendingResponse(null); }, [messages.data, pendingResponse]);
  useEffect(() => {
    if (!mobileConversationsOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMobileConversationsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileConversationsOpen]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [messages.data, pendingMessage, pendingResponse, sending]);

  function selectConversation(id: string) {
    if (sendingRef.current) return;
    setError("");
    setPendingMessage(null);
    setPendingResponse(null);
    setSelected(id);
    setMobileConversationsOpen(false);
  }

  async function createConversation() {
    if (sendingRef.current) return;
    setPendingResponse(null);
    setPendingMessage(null);
    setError("");
    setSelected("");
    newChatDraftId.current = crypto.randomUUID();
    setMobileConversationsOpen(false);
    void clearAutoSaveDraft(composerDraftKey);
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;
    const element = event.currentTarget;
    const input = element.elements.namedItem("content");
    const form = new FormData(element);
    const content = String(form.get("content") || "").trim();
    if (!content) return;
    if (content.length < 2) { setError(t("assistant.messageTooShort")); return; }
    if (content.length > 32_000) return;
    sendingRef.current = true;
    setSending(true);
    setPendingMessage(content);
    setPendingResponse(null);
    setError("");
    element.reset();
    void clearAutoSaveDraft(composerDraftKey);
    let id = selected;
    try {
      if (!id) {
        const created = await api<Conversation>("/chat/conversations", { method: "POST", body: JSON.stringify({ title: t("assistant.newConversation") }) });
        id = created.data.id;
        setSelected(id);
      }
      const response = await api<Message>(`/chat/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content, locale }) });
      setPendingResponse(response.data);
      setPendingMessage(null);
      messages.reload();
      conversations.reload();
    } catch (reason) {
      setPendingMessage(null);
      const failure = reason as Error & { code?: string };
      if (failure.code === "NETWORK_ERROR") {
        setPendingResponse({
          id: `offline-${Date.now()}`,
          role: "assistant",
          content: t("assistant.offlineFallback"),
          provider: "fallback",
          createdAt: new Date().toISOString(),
          citations: [],
        });
      } else {
        setError(failure.message);
      }
      const currentInput = document.querySelector<HTMLTextAreaElement>('.assistant-page textarea[name="content"]') ?? input;
      if ((currentInput instanceof HTMLInputElement || currentInput instanceof HTMLTextAreaElement) && !currentInput.value.trim()) {
        currentInput.value = content;
        currentInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (id) messages.reload();
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function fillSuggestion(value: string) {
    const input = document.querySelector<HTMLTextAreaElement>('textarea[name="content"]');
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }
  }

  function renderMessage(item: Message) {
    return <div className={"message " + item.role} key={item.id}><div className="message-avatar">{item.role === "user" ? (locale === "en" ? "Y" : "ش") : <Icon name="sparkles" size={16}/>}</div><div className="message-bubble"><strong>{item.role === "user" ? t("assistant.you") : t("assistant.assistant")}</strong><p>{item.content}</p>{item.role !== "user" && item.citations?.length ? <div className="message-citations"><small>{t("assistant.knowledgeSources")}</small>{item.citations.map((citation) => <span key={citation.id}>{citation.title}</span>)}</div> : null}<small>{item.provider || formatDate(item.createdAt, true)}</small></div></div>;
  }
  return <section className="page-shell assistant-page" aria-label={t("nav.assistant")}>
    {error && <div className="alert error"><Icon name="warning"/>{error}</div>}
    <div className={`assistant-layout${mobileConversationsOpen ? " history-open" : ""}`}>
      <section id="assistant-conversations-panel" className="conversation-panel" aria-label={t("assistant.conversations")}>
        <div className="conversation-head">
          <div><h3>{t("assistant.conversations")}</h3><small>{(conversations.data?.length ?? 0).toLocaleString(numberLocale)} {t("assistant.conversationCount")}</small></div>
          <div className="conversation-head-actions">
            <button type="button" className="icon-button accent" onClick={createConversation} title={t("assistant.newConversation")} disabled={sending}><Icon name="plus"/></button>
            <button type="button" className="icon-button assistant-history-close" onClick={() => setMobileConversationsOpen(false)} aria-label={t("assistant.closeConversations")} title={t("assistant.closeConversations")}><span aria-hidden="true">×</span></button>
          </div>
        </div>
        <div className="conversation-list">{conversations.loading ? <div className="state compact"><div className="spinner"/></div> : !conversations.data?.length ? <EmptyState title={t("assistant.noConversation")} icon="assistant"/> : conversations.data.map((item) => <button type="button" className={selected === item.id ? "active" : ""} key={item.id} onClick={() => selectConversation(item.id)} disabled={sending}><span className="conversation-icon"><Icon name="assistant" size={17}/></span><span><strong>{item.title}</strong><small>{formatDate(item.updatedAt)}</small></span></button>)}</div>
      </section>
      {mobileConversationsOpen && <button type="button" className="assistant-history-backdrop" aria-label={t("assistant.closeConversations")} onClick={() => setMobileConversationsOpen(false)} />}
      <section className="chat-panel">
        <div className="chat-header">
          <button type="button" className="assistant-history-toggle" onClick={() => setMobileConversationsOpen(true)} aria-expanded={mobileConversationsOpen} aria-controls="assistant-conversations-panel" aria-label={t("assistant.openConversations")} title={t("assistant.openConversations")}><Icon name="menu"/></button>
          <span className="ai-orb"><Icon name="sparkles"/></span><div><h3>{t("assistant.chatTitle")}</h3></div><span className={`online ${connectionStatus.tone}`} role="status" aria-live="polite"><span className="online-dot"/>{chatStatus}</span>
        </div>
        <div className="chat-log" ref={logRef} aria-busy={sending}>{!selected && !pendingMessage && !pendingResponse ? <EmptyState title={t("assistant.chooseConversation")} description={t("assistant.chooseConversationDescription")} icon="assistant"/> : selected && messages.loading && !pendingMessage && !pendingResponse ? <div className="state"><div className="spinner"/></div> : !messages.data?.length && !pendingMessage && !pendingResponse ? <div className="chat-welcome"><span className="ai-orb large"><Icon name="sparkles" size={28}/></span><h3>{t("assistant.welcome")}</h3><p>{t("assistant.welcomeDescription")}</p><div className="suggestions"><button type="button" onClick={() => fillSuggestion(t("assistant.suggestionOneText"))}>{t("assistant.suggestionOne")}</button><button type="button" onClick={() => fillSuggestion(t("assistant.suggestionTwoText"))}>{t("assistant.suggestionTwo")}</button></div></div> : <>{messages.data?.map(renderMessage)}{pendingResponse && renderMessage(pendingResponse)}{pendingMessage && <div className="message user pending-message"><div className="message-avatar">{locale === "en" ? "Y" : "ش"}</div><div className="message-bubble"><strong>{t("assistant.you")}</strong><p>{pendingMessage}</p><small>{t("assistant.sending")}</small></div></div>}{sending && <div className="message assistant pending-message"><div className="message-avatar"><Icon name="sparkles" size={16}/></div><div className="message-bubble"><strong>{t("assistant.assistant")}</strong><p>{t("assistant.waitingForResponse")}</p><span className="assistant-typing" aria-hidden="true"><i/><i/><i/></span></div></div>}</>}</div>
<AutoSaveForm key={composerDraftKey} storageKey={composerDraftKey} className="composer" onSubmit={send}><div className="composer-field"><textarea name="content" placeholder={t("assistant.questionPlaceholder")} autoComplete="off" minLength={2} maxLength={32_000} rows={3} required aria-label={t("assistant.questionPlaceholder")} aria-busy={sending}/><button type="submit" className="primary composer-send-button" aria-label={t("assistant.send")} title={t("assistant.send")} disabled={sending}>{sending ? <span className="composer-spinner" aria-hidden="true"/> : <Icon name="arrow"/>}</button></div>{sending && <small className="composer-send-status" role="status"><span className="composer-spinner" aria-hidden="true"/>{t("assistant.waitingForResponse")}</small>}</AutoSaveForm>
        <small className="assistant-note">{t("assistant.disclaimer")}</small>
      </section>
    </div>
  </section>;
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, getSession, useLoad } from "../../api/client";
import { EmptyState, Icon, formatDate } from "../../components/UI";
import { useModalFocus } from "../../components/useModalFocus";
import { AutoSaveForm, clearAutoSaveDraft } from "../../forms/AutoSaveForm";
import { scopedDraftKey } from "../../forms/autoSave";
import { useI18n } from "../../i18n";
import "./assistant-design.css";

type Conversation = { id: string; title: string; updatedAt?: string };
type Message = { id: string; role: string; content: string; provider?: string; createdAt: string; citations?: Array<{ id: string; title: string }> };

export function AssistantPage() {
  const conversations = useLoad<Conversation[]>("/chat/conversations");
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const [search, setSearch] = useState("");
  const [characterCount, setCharacterCount] = useState(0);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [pendingResponse, setPendingResponse] = useState<Message | null>(null);
  const [mobileConversationsOpen, setMobileConversationsOpen] = useState(false);
  const [compactHistory, setCompactHistory] = useState(() => window.matchMedia("(max-width: 768px)").matches);
  const historyRef = useRef<HTMLElement>(null);
  useModalFocus(historyRef, compactHistory && mobileConversationsOpen, () => setMobileConversationsOpen(false));
  const sendingRef = useRef(false);
  const newChatDraftId = useRef(crypto.randomUUID());
  const { session, orgId } = getSession();
  const composerDraftKey = scopedDraftKey(`chat-composer:${selected || `new:${newChatDraftId.current}`}`, session?.user.id, orgId);
  const messages = useLoad<Message[]>(selected ? `/chat/conversations/${selected}/messages` : null, [selected]);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setCharacterCount(document.querySelector<HTMLTextAreaElement>(".assistant-redesign textarea[name=content]")?.value.length ?? 0));
    return () => cancelAnimationFrame(frame);
  }, [composerDraftKey]);
  useEffect(() => { if (pendingResponse && messages.data?.some((item) => item.id === pendingResponse.id)) setPendingResponse(null); }, [messages.data, pendingResponse]);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const update = () => { setCompactHistory(query.matches); if (!query.matches) setMobileConversationsOpen(false); };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [messages.data, pendingMessage, pendingResponse, sending]);

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
    setCharacterCount(0);
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
        setCharacterCount(content.length);
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
      setCharacterCount(value.length);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    }
  }

  function renderMessage(item: Message) {
    return <div className={"message " + item.role} key={item.id}><div className="message-avatar">{item.role === "user" ? t("redesign.userInitial") : <Icon name="sparkles" size={16}/>}</div><div className="message-bubble"><strong>{item.role === "user" ? t("assistant.you") : t("assistant.assistant")}</strong><p>{item.content}</p>{item.role !== "user" && item.citations?.length ? <div className="message-citations"><small>{t("assistant.knowledgeSources")}</small>{item.citations.map((citation) => <span key={citation.id}>{citation.title}</span>)}</div> : null}<time className="message-time" dateTime={item.createdAt}>{formatDate(item.createdAt, true)}</time></div></div>;
  }
  const fa = locale === "fa";
  const visibleConversations = conversations.data?.filter(item => item.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) ?? [];
  const prompts = [
    { icon: "warning" as const, title: t("redesign.promptRisk"), description: t("redesign.promptRiskDescription"), text: t("assistant.suggestionOneText") },
    { icon: "check" as const, title: t("redesign.promptChecklist"), description: t("redesign.promptChecklistDescription"), text: t("assistant.suggestionTwoText") },
    { icon: "search" as const, title: t("redesign.promptIncident"), description: t("redesign.promptIncidentDescription"), text: t("redesign.promptIncidentText") },
  ];
  return <section className="page-shell assistant-page assistant-redesign" dir={fa ? "rtl" : "ltr"} aria-label={t("nav.assistant")}>
    {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    <div className={`assistant-layout${mobileConversationsOpen ? " history-open" : ""}`}>
      <aside ref={historyRef} tabIndex={-1} id="assistant-conversations-panel" className="history" role={compactHistory && mobileConversationsOpen ? "dialog" : undefined} aria-modal={compactHistory && mobileConversationsOpen ? true : undefined} inert={compactHistory && !mobileConversationsOpen} aria-label={t("assistant.conversations")}>
        <div className="history-heading"><button type="button" className="icon-button history-back" onClick={() => setMobileConversationsOpen(false)} aria-label={t("assistant.closeConversations")}><Icon name="arrow"/></button><h2>{t("assistant.conversations")}</h2><span className="count">{(conversations.data?.length ?? 0).toLocaleString(numberLocale)} {t("assistant.conversationCount")}</span></div>
        <button type="button" className="button new-chat" onClick={createConversation} disabled={sending}><Icon name="plus"/>{t("assistant.newConversation")}</button>
        <label className="search-field"><Icon name="search"/><input id="assistant-conversation-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t("redesign.searchConversations")} aria-label={t("redesign.searchConversations")}/></label>
        <nav className="history-list" aria-label={t("assistant.conversations")}>{conversations.loading ? <div className="state compact"><div className="spinner"/></div> : conversations.error ? <div className="alert error" role="alert">{conversations.error}<button className="button" type="button" onClick={conversations.reload}>{t("common.retry")}</button></div> : <>
          {!selected && !search && <button type="button" className="conversation-row selected" onClick={createConversation} disabled={sending}><Icon name="assistant"/><span className="row-content"><strong>{t("assistant.newConversation")}</strong><small>{t("redesign.waitingFirstMessage")}</small></span><span className="selected-mark"/></button>}
          {visibleConversations.map(item => <button type="button" className={`conversation-row${selected === item.id ? " selected" : ""}`} aria-current={selected === item.id ? "true" : undefined} key={item.id} onClick={() => selectConversation(item.id)} disabled={sending}><Icon name="assistant"/><span className="row-content"><strong>{item.title}</strong><small>{formatDate(item.updatedAt)}</small></span>{selected === item.id && <span className="selected-mark"/>}</button>)}
          {!visibleConversations.length && <EmptyState title={search ? (t("redesign.noMatchingConversation")) : t("assistant.noConversation")} icon="assistant"/>}
        </>}</nav>
        <p className="autosave"><Icon name="check" size={16}/>{t("redesign.conversationsSaved")}</p>
      </aside>
      <section className="chat" inert={compactHistory && mobileConversationsOpen} aria-label={t("assistant.chatTitle")}>
        <header className="assistant-header"><div className="identity"><span className="identity-icon"><img src="/icon-64.png" alt="NIVASafe" width="40" height="40"/></span><div><h1>{t("assistant.chatTitle")}</h1><p>{t("redesign.occupationalHealth")}</p></div></div>
          <button className="icon-button history-toggle" type="button" onClick={() => setMobileConversationsOpen(true)} aria-expanded={mobileConversationsOpen} aria-controls="assistant-conversations-panel" aria-label={t("assistant.openConversations")}><Icon name="menu"/></button>
        </header>
        <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions" aria-busy={sending}>{selected && messages.loading && !pendingMessage && !pendingResponse ? <div className="state"><div className="spinner"/></div> : messages.error ? <div className="alert error" role="alert">{messages.error}<button type="button" className="button" onClick={messages.reload}>{t("common.retry")}</button></div> : !messages.data?.length && !pendingMessage && !pendingResponse ? <div className="empty-state"><div className="welcome"><div className="welcome-icon"><img src="/icon-64.png" alt="NIVASafe" width="40" height="40"/></div><h2>{t("redesign.chatWelcome")}</h2><p>{t("redesign.chatWelcomeDescription")}</p></div><div className="suggestions"><p className="suggestion-label">{t("redesign.chatSuggestions")}</p><div className="prompt-grid">{prompts.map((prompt, index) => <button key={prompt.icon} type="button" className={`prompt ${index === 0 ? "featured" : "secondary-prompt"}`} onClick={() => fillSuggestion(prompt.text)} disabled={sending}><span className="prompt-icon"><Icon name={prompt.icon}/></span><div className="prompt-copy"><strong>{prompt.title}</strong><p>{prompt.description}</p></div><Icon name="arrow" className="prompt-arrow"/></button>)}</div></div></div> : <div className="message-thread">{messages.data?.map(renderMessage)}{pendingResponse && !messages.data?.some(item => item.id === pendingResponse.id) && renderMessage(pendingResponse)}{pendingMessage && <div className="message user pending-message"><div className="message-bubble"><strong>{t("assistant.you")}</strong><p>{pendingMessage}</p><small>{t("assistant.sending")}</small></div></div>}{sending && <div className="message assistant pending-message"><div className="message-bubble"><strong>{t("assistant.assistant")}</strong><p>{t("assistant.waitingForResponse")}</p><span className="assistant-typing" aria-hidden="true"><i/><i/><i/></span></div></div>}</div>}</div>
        <AutoSaveForm key={composerDraftKey} storageKey={composerDraftKey} className="composer-section" showSaveStatus={false} onInput={event => { const input = event.currentTarget.elements.namedItem("content"); if (input instanceof HTMLTextAreaElement) setCharacterCount(input.value.length); }} onSubmit={send}>
          <div className="composer-label"><label htmlFor="assistant-message">{t("redesign.yourMessage")}</label><span>{characterCount.toLocaleString(numberLocale)} / {(32_000).toLocaleString(numberLocale)}</span></div>
          <div className="composer"><textarea id="assistant-message" name="content" placeholder={t("assistant.questionPlaceholder")} autoComplete="off" minLength={2} maxLength={32_000} rows={1} required aria-busy={sending} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(min-width: 769px)").matches) { event.preventDefault(); if (!sendingRef.current) event.currentTarget.form?.requestSubmit(); } }}/><div className="composer-actions"><button type="submit" className="button send" disabled={sending} aria-label={t("assistant.send")}>{sending ? <span className="composer-spinner"/> : <Icon name="arrow"/>}{t("assistant.send")}</button></div></div>
          {sending && <small className="composer-send-status" role="status">{t("assistant.waitingForResponse")}</small>}
        </AutoSaveForm>
      </section>
    </div>
  </section>;
}

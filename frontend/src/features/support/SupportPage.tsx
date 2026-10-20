import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, getSession, useLoad, type ApiEnvelope } from "../../api/client";
import { Icon, PageHeader, SectionCard, StatusBadge, StyledSelect, formatDate } from "../../components/UI";
import { LoadState } from "../../components/LoadState";
import { useI18n } from "../../i18n";
import { isSupportRequestId, supportPrefillFromSearch, supportStatusOptions, type SupportCategory, type SupportPriority, type SupportStatus } from "./supportModel";

type SupportRequest = { id: string; category: SupportCategory; subject: string; message: string; status: SupportStatus; priority: SupportPriority; assignedToId?: string | null; assignedTo?: SupportStaff | null; relatedAssessmentType?: "RULA" | "FMEA" | null; relatedAssessmentId?: string | null; publicErrorCode?: string | null; response?: string | null; createdAt: string; updatedAt: string };
type SupportStaff = { id: string; displayName: string; email: string };
type AdminSupportRequest = SupportRequest & { requester: { id: string; displayName: string; email: string }; organization: { id: string; nameFa: string; nameEn: string } };
type SupportThreadReply = { id: string; message: string; visibility?: "PUBLIC" | "INTERNAL"; createdAt: string; author: { id: string; displayName: string; globalRole?: string | null } };
type SupportRequestDetails = SupportRequest & { replies?: SupportThreadReply[]; requester?: { id: string; displayName: string; email?: string } };
type SupportListMeta = { page: number; limit: number; total: number };
const SUPPORT_PAGE_LIMIT = 20;

const categories: SupportCategory[] = ["AI_QUOTA", "PROFESSIONAL_PLAN", "TECHNICAL_SUPPORT", "OTHER"];
const statuses: SupportStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"];
const priorities: SupportPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];
const statusKey: Record<SupportStatus, string> = { OPEN: "support.statusOpen", IN_PROGRESS: "support.statusInProgress", WAITING_USER: "support.statusWaitingUser", RESOLVED: "support.statusResolved", CLOSED: "support.statusClosed" };
const priorityKey: Record<SupportPriority, string> = { LOW: "support.priorityLow", NORMAL: "support.priorityNormal", HIGH: "support.priorityHigh", URGENT: "support.priorityUrgent" };
const categoryKey: Record<SupportCategory, string> = { AI_QUOTA: "support.categoryQuota", PROFESSIONAL_PLAN: "support.categoryProfessional", TECHNICAL_SUPPORT: "support.categoryTechnical", OTHER: "support.categoryOther" };

function newIdempotencyKey() {
  if (!globalThis.crypto?.randomUUID) throw new Error("Secure request identifiers are unavailable in this browser.");
  return globalThis.crypto.randomUUID();
}

function useSupportList<T>(path: string) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ data: T[] | null; meta?: SupportListMeta; loading: boolean; error: string }>({ data: null, loading: Boolean(path), error: "" });
  useEffect(() => {
    if (!path) { setState({ data: null, loading: false, error: "" }); return; }
    let active = true;
    setState((current) => ({ ...current, loading: current.data === null, error: "" }));
    api<T[]>(path).then((response: ApiEnvelope<T[]>) => {
      if (active) setState({ data: response.data, meta: response.meta, loading: false, error: "" });
    }).catch((reason) => {
      if (active) setState((current) => ({ ...current, loading: false, error: reason instanceof Error ? reason.message : String(reason) }));
    });
    return () => { active = false; };
  }, [path, revision]);
  return { ...state, reload: () => setRevision((value) => value + 1) };
}

function SupportThread({ requestId, admin = false, initiallyOpen = false, onOpenChange, onChanged }: { requestId: string; admin?: boolean; initiallyOpen?: boolean; onOpenChange?: (open: boolean) => void; onChanged: () => void }) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(initiallyOpen);
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const replyIdempotencyKey = useRef("");
  const replyIdempotencyPayload = useRef("");
  const noteIdempotencyKey = useRef("");
  const noteIdempotencyPayload = useRef("");
  const detailPath = admin ? `/admin/support-requests/${encodeURIComponent(requestId)}` : `/support/requests/${encodeURIComponent(requestId)}`;
  const details = useLoad<SupportRequestDetails>(open ? detailPath : null);
  useEffect(() => { setOpen(initiallyOpen); }, [initiallyOpen]);
  useEffect(() => {
    if (!open) return;
    const refresh = () => details.reload();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [open, requestId, admin]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !reply.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const route = admin ? `/admin/support-requests/${encodeURIComponent(requestId)}/replies` : `/support/requests/${encodeURIComponent(requestId)}/replies`;
      const payload = reply.trim();
      if (replyIdempotencyPayload.current !== payload) {
        replyIdempotencyPayload.current = payload;
        replyIdempotencyKey.current = newIdempotencyKey();
      }
      await api<SupportThreadReply>(route, { method: "POST", headers: { "idempotency-key": replyIdempotencyKey.current }, body: JSON.stringify({ message: reply.trim() }) });
      replyIdempotencyKey.current = ""; replyIdempotencyPayload.current = "";
      setReply(""); setMessage(t("support.replySent")); details.reload(); onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("common.saveFailed")); }
    finally { setBusy(false); }
  }

  async function sendInternalNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!admin || busy || !internalNote.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const payload = internalNote.trim();
      if (noteIdempotencyPayload.current !== payload) {
        noteIdempotencyPayload.current = payload;
        noteIdempotencyKey.current = newIdempotencyKey();
      }
      await api<SupportThreadReply>(`/admin/support-requests/${encodeURIComponent(requestId)}/internal-notes`, { method: "POST", headers: { "idempotency-key": noteIdempotencyKey.current }, body: JSON.stringify({ message: payload }) });
      noteIdempotencyKey.current = ""; noteIdempotencyPayload.current = "";
      setInternalNote(""); setMessage(t("support.internalNoteSaved")); details.reload(); onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("common.saveFailed")); }
    finally { setBusy(false); }
  }

  return <div className="support-thread">
    <div className="page-actions-inline"><button className="secondary support-thread-toggle" type="button" aria-expanded={open} aria-controls={`support-thread-${requestId}`} onClick={() => { const next = !open; setOpen(next); onOpenChange?.(next); }}>{open ? t("support.closeThread") : t("support.openThread")}</button>{open && <button className="secondary" type="button" disabled={details.loading || busy} onClick={details.reload}><Icon name="restore" size={16}/>{t("support.refreshThread")}</button>}</div>
    {open && <div className="support-thread-panel" id={`support-thread-${requestId}`}>
      {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
      {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
      <LoadState state={details}>
        {(ticket) => {
          const replies = (ticket.replies ?? []).filter((item) => admin || item.visibility !== "INTERNAL");
          return <>
            <div className="support-thread-summary"><StatusBadge value={ticket.status}/><span>{t("support.lastUpdated")}: {formatDate(ticket.updatedAt, true)}</span><span>{t("support.replyCount", { count: replies.length.toLocaleString(locale === "en" ? "en-US" : "fa-IR") })}</span></div>
            <ol className="support-thread-messages">
              <li className="support-thread-message from-requester">
                <header><strong>{t("support.originalRequest")}</strong><span>{admin ? ticket.requester?.displayName ?? t("support.requester") : t("support.requester")}</span><time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt, true)}</time></header>
                <p>{ticket.message}</p>
              </li>
              {replies.map((item) => {
              const fromSupport = item.author.globalRole === "SUPER_ADMIN";
              const internal = item.visibility === "INTERNAL";
              return <li className={`support-thread-message${fromSupport ? " from-support" : " from-requester"}${internal ? " internal-note" : ""}`} key={item.id}>
                <header><strong>{internal ? t("support.internalNote") : fromSupport ? t("support.supportTeam") : t("support.requester")}</strong>{internal && <span>{t("support.internalOnly")}</span>}<span>{item.author.displayName}</span><time dateTime={item.createdAt}>{formatDate(item.createdAt, true)}</time></header>
                <p>{item.message}</p>
              </li>;
              })}
              {!replies.length && ticket.response && <li className="support-thread-message from-support"><header><strong>{t("support.supportTeam")}</strong><time dateTime={ticket.updatedAt}>{formatDate(ticket.updatedAt, true)}</time></header><p>{ticket.response}</p></li>}
            </ol>
            {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && <p className="support-thread-reopen-note">{t("support.replyReopensTicket")}</p>}
            <form className="support-thread-reply-form" onSubmit={(event) => void send(event)}>
              <label>{t("support.reply")}<textarea rows={3} minLength={1} maxLength={4000} value={reply} onChange={(event) => setReply(event.target.value)} required/></label>
              <button className="primary" type="submit" disabled={busy || !reply.trim()}>{busy ? t("common.loading") : <><Icon name="arrow"/>{t("support.sendReply")}</>}</button>
            </form>
            {admin && <form className="support-thread-reply-form support-internal-note-form" onSubmit={(event) => void sendInternalNote(event)}>
              <label>{t("support.internalNote")}<textarea rows={3} minLength={1} maxLength={4000} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} required/></label>
              <small>{t("support.internalOnly")}</small>
              <button className="secondary" type="submit" disabled={busy || !internalNote.trim()}>{busy ? t("common.loading") : <><Icon name="check"/>{t("support.addInternalNote")}</>}</button>
            </form>}
          </>;
        }}
      </LoadState>
    </div>}
  </div>;
}

function SupportTicketCard({ item, initiallyOpen = false, onOpenChange, onChanged }: { item: SupportRequest; initiallyOpen?: boolean; onOpenChange?: (open: boolean) => void; onChanged: () => void }) {
  const { t } = useI18n();
  return <article className="support-request-card" id={`ticket-${item.id}`}>
    <div className="support-request-card-heading"><div>
      <small>{t(categoryKey[item.category])} · {t("support.lastUpdated")} {formatDate(item.updatedAt, true)}</small>
      <h3>{item.subject}</h3>
      <small className="support-ticket-reference">{t("support.ticketReference")}: <bdi dir="ltr">{item.id}</bdi></small>
    </div><StatusBadge value={item.status}/></div>
    <p className="support-request-preview">{item.message}</p>
    <SupportThread requestId={item.id} initiallyOpen={initiallyOpen} onOpenChange={onOpenChange} onChanged={onChanged}/>
  </article>;
}

export function SupportPage() {
  const { session } = getSession();
  return session?.user.globalRole === "SUPER_ADMIN" ? <SupportAdministratorPage/> : <SupportCustomerPage/>;
}

function SupportAdministratorPage() {
  const { t } = useI18n();
  return <section className="page-shell support-page support-administrator-page"><PageHeader eyebrow={t("support.eyebrow")} title={t("support.inboxTitle")} description={t("support.inboxDescription")}/><SectionCard icon="assistant" title={t("support.customerTickets")}><SupportInboxSection/></SectionCard></section>;
}

function SupportCustomerPage() {
  const { locale, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillSearch = useMemo(() => {
    const values = new URLSearchParams();
    for (const key of ["source", "category", "errorCode", "assessment"] as const) {
      const value = searchParams.get(key);
      if (value) values.set(key, value);
    }
    return values.toString();
  }, [searchParams]);
  const prefill = useMemo(() => supportPrefillFromSearch(prefillSearch ? `?${prefillSearch}` : "", locale), [prefillSearch, locale]);
  const [category, setCategory] = useState<SupportCategory>(prefill.category);
  const [subject, setSubject] = useState(prefill.subject);
  const [requestMessage, setRequestMessage] = useState(prefill.message);
  const [contextActive, setContextActive] = useState(prefill.fromRulaAi);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"" | SupportCategory>("");
  const [statusFilter, setStatusFilter] = useState<"" | SupportStatus>("");
  const [page, setPage] = useState(1);
  const createIdempotencyKey = useRef("");
  const createIdempotencyPayload = useRef("");
  const requestedTicketId = searchParams.get("ticket") ?? "";
  const selectedTicketId = isSupportRequestId(requestedTicketId) ? requestedTicketId : "";
  const listPath = useMemo(() => {
    const query = new URLSearchParams({ page: String(page), limit: String(SUPPORT_PAGE_LIMIT) });
    if (statusFilter) query.set("status", statusFilter);
    if (categoryFilter) query.set("category", categoryFilter);
    if (search.trim()) query.set("search", search.trim());
    return `/support/requests?${query.toString()}`;
  }, [page, statusFilter, categoryFilter, search]);
  const requests = useSupportList<SupportRequest>(listPath);
  const visibleRequests = requests.data ?? [];
  const linkedTicketNeedsFetch = Boolean(selectedTicketId && requests.data && !visibleRequests.some((item) => item.id === selectedTicketId));
  const linkedTicket = useLoad<SupportRequestDetails>(linkedTicketNeedsFetch ? `/support/requests/${encodeURIComponent(selectedTicketId)}` : null);
  const total = requests.meta?.total ?? requests.data?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / SUPPORT_PAGE_LIMIT));

  useEffect(() => {
    setCategory(prefill.category);
    setSubject(prefill.subject);
    setRequestMessage(prefill.message);
    setContextActive(prefill.fromRulaAi);
    setPage(1);
  }, [prefillSearch, locale]);

  function setTicketInUrl(ticketId: string, open: boolean) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (open) next.set("ticket", ticketId);
      else if (next.get("ticket") === ticketId) next.delete("ticket");
      return next;
    });
  }

  function removePrefilledContext() {
    setContextActive(false);
    setSubject("");
    setRequestMessage("");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const key of ["source", "errorCode", "assessment"] as const) next.delete(key);
      return next;
    }, { replace: true });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || subject.trim().length < 3 || requestMessage.trim().length < 10) return;
    const payload = JSON.stringify({
      category,
      subject: subject.trim(),
      message: requestMessage.trim(),
      ...(contextActive && prefill.assessmentReference ? { relatedAssessmentType: "RULA", relatedAssessmentId: prefill.assessmentReference } : {}),
      ...(contextActive && prefill.publicErrorCode ? { publicErrorCode: prefill.publicErrorCode } : {}),
    });
    if (createIdempotencyPayload.current !== payload) {
      createIdempotencyPayload.current = payload;
      createIdempotencyKey.current = newIdempotencyKey();
    }
    setBusy(true); setError(""); setMessage("");
    try {
      await api<SupportRequest>("/support/requests", { method: "POST", headers: { "idempotency-key": createIdempotencyKey.current }, body: payload });
      createIdempotencyKey.current = ""; createIdempotencyPayload.current = "";
      setCategory("OTHER");
      setSubject(""); setRequestMessage(""); setContextActive(false);
      setMessage(t("support.requestCreated"));
      setPage(1);
      requests.reload();
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        for (const key of ["category", "source", "errorCode", "assessment"] as const) next.delete(key);
        return next;
      }, { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("common.saveFailed")); }
    finally { setBusy(false); }
  }

  return <section className="page-shell support-page">
    <PageHeader eyebrow={t("support.eyebrow")} title={t("support.title")} description={t("support.description")}/>
    {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    <SectionCard title={t("support.newRequest")} description={t("support.noAutomaticUpgrade")} icon="assistant">
      <form className="support-request-form" onSubmit={submit}>
        <label>{t("support.category")}<StyledSelect value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)}>{categories.map((value) => <option key={value} value={value}>{t(categoryKey[value])}</option>)}</StyledSelect></label>
        <label>{t("support.subject")}<input name="subject" minLength={3} maxLength={191} value={subject} onChange={(event) => setSubject(event.target.value)} required/></label>
        <label className="support-request-message">{t("support.message")}<textarea name="message" minLength={10} maxLength={10_000} rows={5} value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} required/></label>
        {contextActive && <div className="support-context-note" role="note"><Icon name="warning"/><p>{t("support.rulaContextReview")}</p><button className="text-button" type="button" onClick={removePrefilledContext}>{t("support.removeContext")}</button></div>}
        <button className="primary" type="submit" disabled={busy}>{busy ? t("common.loading") : <><Icon name="arrow"/>{t("support.submit")}</>}</button>
      </form>
    </SectionCard>
    <SectionCard title={t("support.myRequests")} description={t("support.listDescription")} icon="notifications">
      <div className="support-list-controls">
        <label>{t("support.searchCurrentPage")}<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("support.userSearchPlaceholder")}/></label>
        <label>{t("support.category")}<StyledSelect value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value as "" | SupportCategory); setPage(1); }}><option value="">{t("support.allCategories")}</option>{categories.map((value) => <option key={value} value={value}>{t(categoryKey[value])}</option>)}</StyledSelect></label>
        <label>{t("support.filterStatus")}<StyledSelect value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "" | SupportStatus); setPage(1); }}><option value="">{t("support.allStatuses")}</option>{statuses.map((value) => <option key={value} value={value}>{t(statusKey[value])}</option>)}</StyledSelect></label>
      </div>
      <LoadState state={requests} empty={search || categoryFilter ? t("support.noMatches") : t("support.noRequests")}>
        {() => visibleRequests.length ? <div className="support-request-list">{visibleRequests.map((item) => <SupportTicketCard key={item.id} item={item} initiallyOpen={selectedTicketId === item.id} onOpenChange={(open) => setTicketInUrl(item.id, open)} onChanged={requests.reload}/>)}</div> : <p className="support-filter-empty">{t("support.noMatches")}</p>}
      </LoadState>
      {linkedTicketNeedsFetch && <LoadState state={linkedTicket}>{(ticket) => <SupportTicketCard item={ticket} initiallyOpen onOpenChange={(open) => setTicketInUrl(ticket.id, open)} onChanged={requests.reload}/>}</LoadState>}
      {requests.meta && <div className="support-pagination"><span>{t("support.pageSummary", { page: page.toLocaleString(locale === "en" ? "en-US" : "fa-IR"), pages: pageCount.toLocaleString(locale === "en" ? "en-US" : "fa-IR"), total: total.toLocaleString(locale === "en" ? "en-US" : "fa-IR") })}</span><div><button className="secondary" type="button" disabled={page <= 1 || requests.loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t("support.previousPage")}</button><button className="secondary" type="button" disabled={page >= pageCount || requests.loading} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>{t("support.nextPage")}</button></div></div>}
    </SectionCard>
  </section>;
}

export function SupportInboxSection() {
  const { locale, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTicketId = searchParams.get("ticket") ?? "";
  const selectedTicketId = isSupportRequestId(requestedTicketId) ? requestedTicketId : "";
  const [status, setStatus] = useState<"" | SupportStatus>("");
  const [category, setCategory] = useState<"" | SupportCategory>("");
  const [priority, setPriority] = useState<"" | SupportPriority>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, SupportStatus>>({});
  const [priorityDrafts, setPriorityDrafts] = useState<Record<string, SupportPriority>>({});
  const [assigneeDrafts, setAssigneeDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(SUPPORT_PAGE_LIMIT) });
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (priority) params.set("priority", priority);
    if (search.trim()) params.set("search", search.trim());
    return `/admin/support-requests?${params.toString()}`;
  }, [page, status, category, priority, search]);
  const requests = useSupportList<AdminSupportRequest>(query);
  const listedRequests = requests.data ?? [];
  const linkedTicketNeedsFetch = Boolean(selectedTicketId && requests.data && !listedRequests.some(item => item.id === selectedTicketId));
  const linkedTicket = useLoad<AdminSupportRequest>(linkedTicketNeedsFetch ? `/admin/support-requests/${encodeURIComponent(selectedTicketId)}` : null);
  const visibleRequests = linkedTicketNeedsFetch && linkedTicket.data?.id === selectedTicketId ? [linkedTicket.data, ...listedRequests] : listedRequests;
  const staff = useLoad<SupportStaff[]>("/admin/support-staff");
  const total = requests.meta?.total ?? requests.data?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / SUPPORT_PAGE_LIMIT));

  async function save(item: AdminSupportRequest) {
    if (busyId) return;
    const nextStatus = statusDrafts[item.id] ?? item.status;
    const nextPriority = priorityDrafts[item.id] ?? item.priority;
    const nextAssigneeId = assigneeDrafts[item.id] ?? item.assignedTo?.id ?? "";
    setBusyId(item.id); setError(""); setMessage("");
    try {
      await api(`/admin/support-requests/${encodeURIComponent(item.id)}`, { method: "PATCH", body: JSON.stringify({ expectedUpdatedAt: item.updatedAt, status: nextStatus, priority: nextPriority, ...(nextAssigneeId !== (item.assignedTo?.id ?? "") ? { assignedToId: nextAssigneeId || null } : {}) }) });
      setMessage(t("support.reviewSaved"));
      requests.reload();
    } catch (reason) { setError((reason as { code?: string })?.code === "SUPPORT_TICKET_CONFLICT" ? t("support.ticketConflict") : reason instanceof Error ? reason.message : t("common.saveFailed")); }
    finally { setBusyId(""); }
  }

  return <section className="support-inbox-section">
    <button className="secondary" type="button" disabled={requests.loading} onClick={() => { requests.reload(); staff.reload(); linkedTicket.reload(); }}><Icon name="restore" size={16}/>{t("support.refreshInbox")}</button>
    {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    {linkedTicketNeedsFetch && linkedTicket.error && <div className="alert error" role="alert">{linkedTicket.error}<button type="button" className="text-button" onClick={linkedTicket.reload}>{t("common.retry")}</button></div>}
    {linkedTicketNeedsFetch && linkedTicket.loading && <p role="status">{t("common.loading")}</p>}
    <div className="support-list-controls support-inbox-controls">
      <label>{t("support.searchCurrentPage")}<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("support.searchPlaceholder")}/></label>
      <label>{t("support.category")}<StyledSelect value={category} onChange={(event) => { setCategory(event.target.value as "" | SupportCategory); setPage(1); }}><option value="">{t("support.allCategories")}</option>{categories.map((value) => <option key={value} value={value}>{t(categoryKey[value])}</option>)}</StyledSelect></label>
      <label>{t("support.priority")}<StyledSelect value={priority} onChange={(event) => { setPriority(event.target.value as "" | SupportPriority); setPage(1); }}><option value="">{t("support.priority")}</option>{priorities.map((value) => <option key={value} value={value}>{t(priorityKey[value])}</option>)}</StyledSelect></label>
      <label>{t("support.filterStatus")}<StyledSelect value={status} onChange={(event) => { setStatus(event.target.value as "" | SupportStatus); setPage(1); }}><option value="">{t("support.allStatuses")}</option>{statuses.map((value) => <option key={value} value={value}>{t(statusKey[value])}</option>)}</StyledSelect></label>
    </div>
    <LoadState state={{ ...requests, data: requests.data ? visibleRequests : null }} empty={search || category ? t("support.noMatches") : t("support.noRequests")}>
      {() => visibleRequests.length ? <div className="support-request-list">{visibleRequests.map((item) => <article className="support-inbox-card" key={item.id}>
        <header className="support-request-card-heading"><div><small>{locale === "en" ? item.organization.nameEn : item.organization.nameFa} · {item.requester.displayName}</small><h3>{item.subject}</h3><small className="support-ticket-reference">{t("support.ticketReference")}: <bdi dir="ltr">{item.id}</bdi></small></div><StatusBadge value={item.status}/></header>
        <div className="support-request-inbox-meta"><span>{t(categoryKey[item.category])}</span><span>{t("support.priority")}: {t(priorityKey[item.priority])}</span><time dateTime={item.updatedAt}>{formatDate(item.updatedAt, true)}</time></div>
        <p className="support-request-preview">{item.message}</p>
        <SupportThread requestId={item.id} admin initiallyOpen={selectedTicketId === item.id} onOpenChange={(open) => setSearchParams(current => { const next = new URLSearchParams(current); if (open) next.set("ticket", item.id); else if (next.get("ticket") === item.id) next.delete("ticket"); return next; })} onChanged={() => { requests.reload(); linkedTicket.reload(); }}/>
        <label>{t("support.requestStatus")}<StyledSelect value={statusDrafts[item.id] ?? item.status} onChange={(event) => setStatusDrafts((current) => ({ ...current, [item.id]: event.target.value as SupportStatus }))}>{supportStatusOptions(item.status).map((value) => <option key={value} value={value}>{t(statusKey[value])}</option>)}</StyledSelect></label>
        <label>{t("support.priority")}<StyledSelect value={priorityDrafts[item.id] ?? item.priority} onChange={(event) => setPriorityDrafts((current) => ({ ...current, [item.id]: event.target.value as SupportPriority }))}>{priorities.map((value) => <option key={value} value={value}>{t(priorityKey[value])}</option>)}</StyledSelect></label>
        <label>{t("support.assignedTo")}<StyledSelect value={assigneeDrafts[item.id] ?? item.assignedTo?.id ?? ""} onChange={(event) => setAssigneeDrafts((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">{t("support.unassigned")}</option>{(staff.data ?? []).map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</StyledSelect></label>
        <button className="primary" type="button" disabled={busyId === item.id || ((statusDrafts[item.id] ?? item.status) === item.status && (priorityDrafts[item.id] ?? item.priority) === item.priority && (assigneeDrafts[item.id] ?? item.assignedTo?.id ?? "") === (item.assignedTo?.id ?? ""))} onClick={() => void save(item)}>{busyId === item.id ? t("common.loading") : <><Icon name="check"/>{t("support.saveStatus")}</>}</button>
      </article>)}</div> : <p className="support-filter-empty">{t("support.noMatches")}</p>}
    </LoadState>
    {requests.meta && <div className="support-pagination"><span>{t("support.pageSummary", { page: page.toLocaleString(locale === "en" ? "en-US" : "fa-IR"), pages: pageCount.toLocaleString(locale === "en" ? "en-US" : "fa-IR"), total: total.toLocaleString(locale === "en" ? "en-US" : "fa-IR") })}</span><div><button className="secondary" type="button" disabled={page <= 1 || requests.loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t("support.previousPage")}</button><button className="secondary" type="button" disabled={page >= pageCount || requests.loading} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>{t("support.nextPage")}</button></div></div>}
  </section>;
}

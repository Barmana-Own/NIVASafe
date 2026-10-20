import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { isForbiddenDisplayName, isStrongPassword, isValidDisplayName, isValidEmail, isValidPhone, isValidUsername, normalizeEmail, normalizePhone, normalizeUsername, PASSWORD_MIN_LENGTH } from "@nivasafe/domain";
import { api, getSession, useLoad } from "../../api/client";
import { TableRegion, EmptyState, Icon, SectionCard, StyledSelect, LoadingState as SharedLoadingState, roleLabel, useDialog, formatDate } from "../../components/UI";
import { useModalFocus } from "../../components/useModalFocus";
import { useUnsavedChanges } from "../../components/useUnsavedChanges";
import { WorkspaceTabs as AdminWorkspaceTabs } from "../../components/WorkspaceTabs";
import { useI18n } from "../../i18n";
import { SupportInboxSection } from "../support/SupportPage";

type UserRole = "USER" | "SUPER_ADMIN";
type AdminMembership = { id: string; role: string; active: boolean; organization: { id: string; nameFa: string; nameEn: string; active: boolean } };
type AdminUser = { id: string; email: string; username: string | null; displayName: string; active: boolean; globalRole: UserRole; protectedSystemAdmin?: boolean; lastLoginAt: string | null; jobTitle: string | null; phone: string | null; createdAt: string; memberships: AdminMembership[] };
type AdminOverview = {
  users: { total: number; active: number; inactive: number; superAdmins: number };
  organizations: { total: number; active: number; inactive: number };
  activeMemberships: number;
  pendingInvitations: number;
  pendingMemberRequests: number;
  recentUsers: Array<Pick<AdminUser, "id" | "displayName" | "email" | "username" | "active" | "globalRole" | "createdAt">>;
};
type UserEdit = { displayName: string; email: string; username: string; phone: string; jobTitle: string };
type PasswordEdit = { password: string; confirmation: string };
type UserPatch = Partial<{ active: boolean; globalRole: UserRole; displayName: string; email: string; username: string | null; phone: string | null; jobTitle: string | null }>;
type OrganizationMember = { id: string; role: string; active: boolean; user: { id: string; email: string; username?: string | null; displayName: string; jobTitle?: string | null; active?: boolean; globalRole?: string } };
type AdminMemberRequest = { id: string; username: string | null; email: string | null; displayName: string; phone: string | null; jobTitle: string | null; role: string; status: string; rejectionReason: string | null; createdAt: string; reviewedAt: string | null; organization: { id: string; nameFa: string; nameEn: string; active: boolean }; requestedBy: { id: string; displayName: string; email: string; username: string | null } };
type AdminAIUsageRow = { userId: string; displayName: string; username: string | null; email: string; active: boolean; requestCount: number; inputTokens: number; outputTokens: number; totalTokens: number; aiEnabled: boolean; aiTokenLimit?: number; aiTokensUsed?: number };
type AdminAIUsage = { users: AdminAIUsageRow[]; totals: Pick<AdminAIUsageRow, "requestCount" | "inputTokens" | "outputTokens" | "totalTokens"> };
type GlobalAdminTab = "users" | "requests" | "ai" | "overview" | "support";
type OrganizationAdminTab = "members" | "ai";


function LoadingState() {
  return <SharedLoadingState compact/>;
}

function AIQuotaEditor({ user, disabled, onSave }: { user: AdminAIUsageRow; disabled: boolean; onSave: (limit: number) => Promise<void> }) {
  const { t } = useI18n();
  const limit = user.aiTokenLimit ?? 1_000_000;
  const [draft, setDraft] = useState(String(limit));
  useEffect(() => setDraft(String(limit)), [limit]);
  useUnsavedChanges(draft !== String(limit), t("redesign.unsavedChanges"));
    const normalizedDraft = draft.replace(/[۰-۹]/gu, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/gu, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    const value = Number(normalizedDraft);
    const valid = /^\d+$/u.test(normalizedDraft) && Number.isSafeInteger(value) && value >= 0 && value <= 2_147_483_647;
  return <form className="admin-ai-quota-editor" onSubmit={event => { event.preventDefault(); if (valid && !disabled && value !== limit) void onSave(value); }}>
      <input type="text" dir="ltr" inputMode="numeric" pattern="[0-9۰-۹٠-٩]*" autoComplete="off" required value={draft} disabled={disabled} onChange={event => setDraft(event.target.value)} aria-label={t("admin.aiTokenLimit") + ": " + user.displayName}/>
    <button type="submit" className="ghost" disabled={disabled || !valid || value === limit} aria-label={t("common.save") + ": " + user.displayName}>{t("common.save")}</button>
  </form>;
}

export function AIUsageSection({ data, loading, onChanged, search }: { data: AdminAIUsage | null; loading: boolean; onChanged: () => void; search?: { input: string; value: string; onInput: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onReset: () => void } }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canManage = getSession().session?.user.globalRole === "SUPER_ADMIN";
  async function changeAccess(user: AdminAIUsageRow, patch = { aiEnabled: !user.aiEnabled } as { aiEnabled?: boolean; aiTokenLimit?: number }) {
    if (busyId || !canManage) return;
    setBusyId(user.userId); setError(""); setMessage("");
    try { await api(`/admin/users/${user.userId}/ai-access`, { method: "PATCH", body: JSON.stringify(patch) }); setMessage(t("admin.aiAllowanceUpdated")); onChanged(); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusyId(null); }
  }
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  return <SectionCard className="admin-ai-usage" title={t("admin.aiUsageTitle")} description={t("admin.aiUsageDescription")} icon="activity">
    {search && <form className="admin-user-toolbar admin-ai-toolbar" onSubmit={search.onSubmit}>
      <div className="search-box"><Icon name="search"/><input value={search.input} onChange={(event) => search.onInput(event.target.value)} placeholder={t("admin.aiSearchPlaceholder")} aria-label={t("admin.aiSearchPlaceholder")}/></div>
      <div className="admin-toolbar-actions"><button className="primary" type="submit"><Icon name="search" size={16}/>{t("admin.search")}</button>{search.value && <button className="ghost" type="button" onClick={search.onReset}>{t("admin.reset")}</button>}</div>
    </form>}
    {error && <div role="alert" className="alert error">{error}</div>}{message && <div role="status" className="alert success">{message}</div>}{loading && !data ? <LoadingState/> : data ? <>
      <div className="admin-ai-usage-summary">
        <article><small>{t("admin.aiUsageTotalTokens")}</small><strong className="admin-token-number" dir="ltr">{data.totals.totalTokens.toLocaleString(numberLocale)}</strong></article>
        <article><small>{t("admin.aiUsageRequests")}</small><strong className="admin-token-number" dir="ltr">{data.totals.requestCount.toLocaleString(numberLocale)}</strong></article>
        <article><small>{t("admin.aiUsageInputTokens")}</small><strong className="admin-token-number" dir="ltr">{data.totals.inputTokens.toLocaleString(numberLocale)}</strong></article>
        <article><small>{t("admin.aiUsageOutputTokens")}</small><strong className="admin-token-number" dir="ltr">{data.totals.outputTokens.toLocaleString(numberLocale)}</strong></article>
      </div>
        {data.users.length ? <TableRegion className="table-wrap admin-ai-usage-table"><table><thead><tr><th scope="col">{t("admin.aiUsageUser")}</th><th scope="col">{t("admin.aiUsageRequests")}</th><th scope="col">{t("admin.aiUsageInputTokens")}</th><th scope="col">{t("admin.aiUsageOutputTokens")}</th><th scope="col">{t("admin.aiUsageTotalTokens")}</th><th scope="col">{t("admin.aiAccess")}</th>{canManage && <th scope="col">{t("admin.aiAllowance")}</th>}</tr></thead><tbody>{data.users.map((user) => <tr key={user.userId}><td data-label={t("admin.aiUsageUser")}><div className="admin-user-identity"><strong>{user.displayName}</strong>{user.username && <small dir="ltr">@{user.username}</small>}<small dir="ltr">{user.email}</small>{!user.active && <span className="admin-account-warning">{t("admin.inactive")}</span>}</div></td><td data-label={t("admin.aiUsageRequests")} className="admin-token-number" dir="ltr">{user.requestCount.toLocaleString(numberLocale)}</td><td data-label={t("admin.aiUsageInputTokens")} className="admin-token-number" dir="ltr">{user.inputTokens.toLocaleString(numberLocale)}</td><td data-label={t("admin.aiUsageOutputTokens")} className="admin-token-number" dir="ltr">{user.outputTokens.toLocaleString(numberLocale)}</td><td data-label={t("admin.aiUsageTotalTokens")} className="admin-token-number" dir="ltr"><strong>{user.totalTokens.toLocaleString(numberLocale)}</strong></td><td data-label={t("admin.aiAccess")}><label className="admin-ai-access-control"><input type="checkbox" checked={user.aiEnabled} disabled={!canManage || Boolean(busyId)} onChange={() => void changeAccess(user)} aria-label={`${t("admin.aiAccess")}: ${user.displayName}`}/><span className="admin-ai-switch" aria-hidden="true"/><span>{t(user.aiEnabled ? "admin.aiAllowed" : "admin.aiBlocked")}</span></label></td>{canManage && <td className="admin-ai-allowance" data-label={t("admin.aiAllowance")}><span dir="ltr">{(user.aiTokensUsed ?? 0).toLocaleString(numberLocale)} / {(user.aiTokenLimit ?? 1000000).toLocaleString(numberLocale)}</span><AIQuotaEditor user={user} disabled={Boolean(busyId)} onSave={(aiTokenLimit) => changeAccess(user, { aiTokenLimit })}/><small className="admin-ai-remaining">{t("admin.aiRemaining")}: {Math.max(0, (user.aiTokenLimit ?? 1000000) - (user.aiTokensUsed ?? 0)).toLocaleString(numberLocale)}</small></td>}</tr>)}</tbody></table></TableRegion> : <EmptyState icon="activity" title={t("admin.aiUsageNoData")} description={t("admin.aiUsageNoDataDescription")}/>}
    </> : null}
  </SectionCard>;
}

function MemberRequestsSection({ data, loading, onChanged }: { data: AdminMemberRequest[] | null; loading: boolean; onChanged: () => void }) {
  const { locale, t } = useI18n();
  const dialog = useDialog();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [approvalEmail, setApprovalEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const approvalDirty = Boolean(activeId && (password || confirmation || approvalEmail !== (data?.find((request) => request.id === activeId)?.email ?? "")));
  useUnsavedChanges(approvalDirty, t("redesign.unsavedChanges"));
  async function closeApproval() { if (busy || (approvalDirty && !(await dialog.confirm(t("redesign.unsavedChanges"))))) return; setActiveId(null); setPassword(""); setConfirmation(""); }

  async function openApproval(request: AdminMemberRequest) {
    if (busy || (approvalDirty && !(await dialog.confirm(t("redesign.unsavedChanges"))))) return;
    setActiveId(request.id);
    setApprovalEmail(request.email ?? "");
    setPassword("");
    setConfirmation("");
    setError("");
    setMessage("");
  }

  async function approve(request: AdminMemberRequest, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = request.email === null ? normalizeEmail(approvalEmail) : undefined;
    if (email !== undefined && !isValidEmail(email)) { setError(t("profile.invalidEmail")); return; }
    if (password !== confirmation) { setError(t("admin.passwordMismatch")); return; }
    if (!isStrongPassword(password, { email: email ?? request.email ?? undefined, displayName: request.displayName })) { setError(t("admin.invalidPassword", { min: PASSWORD_MIN_LENGTH })); return; }
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await api<{ credentialsReady: boolean; user: { username: string | null; email: string } }>(`/admin/member-requests/${request.id}/approve`, { method: "POST", body: JSON.stringify({ password, ...(email === undefined ? {} : { email }) }) });
      setActiveId(null);
      setApprovalEmail("");
      setPassword("");
      setConfirmation("");
      setMessage(t("admin.credentialsReady", { identifier: result.data.user.username ?? result.data.user.email }));
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("admin.updateFailed"));
    } finally { setBusy(false); }
  }

  async function reject(request: AdminMemberRequest) {
    if (busy) return;
    if (!(await dialog.confirm(t("admin.rejectMemberRequest") + `: ${request.displayName}?`))) return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await api(`/admin/member-requests/${request.id}/reject`, { method: "POST", body: JSON.stringify({}) });
      setMessage(t("admin.requestRejected"));
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("admin.updateFailed"));
    } finally { setBusy(false); }
  }

  return <SectionCard className="admin-member-requests" title={t("admin.memberRequestsTitle")} description={t("admin.memberRequestsDescription")} icon="members">
    {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    {loading && !data ? <LoadingState/> : data?.length ? <div className="admin-request-list">{data.map((request) => <article className="admin-request-card" key={request.id}>
      <header className="admin-request-card-head">
        <div className="admin-request-person">
          <span className="admin-request-avatar" aria-hidden="true">{request.displayName.trim().slice(0, 1)}</span>
          <div className="admin-request-copy">
            <strong>{request.displayName}</strong>
            <div className="admin-request-identifiers" dir="ltr">
              {request.username && <span>@{request.username}</span>}
              {request.email && <span>{request.email}</span>}
            </div>
            {request.jobTitle && <small className="admin-request-job-title">{request.jobTitle}</small>}
          </div>
        </div>
        <div className="admin-request-badges">
          <span className="status-badge neutral">{roleLabel(request.role)}</span>
          <span className="status-badge warning">{t("admin.pendingApproval")}</span>
        </div>
      </header>
      <div className="admin-request-meta">
        <div className="admin-request-meta-item"><span>{t("admin.requestedForOrganization")}</span><strong>{locale === "en" ? request.organization.nameEn : request.organization.nameFa}</strong></div>
        <div className="admin-request-meta-item"><span>{t("admin.requestedBy")}</span><strong>{request.requestedBy.displayName}</strong></div>
        <div className="admin-request-meta-item"><span>{t("admin.requestDate")}</span><time dateTime={request.createdAt}>{formatDate(request.createdAt, true)}</time></div>
      </div>
      {activeId === request.id ? <form className="admin-request-approval form-grid" onSubmit={(event) => void approve(request, event)}><p className="field-hint full">{t("admin.approveMemberRequestDescription")}</p>{request.email === null && <><p className="field-hint full">{t("admin.memberRequestEmailRequired")}</p><label>{t("members.requestEmail")}<input type="email" dir="ltr" autoComplete="email" value={approvalEmail} onChange={(event) => setApprovalEmail(event.target.value)} maxLength={254} required/></label></>}<label>{t("admin.initialPassword")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label><label>{t("admin.initialPasswordConfirm")}<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label><div className="admin-edit-actions admin-request-form-actions full"><button className="primary" type="submit" disabled={busy}><Icon name="check" size={16}/>{t("admin.approveMemberRequest")}</button><button className="ghost" type="button" onClick={() => void closeApproval()}>{t("common.cancel")}</button></div></form> : <div className="admin-request-actions"><button className="primary" type="button" disabled={busy} onClick={() => void openApproval(request)}>{t("admin.approveMemberRequest")}</button><button className="ghost danger-link" type="button" disabled={busy} onClick={() => void reject(request)}>{t("admin.rejectMemberRequest")}</button></div>}
    </article>)}</div> : <EmptyState icon="members" title={t("admin.noPendingMemberRequests")}/>}
  </SectionCard>;
}

export function AdminPanelPage() {
  const { locale, t } = useI18n();
  const { session } = getSession();
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState<GlobalAdminTab>("users");
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [aiSearchInput, setAiSearchInput] = useState("");
  const [aiSearch, setAiSearch] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserEdit>({ displayName: "", email: "", username: "", phone: "", jobTitle: "" });
  const initialEditForm = useRef(editForm);
  const [profileError, setProfileError] = useState<{ field: keyof UserEdit; message: string } | null>(null);
  const [passwordEditingId, setPasswordEditingId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordEdit>({ password: "", confirmation: "" });
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const userEditorRef = useRef<HTMLElement>(null);
  const overview = useLoad<AdminOverview>("/admin/overview");
  const memberRequests = useLoad<AdminMemberRequest[]>("/admin/member-requests?status=PENDING");
  const usersPath = `/admin/users?limit=100${userSearch ? `&search=${encodeURIComponent(userSearch)}` : ""}`;
  const users = useLoad<AdminUser[]>(usersPath);
  const aiUsagePath = `/admin/ai-usage?limit=100${aiSearch ? `&search=${encodeURIComponent(aiSearch)}` : ""}`;
  const aiUsage = useLoad<AdminAIUsage>(aiUsagePath);
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const currentUserId = session?.user.id;
  const editorId = editingId ?? passwordEditingId;
  const editorUser = users.data?.find((user) => user.id === editorId) ?? null;
  const profileDirty = Boolean(editingId) && JSON.stringify(editForm) !== JSON.stringify(initialEditForm.current);
  const passwordDirty = Boolean(passwordEditingId && (passwordForm.password || passwordForm.confirmation));
  useUnsavedChanges(profileDirty || passwordDirty, t("redesign.unsavedChanges"));

  async function closeUserEditor() {
    if (busyUserId) return;
    if ((profileDirty || passwordDirty) && !(await dialog.confirm(t("redesign.unsavedChanges")))) return;
    setEditingId(null);
    setPasswordEditingId(null);
    setPasswordForm({ password: "", confirmation: "" });
  }

  useModalFocus(userEditorRef, Boolean(editorId), () => void closeUserEditor());

  function changeProfileField(field: keyof UserEdit, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
    if (profileError?.field === field) setProfileError(null);
  }

  function submitUserSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserSearch(userSearchInput.trim());
  }

  function resetUserSearch() {
    setUserSearchInput("");
    setUserSearch("");
  }

  function submitAiSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAiSearch(aiSearchInput.trim());
  }

  function resetAiSearch() {
    setAiSearchInput("");
    setAiSearch("");
  }

  async function updateUser(id: string, patch: UserPatch): Promise<boolean> {
    if (busyUserId) return false;
    setBusyUserId(id);
    setActionError("");
    setMessage("");
    try {
      await api(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      users.reload();
      aiUsage.reload();
      overview.reload();
      setMessage(t("admin.userUpdated"));
      return true;
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : t("admin.updateFailed"));
      return false;
    } finally {
      setBusyUserId(null);
    }
  }

  async function changeRole(user: AdminUser, nextRole: UserRole) {
    if (busyUserId || user.protectedSystemAdmin || nextRole === user.globalRole || user.id === currentUserId) return;
    const key = nextRole === "SUPER_ADMIN" ? "admin.promoteConfirm" : "admin.demoteConfirm";
    if (!(await dialog.confirm(t(key, { name: user.displayName })))) return;
    await updateUser(user.id, { globalRole: nextRole });
  }

  async function toggleActive(user: AdminUser) {
    if (busyUserId || user.protectedSystemAdmin || (user.id === currentUserId && user.active)) return;
    if (user.active && !(await dialog.confirm(t("admin.deactivateConfirm", { name: user.displayName })))) return;
    await updateUser(user.id, { active: !user.active });
  }

  async function beginEdit(user: AdminUser) {
    if (passwordDirty && !(await dialog.confirm(t("redesign.unsavedChanges")))) return;
    setPasswordEditingId(null);
    setPasswordForm({ password: "", confirmation: "" });
    setEditingId(user.id);
    const values = { displayName: user.displayName, email: user.email, username: user.username ?? "", phone: user.phone ?? "", jobTitle: user.jobTitle ?? "" };
    initialEditForm.current = values;
    setEditForm(values);
    setProfileError(null);
    setActionError("");
    setMessage("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || busyUserId) return;
    const displayName = editForm.displayName.trim();
    const email = editForm.email.trim();
    const username = editForm.username.trim();
    const phone = editForm.phone.trim();
    setProfileError(null);
    if (!isValidDisplayName(displayName) || isForbiddenDisplayName(displayName)) { setProfileError({ field: "displayName", message: t("admin.invalidDisplayName") }); return; }
    if (!isValidEmail(email)) { setProfileError({ field: "email", message: t("admin.invalidEmail") }); return; }
    if (username && !isValidUsername(username)) { setProfileError({ field: "username", message: t("admin.invalidUsername") }); return; }
    if (phone && !isValidPhone(phone)) { setProfileError({ field: "phone", message: t("admin.invalidPhone") }); return; }
    const updated = await updateUser(editingId, { displayName, email, username: username ? normalizeUsername(username) : null, phone: phone ? normalizePhone(phone) : null, jobTitle: editForm.jobTitle.trim() || null });
    if (updated) setEditingId(null);
  }

  async function beginPasswordEdit(user: AdminUser) {
    if (profileDirty && !(await dialog.confirm(t("redesign.unsavedChanges")))) return;
    setEditingId(null);
    setPasswordEditingId(user.id);
    setPasswordForm({ password: "", confirmation: "" });
    setActionError("");
    setMessage("");
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordEditingId || busyUserId) return;
    const target = users.data?.find((user) => user.id === passwordEditingId);
    if (!target) return;
    if (passwordForm.password !== passwordForm.confirmation) { setActionError(t("admin.passwordMismatch")); return; }
    if (!isStrongPassword(passwordForm.password, { email: target.email, displayName: target.displayName })) { setActionError(t("admin.invalidPassword", { min: PASSWORD_MIN_LENGTH })); return; }
    setBusyUserId(target.id);
    setActionError("");
    setMessage("");
    try {
      await api(`/admin/users/${target.id}/password`, { method: "POST", body: JSON.stringify({ password: passwordForm.password }) });
      users.reload();
      setPasswordEditingId(null);
      setPasswordForm({ password: "", confirmation: "" });
      setMessage(t("admin.passwordUpdated"));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : t("admin.updateFailed"));
    } finally {
      setBusyUserId(null);
    }
  }

  async function updateMembershipRole(membership: AdminMembership, role: string) {
    if (busyUserId || role === membership.role) return;
    setBusyUserId(membership.id);
    setActionError("");
    setMessage("");
    try {
      await api(`/admin/memberships/${membership.id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      users.reload();
      overview.reload();
      setMessage(t("admin.membershipUpdated"));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : t("admin.updateFailed"));
    } finally {
      setBusyUserId(null);
    }
  }

  const loadError = overview.error || users.error || aiUsage.error || memberRequests.error;
  return <section className="page-shell admin-panel-page">
    <div className="admin-hero">
      <span className="admin-hero-mark"><Icon name="shield" size={30}/></span>
      <div className="admin-hero-copy"><div className="eyebrow">{t("admin.eyebrow")}</div><h2>{t("admin.title")}</h2><p>{t("admin.description")}</p></div>
      <div className="admin-hero-actions"><span className="admin-hero-lock"><Icon name="shield" size={15}/> {t("admin.globalOnly")}</span><Link className="ghost button-link" to="/members"><Icon name="members" size={16}/>{t("admin.openOrganizationMembers")}</Link></div>
    </div>
    {loadError && <div className="alert error" role="alert"><Icon name="warning"/>{loadError}</div>}
    {actionError && !editorUser && <div className="alert error" role="alert"><Icon name="warning"/>{actionError}</div>}
    {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    <AdminWorkspaceTabs prefix="global-admin" value={activeTab} onChange={setActiveTab} tabs={[
      { id: "users", label: t("admin.workspaceUsers") },
      { id: "requests", label: t("admin.workspaceRequests"), count: overview.data?.pendingMemberRequests ?? 0 },
      { id: "ai", label: t("admin.workspaceAi") },
      { id: "overview", label: t("admin.workspaceOverview") },
      { id: "support", label: t("admin.workspaceSupport") },
    ]}/>
    <div className="admin-workspace-panel" role="tabpanel" tabIndex={0} id="global-admin-panel-users" aria-labelledby="global-admin-tab-users" hidden={activeTab !== "users"}>
      <SectionCard className="admin-user-control" title={t("admin.userControl")} description={t("admin.userControlDescription")} icon="members">
        <form className="admin-user-toolbar" onSubmit={submitUserSearch}>
          <div className="search-box"><Icon name="search"/><input value={userSearchInput} onChange={(event) => setUserSearchInput(event.target.value)} placeholder={t("admin.searchPlaceholder")} aria-label={t("admin.searchPlaceholder")}/></div>
          <div className="admin-toolbar-actions"><button className="primary" type="submit"><Icon name="search" size={16}/>{t("admin.search")}</button>{userSearch && <button className="ghost" type="button" onClick={resetUserSearch}>{t("admin.reset")}</button>}</div>
        </form>
        <p className="admin-loaded-notice">{t("admin.loadedUsersNotice")}</p>
        {users.loading && !users.data ? <LoadingState/> : users.data?.length ? <div className="admin-user-list">{users.data.map((user) => <article className="admin-user-card" key={user.id}>
          <div className="admin-user-card-heading"><span className="admin-user-avatar" aria-hidden="true">{user.displayName.trim().slice(0, 1)}</span><div className="admin-user-card-identity"><strong>{user.displayName}</strong>{user.username && <small dir="ltr">@{user.username}</small>}<small dir="ltr">{user.email}</small>{user.jobTitle && <small>{user.jobTitle}</small>}</div></div>
          <div className="admin-user-card-badges"><span className="status-badge neutral">{roleLabel(user.globalRole)}</span><span className={`status-badge ${user.active ? "success" : "neutral"}`}>{user.active ? t("admin.active") : t("admin.inactive")}</span>{user.protectedSystemAdmin && <span className="status-badge warning">{t("admin.protectedSystemAdmin")}</span>}</div>
          <div className="admin-user-card-meta"><span><strong>{t("admin.lastLogin")}</strong>{user.lastLoginAt ? formatDate(user.lastLoginAt, true) : t("admin.never")}</span><span><strong>{t("admin.organizationsColumn")}</strong>{user.memberships.length ? user.memberships.map((membership) => <span className="admin-membership-chip" key={membership.id}>{locale === "en" ? membership.organization.nameEn : membership.organization.nameFa}</span>) : <span>{t("admin.noOrganization")}</span>}</span></div>
          <div className="admin-user-card-actions"><button className="ghost" type="button" disabled={busyUserId === user.id} onClick={() => beginEdit(user)}><Icon name="edit" size={16}/>{t("admin.editUser")}</button></div>
        </article>)}</div> : users.error ? null : <EmptyState icon="members" title={t("admin.noUsers")} description={t("admin.noUsersDescription")}/>}
      </SectionCard>
    </div>
    <div className="admin-workspace-panel" role="tabpanel" tabIndex={0} id="global-admin-panel-requests" aria-labelledby="global-admin-tab-requests" hidden={activeTab !== "requests"}>
      <MemberRequestsSection data={memberRequests.data} loading={memberRequests.loading} onChanged={() => { memberRequests.reload(); overview.reload(); users.reload(); }}/>
    </div>
    <div className="admin-workspace-panel" role="tabpanel" tabIndex={0} id="global-admin-panel-ai" aria-labelledby="global-admin-tab-ai" hidden={activeTab !== "ai"}>
      <AIUsageSection data={aiUsage.data} loading={aiUsage.loading} onChanged={aiUsage.reload} search={{ input: aiSearchInput, value: aiSearch, onInput: setAiSearchInput, onSubmit: submitAiSearch, onReset: resetAiSearch }}/>
    </div>
    <div className="admin-workspace-panel" role="tabpanel" tabIndex={0} id="global-admin-panel-overview" aria-labelledby="global-admin-tab-overview" hidden={activeTab !== "overview"}>
      {overview.data ? <>
        <div className="admin-stat-grid">
          <article className="admin-stat-card"><Icon name="members" size={23}/><div><small>{t("admin.totalUsers")}</small><strong>{overview.data.users.total.toLocaleString(numberLocale)}</strong></div></article>
          <article className="admin-stat-card"><Icon name="check" size={23}/><div><small>{t("admin.activeUsers")}</small><strong>{overview.data.users.active.toLocaleString(numberLocale)}</strong></div></article>
          <article className="admin-stat-card"><Icon name="dashboard" size={23}/><div><small>{t("admin.organizations")}</small><strong>{overview.data.organizations.total.toLocaleString(numberLocale)}</strong></div></article>
          <article className="admin-stat-card"><Icon name="shield" size={23}/><div><small>{t("admin.superAdmins")}</small><strong>{overview.data.users.superAdmins.toLocaleString(numberLocale)}</strong></div></article>
        </div>
        <div className="admin-overview-grid">
          <SectionCard title={t("admin.recentUsers")} description={t("admin.recentUsersDescription")} icon="clock">
            <div className="admin-recent-list">{overview.data.recentUsers.length ? overview.data.recentUsers.map((user) => <div className="admin-recent-row" key={user.id}><span className="admin-recent-avatar">{user.displayName.charAt(0)}</span><div><strong>{user.displayName}</strong><small dir="ltr">{user.username ? `${user.username} · ` : ""}{user.email}</small></div><span className={`status-badge ${user.active ? "success" : "neutral"}`}>{user.active ? t("admin.active") : t("admin.inactive")}</span></div>) : <EmptyState icon="members" title={t("admin.noUsers")}/>}</div>
          </SectionCard>
          <SectionCard title={t("admin.systemSummary")} description={t("admin.systemSummaryDescription")} icon="activity">
            <div className="admin-summary-list"><div><span>{t("admin.activeMemberships")}</span><strong>{overview.data.activeMemberships.toLocaleString(numberLocale)}</strong></div><div><span>{t("admin.pendingInvitations")}</span><strong>{overview.data.pendingInvitations.toLocaleString(numberLocale)}</strong></div><div><span>{t("admin.inactiveUsers")}</span><strong>{overview.data.users.inactive.toLocaleString(numberLocale)}</strong></div><div><span>{t("admin.activeOrganizations")}</span><strong>{overview.data.organizations.active.toLocaleString(numberLocale)}</strong></div></div>
          </SectionCard>
        </div>
      </> : overview.loading ? <LoadingState/> : null}
    </div>
    <div className="admin-workspace-panel" role="tabpanel" tabIndex={0} id="global-admin-panel-support" aria-labelledby="global-admin-tab-support" hidden={activeTab !== "support"}>
      <SectionCard title={t("support.inboxTitle")} description={t("support.inboxDescription")} icon="assistant"><SupportInboxSection/></SectionCard>
    </div>
    {editorUser && <div className="admin-user-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeUserEditor(); }}>
      <section ref={userEditorRef} className="admin-user-editor" role="dialog" tabIndex={-1} aria-modal="true" aria-busy={Boolean(busyUserId)} aria-labelledby="admin-user-editor-title" aria-describedby="admin-user-editor-description">
        <header className="admin-user-editor-heading"><div><div className="eyebrow">{t("admin.userControl")}</div><h2 id="admin-user-editor-title">{editorUser.displayName}</h2><p id="admin-user-editor-description" dir="ltr">{editorUser.email}</p></div><button className="icon-button" type="button" aria-label={t("common.cancel")} onClick={closeUserEditor}>×</button></header>
        {actionError && <div className="alert error" role="alert"><Icon name="warning"/>{actionError}</div>}
        {editorUser.protectedSystemAdmin ? <p className="field-hint">{t("admin.protectedAccountHint")}</p> : editorUser.id === currentUserId && <p className="field-hint">{t("admin.selfAccountHint")} <Link to="/profile">{t("nav.profile")}</Link></p>}
        {passwordEditingId === editorUser.id ? <form className="form-grid admin-password-editor" onSubmit={savePassword}>
          <div className="admin-password-intro"><strong>{t("admin.setPassword")}</strong><small>{t("admin.setPasswordDescription")}</small><small>{t("admin.passwordNeverShown")}</small></div>
          <label>{t("admin.newPassword")}<input type="password" value={passwordForm.password} onChange={(event) => setPasswordForm((value) => ({ ...value, password: event.target.value }))} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label>
          <label>{t("admin.confirmPassword")}<input type="password" value={passwordForm.confirmation} onChange={(event) => setPasswordForm((value) => ({ ...value, confirmation: event.target.value }))} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label>
          <div className="admin-edit-actions"><button className="primary" type="submit" disabled={busyUserId === editorUser.id}><Icon name="check" size={16}/>{t("common.save")}</button><button className="ghost" type="button" onClick={() => beginEdit(editorUser)}>{t("common.cancel")}</button></div>
        </form> : <>
          <div className="admin-user-access">
            <label>{t("admin.level")}<StyledSelect className="admin-role-select" value={editorUser.globalRole} disabled={busyUserId === editorUser.id || editorUser.id === currentUserId || editorUser.protectedSystemAdmin} onChange={(event) => void changeRole(editorUser, event.target.value as UserRole)} aria-label={`${t("admin.changeLevel")}: ${editorUser.displayName}`}><option value="USER">{t("admin.standardUser")}</option><option value="SUPER_ADMIN">{t("admin.superAdmin")}</option></StyledSelect></label>
            <div className="admin-user-status-control"><span>{t("admin.status")}</span><button type="button" className={`status-toggle ${editorUser.active ? "active" : "inactive"}`} disabled={busyUserId === editorUser.id || Boolean(editorUser.protectedSystemAdmin) || (editorUser.id === currentUserId && editorUser.active)} onClick={() => void toggleActive(editorUser)}><span/>{editorUser.active ? t("admin.active") : t("admin.activate")}</button></div>
          </div>
          <div className="admin-user-membership-editor"><h3>{t("admin.organizationsColumn")}</h3>{editorUser.memberships.length ? editorUser.memberships.map((membership) => { const organizationMemberRoles = ["HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "VIEWER"]; const roleIsAssignable = organizationMemberRoles.includes(membership.role); return <div className="admin-user-membership-row" key={membership.id}><div><strong>{locale === "en" ? membership.organization.nameEn : membership.organization.nameFa}</strong><small>{membership.active ? t("admin.active") : t("admin.inactive")}</small></div>{roleIsAssignable ? <StyledSelect className="admin-role-select" value={membership.role} disabled={busyUserId === membership.id} onChange={(event) => void updateMembershipRole(membership, event.target.value)} aria-label={`${t("members.role")}: ${locale === "en" ? membership.organization.nameEn : membership.organization.nameFa}`}>{organizationMemberRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</StyledSelect> : <span className="status-badge neutral member-legacy-role">{roleLabel(membership.role)}</span>}</div>; }) : <p className="muted">{t("admin.noOrganization")}</p>}</div>
          <form className="form-grid admin-edit-form admin-profile-editor" onSubmit={saveProfile}>
            <label>{t("profile.displayName")}<input value={editForm.displayName} onChange={(event) => changeProfileField("displayName", event.target.value)} aria-invalid={profileError?.field === "displayName" || undefined} aria-describedby={profileError?.field === "displayName" ? "admin-error-displayName" : undefined} required/>{profileError?.field === "displayName" && <span id="admin-error-displayName" className="field-error" role="alert">{profileError.message}</span>}</label>
            <label>{t("admin.username")}<input value={editForm.username} onChange={(event) => changeProfileField("username", normalizeUsername(event.target.value))} aria-invalid={profileError?.field === "username" || undefined} aria-describedby={profileError?.field === "username" ? "admin-error-username" : undefined} dir="ltr" autoComplete="username" maxLength={64}/>{profileError?.field === "username" && <span id="admin-error-username" className="field-error" role="alert">{profileError.message}</span>}</label>
            <label>{t("auth.email")}<input value={editForm.email} onChange={(event) => changeProfileField("email", event.target.value)} aria-invalid={profileError?.field === "email" || undefined} aria-describedby={profileError?.field === "email" ? "admin-error-email" : undefined} type="email" dir="ltr" required/>{profileError?.field === "email" && <span id="admin-error-email" className="field-error" role="alert">{profileError.message}</span>}</label>
            <label>{t("profile.phone")}<input value={editForm.phone} onChange={(event) => changeProfileField("phone", normalizePhone(event.target.value))} aria-invalid={profileError?.field === "phone" || undefined} aria-describedby={profileError?.field === "phone" ? "admin-error-phone" : undefined} inputMode="numeric" dir="ltr" maxLength={11}/>{profileError?.field === "phone" && <span id="admin-error-phone" className="field-error" role="alert">{profileError.message}</span>}</label>
            <label>{t("profile.jobTitle")}<input value={editForm.jobTitle} onChange={(event) => changeProfileField("jobTitle", event.target.value)}/></label>
            <div className="admin-edit-actions"><button className="primary" type="submit" disabled={busyUserId === editorUser.id}><Icon name="check" size={16}/>{t("admin.saveUser")}</button><button className="ghost" type="button" onClick={closeUserEditor}>{t("common.cancel")}</button></div>
          </form>
          <div className="admin-password-link"><button className="ghost" type="button" disabled={busyUserId === editorUser.id || editorUser.id === currentUserId} onClick={() => beginPasswordEdit(editorUser)}>{t("admin.setPassword")}</button><span>{t("admin.setPasswordDescription")}</span></div>
        </>}
      </section>
    </div>}
  </section>;
}

const organizationRoles = ["HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "VIEWER"];
const organizationAssignableRoles = organizationRoles;

export function OrganizationAdminPanelPage() {
  const { locale, t } = useI18n();
  const state = useLoad<OrganizationMember[]>("/members");
  const aiUsage = useLoad<AdminAIUsage>("/admin/ai-usage?limit=100");
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState<OrganizationAdminTab>("members");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const memberEditorRef = useRef<HTMLElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const members = state.data ?? [];
  const activeMembers = members.filter((member) => member.active).length;
  const organizationAdmins = members.filter((member) => member.active && member.role === "ORG_ADMIN").length;
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const editorMember = members.find((member) => member.id === editingMemberId);
  useModalFocus(memberEditorRef, Boolean(editorMember), () => { if (!busyId) setEditingMemberId(null); });

  async function updateMember(member: OrganizationMember, patch: { role?: string; active?: boolean }) {
    if (busyId) return;
    setBusyId(member.id);
    setError("");
    setMessage("");
    try {
      await api(`/members/${member.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      state.reload();
      setMessage(t("admin.userUpdated"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("admin.updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleMember(member: OrganizationMember) {
    if (member.active && !(await dialog.confirm(t("admin.organizationDeactivateConfirm", { name: member.user.displayName })))) return;
    await updateMember(member, { active: !member.active });
  }

  return <section className="page-shell admin-panel-page">
    <div className="admin-hero">
      <span className="admin-hero-mark"><Icon name="shield" size={30}/></span>
      <div className="admin-hero-copy"><div className="eyebrow">{t("admin.organizationEyebrow")}</div><h2>{t("admin.organizationTitle")}</h2><p>{t("admin.organizationDescription")}</p></div>
      <div className="admin-hero-actions"><span className="admin-hero-lock"><Icon name="shield" size={15}/> {t("admin.organizationOnly")}</span><Link className="ghost button-link" to="/members"><Icon name="members" size={16}/>{t("admin.openOrganizationMembers")}</Link></div>
    </div>
    {state.error && <div className="alert error" role="alert"><Icon name="warning"/>{state.error}</div>}
    {aiUsage.error && <div className="alert error" role="alert"><Icon name="warning"/>{aiUsage.error}</div>}
    {error && !editorMember && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    <AdminWorkspaceTabs prefix="organization-admin" value={activeTab} onChange={setActiveTab} tabs={[
      { id: "members", label: t("admin.workspaceMembers") },
      { id: "ai", label: t("admin.workspaceAi") },
    ]}/>
    <div className="admin-workspace-panel" role="tabpanel" tabIndex={0} id="organization-admin-panel-members" aria-labelledby="organization-admin-tab-members" hidden={activeTab !== "members"}>
      {state.loading && !state.data ? <LoadingState/> : <>
        <div className="admin-stat-grid">
          <article className="admin-stat-card"><Icon name="members" size={23}/><div><small>{t("admin.organizationUsers")}</small><strong>{members.length.toLocaleString(numberLocale)}</strong></div></article>
          <article className="admin-stat-card"><Icon name="check" size={23}/><div><small>{t("admin.activeUsers")}</small><strong>{activeMembers.toLocaleString(numberLocale)}</strong></div></article>
          <article className="admin-stat-card"><Icon name="shield" size={23}/><div><small>{t("admin.organizationAdmins")}</small><strong>{organizationAdmins.toLocaleString(numberLocale)}</strong></div></article>
          <article className="admin-stat-card"><Icon name="warning" size={23}/><div><small>{t("admin.inactiveUsers")}</small><strong>{(members.length - activeMembers).toLocaleString(numberLocale)}</strong></div></article>
        </div>
        <SectionCard className="admin-user-control" title={t("admin.organizationUserControl")} description={t("admin.organizationUserControlDescription")} icon="members">
          {members.length ? <div className="admin-user-list organization-member-list">{members.map((member) => {
            return <article className="admin-user-card organization-member-card" key={member.id}>
              <div className="admin-user-card-heading"><span className="admin-user-avatar" aria-hidden="true">{member.user.displayName.trim().slice(0, 1)}</span><div className="admin-user-card-identity"><strong>{member.user.displayName}</strong>{member.user.username && <small dir="ltr">@{member.user.username}</small>}<small dir="ltr">{member.user.email}</small>{member.user.jobTitle && <small>{member.user.jobTitle}</small>}{member.user.active === false && <span className="admin-account-warning">{t("admin.accountInactive")}</span>}</div></div>
              <div className="admin-user-card-badges"><span className="status-badge neutral">{roleLabel(member.role)}</span><span className={`status-badge ${member.active ? "success" : "neutral"}`}>{member.active ? t("admin.active") : t("admin.inactive")}</span></div>
              <div className="admin-user-card-actions organization-member-actions">
                <button className="ghost" type="button" onClick={() => { setError(""); setEditingMemberId(member.id); }}><Icon name="edit" size={16}/>{t("members.accessDetails")}</button>
              </div>
            </article>;
          })}</div> : <EmptyState icon="members" title={t("members.noMembers")}/>}
        </SectionCard>
      </>}
    </div>
    <div className="admin-workspace-panel" role="tabpanel" tabIndex={0} id="organization-admin-panel-ai" aria-labelledby="organization-admin-tab-ai" hidden={activeTab !== "ai"}>
      <AIUsageSection data={aiUsage.data} loading={aiUsage.loading} onChanged={aiUsage.reload}/>
    </div>
    {editorMember && <div className="admin-user-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyId) setEditingMemberId(null); }}>
      <section ref={memberEditorRef} className="admin-user-editor" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="organization-member-editor-title" aria-busy={Boolean(busyId)}>
        <header className="admin-user-editor-heading"><div><h2 id="organization-member-editor-title">{editorMember.user.displayName}</h2><p dir="ltr">{editorMember.user.email}</p></div><button className="icon-button" type="button" disabled={Boolean(busyId)} aria-label={t("common.cancel")} onClick={() => setEditingMemberId(null)}>×</button></header>
        {error && <div className="alert error" role="alert">{error}</div>}
        <div className="admin-user-access">
          {organizationAssignableRoles.includes(editorMember.role) ? <label>{t("members.role")}<StyledSelect className="admin-role-select" value={editorMember.role} disabled={Boolean(busyId)} onChange={(event) => void updateMember(editorMember, { role: event.target.value })} aria-label={`${t("members.role")}: ${editorMember.user.displayName}`}>{organizationAssignableRoles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</StyledSelect></label> : <span className="status-badge neutral member-legacy-role">{roleLabel(editorMember.role)}</span>}
          <button type="button" className={`status-toggle ${editorMember.active ? "active" : "inactive"}`} disabled={Boolean(busyId)} onClick={() => void toggleMember(editorMember)}><span/>{editorMember.active ? t("admin.active") : t("admin.activate")}</button>
        </div>
        <Link className="ghost button-link" to="/members">{t("admin.openOrganizationMembers")}</Link>
      </section>
    </div>}
  </section>;
}

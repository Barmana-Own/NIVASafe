import { Fragment, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { isForbiddenDisplayName, isStrongPassword, isValidDisplayName, isValidEmail, isValidPhone, isValidUsername, normalizePhone, normalizeUsername, PASSWORD_MIN_LENGTH } from "@nivasafe/domain";
import { api, getSession, useLoad } from "../../api/client";
import { EmptyState, Icon, SectionCard, StyledSelect, roleLabel, useDialog, formatDate } from "../../components/UI";
import { useI18n } from "../../i18n";

type UserRole = "USER" | "SUPER_ADMIN";
type AdminMembership = { id: string; role: string; active: boolean; organization: { id: string; nameFa: string; nameEn: string; active: boolean } };
type AdminUser = { id: string; email: string; username: string | null; displayName: string; active: boolean; globalRole: UserRole; lastLoginAt: string | null; jobTitle: string | null; phone: string | null; createdAt: string; memberships: AdminMembership[] };
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
type AdminMemberRequest = { id: string; username: string; email: string; displayName: string; phone: string | null; jobTitle: string | null; role: string; status: string; rejectionReason: string | null; createdAt: string; reviewedAt: string | null; organization: { id: string; nameFa: string; nameEn: string; active: boolean }; requestedBy: { id: string; displayName: string; email: string; username: string | null } };
type AdminAIUsageRow = { userId: string; displayName: string; username: string | null; email: string; active: boolean; requestCount: number; inputTokens: number; outputTokens: number; totalTokens: number };
type AdminAIUsage = { users: AdminAIUsageRow[]; totals: Pick<AdminAIUsageRow, "requestCount" | "inputTokens" | "outputTokens" | "totalTokens"> };

function LoadingState() {
  return <div className="state compact"><div className="spinner"/></div>;
}

function AIUsageSection({ data, loading }: { data: AdminAIUsage | null; loading: boolean }) {
  const { locale, t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  return <SectionCard className="admin-ai-usage" title={t("admin.aiUsageTitle")} description={t("admin.aiUsageDescription")} icon="activity">
    {loading && !data ? <LoadingState/> : data ? <>
      <div className="admin-ai-usage-summary">
        <article><small>{t("admin.aiUsageTotalTokens")}</small><strong className="admin-token-number" dir="ltr">{data.totals.totalTokens.toLocaleString(numberLocale)}</strong></article>
        <article><small>{t("admin.aiUsageRequests")}</small><strong className="admin-token-number" dir="ltr">{data.totals.requestCount.toLocaleString(numberLocale)}</strong></article>
        <article><small>{t("admin.aiUsageInputTokens")}</small><strong className="admin-token-number" dir="ltr">{data.totals.inputTokens.toLocaleString(numberLocale)}</strong></article>
        <article><small>{t("admin.aiUsageOutputTokens")}</small><strong className="admin-token-number" dir="ltr">{data.totals.outputTokens.toLocaleString(numberLocale)}</strong></article>
      </div>
      {data.users.length ? <div className="table-wrap admin-ai-usage-table"><table><thead><tr><th>{t("admin.aiUsageUser")}</th><th>{t("admin.aiUsageRequests")}</th><th>{t("admin.aiUsageInputTokens")}</th><th>{t("admin.aiUsageOutputTokens")}</th><th>{t("admin.aiUsageTotalTokens")}</th></tr></thead><tbody>{data.users.map((user) => <tr key={user.userId}><td><div className="admin-user-identity"><strong>{user.displayName}</strong>{user.username && <small dir="ltr">@{user.username}</small>}<small dir="ltr">{user.email}</small>{!user.active && <span className="admin-account-warning">{t("admin.inactive")}</span>}</div></td><td className="admin-token-number" dir="ltr">{user.requestCount.toLocaleString(numberLocale)}</td><td className="admin-token-number" dir="ltr">{user.inputTokens.toLocaleString(numberLocale)}</td><td className="admin-token-number" dir="ltr">{user.outputTokens.toLocaleString(numberLocale)}</td><td className="admin-token-number" dir="ltr"><strong>{user.totalTokens.toLocaleString(numberLocale)}</strong></td></tr>)}</tbody></table></div> : <EmptyState icon="activity" title={t("admin.aiUsageNoData")} description={t("admin.aiUsageNoDataDescription")}/>}
    </> : null}
  </SectionCard>;
}

function MemberRequestsSection({ data, loading, onChanged }: { data: AdminMemberRequest[] | null; loading: boolean; onChanged: () => void }) {
  const { locale, t } = useI18n();
  const dialog = useDialog();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function openApproval(request: AdminMemberRequest) {
    setActiveId(request.id);
    setPassword("");
    setConfirmation("");
    setError("");
    setMessage("");
  }

  async function approve(request: AdminMemberRequest, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) { setError(t("admin.passwordMismatch")); return; }
    if (!isStrongPassword(password, { email: request.email, displayName: request.displayName })) { setError(t("admin.invalidPassword", { min: PASSWORD_MIN_LENGTH })); return; }
    setError("");
    setMessage("");
    try {
      const result = await api<{ credentialsReady: boolean; user: { username: string } }>(`/admin/member-requests/${request.id}/approve`, { method: "POST", body: JSON.stringify({ password }) });
      setActiveId(null);
      setPassword("");
      setConfirmation("");
      setMessage(t("admin.credentialsReady", { username: result.data.user.username }));
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("admin.updateFailed"));
    }
  }

  async function reject(request: AdminMemberRequest) {
    if (!(await dialog.confirm(t("admin.rejectMemberRequest") + `: ${request.displayName}?`))) return;
    setError("");
    setMessage("");
    try {
      await api(`/admin/member-requests/${request.id}/reject`, { method: "POST", body: JSON.stringify({}) });
      setMessage(t("admin.requestRejected"));
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("admin.updateFailed"));
    }
  }

  return <SectionCard className="admin-member-requests" title={t("admin.memberRequestsTitle")} description={t("admin.memberRequestsDescription")} icon="members">
    {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    {loading && !data ? <LoadingState/> : data?.length ? <div className="admin-request-list">{data.map((request) => <article className="admin-request-card" key={request.id}>
      <div className="admin-request-copy"><strong>{request.displayName}</strong><small dir="ltr">{request.username} · {request.email}</small>{request.jobTitle && <small>{request.jobTitle}</small>}<small>{t("admin.requestedForOrganization")}: {locale === "en" ? request.organization.nameEn : request.organization.nameFa}</small><small>{t("admin.requestedBy")}: {request.requestedBy.displayName} · {formatDate(request.createdAt, true)}</small></div>
      <div className="admin-request-role"><span className="status-badge neutral">{roleLabel(request.role)}</span><span className="status-badge warning">{t("admin.pendingApproval")}</span></div>
      {activeId === request.id ? <form className="admin-request-approval form-grid" onSubmit={(event) => void approve(request, event)}><p className="field-hint full">{t("admin.approveMemberRequestDescription")}</p><label>{t("admin.initialPassword")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label><label>{t("admin.initialPasswordConfirm")}<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label><div className="admin-edit-actions full"><button className="primary" type="submit"><Icon name="check" size={16}/>{t("admin.approveMemberRequest")}</button><button className="ghost" type="button" onClick={() => setActiveId(null)}>{t("common.cancel")}</button></div></form> : <div className="admin-request-actions"><button className="primary" type="button" onClick={() => openApproval(request)}>{t("admin.approveMemberRequest")}</button><button className="ghost danger-link" type="button" onClick={() => void reject(request)}>{t("admin.rejectMemberRequest")}</button></div>}
    </article>)}</div> : <EmptyState icon="members" title={t("admin.noPendingMemberRequests")}/>}
  </SectionCard>;
}

export function AdminPanelPage() {
  const { locale, t } = useI18n();
  const { session } = getSession();
  const dialog = useDialog();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UserEdit>({ displayName: "", email: "", username: "", phone: "", jobTitle: "" });
  const [passwordEditingId, setPasswordEditingId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordEdit>({ password: "", confirmation: "" });
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const overview = useLoad<AdminOverview>("/admin/overview");
  const memberRequests = useLoad<AdminMemberRequest[]>("/admin/member-requests?status=PENDING");
  const usersPath = `/admin/users?limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  const users = useLoad<AdminUser[]>(usersPath);
  const aiUsagePath = `/admin/ai-usage?limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  const aiUsage = useLoad<AdminAIUsage>(aiUsagePath);
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const currentUserId = session?.user.id;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  function resetSearch() {
    setSearchInput("");
    setSearch("");
  }

  async function updateUser(id: string, patch: UserPatch): Promise<boolean> {
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
    if (nextRole === user.globalRole || user.id === currentUserId) return;
    const key = nextRole === "SUPER_ADMIN" ? "admin.promoteConfirm" : "admin.demoteConfirm";
    if (!(await dialog.confirm(t(key, { name: user.displayName })))) return;
    await updateUser(user.id, { globalRole: nextRole });
  }

  async function toggleActive(user: AdminUser) {
    if (user.id === currentUserId && user.active) return;
    if (user.active && !(await dialog.confirm(t("admin.deactivateConfirm", { name: user.displayName })))) return;
    await updateUser(user.id, { active: !user.active });
  }

  function beginEdit(user: AdminUser) {
    setEditingId(user.id);
    setEditForm({ displayName: user.displayName, email: user.email, username: user.username ?? "", phone: user.phone ?? "", jobTitle: user.jobTitle ?? "" });
    setActionError("");
    setMessage("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    const displayName = editForm.displayName.trim();
    const email = editForm.email.trim();
    const username = editForm.username.trim();
    const phone = editForm.phone.trim();
    if (!isValidDisplayName(displayName) || isForbiddenDisplayName(displayName)) { setActionError(t("admin.invalidDisplayName")); return; }
    if (!isValidEmail(email)) { setActionError(t("admin.invalidEmail")); return; }
    if (username && !isValidUsername(username)) { setActionError(t("admin.invalidUsername")); return; }
    if (phone && !isValidPhone(phone)) { setActionError(t("admin.invalidPhone")); return; }
    const updated = await updateUser(editingId, { displayName, email, username: username ? normalizeUsername(username) : null, phone: phone ? normalizePhone(phone) : null, jobTitle: editForm.jobTitle.trim() || null });
    if (updated) setEditingId(null);
  }

  function beginPasswordEdit(user: AdminUser) {
    setPasswordEditingId(user.id);
    setPasswordForm({ password: "", confirmation: "" });
    setActionError("");
    setMessage("");
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordEditingId) return;
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
    if (role === membership.role) return;
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
      <div className="admin-hero-actions"><span className="admin-hero-lock"><Icon name="shield" size={15}/> {t("admin.globalOnly")}</span><Link className="ghost button-link" to="/members"><Icon name="members" size={16}/> {t("admin.openOrganizationMembers")}</Link></div>
    </div>
    {loadError && <div className="alert error" role="alert"><Icon name="warning"/>{loadError}</div>}
    {actionError && <div className="alert error" role="alert"><Icon name="warning"/>{actionError}</div>}
    {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
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
    <MemberRequestsSection data={memberRequests.data} loading={memberRequests.loading} onChanged={() => { memberRequests.reload(); overview.reload(); users.reload(); }}/>
    <AIUsageSection data={aiUsage.data} loading={aiUsage.loading}/>
    <SectionCard className="admin-user-control" title={t("admin.userControl")} description={t("admin.userControlDescription")} icon="members">
      <form className="admin-user-toolbar" onSubmit={submitSearch}>
        <div className="search-box"><Icon name="search"/><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t("admin.searchPlaceholder")} aria-label={t("admin.searchPlaceholder")}/></div>
        <div className="admin-toolbar-actions"><button className="primary" type="submit"><Icon name="search" size={16}/>{t("admin.search")}</button>{search && <button className="ghost" type="button" onClick={resetSearch}>{t("admin.reset")}</button>}</div>
      </form>
      {users.loading && !users.data ? <LoadingState/> : users.data?.length ? <div className="table-wrap admin-user-table"><table><thead><tr><th>{t("admin.user")}</th><th>{t("admin.level")}</th><th>{t("admin.status")}</th><th>{t("admin.organizationsColumn")}</th><th>{t("admin.lastLogin")}</th><th>{t("admin.actions")}</th></tr></thead><tbody>{users.data.map((user) => { const isSelf = user.id === currentUserId; const busy = busyUserId === user.id; return <Fragment key={user.id}>
        <tr>
          <td><div className="admin-user-identity"><strong>{user.displayName}</strong>{user.username && <small dir="ltr">@{user.username}</small>}<small dir="ltr">{user.email}</small>{user.jobTitle && <small>{user.jobTitle}</small>}</div></td>
          <td><StyledSelect className="admin-role-select" value={user.globalRole} disabled={busy || isSelf} onChange={(event) => void changeRole(user, event.target.value as UserRole)} aria-label={`${t("admin.changeLevel")}: ${user.displayName}`}><option value="USER">{t("admin.standardUser")}</option><option value="SUPER_ADMIN">{t("admin.superAdmin")}</option></StyledSelect></td>
          <td><button type="button" className={`status-toggle ${user.active ? "active" : "inactive"}`} disabled={busy || (isSelf && user.active)} onClick={() => void toggleActive(user)}><span/>{user.active ? t("admin.active") : t("admin.activate")}</button></td>
          <td><div className="admin-memberships">{user.memberships.length ? user.memberships.map((membership) => { const organizationMemberRoles = ["ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "VIEWER", "ASSISTANT", "ASSESSOR"]; const roleOptions = membership.role === "SUPER_ADMIN" ? ["SUPER_ADMIN", ...organizationMemberRoles] : organizationMemberRoles; return <div className="admin-membership-entry" key={membership.id}><span className={`admin-membership-chip ${membership.active ? "" : "inactive"}`}>{locale === "en" ? membership.organization.nameEn : membership.organization.nameFa}</span><StyledSelect className="admin-role-select" value={membership.role} disabled={busyUserId === membership.id} onChange={(event) => void updateMembershipRole(membership, event.target.value)} aria-label={`${t("members.role")}: ${membership.organization.nameFa}`}>{roleOptions.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</StyledSelect></div>; }) : <span className="muted">{t("admin.noOrganization")}</span>}</div></td>
          <td>{user.lastLoginAt ? formatDate(user.lastLoginAt, true) : t("admin.never")}</td>
           <td><div className="admin-user-actions"><button type="button" className="ghost" aria-expanded={editingId === user.id} aria-controls={`admin-user-edit-${user.id}`} data-scroll-target={`#admin-user-edit-${user.id}`} data-scroll-focus="input" disabled={busy} onClick={() => beginEdit(user)}>{t("admin.editUser")}</button><button type="button" className="ghost" aria-expanded={passwordEditingId === user.id} aria-controls={`admin-user-password-${user.id}`} data-scroll-target={`#admin-user-password-${user.id}`} data-scroll-focus="input" disabled={busy || isSelf} onClick={() => beginPasswordEdit(user)}>{t("admin.setPassword")}</button></div></td>
        </tr>
         {editingId === user.id && <tr id={`admin-user-edit-${user.id}`} className="admin-edit-row"><td colSpan={6}><form className="form-grid admin-edit-form" onSubmit={saveProfile}><label>{t("profile.displayName")}<input value={editForm.displayName} onChange={(event) => setEditForm((value) => ({ ...value, displayName: event.target.value }))} required/></label><label>{t("admin.username")}<input value={editForm.username} onChange={(event) => setEditForm((value) => ({ ...value, username: normalizeUsername(event.target.value) }))} dir="ltr" autoComplete="username" maxLength={64}/></label><label>{t("auth.email")}<input value={editForm.email} onChange={(event) => setEditForm((value) => ({ ...value, email: event.target.value }))} type="email" dir="ltr" required/></label><label>{t("profile.phone")}<input value={editForm.phone} onChange={(event) => setEditForm((value) => ({ ...value, phone: normalizePhone(event.target.value) }))} inputMode="numeric" dir="ltr" maxLength={11}/></label><label>{t("profile.jobTitle")}<input value={editForm.jobTitle} onChange={(event) => setEditForm((value) => ({ ...value, jobTitle: event.target.value }))}/></label><div className="admin-edit-actions"><button className="primary" type="submit" disabled={busy}><Icon name="check" size={16}/>{t("admin.saveUser")}</button><button className="ghost" type="button" onClick={() => setEditingId(null)}>{t("common.cancel")}</button></div></form></td></tr>}
         {passwordEditingId === user.id && <tr id={`admin-user-password-${user.id}`} className="admin-edit-row admin-password-row"><td colSpan={6}><form className="form-grid admin-edit-form" onSubmit={savePassword}><div className="admin-password-intro"><strong>{t("admin.setPassword")}</strong><small>{t("admin.setPasswordDescription")}</small><small>{t("admin.passwordNeverShown")}</small></div><label>{t("admin.newPassword")}<input type="password" value={passwordForm.password} onChange={(event) => setPasswordForm((value) => ({ ...value, password: event.target.value }))} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label><label>{t("admin.confirmPassword")}<input type="password" value={passwordForm.confirmation} onChange={(event) => setPasswordForm((value) => ({ ...value, confirmation: event.target.value }))} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={128} required/></label><div className="admin-edit-actions"><button className="primary" type="submit" disabled={busy}><Icon name="check" size={16}/>{t("common.save")}</button><button className="ghost" type="button" onClick={() => { setPasswordEditingId(null); setPasswordForm({ password: "", confirmation: "" }); }}>{t("common.cancel")}</button></div></form></td></tr>}
      </Fragment>; })}</tbody></table></div> : users.error ? null : <EmptyState icon="members" title={t("admin.noUsers")} description={t("admin.noUsersDescription")}/>}
    </SectionCard>
  </section>;
}

const organizationRoles = ["ORG_ADMIN", "HSE_MANAGER", "HSE_SPECIALIST", "HSE_OFFICER", "EXTERNAL_AUDITOR", "PERSONNEL", "VIEWER"];
const organizationAssignableRoles = [...organizationRoles, "ASSISTANT", "ASSESSOR"];

export function OrganizationAdminPanelPage() {
  const { locale, t } = useI18n();
  const state = useLoad<OrganizationMember[]>("/members");
  const aiUsage = useLoad<AdminAIUsage>("/admin/ai-usage?limit=100");
  const dialog = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const members = state.data ?? [];
  const activeMembers = members.filter((member) => member.active).length;
  const organizationAdmins = members.filter((member) => member.active && member.role === "ORG_ADMIN").length;
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";

  async function updateMember(member: OrganizationMember, patch: { role?: string; active?: boolean }) {
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
      <div className="admin-hero-actions"><span className="admin-hero-lock"><Icon name="shield" size={15}/> {t("admin.organizationOnly")}</span><Link className="ghost button-link" to="/members"><Icon name="members" size={16}/> {t("admin.openOrganizationMembers")}</Link></div>
    </div>
    {state.error && <div className="alert error" role="alert"><Icon name="warning"/>{state.error}</div>}
    {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    {aiUsage.error && <div className="alert error" role="alert"><Icon name="warning"/>{aiUsage.error}</div>}
    {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    {state.loading && !state.data ? <LoadingState/> : <>
      <div className="admin-stat-grid">
        <article className="admin-stat-card"><Icon name="members" size={23}/><div><small>{t("admin.organizationUsers")}</small><strong>{members.length.toLocaleString(numberLocale)}</strong></div></article>
        <article className="admin-stat-card"><Icon name="check" size={23}/><div><small>{t("admin.activeUsers")}</small><strong>{activeMembers.toLocaleString(numberLocale)}</strong></div></article>
        <article className="admin-stat-card"><Icon name="shield" size={23}/><div><small>{t("admin.organizationAdmins")}</small><strong>{organizationAdmins.toLocaleString(numberLocale)}</strong></div></article>
        <article className="admin-stat-card"><Icon name="warning" size={23}/><div><small>{t("admin.inactiveUsers")}</small><strong>{(members.length - activeMembers).toLocaleString(numberLocale)}</strong></div></article>
      </div>
      <AIUsageSection data={aiUsage.data} loading={aiUsage.loading}/>
      <SectionCard title={t("admin.organizationUserControl")} description={t("admin.organizationUserControlDescription")} icon="members">
        {members.length ? <div className="table-wrap admin-user-table"><table><thead><tr><th>{t("admin.user")}</th><th>{t("members.role")}</th><th>{t("admin.status")}</th><th>{t("admin.actions")}</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><div className="admin-user-identity"><strong>{member.user.displayName}</strong>{member.user.username && <small dir="ltr">@{member.user.username}</small>}<small dir="ltr">{member.user.email}</small>{member.user.jobTitle && <small>{member.user.jobTitle}</small>}{member.user.active === false && <span className="admin-account-warning">{t("admin.accountInactive")}</span>}</div></td><td><StyledSelect className="admin-role-select" value={member.role} disabled={busyId === member.id} onChange={(event) => void updateMember(member, { role: event.target.value })} aria-label={`${t("members.role")}: ${member.user.displayName}`}>{(organizationAssignableRoles.includes(member.role) ? organizationAssignableRoles : [member.role, ...organizationAssignableRoles]).map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</StyledSelect></td><td><button type="button" className={`status-toggle ${member.active ? "active" : "inactive"}`} disabled={busyId === member.id} onClick={() => void toggleMember(member)}><span/>{member.active ? t("admin.active") : t("admin.activate")}</button></td><td><Link className="ghost button-link admin-manage-link" to="/members">{t("admin.editUser")}</Link></td></tr>)}</tbody></table></div> : <EmptyState icon="members" title={t("members.noMembers")}/>}
      </SectionCard>
    </>}
  </section>;
}

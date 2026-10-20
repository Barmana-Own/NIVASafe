import { useState, type FormEvent } from "react";
import { api, getCurrentRole, useLoad } from "../../api/client";
import { Icon, PageHeader, SectionCard, StyledSelect, formatDate } from "../../components/UI";
import { LoadState } from "../../components/LoadState";
import { useI18n } from "../../i18n";

type IncidentKind = "INCIDENT" | "NEAR_MISS";
type IncidentStatus = "REPORTED" | "UNDER_REVIEW" | "CLOSED";
type IncidentReport = {
  id: string;
  kind: IncidentKind;
  occurredAt: string;
  location: string;
  summary: string;
  description: string;
  status: IncidentStatus;
  createdAt: string;
  reporter?: { id: string; displayName: string };
  project?: { id: string; name: string } | null;
};

const statusLabel: Record<IncidentStatus, string> = {
  REPORTED: "incidents.statusReported",
  UNDER_REVIEW: "incidents.statusUnderReview",
  CLOSED: "incidents.statusClosed",
};
const managerRoles = new Set(["SUPER_ADMIN", "ORG_ADMIN", "HSE_MANAGER"]);
const nextStatuses: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ["UNDER_REVIEW", "CLOSED"],
  UNDER_REVIEW: ["REPORTED", "CLOSED"],
  CLOSED: ["UNDER_REVIEW"],
};

export function IncidentsPage() {
  const { t } = useI18n();
  const canReview = managerRoles.has(getCurrentRole());
  const reports = useLoad<IncidentReport[]>("/incidents?limit=100");
  const [kind, setKind] = useState<IncidentKind>("INCIDENT");
  const [busy, setBusy] = useState(false);
  const [busyReport, setBusyReport] = useState("");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, IncidentStatus>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const occurredAt = String(form.get("occurredAt") ?? "");
    setBusy(true); setError(""); setMessage("");
    try {
      await api<IncidentReport>("/incidents", {
        method: "POST",
        body: JSON.stringify({
          kind,
          occurredAt: new Date(occurredAt).toISOString(),
          location: String(form.get("location") ?? "").trim(),
          summary: String(form.get("summary") ?? "").trim(),
          description: String(form.get("description") ?? "").trim(),
        }),
      });
      formElement.reset();
      setKind("INCIDENT");
      setMessage(t("incidents.created"));
      reports.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("common.saveFailed"));
    } finally { setBusy(false); }
  }

  async function updateStatus(report: IncidentReport) {
    const status = statusDrafts[report.id];
    if (!status || busyReport) return;
    setBusyReport(report.id); setError(""); setMessage("");
    try {
      await api<IncidentReport>(`/incidents/${encodeURIComponent(report.id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setMessage(t("incidents.statusUpdated"));
      reports.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("common.saveFailed"));
    } finally { setBusyReport(""); }
  }

  return <section className="page-shell workflow-page incidents-page">
    <PageHeader eyebrow={t("incidents.eyebrow")} title={t("incidents.title")} description={t("incidents.description")}/>
    {error && <div className="alert error" role="alert"><Icon name="warning"/>{error}</div>}
    {message && <div className="alert success" role="status"><Icon name="check"/>{message}</div>}
    <div className="workflow-scope-note" role="note"><Icon name="shield"/><p>{t("incidents.scopeNote")}</p></div>
    <SectionCard title={t("incidents.newReport")} icon="activity">
      <form className="workflow-form" onSubmit={submit}>
        <label>{t("incidents.kind")}<StyledSelect value={kind} onChange={(event) => setKind(event.target.value as IncidentKind)}><option value="INCIDENT">{t("incidents.incident")}</option><option value="NEAR_MISS">{t("incidents.nearMiss")}</option></StyledSelect></label>
        <label>{t("incidents.occurredAt")}<input type="datetime-local" name="occurredAt" required/></label>
        <label>{t("incidents.location")}<input name="location" maxLength={191} minLength={2} required/></label>
        <label>{t("incidents.summary")}<input name="summary" maxLength={191} minLength={3} required/></label>
        <label className="workflow-form-wide">{t("incidents.descriptionField")}<textarea name="description" rows={5} maxLength={10000} minLength={10} required/></label>
        <button className="primary" type="submit" disabled={busy}>{busy ? t("common.loading") : <><Icon name="plus"/>{t("incidents.submit")}</>}</button>
      </form>
    </SectionCard>
    <SectionCard title={t("incidents.myReports")} icon="audit">
      <LoadState state={reports} empty={t("incidents.empty")}>
        {(items) => <div className="workflow-list">{items.map((report) => <article className="workflow-record-card" key={report.id}>
          <header className="workflow-record-heading">
            <div><span className="workflow-record-kind">{t(report.kind === "INCIDENT" ? "incidents.incident" : "incidents.nearMiss")}</span><h3>{report.summary}</h3></div>
            <span className={`workflow-status workflow-status-${report.status.toLowerCase()}`}>{t(statusLabel[report.status])}</span>
          </header>
          <dl className="workflow-record-meta"><div><dt>{t("incidents.occurredAt")}</dt><dd>{formatDate(report.occurredAt, true)}</dd></div><div><dt>{t("incidents.location")}</dt><dd>{report.location}</dd></div>{canReview && report.reporter && <div><dt>{t("support.requester")}</dt><dd>{report.reporter.displayName}</dd></div>}</dl>
          <p className="workflow-record-description">{report.description}</p>
          {canReview && <div className="workflow-status-editor"><label>{t("incidents.updateStatus")}<StyledSelect value={statusDrafts[report.id] ?? report.status} onChange={(event) => setStatusDrafts((current) => ({ ...current, [report.id]: event.target.value as IncidentStatus }))}><option value={report.status}>{t(statusLabel[report.status])}</option>{nextStatuses[report.status].map((status) => <option key={status} value={status}>{t(statusLabel[status])}</option>)}</StyledSelect></label><button type="button" className="secondary" disabled={busyReport === report.id || !statusDrafts[report.id] || statusDrafts[report.id] === report.status} onClick={() => void updateStatus(report)}>{busyReport === report.id ? t("common.loading") : t("common.save")}</button></div>}
        </article>)}</div>}
      </LoadState>
    </SectionCard>
  </section>;
}

import { useId, useState } from "react";
import { Icon, StatusBadge } from "../../components/UI";
import { useI18n } from "../../i18n";
import type { ReportActionProgress, ReportActionItem, ReportSuggestionItem } from "./reportActionProgress";

type ProgressCounts = { completedCount: number; inProgressCount: number; remainingCount: number };
const statuses = ["completed", "inProgress", "remaining"] as const;
type ProgressStatus = typeof statuses[number];
const colors = { completed: "#138a61", inProgress: "#e19a31", remaining: "#bdcdd6" };
const labelKeys: Record<ProgressStatus, string> = { completed: "report.completed", inProgress: "report.registeredActive", remaining: "report.remainingRecommendations" };

export function fmeaActionProgressSegments(counts: ProgressCounts) {
  const values = [counts.completedCount, counts.inProgressCount, counts.remainingCount].map((value) => Number.isFinite(value) ? Math.max(0, value) : 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  const entries = statuses.map((status, index) => {
    const count = values[index] ?? 0;
    const percentage = total ? (count / total) * 100 : 0;
    const entry = { status, count, percentage, startPercentage: cursor };
    cursor += percentage;
    return entry;
  });
  return { total, entries };
}

type ProgressEntry = ReportActionItem | ReportSuggestionItem;
type FmeaActionProgressChartProps = {
  progress: ReportActionProgress;
  sideLabel?: string;
};

export function FmeaActionProgressChart({ progress, sideLabel }: FmeaActionProgressChartProps) {
  const { t, locale } = useI18n();
  const chartId = useId();
  const itemsId = `report-action-progress-items-${chartId}`;
  const headingId = `report-action-progress-heading-${chartId}`;
  const [activeStatus, setActiveStatus] = useState<ProgressStatus | null>(null);
  const { total, entries } = fmeaActionProgressSegments(progress);
  const activeEntry = entries.find((entry) => entry.status === activeStatus);
  const numberLocale = locale === "fa" ? "fa-IR" : "en-US";
  const percent = (value: number) => `${value.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}${locale === "fa" ? "٪" : "%"}`;
  const describe = (entry: typeof entries[number]) => `${t(labelKeys[entry.status])}: ${entry.count.toLocaleString(numberLocale)}, ${percent(entry.percentage)} ${t("report.ofTotal")}`;
  const itemsByStatus: Record<ProgressStatus, readonly ProgressEntry[]> = {
    completed: progress.completed,
    inProgress: progress.registeredActive,
    remaining: progress.remainingSuggestions,
  };
  const completion = total > 0 ? Math.round(progress.completedPercentage) : 0;
  const activeItems = activeStatus ? itemsByStatus[activeStatus] : [];

  const progressLabel = sideLabel ? `${t("report.actionCompletion")}: ${sideLabel}` : t("report.actionCompletion");

  return <div className="fmea-risk-distribution-visual fmea-workflow-visual report-action-progress" data-total-count={total} role="group" aria-label={progressLabel}>
    <div className="fmea-risk-distribution-visual report-action-progress-chart-row" dir={locale === "fa" ? "rtl" : "ltr"}>
      <div className="fmea-risk-donut" aria-hidden="true">
        <svg className="fmea-risk-donut-svg" viewBox="0 0 120 120">
          <circle className="fmea-risk-donut-track" cx="60" cy="60" r="43" pathLength="100"/>
          {entries.filter((entry) => entry.count > 0).map((entry) => <circle key={entry.status} data-status={entry.status} className={`fmea-risk-donut-segment${activeStatus === entry.status ? " is-active" : ""}`} cx="60" cy="60" r="43" pathLength="100" stroke={colors[entry.status]} strokeDasharray={`${entry.percentage} ${100 - entry.percentage}`} strokeDashoffset={-entry.startPercentage}/>) }
        </svg>
        <div className="fmea-risk-donut-label"><span>{activeEntry ? percent(activeEntry.percentage) : `${completion.toLocaleString(numberLocale)}${locale === "fa" ? "٪" : "%"}`}</span><small>{activeEntry ? `${t(labelKeys[activeEntry.status])} · ${activeEntry.count.toLocaleString(numberLocale)}` : t("report.completed")}</small></div>
      </div>
      <span className="sr-only" role="progressbar" aria-label={progressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion} aria-valuetext={`${progress.completedCount.toLocaleString(numberLocale)} / ${total.toLocaleString(numberLocale)} · ${completion}${locale === "fa" ? "٪" : "%"}`}/>
      <div className="fmea-risk-legend" role="group" aria-label={progressLabel}>
        {entries.map((entry) => <button key={entry.status} type="button" className={`fmea-risk-legend-item${activeStatus === entry.status ? " is-active" : ""}`} aria-label={describe(entry)} aria-controls={itemsId} aria-pressed={activeStatus === entry.status} aria-expanded={activeStatus === entry.status} onClick={() => setActiveStatus((current) => current === entry.status ? null : entry.status)}>
          <span className="fmea-risk-legend-dot" style={{ background: colors[entry.status] }}/>
          <span className={`status-badge fmea-workflow-badge ${entry.status}`}>{t(labelKeys[entry.status])}</span>
          <span className="fmea-risk-legend-value"><strong>{entry.count.toLocaleString(numberLocale)}</strong><small>{percent(entry.percentage)}</small></span>
        </button>)}
      </div>
    </div>
    {total === 0 && <p className="report-action-progress-empty" role="status"><Icon name="actions" size={16}/>{t("report.actionProgressEmpty")}</p>}
    {activeStatus && <section id={itemsId} className="report-action-progress-items" aria-live="polite" aria-labelledby={headingId}>
      <h4 id={headingId}>{t(labelKeys[activeStatus])} <span>{activeItems.length.toLocaleString(numberLocale)} / {total.toLocaleString(numberLocale)} · {percent(activeEntry?.percentage ?? 0)}</span></h4>
      {activeItems.length ? <ul>{activeItems.map((item) => <li key={item.id}>
        <div className="report-action-progress-item-copy"><strong>{item.title}</strong>{item.description && <small>{item.description}</small>}</div>
        {"status" in item && item.status ? <StatusBadge value={item.status}/> : <StatusBadge value="SUGGESTED"/>}
      </li>)}</ul> : <p className="report-action-progress-empty" role="status">{t("report.actionProgressBucketEmpty")}</p>}
    </section>}
  </div>;
}

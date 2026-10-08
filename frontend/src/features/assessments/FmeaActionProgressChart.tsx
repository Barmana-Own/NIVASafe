import { useState } from "react";
import { useI18n } from "../../i18n";

type ProgressCounts = { completedCount: number; inProgressCount: number; remainingCount: number };
const statuses = ["completed", "inProgress", "remaining"] as const;
type ProgressStatus = typeof statuses[number];
const colors = { completed: "#138a61", inProgress: "#e19a31", remaining: "#bdcdd6" };

export function fmeaActionProgressSegments(counts: ProgressCounts) {
  const values = [counts.completedCount, counts.inProgressCount, counts.remainingCount].map(value => Number.isFinite(value) ? Math.max(0, value) : 0);
  const total = values.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  const entries = statuses.map((status, index) => {
    const count = values[index] ?? 0;
    const percentage = total ? count / total * 100 : 0;
    const entry = { status, count, percentage, startPercentage: cursor };
    cursor += percentage;
    return entry;
  });
  return { total, entries };
}

export function FmeaActionProgressChart(counts: ProgressCounts) {
  const { t, locale } = useI18n();
  const [activeStatus, setActiveStatus] = useState<ProgressStatus | null>(null);
  const { total, entries } = fmeaActionProgressSegments(counts);
  const activeEntry = entries.find(entry => entry.status === activeStatus);
  const numberLocale = locale === "fa" ? "fa-IR" : "en-US";
  const percent = (value: number) => `${value.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}${locale === "fa" ? "٪" : "%"}`;
  const describe = (entry: typeof entries[number]) => `${t(`report.${entry.status}`)}: ${entry.count.toLocaleString(numberLocale)}، ${percent(entry.percentage)}`;
  const clear = () => setActiveStatus(null);
  const completion = Math.round(entries[0]?.percentage ?? 0);
  return <div className="fmea-risk-distribution-visual fmea-workflow-visual">
    <div className={`fmea-risk-donut${activeEntry ? " has-active" : ""}`} role="group" aria-label={t("report.actionCompletion")} onMouseLeave={clear}>
      <svg className="fmea-risk-donut-svg" viewBox="0 0 120 120" aria-label={t("report.actionCompletion")}>
        <circle className="fmea-risk-donut-track" cx="60" cy="60" r="43" pathLength="100"/>
        {entries.filter(entry => entry.count > 0).map(entry => <circle key={entry.status} data-status={entry.status} className={`fmea-risk-donut-segment${activeStatus === entry.status ? " is-active" : ""}`} cx="60" cy="60" r="43" pathLength="100" stroke={colors[entry.status]} strokeDasharray={`${entry.percentage} ${100 - entry.percentage}`} strokeDashoffset={-entry.startPercentage} tabIndex={0} role="button" aria-label={describe(entry)} onMouseEnter={() => setActiveStatus(entry.status)} onFocus={() => setActiveStatus(entry.status)} onBlur={clear} onClick={() => setActiveStatus(entry.status)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActiveStatus(entry.status); } else if (event.key === "Escape") clear(); }}/>) }
      </svg>
      <div className={`fmea-risk-donut-label${activeEntry ? " is-hovered" : ""}`} aria-live="polite"><span>{percent(activeEntry?.percentage ?? completion)}</span><small>{activeEntry ? `${t(`report.${activeEntry.status}`)} · ${activeEntry.count.toLocaleString(numberLocale)}` : t("report.completed")}</small></div>
      <span className="sr-only" role="progressbar" aria-label={`${t("report.completed")}: ${counts.completedCount.toLocaleString(numberLocale)} / ${total.toLocaleString(numberLocale)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}/>
    </div>
    <div className="fmea-risk-legend" role="group" aria-label={t("report.actionCompletion")}>
      {entries.map(entry => <button key={entry.status} type="button" className={`fmea-risk-legend-item${activeStatus === entry.status ? " is-active" : ""}`} aria-label={describe(entry)} onMouseEnter={() => setActiveStatus(entry.status)} onMouseLeave={clear} onFocus={() => setActiveStatus(entry.status)} onBlur={clear} onClick={() => setActiveStatus(entry.status)} onKeyDown={event => { if (event.key === "Escape") clear(); }}><span className="fmea-risk-legend-dot" style={{ background: colors[entry.status] }}/><span className={`fmea-workflow-badge ${entry.status}`}>{t(`report.${entry.status}`)}</span><span className="fmea-risk-legend-value"><strong>{entry.count.toLocaleString(numberLocale)}</strong><small>{percent(entry.percentage)}</small></span></button>)}
    </div>
  </div>;
}

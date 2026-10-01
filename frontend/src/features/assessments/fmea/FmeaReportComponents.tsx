import { type RiskThresholds } from "@nivasafe/domain";
import { useState } from "react";
import { Icon, StatusBadge, TableContainer, formatDate } from "../../../components/UI";
import { useI18n } from "../../../i18n";
import { FmeaItem, fmeaScoreCriteria } from "../assessmentShared";

export type FmeaReportItem = FmeaItem & { actionPriority: string; correctiveActions: Array<{ id: string; title: string; status: string; priority: string }> };
export type FmeaReportAction = { id: string; title: string; description: string; priority: string; status: string; progress: number; assigneeName: string | null; dueDate: string | null; fmeaItemId: string | null; fmeaItem: { rowNumber: number; failureMode: string } | null };
export type FmeaReport = {
  assessment: { id: string; title: string; code: string; status: string; version: number; createdAt: string; updatedAt: string; approvedAt: string | null; fmeaDetailSeeded: boolean; method: string; processName: { fa: string; en: string }; companyName: { fa: string; en: string }; project: { id: string; name: string; code: string }; evaluationTeam: Array<{ id: string; displayName: string; email: string; role: string }> };
  riskThresholds?: RiskThresholds;
  summary: { totalFailureModes: number; highPriorityRisks: number; correctiveActionsNeeded: number; immediateActions: number; distribution: Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "VERY_LOW", number> };
  items: FmeaReportItem[];
  topFailureModes: FmeaReportItem[];
  suggestedActions: Array<{ id: string; title: string; description: string; fmeaItemId: string; failureMode: string; priority: string; status: string }>;
  actions: FmeaReportAction[];
};

const fmeaReportRiskLevels = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "VERY_LOW"] as const;
const fmeaReportRiskColors: Record<(typeof fmeaReportRiskLevels)[number], string> = { CRITICAL: "#cf4a4d", HIGH: "#e19a31", MEDIUM: "#d7b83f", LOW: "#43a27d", VERY_LOW: "#78c4a1" };
type FmeaReportRiskLevel = (typeof fmeaReportRiskLevels)[number];
type FmeaRiskDistributionEntry = { level: FmeaReportRiskLevel; count: number; percentage: number; startPercentage: number };

function fmeaReportRiskDistributionEntries(distribution: FmeaReport["summary"]["distribution"]) {
  const total = fmeaReportRiskLevels.reduce((sum, level) => sum + Math.max(0, Number(distribution[level]) || 0), 0);
  let cursor = 0;
  const entries: FmeaRiskDistributionEntry[] = fmeaReportRiskLevels.map((level) => {
    const count = Math.max(0, Number(distribution[level]) || 0);
    const percentage = total ? (count / total) * 100 : 0;
    const entry = { level, count, percentage, startPercentage: cursor };
    cursor += percentage;
    return entry;
  });
  return { total, entries };
}

function fmeaReportRiskLabelKey(level: FmeaReportRiskLevel) {
  return level === "VERY_LOW" ? "status.veryLow" : `status.${level.toLocaleLowerCase()}`;
}

function formatFmeaRiskPercentage(value: number, locale: "fa" | "en") {
  const formatted = value.toLocaleString(locale === "en" ? "en-US" : "fa-IR", { maximumFractionDigits: 1 });
  return `${formatted}${locale === "fa" ? "٪" : "%"}`;
}

export function FmeaRiskDistributionChart({ distribution, totalFailureModes, locale }: { distribution: FmeaReport["summary"]["distribution"]; totalFailureModes: number; locale: "fa" | "en" }) {
  const { t } = useI18n();
  const [activeLevel, setActiveLevel] = useState<FmeaReportRiskLevel | null>(null);
  const { total, entries } = fmeaReportRiskDistributionEntries(distribution);
  const activeEntry = entries.find((entry) => entry.level === activeLevel) ?? null;
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const activate = (level: FmeaReportRiskLevel) => setActiveLevel(level);
  const clearActive = () => setActiveLevel(null);
  const activeLabel = activeEntry ? t(fmeaReportRiskLabelKey(activeEntry.level)) : "";
  return <div className="fmea-risk-distribution-visual">
    <div className={`fmea-risk-donut${activeEntry ? " has-active" : ""}`} role="group" aria-label={t("report.riskDistribution")} onMouseLeave={clearActive}>
      <svg className="fmea-risk-donut-svg" viewBox="0 0 120 120" role="img" aria-label={t("report.riskDistribution")}>
        <circle className="fmea-risk-donut-track" cx="60" cy="60" r="43" pathLength="100"/>
        {entries.filter((entry) => entry.count > 0).map((entry) => <circle key={entry.level} className={`fmea-risk-donut-segment${entry.level === activeLevel ? " is-active" : ""}`} cx="60" cy="60" r="43" pathLength="100" stroke={fmeaReportRiskColors[entry.level]} strokeDasharray={`${entry.percentage} ${100 - entry.percentage}`} strokeDashoffset={-entry.startPercentage} tabIndex={0} role="img" aria-label={`${t(fmeaReportRiskLabelKey(entry.level))}: ${entry.count.toLocaleString(numberLocale)}، ${formatFmeaRiskPercentage(entry.percentage, locale)} ${t("report.ofTotal")}`} onMouseEnter={() => activate(entry.level)} onFocus={() => activate(entry.level)} onBlur={clearActive}/>) }
      </svg>
      <div className={`fmea-risk-donut-label${activeEntry ? " is-hovered" : ""}`} aria-live="polite"><span>{activeEntry ? formatFmeaRiskPercentage(activeEntry.percentage, locale) : totalFailureModes.toLocaleString(numberLocale)}</span><small>{activeEntry ? `${activeLabel} · ${activeEntry.count.toLocaleString(numberLocale)}` : t("report.totalFailureModes")}</small></div>
    </div>
    <div className="fmea-risk-legend" role="group" aria-label={t("report.riskDistribution")}>
      {entries.map((entry) => <button type="button" className={`fmea-risk-legend-item${entry.level === activeLevel ? " is-active" : ""}`} key={entry.level} aria-label={`${t(fmeaReportRiskLabelKey(entry.level))}: ${entry.count.toLocaleString(numberLocale)}، ${formatFmeaRiskPercentage(entry.percentage, locale)} ${t("report.ofTotal")}`} onMouseEnter={() => activate(entry.level)} onMouseLeave={clearActive} onFocus={() => activate(entry.level)} onBlur={clearActive}><span className="fmea-risk-legend-dot" style={{ background: fmeaReportRiskColors[entry.level] }}/><StatusBadge value={entry.level}/><span className="fmea-risk-legend-value"><strong>{entry.count.toLocaleString(numberLocale)}</strong><small>{formatFmeaRiskPercentage(entry.percentage, locale)}</small></span></button>)}
    </div>
  </div>;
}

export function FmeaReportTableContext({ processName, evaluationDate }: { processName: string; evaluationDate: string }) {
  const { t } = useI18n();
  return <div className="fmea-report-table-context" role="group" aria-label={t("report.header")}><div><small>{t("assessment.processActivity")}</small><strong>{processName || "—"}</strong></div><div><small>{t("report.date")}</small><strong>{formatDate(evaluationDate)}</strong></div></div>;
}

export function FmeaFinalTableExportBar({ onDownload }: { onDownload: (format: "xlsx" | "pdf" | "docx") => void }) {
  const { t } = useI18n();
  return <div className="fmea-final-table-export-bar" role="toolbar" aria-label={t("report.finalTableExportTitle")}><div className="fmea-final-table-export-copy"><strong>{t("report.finalTableExportTitle")}</strong><small>{t("report.finalTableExportDescription")}</small></div><div className="fmea-final-table-export-actions"><button type="button" className="ghost" onClick={() => onDownload("xlsx")}><Icon name="download"/> {t("assessment.downloadExcel")}</button><button type="button" className="ghost" onClick={() => onDownload("docx")}><Icon name="download"/> {t("assessment.downloadWord")}</button><button type="button" className="ghost" onClick={() => onDownload("pdf")}><Icon name="download"/> {t("assessment.downloadPdf")}</button></div></div>;
}

export function FmeaReportRiskTable({ report, locale, canEdit, onView, onEdit }: { report: FmeaReport; locale: "fa" | "en"; canEdit: boolean; onView: (item: FmeaReportItem) => void; onEdit: (item: FmeaReportItem) => void }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  return <TableContainer className="report-data-table-wrap"><table className="assessment-report-table fmea-report-data-table"><thead><tr><th>{t("assessment.row")}</th><th>{t("assessment.failureMode")}</th><th>{t("assessment.effect")}</th><th>{t("assessment.cause")}</th><th>{t("assessment.existingControls")}</th><th title={t("assessment.severity")}>S</th><th title={t("assessment.occurrence")}>O</th><th title={t("assessment.detection")}>D</th><th>RPN</th><th>{t("assessment.riskLevel")}</th><th>{t("assessment.recommendation")}</th><th>{t("assessment.operations")}</th></tr></thead><tbody>{report.items.map((item) => {
    const controls = [item.preventiveControls, item.detectionControls].filter((value): value is string => Boolean(value?.trim()));
    const linkedActions = item.correctiveActions;
    return <tr key={item.id}><td data-label={t("assessment.row")} className="report-table-number">{item.rowNumber.toLocaleString(numberLocale)}</td><td data-label={t("assessment.failureMode")} className="report-table-text"><strong>{item.failureMode}</strong></td><td data-label={t("assessment.effect")} className="report-table-text">{item.effect}</td><td data-label={t("assessment.cause")} className="report-table-text">{item.cause}</td><td data-label={t("assessment.existingControls")} className="report-table-text"><div className="report-table-stack">{controls.length ? controls.map((control, index) => <span key={`${item.id}-control-${index}`}>{control}</span>) : <span>—</span>}</div></td><td data-label="S" className="report-table-number">{item.severity.toLocaleString(numberLocale)}</td><td data-label="O" className="report-table-number">{item.occurrence.toLocaleString(numberLocale)}</td><td data-label="D" className="report-table-number">{item.detection.toLocaleString(numberLocale)}</td><td data-label="RPN" className="report-table-number"><strong className="rpn-number">{item.rpn.toLocaleString(numberLocale)}</strong></td><td data-label={t("assessment.riskLevel")} className="report-table-number"><StatusBadge value={item.riskLevel}/></td><td data-label={t("assessment.recommendation")} className="report-table-text"><div className="report-table-stack">{item.recommendation?.trim() && <span><strong>{item.recommendation.trim()}</strong><small><StatusBadge value="SUGGESTED"/></small></span>}{linkedActions.map((action) => <span key={action.id}><strong>{action.title}</strong><small><StatusBadge value={action.status}/> <StatusBadge value={action.priority}/></small></span>)}{!item.recommendation?.trim() && !linkedActions.length && <span>—</span>}</div></td><td data-label={t("assessment.operations")} className="report-table-number"><div className="report-table-actions" aria-label={t("assessment.operations")}><button type="button" className="icon-button" title={t("assessment.viewDetails")} aria-label={`${t("assessment.viewDetails")}: ${item.failureMode}`} onClick={() => onView(item)}><Icon name="eye" size={15}/></button>{canEdit && <button type="button" className="icon-button" title={t("assessment.editRiskRow")} aria-label={`${t("assessment.editRiskRow")}: ${item.failureMode}`} onClick={() => onEdit(item)}><Icon name="edit" size={15}/></button>}</div></td></tr>;
  })}</tbody></table></TableContainer>;
}

export function FmeaScoreGuide({ locale }: { locale: "fa" | "en" }) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  return <details className="risk-score-guide"><summary><Icon name="chart" size={16}/>{t("assessment.scoreGuide")}</summary><p>{t("assessment.scoreGuideDescription")}</p><TableContainer className="score-guide-container"><table className="score-guide-table"><thead><tr><th>{t("assessment.scoreRange")}</th><th>{t("assessment.severity")}</th><th>{t("assessment.occurrence")}</th><th>{t("assessment.detection")}</th></tr></thead><tbody>{fmeaScoreCriteria[locale].severity.map((criterion, index) => <tr key={criterion.score}><td data-label={t("assessment.scoreRange")}><strong>{criterion.score.toLocaleString(numberLocale)}</strong></td><td data-label={t("assessment.severity")}><strong>{criterion.label}</strong><small>{criterion.description}</small></td><td data-label={t("assessment.occurrence")}><strong>{fmeaScoreCriteria[locale].occurrence[index].label}</strong><small>{fmeaScoreCriteria[locale].occurrence[index].description}</small></td><td data-label={t("assessment.detection")}><strong>{fmeaScoreCriteria[locale].detection[index].label}</strong><small>{fmeaScoreCriteria[locale].detection[index].description}</small></td></tr>)}</tbody></table></TableContainer></details>;
}

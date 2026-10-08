import { Icon, SectionCard, StatusBadge } from "../../components/UI";
import { useI18n } from "../../i18n";
import { useState } from "react";
import { buildRulaPriorityDistribution, rulaActionLevels, summarizeRulaActionWorkflow, type RulaOverviewCorrectiveAction, type RulaOverviewMetrics, type RulaOverviewResult } from "./rulaOverviewModel";
import { FmeaActionProgressChart } from "./FmeaActionProgressChart";

const actionLevelColors: Record<(typeof rulaActionLevels)[number], string> = {
  4: "#cf4a4d",
  3: "#e19a31",
  2: "#d7b83f",
  1: "#43a27d",
};

const actionLevelTranslationKeys: Record<(typeof rulaActionLevels)[number], string> = {
  4: "assessment.rulaRiskImmediate",
  3: "assessment.rulaNeedsReview",
  2: "assessment.rulaRiskInvestigation",
  1: "assessment.rulaAcceptable",
};

type RulaReportOverviewProps = {
  riskResults: readonly RulaOverviewResult[];
  actions: readonly RulaOverviewCorrectiveAction[];
  score: number;
  actionLevelLabel: string;
  actionLevelClassName: string;
  status: string;
  reviewComplete: boolean;
  reviewedPostureCount: number;
  totalPostureCount: number;
  sideLabel: string;
  mainFactor: { label: string; score: number; sharePercent: number } | null;
};

function numberText(value: number, locale: "fa" | "en") {
  return value.toLocaleString(locale === "en" ? "en-US" : "fa-IR");
}

function percentText(value: number, locale: "fa" | "en") {
  return `${value.toLocaleString(locale === "en" ? "en-US" : "fa-IR", { maximumFractionDigits: 1 })}${locale === "en" ? "%" : "٪"}`;
}

function actionLevelLabelKey(actionLevel: (typeof rulaActionLevels)[number]) {
  return actionLevelTranslationKeys[actionLevel];
}

function RulaRiskDistributionChart({ metrics, locale }: { metrics: RulaOverviewMetrics; locale: "fa" | "en" }) {
  const { t } = useI18n();
  const [activeActionLevel, setActiveActionLevel] = useState<(typeof rulaActionLevels)[number] | null>(null);
  const activeEntry = metrics.riskDistribution.find((entry) => entry.actionLevel === activeActionLevel) ?? null;
  const activeLabel = activeEntry ? t(actionLevelLabelKey(activeEntry.actionLevel)) : "";
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const describeEntry = (entry: RulaOverviewMetrics["riskDistribution"][number]) => `${t(actionLevelLabelKey(entry.actionLevel))}: ${entry.count.toLocaleString(numberLocale)}، ${percentText(entry.percentage, locale)} ${t("report.ofTotal")}`;

  return <div className="fmea-risk-distribution-visual rula-risk-distribution-visual">
    <div className={`fmea-risk-donut${activeEntry ? " has-active" : ""}`} role="group" aria-label={t("assessment.rulaRiskDistributionTitle")} onMouseLeave={() => setActiveActionLevel(null)}>
      <svg className="fmea-risk-donut-svg" viewBox="0 0 120 120" role="img" aria-label={t("assessment.rulaRiskDistributionTitle")}>
        <circle className="fmea-risk-donut-track" cx="60" cy="60" r="43" pathLength="100"/>
        {metrics.riskDistribution.filter((entry) => entry.count > 0).map((entry) => <circle key={entry.actionLevel} className={`fmea-risk-donut-segment${entry.actionLevel === activeActionLevel ? " is-active" : ""}`} cx="60" cy="60" r="43" pathLength="100" stroke={actionLevelColors[entry.actionLevel]} strokeDasharray={`${entry.percentage} ${100 - entry.percentage}`} strokeDashoffset={-entry.startPercentage} tabIndex={0} role="img" aria-label={describeEntry(entry)} onMouseEnter={() => setActiveActionLevel(entry.actionLevel)} onFocus={() => setActiveActionLevel(entry.actionLevel)} onBlur={() => setActiveActionLevel(null)}/>) }
      </svg>
      <div className={`fmea-risk-donut-label${activeEntry ? " is-hovered" : ""}`} aria-live="polite"><span>{activeEntry ? percentText(activeEntry.percentage, locale) : metrics.totalResults.toLocaleString(numberLocale)}</span><small>{activeEntry ? `${activeLabel} · ${activeEntry.count.toLocaleString(numberLocale)}` : t("assessment.rulaTotalResults")}</small></div>
    </div>
    <div className="fmea-risk-legend rula-risk-legend" role="group" aria-label={t("assessment.rulaRiskDistributionTitle")}>
      {metrics.riskDistribution.map((entry) => <button type="button" className={`fmea-risk-legend-item${entry.actionLevel === activeActionLevel ? " is-active" : ""}`} key={entry.actionLevel} aria-label={describeEntry(entry)} onMouseEnter={() => setActiveActionLevel(entry.actionLevel)} onMouseLeave={() => setActiveActionLevel(null)} onFocus={() => setActiveActionLevel(entry.actionLevel)} onBlur={() => setActiveActionLevel(null)}><span className="fmea-risk-legend-dot" style={{ background: actionLevelColors[entry.actionLevel] }}/><span className={`rula-risk-level-badge action-level-${entry.actionLevel}`}>{t(actionLevelLabelKey(entry.actionLevel))}</span><span className="fmea-risk-legend-value"><strong>{entry.count.toLocaleString(numberLocale)}</strong><small>{percentText(entry.percentage, locale)}</small></span></button>)}
      {metrics.totalResults === 0 && <small className="rula-overview-pending-note">{t("assessment.rulaPriorityDistributionEmpty")}</small>}
    </div>
  </div>;
}

export function RulaReportOverview({
  actions,
  score,
  actionLevelLabel,
  actionLevelClassName,
  status,
  reviewComplete,
  reviewedPostureCount,
  totalPostureCount,
  sideLabel,
  mainFactor,
}: RulaReportOverviewProps) {
  const { locale, t } = useI18n();
  const correctiveActionSummary = summarizeRulaActionWorkflow(actions);
  const metrics = buildRulaPriorityDistribution(actions);

  return <>
    <div className={`rula-report-score-card ${actionLevelClassName}`}>
      <div className="rula-report-score">
        <div className="rula-report-score-label"><small>{t("assessment.rulaScoreLabel")}</small><span className="rula-report-score-icon" aria-hidden="true"><Icon name="rula" size={21}/></span></div>
        <strong>{reviewComplete ? numberText(score, locale) : "—"}</strong>
        <span>{reviewComplete ? t("assessment.rulaCurrentScoreDescription") : t("assessment.rulaAutomaticAnalysisPending")}</span>
      </div>
      <div className="rula-report-risk">
        <div className="rula-report-risk-head"><small>{t("assessment.rulaRiskLevel")}</small><span className={`rula-report-risk-badge ${actionLevelClassName}`} role="status">{actionLevelLabel}</span></div>
        <div className="rula-report-status-line"><span>{t("assessment.rulaAssessmentStatus")}</span><StatusBadge value={status}/></div>
        <div className="rula-report-review-line"><span>{t("assessment.bodySide")}: {sideLabel}</span><strong>{t("assessment.rulaReviewProgress")}: {numberText(reviewedPostureCount, locale)} / {numberText(totalPostureCount, locale)}</strong></div>
        <p>{mainFactor ? t("assessment.rulaMainFactorSummary", { factor: mainFactor.label }) : t("assessment.rulaAutomaticAnalysisHint")}</p>
      </div>
    </div>
    <div className="rula-report-overview-grid" data-testid="rula-stage-three-overview">
    <SectionCard className="rula-overview-panel rula-overview-priority-panel" title={t("assessment.rulaActionPriorityTitle")} description={t("assessment.rulaActionPriorityDescription")} icon="warning">
      <div className="rula-overview-priority-grid">
        <article className="rula-overview-priority-stat urgent"><span>{t("assessment.rulaFirstPriorityActions")}</span><strong>{numberText(correctiveActionSummary.firstPriorityCount, locale)}</strong></article>
        <article className="rula-overview-priority-stat"><span>{t("assessment.rulaTotalCorrectiveActions")}</span><strong>{numberText(correctiveActionSummary.totalCount, locale)}</strong></article>
        <article className="rula-overview-priority-stat complete"><span>{t("assessment.rulaCompletedCorrectiveActions")}</span><strong>{numberText(correctiveActionSummary.completedCount, locale)}</strong></article>
        <article className="rula-overview-priority-stat remaining"><span>{t("assessment.rulaRemainingCorrectiveActions")}</span><strong>{numberText(correctiveActionSummary.remainingCount, locale)}</strong></article>
      </div>
    </SectionCard>

    <SectionCard className="rula-overview-panel rula-overview-distribution-panel" title={t("assessment.rulaRiskDistributionTitle")} description={t("assessment.rulaRiskDistributionDescription")} icon="chart">
      <RulaRiskDistributionChart metrics={metrics} locale={locale}/>
    </SectionCard>

    <SectionCard className="rula-overview-panel rula-overview-actions-panel" title={t("assessment.rulaActionProgressTitle")} description={t("assessment.rulaActionProgressDescription")} icon="actions">
      <FmeaActionProgressChart completedCount={correctiveActionSummary.completedCount} inProgressCount={correctiveActionSummary.inProgressCount} remainingCount={correctiveActionSummary.remainingCount}/>
    </SectionCard>
    </div>
  </>;
}

import { Icon, SectionCard, StatusBadge } from "../../components/UI";
import { useI18n } from "../../i18n";
import { buildRulaOverviewMetrics, summarizeRulaCorrectiveActions, type RulaOverviewCorrectiveAction, type RulaOverviewFactor, type RulaOverviewMetrics } from "./rulaOverviewModel";
import type { CSSProperties } from "react";

const impactColors = {
  HIGH: "var(--rula-overview-high)",
  MEDIUM: "var(--rula-overview-medium)",
  LOW: "var(--rula-overview-low)",
} as const;

const impactTranslationKeys = {
  HIGH: "assessment.rulaEffectHigh",
  MEDIUM: "assessment.rulaEffectMedium",
  LOW: "assessment.rulaEffectLow",
} as const;

type RulaReportOverviewProps = {
  factors: readonly RulaOverviewFactor[];
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
  selectedRecommendationCount: number;
  recommendationCount: number;
  manualActionCount: number;
  predictedScore: number;
};

function numberText(value: number, locale: "fa" | "en") {
  return value.toLocaleString(locale === "en" ? "en-US" : "fa-IR");
}

function percentText(value: number, locale: "fa" | "en") {
  return `${numberText(value, locale)}${locale === "en" ? "%" : "٪"}`;
}

function impactDonut(metrics: RulaOverviewMetrics) {
  if (metrics.totalFactorScore === 0) return "conic-gradient(#e7eef2 0 100%)";
  let progress = 0;
  const stops = metrics.impactDistribution.map((item) => {
    const start = progress;
    progress += item.share * 100;
    return `${impactColors[item.level]} ${start}% ${progress}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function RulaReportOverview({
  factors,
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
  selectedRecommendationCount,
  recommendationCount,
  manualActionCount,
  predictedScore,
}: RulaReportOverviewProps) {
  const { locale, t } = useI18n();
  const correctiveActionSummary = summarizeRulaCorrectiveActions(actions);
  const metrics = buildRulaOverviewMetrics({
    factors,
    selectedRecommendationCount,
    recommendationCount,
    manualActionCount,
    currentScore: score,
    predictedScore,
    reviewComplete,
  });
  const factorDistributionLabel = t("assessment.rulaFactorDistributionAria", {
    high: percentText(metrics.impactDistribution[0].sharePercent, locale),
    medium: percentText(metrics.impactDistribution[1].sharePercent, locale),
    low: percentText(metrics.impactDistribution[2].sharePercent, locale),
  });
  const completionProgressLabel = t("assessment.rulaCompletedActionsProgressAria", {
    completed: numberText(correctiveActionSummary.completedCount, locale),
    total: numberText(correctiveActionSummary.totalCount, locale),
    percent: numberText(correctiveActionSummary.completionPercent, locale),
  });

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

    <SectionCard className="rula-overview-panel rula-overview-distribution-panel" title={t("assessment.rulaFactorDistributionTitle")} description={t("assessment.rulaFactorDistributionDescription")} icon="chart">
      <div className="rula-overview-distribution">
        <div className="rula-overview-donut" style={{ background: impactDonut(metrics) }} role="img" aria-label={factorDistributionLabel}>
          <div><strong>{numberText(metrics.totalFactorScore, locale)}</strong><small>{t("assessment.rulaFactorScore")}</small></div>
        </div>
        <div className="rula-overview-legend">
          {metrics.impactDistribution.map((item) => <div className={`rula-overview-legend-row impact-${item.level.toLowerCase()}`} key={item.level}>
            <span className="rula-overview-legend-name"><i aria-hidden="true"/>{t(impactTranslationKeys[item.level])}</span>
            <strong>{numberText(item.factorCount, locale)}</strong>
            <small>{percentText(item.sharePercent, locale)}</small>
          </div>)}
          {!metrics.totalFactorScore && <small className="rula-overview-pending-note">{t("assessment.rulaNoReviewedFactors")}</small>}
        </div>
      </div>
    </SectionCard>

    <SectionCard className="rula-overview-panel rula-overview-actions-panel" title={t("assessment.rulaActionProgressTitle")} description={t("assessment.rulaActionProgressDescription")} icon="actions">
      <div className="rula-overview-actions">
        <div className="rula-overview-progress-ring" style={{ "--rula-action-progress": `${correctiveActionSummary.completionPercent}%` } as CSSProperties} role="progressbar" aria-label={completionProgressLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={correctiveActionSummary.completionPercent}>
          <div><strong>{percentText(correctiveActionSummary.completionPercent, locale)}</strong><small>{t("assessment.rulaCompletedActionsLabel")}</small></div>
        </div>
        <div className="rula-overview-action-stats">
          <div><span>{t("assessment.rulaTotalCorrectiveActions")}</span><strong>{numberText(correctiveActionSummary.totalCount, locale)}</strong></div>
          <div><span>{t("assessment.rulaCompletedCorrectiveActions")}</span><strong>{numberText(correctiveActionSummary.completedCount, locale)}</strong></div>
          <div><span>{t("assessment.rulaRemainingCorrectiveActions")}</span><strong>{numberText(correctiveActionSummary.remainingCount, locale)}</strong></div>
          <div><span>{t("assessment.rulaSelectedRecommendations")}</span><strong>{numberText(metrics.selectedRecommendationCount, locale)}</strong></div>
          <div><span>{t("assessment.rulaManualActionCount")}</span><strong>{numberText(metrics.manualActionCount, locale)}</strong></div>
          <div><span>{t("assessment.rulaEstimatedScoreReduction")}</span><strong>{reviewComplete ? numberText(metrics.estimatedScoreReduction, locale) : "—"}</strong></div>
        </div>
      </div>
    </SectionCard>
    </div>
  </>;
}

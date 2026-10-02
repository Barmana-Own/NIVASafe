import { Icon, SectionCard } from "../../../components/UI";
import { useI18n } from "../../../i18n";
import type { RulaCorrectionAction, RulaReportFactor } from "../assessmentShared";
import { rankRulaReportFactors, rulaActionLevelFor } from "./rulaModel";
import { rulaOverviewMetrics } from "./rulaOverviewModel";

const impactLevels = ["HIGH", "MEDIUM", "LOW"] as const;
const impactColors: Record<(typeof impactLevels)[number], string> = {
  HIGH: "#cf4a4d",
  MEDIUM: "#e19a31",
  LOW: "#43a27d",
};
const impactLabelKeys = {
  HIGH: "assessment.rulaEffectHigh",
  MEDIUM: "assessment.rulaEffectMedium",
  LOW: "assessment.rulaEffectLow",
} as const;

export function RulaOverviewDashboard({ score, actionLevel, reviewComplete, factors, suggestions, selectedActions, predictedScore, locale }: {
  score: number;
  actionLevel: number;
  reviewComplete: boolean;
  factors: RulaReportFactor[];
  suggestions: RulaCorrectionAction[];
  selectedActions: RulaCorrectionAction[];
  predictedScore: number;
  locale: "fa" | "en";
}) {
  const { t } = useI18n();
  const numberLocale = locale === "en" ? "en-US" : "fa-IR";
  const metrics = rulaOverviewMetrics({ factors, suggestions, selectedActions, score, predictedScore });
  const mainFactor = rankRulaReportFactors(factors).find((factor) => factor.score > 0);
  const actionLevelDisplay = reviewComplete
    ? rulaActionLevelFor(actionLevel)
    : { labelKey: "assessment.manualReviewRequiredShort", className: "review-required" } as const;
  const distributionTotal = impactLevels.reduce((total, level) => total + metrics.impactDistribution[level], 0);
  let distributionCursor = 0;
  const distributionEntries = impactLevels.map((level) => {
    const count = metrics.impactDistribution[level];
    const percentage = distributionTotal ? (count / distributionTotal) * 100 : 0;
    const entry = { level, count, percentage, startPercentage: distributionCursor };
    distributionCursor += percentage;
    return entry;
  });
  const progressMaximum = Math.max(1, suggestions.length);
  const impactChartLabel = distributionEntries
    .map((entry) => `${t(impactLabelKeys[entry.level])}: ${entry.count.toLocaleString(numberLocale)} / ${distributionTotal.toLocaleString(numberLocale)}`)
    .join(locale === "fa" ? "، " : ", ");
  const selectedProgressLabel = `${metrics.selectedSuggestionCount.toLocaleString(numberLocale)} / ${suggestions.length.toLocaleString(numberLocale)} ${t("assessment.rulaSelectedSuggestionCount")}`;

  return <div className="rula-overview-grid" data-testid="rula-assessment-overview">
    <SectionCard className="rula-overview-panel rula-overview-summary" title={t("assessment.rulaExecutiveSummary")} description={t("assessment.rulaExecutiveSummaryDescription")} icon="warning">
      <div className="rula-overview-summary-content">
        <div className={`rula-overview-score ${actionLevelDisplay.className}`}>
          <small>{t("assessment.rulaScoreLabel")}</small>
          <strong>{reviewComplete ? score.toLocaleString(numberLocale) : "—"}<span> / 7</span></strong>
          <span>{t("assessment.rulaCurrentScoreDescription")}</span>
        </div>
        <div className="rula-overview-summary-details">
          <div className="rula-overview-detail-row">
            <span>{t("assessment.rulaRiskLevel")}</span>
            <strong className={`rula-report-risk-badge ${actionLevelDisplay.className}`} role="status">{t(actionLevelDisplay.labelKey)}</strong>
          </div>
          <div className="rula-overview-detail-row">
            <span>{t("assessment.rulaMainFactors")}</span>
            <strong>{mainFactor ? t(`assessment.${mainFactor.key}`) : "—"}</strong>
          </div>
          <div className="rula-overview-detail-row">
            <span>{t("assessment.rulaContributingFactorCount")}</span>
            <strong>{metrics.contributingFactorCount.toLocaleString(numberLocale)} / {factors.length.toLocaleString(numberLocale)}</strong>
          </div>
          <div className="rula-overview-detail-row">
            <span>{t("assessment.rulaSelectedActionsSummary")}</span>
            <strong>{selectedActions.length.toLocaleString(numberLocale)}</strong>
          </div>
        </div>
      </div>
    </SectionCard>

    <SectionCard className="rula-overview-panel rula-overview-distribution" title={t("assessment.rulaImpactDistribution")} description={t("assessment.rulaImpactDistributionDescription")} icon="chart">
      <div className="rula-overview-chart-layout">
        <div className="rula-overview-donut" role="img" data-testid="rula-factor-impact-chart" aria-label={`${t("assessment.rulaImpactDistribution")}: ${impactChartLabel}`}>
          <svg className="rula-overview-donut-svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
            <circle className="rula-overview-donut-track" cx="60" cy="60" r="43" pathLength="100"/>
            {distributionEntries.filter((entry) => entry.count > 0).map((entry) => <circle key={entry.level} className="rula-overview-donut-segment" cx="60" cy="60" r="43" pathLength="100" stroke={impactColors[entry.level]} strokeDasharray={`${entry.percentage} ${100 - entry.percentage}`} strokeDashoffset={-entry.startPercentage}/>) }
          </svg>
          <div className="rula-overview-donut-label"><span>{distributionTotal.toLocaleString(numberLocale)}</span><small>{t("assessment.rulaContributingFactorCount")}</small></div>
        </div>
        <div className="rula-overview-legend" role="list" aria-label={t("assessment.rulaImpactDistribution")}>
          {distributionEntries.map((entry) => {
            const factorNames = factors.filter((factor) => factor.impactLevel === entry.level).map((factor) => t(`assessment.${factor.key}`));
            const percentage = distributionTotal ? Math.round(entry.percentage) : 0;
            return <div className={`rula-overview-legend-item impact-${entry.level.toLowerCase()}`} role="listitem" key={entry.level}>
              <span className="rula-overview-legend-dot" aria-hidden="true"/>
              <strong>{t(impactLabelKeys[entry.level])}</strong>
              <span className="rula-overview-legend-value">{entry.count.toLocaleString(numberLocale)} · {percentage.toLocaleString(numberLocale)}{locale === "fa" ? "٪" : "%"}</span>
              <small>{factorNames.length ? factorNames.join(locale === "fa" ? "، " : ", ") : t("assessment.rulaNoFactors")}</small>
            </div>;
          })}
        </div>
      </div>
    </SectionCard>

    <SectionCard className="rula-overview-panel rula-overview-actions" title={t("assessment.rulaCorrectiveSelectionProgress")} description={t("assessment.rulaCorrectiveSelectionProgressDescription")} icon="actions">
      <div className="rula-overview-chart-layout rula-overview-action-chart-layout">
        <div className="rula-overview-action-ring" style={{ background: `conic-gradient(#138a61 ${metrics.suggestionSelectionPercent}%, #e6eef2 0)` }} role="progressbar" data-testid="rula-suggestion-selection-progress" aria-label={t("assessment.rulaCorrectiveSelectionProgress")} aria-valuemin={0} aria-valuemax={progressMaximum} aria-valuenow={metrics.selectedSuggestionCount} aria-valuetext={selectedProgressLabel}>
          <div><strong>{metrics.suggestionSelectionPercent.toLocaleString(numberLocale)}%</strong><small>{t("assessment.rulaSelectedSuggestionCount")}</small></div>
        </div>
        <div className="rula-overview-legend" role="list" aria-label={t("assessment.rulaCorrectiveSelectionProgress")}>
          <div className="rula-overview-legend-item selected" role="listitem"><span className="rula-overview-legend-dot" aria-hidden="true"/><strong>{t("assessment.rulaSelectedSuggestionCount")}</strong><span className="rula-overview-legend-value">{metrics.selectedSuggestionCount.toLocaleString(numberLocale)}</span></div>
          <div className="rula-overview-legend-item remaining" role="listitem"><span className="rula-overview-legend-dot" aria-hidden="true"/><strong>{t("assessment.rulaRemainingSuggestionCount")}</strong><span className="rula-overview-legend-value">{metrics.remainingSuggestionCount.toLocaleString(numberLocale)}</span></div>
          <div className="rula-overview-legend-item manual" role="listitem"><span className="rula-overview-legend-dot" aria-hidden="true"/><strong>{t("assessment.rulaManualActionCount")}</strong><span className="rula-overview-legend-value">{metrics.manualActionCount.toLocaleString(numberLocale)}</span></div>
          <div className="rula-overview-score-reduction"><span>{t("assessment.rulaEstimatedReductionLabel")}</span><strong>{metrics.predictedScoreReduction.toLocaleString(numberLocale)}</strong><Icon name="chart" size={16}/></div>
        </div>
      </div>
    </SectionCard>
  </div>;
}

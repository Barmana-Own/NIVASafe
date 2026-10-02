import { Icon, SectionCard } from "../../../components/UI";
import { useI18n } from "../../../i18n";
import type { RulaCorrectionAction, RulaReportFactor } from "../assessmentShared";
import { rankRulaReportFactors, rulaActionLevelFor } from "./rulaModel";
import { rulaOverviewMetrics } from "./rulaOverviewModel";

const impactLevels = ["HIGH", "MEDIUM", "LOW"] as const;
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
  const distributionTotal = factors.length;
  const progressMaximum = Math.max(1, suggestions.length);

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
      <div className="rula-overview-distribution-list" role="list" aria-label={t("assessment.rulaImpactDistribution")}>
        {impactLevels.map((level) => {
          const count = metrics.impactDistribution[level];
          const percentage = distributionTotal ? Math.round((count / distributionTotal) * 100) : 0;
          const factorNames = factors.filter((factor) => factor.impactLevel === level).map((factor) => t(`assessment.${factor.key}`));
          return <div className={`rula-overview-impact-row impact-${level.toLowerCase()}`} role="listitem" key={level}>
            <div className="rula-overview-impact-heading"><strong>{t(impactLabelKeys[level])}</strong><span>{count.toLocaleString(numberLocale)} / {distributionTotal.toLocaleString(numberLocale)}</span></div>
            <div className="rula-overview-impact-track" role="progressbar" aria-label={`${t(impactLabelKeys[level])}: ${count.toLocaleString(numberLocale)} / ${distributionTotal.toLocaleString(numberLocale)}`} aria-valuemin={0} aria-valuemax={Math.max(1, distributionTotal)} aria-valuenow={count}><span style={{ inlineSize: `${percentage}%` }}/></div>
            <small>{factorNames.length ? factorNames.join(locale === "fa" ? "، " : ", ") : t("assessment.rulaNoFactors")}</small>
          </div>;
        })}
      </div>
    </SectionCard>

    <SectionCard className="rula-overview-panel rula-overview-actions" title={t("assessment.rulaCorrectiveSelectionProgress")} description={t("assessment.rulaCorrectiveSelectionProgressDescription")} icon="actions">
      <div className="rula-overview-action-progress">
        <div className="rula-overview-action-progress-heading"><strong>{metrics.selectedSuggestionCount.toLocaleString(numberLocale)} / {suggestions.length.toLocaleString(numberLocale)}</strong><span>{t("assessment.rulaSelectedSuggestionCount")}</span></div>
        <div className="rula-overview-action-track" role="progressbar" data-testid="rula-suggestion-selection-progress" aria-label={t("assessment.rulaSelectedSuggestionCount")} aria-valuemin={0} aria-valuemax={progressMaximum} aria-valuenow={metrics.selectedSuggestionCount}><span style={{ inlineSize: `${metrics.suggestionSelectionPercent}%` }}/></div>
        <div className="rula-overview-action-counts">
          <div><span className="selected-dot"/>{t("assessment.rulaSelectedSuggestionCount")}<strong>{metrics.selectedSuggestionCount.toLocaleString(numberLocale)}</strong></div>
          <div><span className="remaining-dot"/>{t("assessment.rulaRemainingSuggestionCount")}<strong>{metrics.remainingSuggestionCount.toLocaleString(numberLocale)}</strong></div>
          <div><span className="manual-dot"/>{t("assessment.rulaManualActionCount")}<strong>{metrics.manualActionCount.toLocaleString(numberLocale)}</strong></div>
        </div>
        <div className="rula-overview-score-reduction"><span>{t("assessment.rulaEstimatedReductionLabel")}</span><strong>{metrics.predictedScoreReduction.toLocaleString(numberLocale)}</strong><Icon name="chart" size={16}/></div>
      </div>
    </SectionCard>
  </div>;
}

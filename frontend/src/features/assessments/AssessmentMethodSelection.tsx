import { Link } from "react-router-dom";
import { Icon, PageHeader } from "../../components/UI";
import { useI18n } from "../../i18n";
import { getAssessmentMethods, type AssessmentCategory, type AssessmentSelectionMode } from "./assessmentMethods";
import "../../styles/assessment-methods.css";

export function AssessmentMethodSelection({ category, mode }: { category: AssessmentCategory; mode: AssessmentSelectionMode }) {
  const { t } = useI18n();
  const icon = category === "safety" ? "fmea" : "rula";
  return <section className="page-shell assessment-methods" data-category={category} data-mode={mode}>
    <PageHeader eyebrow={t(mode === "saved" ? "nav.savedAssessments" : "nav.newAssessment")} title={t(category === "safety" ? "nav.fmeaType" : "nav.rulaType")}/>
    <section aria-label={t("path.chooseMethod")}>
      <h3 className="assessment-methods-title">{t("path.chooseMethod")}</h3>
      <div className="assessment-method-grid">
        {getAssessmentMethods(category, mode).map(method => <article className={`assessment-method-card${method.available ? "" : " coming-soon"}`} key={method.id} data-method={method.id} aria-disabled={method.available ? undefined : true}>
          <div className="assessment-method-card-head"><span className="assessment-method-icon"><Icon name={icon} size={24}/></span><h4 dir="ltr">{method.id.toUpperCase()}</h4>{!method.available && <span className="assessment-method-status">{t("path.comingSoon")}</span>}</div>
          {method.available
            ? <Link className="primary button-link assessment-method-action" to={method.href}><span>{t(mode === "saved" ? "path.viewAssessments" : "path.startAssessment")}</span><Icon name="arrow" size={17}/></Link>
            : <button type="button" className="ghost assessment-method-action" disabled>{t("path.comingSoon")}</button>}
        </article>)}
      </div>
    </section>
  </section>;
}

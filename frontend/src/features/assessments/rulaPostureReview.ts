export type RulaReviewRow = {
  source: "AI" | "USER" | "DEFAULT";
  confirmedByUser: boolean;
  requiresReview?: boolean;
  angle?:number|null;
  detected?:boolean;
  measurement?:{state:string};
};

/** New uncertain AI observations need a person to confirm them; old saved rows remain compatible. */
export function isRulaPostureResultReviewed(row: RulaReviewRow) {
  const unresolved=row.measurement&&!["ESTIMATED","QUALITATIVE"].includes(row.measurement.state);
  const corrected=!unresolved||(row.source==="USER"&&row.confirmedByUser&&(row.detected===false||typeof row.angle==="number"));
  return row.source !== "DEFAULT" && (row.requiresReview !== true || row.confirmedByUser) && corrected;
}

export function areRulaPostureRowsReviewed(rows: readonly RulaReviewRow[]) {
  return rows.length > 0 && rows.every(isRulaPostureResultReviewed);
}

export function areRulaPostureSidesReviewed(sides: readonly (readonly RulaReviewRow[] | undefined)[]) {
  return sides.length > 0 && sides.every((rows) => rows !== undefined && areRulaPostureRowsReviewed(rows));
}

export function summarizeReviewedRulaAssessments(assessments: readonly { score: number; actionLevel: number; postureReviewComplete?: boolean }[]) {
  const reviewed = assessments.filter((assessment) => assessment.postureReviewComplete === true);
  return {
    total: assessments.length,
    high: reviewed.filter((assessment) => assessment.actionLevel >= 3).length,
    average: reviewed.length ? Math.round(reviewed.reduce((sum, assessment) => sum + assessment.score, 0) / reviewed.length) : null,
  };
}

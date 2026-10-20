export type RulaPhotoReviewStatus = "queued" | "loading" | "ready" | "error" | "cancelled";
export type RulaPhotoReviewGate = { status: RulaPhotoReviewStatus; manualReviewComplete?: boolean };
export type RulaManualAnalysis = {
  upperArm?: unknown;
  lowerArm?: unknown;
  wrist?: unknown;
  wristTwist?: unknown;
  neck?: unknown;
  trunk?: unknown;
  legs?: unknown;
  sideAnalyses?: Partial<Record<"LEFT" | "RIGHT", unknown>>;
};

const anatomicalParts = ["upperArm", "lowerArm", "wrist", "wristTwist", "neck", "trunk", "legs"] as const;

export function canAdvanceRulaImageReview(images: readonly RulaPhotoReviewGate[], manualFallbackSelected: boolean) {
  if (images.every((image) => image.status === "ready")) return true;
  if (!manualFallbackSelected) return false;
  return images.every((image) => image.status === "ready" || ((image.status === "error" || image.status === "cancelled") && image.manualReviewComplete === true));
}

function isManuallyConfirmedSide(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const analysis = value as Record<string, unknown>;
  return anatomicalParts.every((part) => {
    const row = analysis[part];
    return Boolean(row && typeof row === "object" && (row as { source?: unknown }).source === "USER" && (row as { confirmedByUser?: unknown }).confirmedByUser === true);
  });
}

export function isManualRulaReviewComplete(analysis: RulaManualAnalysis | undefined, bodySide: "LEFT" | "RIGHT" | "BOTH") {
  if (!analysis) return false;
  if (bodySide === "BOTH") {
    return isManuallyConfirmedSide(analysis.sideAnalyses?.RIGHT) && isManuallyConfirmedSide(analysis.sideAnalyses?.LEFT);
  }
  return isManuallyConfirmedSide(analysis.sideAnalyses?.[bodySide] ?? analysis);
}

export type AssessmentCategory = "safety" | "ergonomics";
export type AssessmentSelectionMode = "new" | "saved";
export type AssessmentMethod =
  | { id: "fmea" | "rula"; available: true; href: string }
  | { id: "hazop" | "reba"; available: false; href?: never };

export function readAssessmentMethodSelection(search: string): { category: AssessmentCategory; mode: AssessmentSelectionMode } | null {
  const params = new URLSearchParams(search);
  const category = params.get("category");
  if (category !== "safety" && category !== "ergonomics") return null;
  return { category, mode: params.get("mode") === "saved" ? "saved" : "new" };
}

export function getAssessmentMethods(category: AssessmentCategory, mode: AssessmentSelectionMode): readonly AssessmentMethod[] {
  if (category === "safety") return [
    { id: "fmea", available: true, href: mode === "saved" ? "/fmea?view=registered" : "/fmea" },
    { id: "hazop", available: false },
  ];
  return [
    { id: "rula", available: true, href: mode === "saved" ? "/rula?view=results" : "/rula" },
    { id: "reba", available: false },
  ];
}

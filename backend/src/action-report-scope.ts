import type { Prisma } from "@prisma/client";

/** Exact assessment filters keep historical item-only FMEA links while excluding mixed or mismatched typed records. */
export function fmeaAssessmentActionScope(assessmentId: string): Prisma.CorrectiveActionWhereInput {
  return {
    rulaId: null,
    OR: [
      { fmeaId: assessmentId, OR: [{ fmeaItemId: null }, { fmeaItem: { assessmentId } }] },
      { fmeaId: null, fmeaItem: { assessmentId } },
    ],
  };
}

/** Mixed historic records stay visible in the explicit unclassified list, not a RULA report. */
export function rulaAssessmentActionScope(assessmentId: string): Prisma.CorrectiveActionWhereInput {
  return { rulaId: assessmentId, fmeaId: null, fmeaItemId: null };
}

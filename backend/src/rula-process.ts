import { z } from "zod";

const nullableUuid = z.preprocess((value) => value === "" ? null : value, z.string().uuid().nullable().optional());

/** Structured context used by the RULA scoring workflow and future posture-image assistance. */
export const rulaActivityInfoSchema = z.object({
  jobTitle: z.string().trim().min(2).max(180),
  taskDescription: z.string().trim().min(2).max(500),
  durationPerOccurrence: z.number().positive().max(1440).optional(),
  durationUnit: z.enum(["SECOND", "MINUTE", "HOUR"]).optional(),
  repetitionsPerShift: z.number().int().min(1).max(10000).optional(),
  postureHoldDuration: z.number().positive().max(1440).optional(),
  postureHoldUnit: z.enum(["SECOND", "MINUTE", "HOUR"]).optional(),
  postureDescription: z.string().trim().max(1000).nullable().optional(),
  loadWeight: z.number().nonnegative().max(10000).nullable().optional(),
  loadUnit: z.enum(["KG", "LB"]).optional(),
  postureImageAttachmentId: nullableUuid,
}).superRefine((value, context) => {
  const measurementPairs = [
    ["durationPerOccurrence", "durationUnit"],
    ["postureHoldDuration", "postureHoldUnit"],
  ] as const;
  for (const [valueKey, unitKey] of measurementPairs) {
    const hasValue = value[valueKey] !== undefined;
    const hasUnit = value[unitKey] !== undefined;
    if (hasValue !== hasUnit) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [hasValue ? unitKey : valueKey], message: "Measurement value and unit must be provided together" });
    }
  }
});

export type RulaActivityInfo = z.infer<typeof rulaActivityInfoSchema>;

export const rulaBodySideSchema = z.enum(["LEFT", "RIGHT", "BOTH"]);

export const rulaTitleSchema = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(2).max(180).optional(),
);

export function resolveRulaTitle(title: string | undefined, activityInfo?: Pick<RulaActivityInfo, "jobTitle"> | null) {
  return title?.trim() || activityInfo?.jobTitle?.trim() || "RULA assessment";
}

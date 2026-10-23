import { z } from "zod";
import { rulaActivityInfoSchema, rulaBodySideSchema } from "./rula-process.js";

/** Image-first analysis needs visual input; activity context is supplementary. */
export const rulaPostureImageAnalysisRequestSchema = z.object({
  imageSubject: z.enum(["SELF", "THIRD_PARTY"]),
  ownerAuthorizationId: z.string().uuid().optional(),
  activityInfo: rulaActivityInfoSchema.optional(),
  bodySide: rulaBodySideSchema,
  jobTitle: z.string().trim().max(180).default(""),
  taskDescription: z.string().trim().max(500).default(""),
  postureDescription: z.string().trim().max(1000).default(""),
  locale: z.enum(["fa", "en"]).default("fa"),
}).superRefine((value, context) => {
  if (value.imageSubject === "THIRD_PARTY" && !value.ownerAuthorizationId) context.addIssue({ code: "custom", path: ["ownerAuthorizationId"], message: "مجوز معتبر صاحب تصویر لازم است." });
  if (value.imageSubject === "SELF" && value.ownerAuthorizationId) context.addIssue({ code: "custom", path: ["ownerAuthorizationId"], message: "برای تصویر خودتان مجوز شخص دیگر قابل استفاده نیست." });
});

export type RulaPostureImageAnalysisRequest = z.infer<typeof rulaPostureImageAnalysisRequestSchema>;

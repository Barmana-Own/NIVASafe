import { z } from "zod";
import { rulaActivityInfoSchema, rulaBodySideSchema } from "./rula-process.js";

/** Image-first analysis needs visual input; activity context is supplementary. */
export const rulaPostureImageAnalysisRequestSchema = z.object({
  activityInfo: rulaActivityInfoSchema.optional(),
  bodySide: rulaBodySideSchema,
  jobTitle: z.string().trim().max(180).default(""),
  taskDescription: z.string().trim().max(500).default(""),
  postureDescription: z.string().trim().max(1000).default(""),
  locale: z.enum(["fa", "en"]).default("fa"),
});

export type RulaPostureImageAnalysisRequest = z.infer<typeof rulaPostureImageAnalysisRequestSchema>;

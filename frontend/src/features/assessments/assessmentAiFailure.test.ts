import { describe, expect, it } from "vitest";
import { assessmentAiFailure, rulaImageManualRetryAllowed } from "./assessmentAiFailure";

it.each([['RULA_IMAGE_AI_UNAVAILABLE',503],['RULA_IMAGE_AI_INVALID_RESPONSE',502]] as const)('keeps explicit manual recovery for %s without automatic paid replay', (code,status) => {
  expect(rulaImageManualRetryAllowed({code,status,retryable:false},false)).toBe(true);
});
it.each([401,403,429,415])('does not offer manual image replay for an access/file denial %i', status => {
  const error={status,code:status===415?'RULA_IMAGE_SIGNATURE_INVALID':'FORBIDDEN',retryable:false};
  expect(rulaImageManualRetryAllowed(error,assessmentAiFailure(error,'Unavailable').stopBatch)).toBe(false);
});
describe("assessment AI failure classification", () => {
 it("keeps quota cause and stops subsequent image calls", () => {expect(assessmentAiFailure(Object.assign(new Error("Remaining tokens are insufficient"), {code:"AI_ACCESS_LIMIT_REACHED",status:429}), "outage")).toEqual({stopBatch:true,message:"Remaining tokens are insufficient"});});
 it.each([401,402,403,429])("preserves blocking HTTP status %i", status => {expect(assessmentAiFailure({status,message:"Access denied"},"outage")).toEqual({stopBatch:true,message:"Access denied"});});
 it("retains safe generic feedback for provider/internal errors", () => {expect(assessmentAiFailure({status:503,message:"private details"},"outage")).toEqual({stopBatch:false,message:"outage"});expect(assessmentAiFailure(null,"outage").message).toBe("outage");});
});

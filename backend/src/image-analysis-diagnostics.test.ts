import { describe, expect, it } from "vitest";
import { classifyRulaImageFailure, imageAnalysisFailureMetadata } from "./image-analysis-diagnostics.js";
describe("image analysis audit diagnostics", () => {
  it("retains model identity rejection without storing the response or claimed model", () => {
    expect(imageAnalysisFailureMetadata({ code: "AI_MODEL_MISMATCH", message: "private response", model: "untrusted model", response: "secret" })).toEqual({ failureCode: "AI_MODEL_MISMATCH", retryable: false });
    expect(classifyRulaImageFailure({ code: "AI_MODEL_MISMATCH" })).toMatchObject({ statusCode: 503, retryable: false });
  });
  it("does not authorize an automatic paid image replay after an uncertain timeout", () => {
    const error = Object.assign(new Error("private provider detail"), { code: "PROVIDER_TIMEOUT", retryable: true });
    expect(classifyRulaImageFailure(error)).toMatchObject({ statusCode: 503, retryable: false });
    expect(imageAnalysisFailureMetadata(error)).toMatchObject({ failureCode: "PROVIDER_TIMEOUT", retryable: true });
  });
  it("retains the actual Arvan 32-hex request-id format without arbitrary text", () => {
    expect(imageAnalysisFailureMetadata({ code: "PROVIDER_REQUEST_FAILED", upstreamRequestId: "2712ef284e078daac19d9e0d5b9e339f" })).toMatchObject({ upstreamRequestId: "2712ef284e078daac19d9e0d5b9e339f" });
  });
  it("retains a known provider status without response contents", () => {
    expect(imageAnalysisFailureMetadata({code:"PROVIDER_REQUEST_FAILED",statusCode:403,message:"private",response:"secret"})).toEqual({failureCode:"PROVIDER_REQUEST_FAILED",upstreamStatus:403,retryable:false});
  });
  it("retains a bounded provider correlation id without persisting response contents", () => {
    expect(imageAnalysisFailureMetadata({code:"PROVIDER_REQUEST_FAILED",statusCode:401,upstreamRequestId:"req_123e4567-e89b-12d3-a456-426614174000",message:"private",response:"secret"})).toEqual({failureCode:"PROVIDER_REQUEST_FAILED",upstreamStatus:401,upstreamRequestId:"req_123e4567-e89b-12d3-a456-426614174000",retryable:false});
  });
  it("does not persist malformed, token-shaped, or oversized provider correlation ids", () => {
    expect(imageAnalysisFailureMetadata({code:"PROVIDER_REQUEST_FAILED",statusCode:401,upstreamRequestId:"Bearer secret-token"})).toEqual({failureCode:"PROVIDER_REQUEST_FAILED",upstreamStatus:401,retryable:false});
    expect(imageAnalysisFailureMetadata({code:"PROVIDER_REQUEST_FAILED",statusCode:401,upstreamRequestId:"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature"})).toEqual({failureCode:"PROVIDER_REQUEST_FAILED",upstreamStatus:401,retryable:false});
    expect(imageAnalysisFailureMetadata({code:"PROVIDER_REQUEST_FAILED",statusCode:401,upstreamRequestId:"a".repeat(129)})).toEqual({failureCode:"PROVIDER_REQUEST_FAILED",upstreamStatus:401,retryable:false});
  });
  it("does not store arbitrary error strings or invalid statuses", () => {
    expect(imageAnalysisFailureMetadata({code:"secret-token",statusCode:Infinity})).toEqual({failureCode:"IMAGE_ANALYSIS_INTERNAL_ERROR",retryable:false});
    expect(imageAnalysisFailureMetadata(null)).toEqual({failureCode:"IMAGE_ANALYSIS_INTERNAL_ERROR",retryable:false});
    expect(imageAnalysisFailureMetadata({statusCode:200})).toEqual({failureCode:"IMAGE_ANALYSIS_INTERNAL_ERROR",retryable:false});
  });
  it("persists only recognized upstream error codes for image-analysis failures", () => {
    expect(imageAnalysisFailureMetadata({code:"PROVIDER_REQUEST_FAILED",statusCode:401,providerErrorCode:"invalid_api_key",message:"private provider detail"})).toEqual({failureCode:"PROVIDER_REQUEST_FAILED",upstreamStatus:401,providerErrorCode:"invalid_api_key",retryable:false});
    expect(imageAnalysisFailureMetadata({code:"PROVIDER_REQUEST_FAILED",statusCode:401,providerErrorCode:"private provider detail"})).toEqual({failureCode:"PROVIDER_REQUEST_FAILED",upstreamStatus:401,retryable:false});
  });
  it("persists an allowlisted response-validation reason without the provider answer", () => {
    expect(imageAnalysisFailureMetadata({code:"RULA_IMAGE_AI_INVALID_RESPONSE",responseValidationCode:"side_result_incomplete_left",message:"private answer content"})).toEqual({failureCode:"RULA_IMAGE_AI_INVALID_RESPONSE",responseValidationCode:"side_result_incomplete_left",retryable:false});
    expect(imageAnalysisFailureMetadata({code:"RULA_IMAGE_AI_INVALID_RESPONSE",responseValidationCode:"private answer content",message:"private answer content"})).toEqual({failureCode:"RULA_IMAGE_AI_INVALID_RESPONSE",retryable:false});
  });
  it("retains allowlisted FMEA response-validation reasons without storing the provider answer", () => {
    expect(imageAnalysisFailureMetadata({code:"FMEA_IMAGE_AI_INVALID_RESPONSE",responseValidationCode:"risk_row_invalid",message:"private answer content"})).toEqual({failureCode:"FMEA_IMAGE_AI_INVALID_RESPONSE",responseValidationCode:"risk_row_invalid",retryable:false});
    expect(imageAnalysisFailureMetadata({code:"FMEA_IMAGE_AI_INVALID_RESPONSE",responseValidationCode:"private answer content",message:"private answer content"})).toEqual({failureCode:"FMEA_IMAGE_AI_INVALID_RESPONSE",retryable:false});
  });
  it("marks only transient provider failures as safely retryable and returns stable public errors", () => {
    expect(classifyRulaImageFailure(Object.assign(new Error("secret"), { code: "PROVIDER_TIMEOUT", retryable: true }))).toEqual({ statusCode: 503, code: "RULA_IMAGE_AI_UNAVAILABLE", message: "Image analysis is temporarily unavailable. You can retry this request.", retryable: false });
    expect(classifyRulaImageFailure(Object.assign(new Error("secret"), { statusCode: 403, code: "PROVIDER_REQUEST_FAILED", retryable: false }))).toMatchObject({ statusCode: 503, code: "RULA_IMAGE_AI_UNAVAILABLE", retryable: false });
    expect(classifyRulaImageFailure(Object.assign(new Error("private malformed model text"), { code: "RULA_IMAGE_AI_INVALID_RESPONSE" }))).toMatchObject({ statusCode: 502, code: "RULA_IMAGE_AI_INVALID_RESPONSE", retryable: false });
    expect(classifyRulaImageFailure(Object.assign(new Error("private image details"), { code: "RULA_IMAGE_AI_EMPTY_OBSERVATION" }))).toMatchObject({ statusCode: 422, code: "RULA_IMAGE_AI_QUALITY_REVIEW", retryable: false });
  });
});

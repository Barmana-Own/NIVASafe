import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { ACCOUNT_IMAGE_CONSENT_VERSION, IMAGE_PROCESSING_PURPOSE } from "./image-processing-consent.js";
const mocks=vi.hoisted(()=>({ analyze:vi.fn(), audit:vi.fn(), usage:vi.fn(), permission:vi.fn() }));
vi.mock("./core.js",()=>({prisma:{aIAnalysisRequest:{create:async()=>({id:"00000000-0000-4000-8000-000000000001"}),findFirst:async()=>null},user:{findFirst:async()=>({active:true,aiEnabled:true,aiTokenLimit:1_000_000,aiTokensUsed:0})},auditLog:{findFirst:async()=>({id:"explicit-account-consent",action:"IMAGE_PROCESSING_CONSENT_ACCEPTED",createdAt:new Date("2026-10-19T00:00:00Z"),metadata:{policyVersion:ACCOUNT_IMAGE_CONSENT_VERSION,provider:"arvancloud",purpose:IMAGE_PROCESSING_PURPOSE}})}},audit:mocks.audit,envelope:(data:unknown)=>({data}),requireOrg:()=>"test-org",requirePermission:mocks.permission,parse:(schema:z.ZodType,value:unknown)=>{const result=schema.safeParse(value);if(!result.success)throw Object.assign(new Error("Invalid input"),{statusCode:400});return result.data;}}));
vi.mock("./auth-guard.js",()=>({authenticate:async(request:{headers:Record<string,string>;actor:unknown})=>{if(!request.headers.authorization)throw Object.assign(new Error("Unauthorized"),{statusCode:401});request.actor={userId:"test-user"};}}));
vi.mock("./ai-usage.js",async(importOriginal)=>({...(await importOriginal<typeof import("./ai-usage.js")>()),recordAIUsage:mocks.usage}));
vi.mock("./ai-provider.js",()=>({getAvailableAssessmentAIProvider:()=>({name:"test",analyze:mocks.analyze}),getRulaPostureImageAIProvider:()=>({name:"test",analyze:async(input:{beforeImageTransfer:()=>Promise<void>})=>{await input.beforeImageTransfer();return mocks.analyze(input);},available:()=>true,supportsImages:()=>true})}));
import {registerAssessmentRoutes} from "./modules/assessments.js";
const parts=["upperArm","lowerArm","wrist","wristTwist","neck","trunk","legs"];
const side=(score=2)=>({...Object.fromEntries(parts.map(part=>[part,{angle:part==="legs"?null:20,score:part==="wristTwist"?1:score,detected:true,confidence:0.8}])),overlay:{points:{}}});
const result=(answer:string)=>({provider:"test",model:"GPT-5-Mini",answer,citations:[],confidence:0.8,usage:{inputTokens:10,outputTokens:5,totalTokens:15}});
beforeEach(()=>vi.resetAllMocks());
async function textRequest(path:string,payload:unknown){const app=Fastify();await app.register(registerAssessmentRoutes);try{return await app.inject({method:"POST",url:path,headers:{authorization:"test"},payload:payload as Record<string,unknown>});}finally{await app.close();}}
it("recovers a malformed stage-one description and keeps it scoped to RULA",async()=>{
  mocks.analyze.mockResolvedValueOnce(result("x".repeat(600))).mockResolvedValueOnce(result("Observe arm reach and trunk posture during assembly."));
  const response=await textRequest("/api/v1/rula/task-description-suggestion",{jobTitle:"Assembly operator",taskDescription:"Manual assembly",locale:"en"});
  expect(response.statusCode).toBe(200);expect(response.json().data.descriptionSuggestion).toContain("arm reach");expect(mocks.analyze).toHaveBeenCalledTimes(2);expect(mocks.analyze.mock.calls[0]![0].message).toContain("RULA");expect(mocks.usage).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({sourceType:"RULA_TASK_DESCRIPTION_SUGGESTION",result:expect.objectContaining({usage:{inputTokens:20,outputTokens:10,totalTokens:30}})}));
});
it("records every task-description attempt when validation remains unusable",async()=>{
  mocks.analyze.mockResolvedValue(result(""));
  const response=await textRequest("/api/v1/rula/task-description-suggestion",{jobTitle:"Assembly operator",taskDescription:"Manual assembly",locale:"en"});
  expect(response.statusCode).toBe(200);expect(response.json().data).toMatchObject({descriptionSuggestion:null,aiStatus:"unavailable"});expect(mocks.analyze).toHaveBeenCalledTimes(2);expect(mocks.usage).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({sourceType:"RULA_TASK_DESCRIPTION_SUGGESTION",result:expect.objectContaining({usage:{inputTokens:20,outputTokens:10,totalTokens:30}})}));
});
it("recovers an incomplete stage-two text answer while preserving independent anatomical sides",async()=>{
  mocks.analyze.mockResolvedValueOnce(result('{"sides":{}}')).mockResolvedValueOnce(result(JSON.stringify({sides:{LEFT:side(1),RIGHT:side(2)},notes:"Text-based estimate"})));
  const response=await textRequest("/api/v1/rula/posture-analysis",{bodySide:"BOTH",jobTitle:"Assembly operator",taskDescription:"Standing assembly",force:1,muscleUse:true,locale:"en"});
  expect(response.statusCode).toBe(200);expect(response.json().data.aiStatus).toBe("connected");expect(response.json().data.sides.LEFT.upperArm.score).toBeDefined();expect(mocks.analyze).toHaveBeenCalledTimes(2);expect(mocks.analyze.mock.calls[0]![0].includeKnowledge).toBe(false);expect(mocks.usage).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({sourceType:"RULA_TEXT_REVIEW",result:expect.objectContaining({usage:{inputTokens:20,outputTokens:10,totalTokens:30}})}));
});
it("records malformed text attempts but never fabricates a fallback posture score",async()=>{
  mocks.analyze.mockResolvedValue(result(JSON.stringify({sides:{}})));
  const response=await textRequest("/api/v1/rula/posture-analysis",{bodySide:"LEFT",jobTitle:"Assembly operator",taskDescription:"Standing assembly",force:1,muscleUse:true,locale:"en"});
  expect(response.statusCode).toBe(503);expect(response.json().data).toBeUndefined();expect(response.json().code).toBe("RULA_TEXT_AI_UNAVAILABLE");expect(mocks.analyze).toHaveBeenCalledTimes(2);expect(mocks.usage).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({sourceType:"RULA_TEXT_REVIEW",result:expect.objectContaining({usage:{inputTokens:20,outputTokens:10,totalTokens:30}})}));
});
it("does not turn a provider timeout into an apparently successful posture assessment",async()=>{
  mocks.analyze.mockRejectedValue(Object.assign(new Error("private timeout detail"),{code:"PROVIDER_TIMEOUT",retryable:true}));
  const response=await textRequest("/api/v1/rula/posture-analysis",{bodySide:"BOTH",jobTitle:"Assembly operator",taskDescription:"Standing assembly",force:1,muscleUse:true,locale:"en"});
  expect(response.statusCode).toBe(503);expect(response.json().data).toBeUndefined();expect(response.body).not.toContain("private timeout detail");expect(mocks.analyze).toHaveBeenCalledOnce();
});
it.each([
  {path:"/api/v1/rula/task-description-suggestion",payload:{jobTitle:"Assembly operator",taskDescription:"Manual assembly",locale:"en"},sourceType:"RULA_TASK_DESCRIPTION_SUGGESTION",malformed:""},
  {path:"/api/v1/rula/posture-analysis",payload:{bodySide:"LEFT",jobTitle:"Assembly operator",taskDescription:"Standing assembly",force:1,muscleUse:true,locale:"en"},sourceType:"RULA_TEXT_REVIEW",malformed:"not JSON"},
])("records a completed attempt before a quota error on $path",async({path,payload,sourceType,malformed})=>{
  mocks.analyze.mockResolvedValueOnce(result(malformed)).mockRejectedValueOnce(Object.assign(new Error("quota reached"),{statusCode:429,code:"AI_ACCESS_LIMIT_REACHED"}));
  const response=await textRequest(path,payload);
  expect(response.statusCode).toBe(429);expect(mocks.usage).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({sourceType,result:expect.objectContaining({usage:{inputTokens:10,outputTokens:5,totalTokens:15}})}));
});
it("validates process measurements and automatically repairs a malformed image answer",async()=>{
  vi.stubEnv("RULA_IMAGE_PRIVACY_APPROVED_PROVIDER", "test");
  vi.stubEnv("RULA_IMAGE_VISION_SUPPORTED_PROVIDER", "test");
  mocks.analyze.mockResolvedValueOnce(result("not JSON")).mockResolvedValueOnce(result(JSON.stringify({sides:{LEFT:side()},notes:"Synthetic test posture"})));
  const app=Fastify();await app.register(multipart);await app.register(registerAssessmentRoutes);
  const boundary="rula-test-boundary";const activityInfo={jobTitle:"Assembly operator",taskDescription:"Manual assembly",durationPerOccurrence:10,durationUnit:"SECOND",loadWeight:3,loadUnit:"KG"};
  const fields=Object.entries({imageSubject:"SELF",imageAnalysisConsent:"true",imageAnalysisConsentVersion:"rula-image-consent-2026-10-19-v1",bodySide:"LEFT",jobTitle:activityInfo.jobTitle,taskDescription:activityInfo.taskDescription,activityInfo:JSON.stringify(activityInfo),locale:"en"}).map(([key,value])=>Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  const image=readFileSync(new URL("../../frontend/test-fixtures/rula-ai-synthetic.png",import.meta.url));
  const payload=Buffer.concat([...fields,Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.png"\r\nContent-Type: image/png\r\n\r\n`),image,Buffer.from(`\r\n--${boundary}--\r\n`)] as unknown as Uint8Array[]);
  try {const response=await app.inject({method:"POST",url:"/api/v1/rula/posture-image-analysis",headers:{authorization:"test","content-type":`multipart/form-data; boundary=${boundary}`},payload:payload as unknown as Uint8Array});expect(response.statusCode).toBe(200);expect(response.json().data.sides.LEFT).toBeDefined();expect(response.json().data.sides.RIGHT).toBeUndefined();expect(mocks.analyze).toHaveBeenCalledTimes(2);expect(mocks.analyze.mock.calls[0]![0].message).toContain('"loadWeight":3');}finally{await app.close();}
});
it("analyzes a synthetic image immediately when job and task context are not entered yet",async()=>{
  vi.stubEnv("RULA_IMAGE_PRIVACY_APPROVED_PROVIDER", "test");
  vi.stubEnv("RULA_IMAGE_VISION_SUPPORTED_PROVIDER", "test");
  mocks.analyze.mockResolvedValueOnce(result(JSON.stringify({sides:{RIGHT:side()},notes:"Synthetic image posture estimate"})));
  const app=Fastify();await app.register(multipart);await app.register(registerAssessmentRoutes);
  const boundary="rula-image-first-boundary";
  const fields=Object.entries({imageSubject:"SELF",imageAnalysisConsent:"true",imageAnalysisConsentVersion:"rula-image-consent-2026-10-19-v1",bodySide:"RIGHT",locale:"en"}).map(([key,value])=>Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  const image=readFileSync(new URL("../../frontend/test-fixtures/rula-ai-synthetic.png",import.meta.url));
  const payload=Buffer.concat([...fields,Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.png"\r\nContent-Type: image/png\r\n\r\n`),image,Buffer.from(`\r\n--${boundary}--\r\n`)] as unknown as Uint8Array[]);
  try {
    const response=await app.inject({method:"POST",url:"/api/v1/rula/posture-image-analysis",headers:{authorization:"test","content-type":`multipart/form-data; boundary=${boundary}`},payload:payload as unknown as Uint8Array});
    expect(response.statusCode).toBe(200);
    expect(response.json().data.sides.RIGHT).toBeDefined();
    expect(mocks.analyze).toHaveBeenCalledOnce();
    expect(mocks.analyze.mock.calls[0]![0].message).toContain("If job or task context is missing, analyze only visible posture evidence");
    expect(mocks.analyze.mock.calls[0]![0].message).toContain("Job/process: -");
  } finally { await app.close(); }
});

import Fastify from "fastify";
import multipart from "@fastify/multipart";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks=vi.hoisted(()=>({ analyze:vi.fn(), audit:vi.fn(), usage:vi.fn(), permission:vi.fn() }));
vi.mock("./core.js",()=>({prisma:{auditLog:{findFirst:async()=>({id:"explicit-account-consent",action:"IMAGE_PROCESSING_CONSENT_ACCEPTED",createdAt:new Date("2026-10-19T00:00:00Z"),metadata:{policyVersion:"image-processing-account-2026-10-19-v1"}})},user:{findFirst:async()=>({active:true,aiEnabled:true,aiTokenLimit:100000,aiTokensUsed:0})}},audit:mocks.audit,envelope:(data:unknown)=>({data}),requireOrg:()=>"test-org",requirePermission:mocks.permission,parse:(schema:z.ZodType,value:unknown)=>{const result=schema.safeParse(value);if(!result.success)throw Object.assign(new Error("Invalid input"),{statusCode:400});return result.data;}}));
vi.mock("./auth-guard.js",()=>({authenticate:async(request:{headers:Record<string,string>;actor:unknown})=>{if(!request.headers.authorization)throw Object.assign(new Error("Unauthorized"),{statusCode:401});request.actor={userId:"test-user"};}}));
vi.mock("./ai-usage.js",async(importOriginal)=>({...(await importOriginal<typeof import("./ai-usage.js")>()),recordAIUsage:mocks.usage}));
vi.mock("./ai-provider.js",()=>({getAvailableAssessmentAIProvider:()=>({name:"test",analyze:mocks.analyze}),getAssessmentImageAIProvider:()=>({name:"test",analyze:mocks.analyze,available:()=>true,supportsImages:()=>true}),getRulaPostureImageAIProvider:()=>({name:"test",analyze:mocks.analyze,available:()=>true,supportsImages:()=>true})}));
import {registerAssessmentRoutes} from "./modules/assessments.js";
const parts=["upperArm","lowerArm","wrist","wristTwist","neck","trunk","legs"];
const side=(score=2)=>({...Object.fromEntries(parts.map(part=>[part,{angle:part==="legs"?null:20,score:part==="wristTwist"?1:score,detected:true,confidence:0.8}])),overlay:{points:{}}});
const result=(answer:string)=>({provider:"test",model:"GPT-5-Mini",answer,citations:[],confidence:0.8,usage:{inputTokens:10,outputTokens:5,totalTokens:15}});
beforeEach(()=>vi.resetAllMocks());
afterEach(()=>vi.unstubAllEnvs());
async function textRequest(path:string,payload:unknown){const app=Fastify();await app.register(registerAssessmentRoutes);try{return await app.inject({method:"POST",url:path,headers:{authorization:"test"},payload:payload as Record<string,unknown>});}finally{await app.close();}}
async function fmeaImageRequest(fields:Record<string,string>){
  const app=Fastify();await app.register(multipart);await app.register(registerAssessmentRoutes);
  const boundary="fmea-image-test-boundary";
  const fieldParts=Object.entries({jobTitle:"Assembly operator",department:"Production",activityDescription:"Inspect components at the workstation.",locale:"en",...fields}).map(([key,value])=>Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  const image=readFileSync(new URL("../../frontend/test-fixtures/rula-ai-synthetic.png",import.meta.url));
  const payload=Buffer.concat([...fieldParts,Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.png"\r\nContent-Type: image/png\r\n\r\n`),image,Buffer.from(`\r\n--${boundary}--\r\n`)] as unknown as Uint8Array[]);
  try{return await app.inject({method:"POST",url:"/api/v1/fmea/process-image-analysis",headers:{authorization:"test","content-type":`multipart/form-data; boundary=${boundary}`},payload:payload as unknown as Uint8Array});}finally{await app.close();}
}
async function rulaImageRequest(fields:Record<string,string>){
  const app=Fastify();await app.register(multipart);await app.register(registerAssessmentRoutes);
  const boundary="rula-image-test-boundary";
  const fieldParts=Object.entries({bodySide:"RIGHT",locale:"en",...fields}).map(([key,value])=>Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  const image=readFileSync(new URL("../../frontend/test-fixtures/rula-ai-synthetic.png",import.meta.url));
  const payload=Buffer.concat([...fieldParts,Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.png"\r\nContent-Type: image/png\r\n\r\n`),image,Buffer.from(`\r\n--${boundary}--\r\n`)] as unknown as Uint8Array[]);
  try{return await app.inject({method:"POST",url:"/api/v1/rula/posture-image-analysis",headers:{authorization:"test","content-type":`multipart/form-data; boundary=${boundary}`},payload:payload as unknown as Uint8Array});}finally{await app.close();}
}
async function fmeaImagePolicyRequest(){const app=Fastify();await app.register(registerAssessmentRoutes);try{return await app.inject({url:"/api/v1/fmea/image-analysis-policy",headers:{authorization:"test"}});}finally{await app.close();}}
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
  const fields=Object.entries({bodySide:"LEFT",jobTitle:activityInfo.jobTitle,taskDescription:activityInfo.taskDescription,activityInfo:JSON.stringify(activityInfo),locale:"en"}).map(([key,value])=>Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
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
  const fields=Object.entries({bodySide:"RIGHT",locale:"en"}).map(([key,value])=>Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
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
it("runs the development landmark-only RULA path through the consent-gated image route",async()=>{
  vi.stubEnv("NODE_ENV","development");
  vi.stubEnv("RULA_LANDMARK_EXPERIMENT_V2","1");
  vi.stubEnv("RULA_IMAGE_PRIVACY_APPROVED_PROVIDER","test");
  vi.stubEnv("RULA_IMAGE_VISION_SUPPORTED_PROVIDER","test");
  const image=readFileSync(new URL("../../frontend/test-fixtures/rula-ai-synthetic.png",import.meta.url));
  const {width,height}=await sharp(image).metadata();
  const landmarks=[["head",.5,.12],["neck",.5,.23],["shoulder",.5,.34],["elbow",.68,.45],["wrist",.75,.6],["hand",.79,.65],["hip",.5,.56],["knee",.5,.75],["ankle",.5,.94]]
    .map(([name,x,y])=>({name,x:Math.round(Number(x)*width!),y:Math.round(Number(y)*height!),visibility:"VISIBLE",confidence:.95}));
  const answer=JSON.stringify({schemaVersion:"rula-landmarks-v2",sides:{RIGHT:{subjectId:"A",side:"RIGHT",coordinateSystem:"PIXELS",bounds:{left:Math.round(.3*width!),top:Math.round(.05*height!),right:Math.round(.85*width!),bottom:Math.round(.99*height!)},view:"SAGITTAL",facing:"IMAGE_RIGHT",up:{x:0,y:-1},legSupport:"SUPPORTED",landmarks}},notes:"Synthetic posture"});
  mocks.analyze.mockResolvedValueOnce(result(answer));
  const response=await rulaImageRequest({});
  expect(response.statusCode).toBe(200);
  expect(response.json().data).toMatchObject({provider:"test",aiStatus:"connected",sides:{RIGHT:{upperArm:{measurement:{version:"landmark-geometry-v2",trustedSource:"DETERMINISTIC_IMAGE_PLANE"}},wristTwist:{detected:false,requiresReview:true}}}});
  expect(mocks.analyze).toHaveBeenCalledOnce();
  expect(mocks.analyze.mock.calls[0]![0]).toMatchObject({imagePurpose:"rula-posture",maxOutputTokens:3000});
  expect(mocks.analyze.mock.calls[0]![0].message).toContain("NIVASAFE_RULA_LANDMARK_LOCALIZATION_V2");
  expect(mocks.audit.mock.calls.some(call=>call[1]==="RULA_IMAGE_TRANSFER_AUTHORIZED")).toBe(true);
});
it("reports FMEA image availability only when provider approvals and account consent are present",async()=>{
  vi.stubEnv("FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER","test");
  vi.stubEnv("FMEA_IMAGE_VISION_SUPPORTED_PROVIDER","test");
  const response=await fmeaImagePolicyRequest();
  expect(response.statusCode).toBe(200);
  expect(response.headers["cache-control"]).toContain("private, no-store");
  expect(response.json().data).toMatchObject({available:true,provider:"test",reasonCode:null,consentAccepted:true});
});
it("automatically analyzes FMEA images under account policy without per-image consent fields",async()=>{
  vi.stubEnv("FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER","test");
  vi.stubEnv("FMEA_IMAGE_VISION_SUPPORTED_PROVIDER","test");
  mocks.analyze.mockResolvedValue(result(JSON.stringify({summary:"Synthetic workplace scene",riskRows:[],annotations:[]})));
  const response=await fmeaImageRequest({});
  expect(response.statusCode).toBe(200);
  expect(mocks.analyze).toHaveBeenCalledOnce();
  expect(mocks.audit.mock.calls.some(call=>call[1]==="FMEA_PROCESS_IMAGE_TRANSFER_AUTHORIZED")).toBe(true);
});
it("does not report FMEA image analysis success when the provider returns malformed JSON",async()=>{
  vi.stubEnv("FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER","test");
  vi.stubEnv("FMEA_IMAGE_VISION_SUPPORTED_PROVIDER","test");
  mocks.analyze.mockResolvedValueOnce(result("not JSON")).mockResolvedValueOnce(result("not JSON"));
  const response=await fmeaImageRequest({});
  expect(response.statusCode).toBe(503);
  expect(response.json().data).toBeUndefined();
  expect(response.json().code).toBe("FMEA_IMAGE_AI_UNAVAILABLE");
  expect(mocks.analyze).toHaveBeenCalledTimes(2);
  expect(mocks.usage).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({sourceType:"FMEA_IMAGE_REVIEW",result:expect.objectContaining({usage:{inputTokens:20,outputTokens:10,totalTokens:30}})}));
  expect(mocks.audit.mock.calls.some(call=>call[1]==="FMEA_PROCESS_IMAGE_ANALYSIS")).toBe(false);
  expect(mocks.audit.mock.calls.some(call=>call[1]==="FMEA_PROCESS_IMAGE_ANALYSIS_FAILED")).toBe(true);
});
it("recovers one malformed FMEA image response and records usage for both attempts",async()=>{
  vi.stubEnv("FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER","test");
  vi.stubEnv("FMEA_IMAGE_VISION_SUPPORTED_PROVIDER","test");
  mocks.analyze.mockResolvedValueOnce(result("not JSON")).mockResolvedValueOnce(result(JSON.stringify({summary:"Synthetic workplace scene",riskRows:[],annotations:[]})));
  const response=await fmeaImageRequest({});
  expect(response.statusCode).toBe(200);
  expect(response.json().data).toMatchObject({summary:"Synthetic workplace scene",riskRows:[]});
  expect(mocks.analyze).toHaveBeenCalledTimes(2);
  expect(mocks.usage).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({sourceType:"FMEA_IMAGE_REVIEW",result:expect.objectContaining({usage:{inputTokens:20,outputTokens:10,totalTokens:30}})}));
  expect(mocks.audit.mock.calls.some(call=>call[1]==="FMEA_PROCESS_IMAGE_ANALYSIS")).toBe(true);
});
it("records a redacted, image-hashed account-policy receipt before analyzing an authorized FMEA image",async()=>{
  vi.stubEnv("FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER","test");
  vi.stubEnv("FMEA_IMAGE_VISION_SUPPORTED_PROVIDER","test");
  mocks.analyze.mockResolvedValue(result(JSON.stringify({summary:"Synthetic workplace scene",riskRows:[],annotations:[]})));
  const response=await fmeaImageRequest({});
  expect(response.statusCode).toBe(200);
  expect(response.json().data).toMatchObject({summary:"Synthetic workplace scene",provider:"test",aiStatus:"connected"});
  expect(mocks.analyze).toHaveBeenCalledOnce();
  expect(mocks.analyze.mock.calls[0]![0]).toMatchObject({userId:"test-user",organizationId:"test-org",imagePurpose:"fmea-process"});
  const receiptCall=mocks.audit.mock.calls.find(call=>call[1]==="FMEA_PROCESS_IMAGE_TRANSFER_AUTHORIZED");
  expect(receiptCall?.[4]).toMatchObject({accountConsentVersion:"image-processing-account-2026-10-19-v1",consentRecordId:"explicit-account-consent",provider:"test",requestedModel:"GPT-5-Mini",purpose:"fmea-process",imageSha256:expect.stringMatching(/^[a-f0-9]{64}$/u)});
  expect(JSON.stringify(receiptCall?.[4])).not.toContain("synthetic.png");
});

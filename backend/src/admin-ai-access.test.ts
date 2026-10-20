import Fastify from "fastify";
import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({find:vi.fn(),update:vi.fn(),audit:vi.fn()}));
vi.mock("./core.js",()=>({prisma:{user:{findUnique:mocks.find},$transaction:async(fn:any)=>fn({user:{update:mocks.update,findUnique:mocks.find},auditLog:{create:mocks.audit}})},parse:(schema:any,value:any)=>schema.parse(value),envelope:(data:any)=>({data})}));
vi.mock("./auth-guard.js",()=>({authenticate:async(req:any)=>{if(!req.headers.authorization)throw Object.assign(Error("Unauthorized"),{statusCode:401});req.actor={userId:"admin",globalRole:req.headers["x-test-role"]??"SUPER_ADMIN"}}}));
vi.mock("./modules/auth.js",()=>({checkedPassword:vi.fn()}));
import {registerAdminRoutes} from "./modules/admin.js";
const id="00000000-0000-4000-8000-000000000001";
beforeEach(()=>{vi.clearAllMocks();mocks.find.mockResolvedValue({id,aiTokenLimit:100000});mocks.update.mockResolvedValue({id,aiEnabled:false,aiTokenLimit:100000,aiTokensUsed:10,aiQuotaCycle:1});});
async function request(headers={},payload:any={aiEnabled:false}){const app=Fastify();await registerAdminRoutes(app);try{return await app.inject({method:"PATCH",url:`/api/v1/admin/users/${id}/ai-access`,headers,payload})}finally{await app.close()}}
it("requires authentication and a global administrator",async()=>{expect((await request()).statusCode).toBe(401);expect((await request({authorization:"fixture","x-test-role":"USER"})).statusCode).toBe(403);expect(mocks.update).not.toHaveBeenCalled();});
it("updates only AI access and records an audit event",async()=>{const r=await request({authorization:"fixture"});expect(r.statusCode).toBe(200);expect(mocks.update.mock.calls[0]?.[0].data).toEqual({aiEnabled:false});expect(mocks.audit.mock.calls[0]?.[0].data.action).toBe("ADMIN_AI_ACCESS_UPDATE");});
it("rejects changing token consumption via mass assignment",async()=>{expect((await request({authorization:"fixture"},{aiEnabled:true,aiTokensUsed:0})).statusCode).toBeGreaterThanOrEqual(400);expect(mocks.update).not.toHaveBeenCalled();});
it("does not create missing users",async()=>{mocks.find.mockResolvedValue(null);expect((await request({authorization:"fixture"})).statusCode).toBe(404);expect(mocks.update).not.toHaveBeenCalled();});

it("starts a new quota-notification cycle on an allowance edit without resetting usage",async()=>{const r=await request({authorization:"fixture"},{aiTokenLimit:2000000});expect(r.statusCode).toBe(200);expect(mocks.update.mock.calls[0]?.[0].data).toEqual({aiTokenLimit:2000000,aiQuotaCycle:{increment:1}});expect(mocks.update.mock.calls[0]?.[0].data).not.toHaveProperty("aiTokensUsed");expect(mocks.audit.mock.calls[0]?.[0].data.metadata).toEqual({aiTokenLimit:2000000});});
it.each([-1,1.5,2147483648,"1000000",null])("rejects invalid token limit %s",async aiTokenLimit=>{expect((await request({authorization:"fixture"},{aiTokenLimit})).statusCode).toBeGreaterThanOrEqual(400);expect(mocks.update).not.toHaveBeenCalled();});
it("rejects empty allowance updates",async()=>{expect((await request({authorization:"fixture"},{})).statusCode).toBeGreaterThanOrEqual(400);expect(mocks.update).not.toHaveBeenCalled();});
it.each([{globalRole:"USER"},{active:false},{globalRole:"USER",protectedSystemAdmin:false}])("blocks protected administrator changes from another super administrator",async payload=>{mocks.find.mockResolvedValue({id,protectedSystemAdmin:true,active:true,globalRole:"SUPER_ADMIN"});const app=Fastify();await registerAdminRoutes(app);try{const r=await app.inject({method:"PATCH",url:"/api/v1/admin/users/"+id,headers:{authorization:"fixture"},payload});expect(r.statusCode).toBe(403);expect(r.json().code).toBe("PROTECTED_SYSTEM_ADMIN");expect(mocks.update).not.toHaveBeenCalled();}finally{await app.close()}});

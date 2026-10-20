import Fastify from "fastify";
import {expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({update:vi.fn(),membershipUpdate:vi.fn()}));
vi.mock("./core.js",()=>({
 prisma:{organizationMember:{findFirst:async()=>({userId:"protected-user",role:"HSE_MANAGER"})},$transaction:async(fn:any)=>fn({user:{findUnique:async()=>({protectedSystemAdmin:true}),update:mocks.update},organizationMember:{update:mocks.membershipUpdate}})},
 parse:(schema:any,value:any)=>schema.parse(value),envelope:(data:any)=>({data}),requireOrg:()=>"org",requirePermission:()=>{},requireAnyPermission:()=>{},requireRole:()=>{},audit:vi.fn(),ROLE_PERMISSIONS:{},tokenHash:vi.fn()
}));
vi.mock("./auth-guard.js",()=>({authenticate:async(req:any)=>{req.actor={userId:"other-admin",role:"SUPER_ADMIN",globalRole:"SUPER_ADMIN"}}}));
vi.mock("./mail.js",()=>({scheduleEmail:vi.fn()}));
import {registerUserRoutes} from "./modules/users.js";
it("blocks demotion of the protected account through the alternate membership API",async()=>{
 const app=Fastify();await registerUserRoutes(app);
 try{const r=await app.inject({method:"PATCH",url:"/api/v1/members/00000000-0000-4000-8000-000000000001",payload:{globalRole:"USER"}});expect(r.statusCode).toBe(403);expect(r.json().code).toBe("PROTECTED_SYSTEM_ADMIN");expect(mocks.update).not.toHaveBeenCalled();expect(mocks.membershipUpdate).not.toHaveBeenCalled();}finally{await app.close()}
});

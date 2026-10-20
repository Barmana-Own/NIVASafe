import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { assertAIAccess, withAIAllowance, DEFAULT_AI_TOKEN_LIMIT } from "./ai-access.js";
const input = { userId: "u", organizationId: "o", message: "test", includeKnowledge: false, maxOutputTokens: 100 };
const result = { provider: "fixture", answer: "ok", citations: [], confidence: 1, usage: { inputTokens: 20, outputTokens: 30, totalTokens: 50 } };
function fixture(overrides = {}) {
  const user = { active: true, aiEnabled: true, aiTokenLimit: 100000, aiTokensUsed: 0, ...overrides };
  const reservations = new Map<string, number>();
  let queue = Promise.resolve();
  const tx = { $queryRaw: vi.fn(), user: { findUnique: vi.fn(async () => user), update: vi.fn(async ({ data }) => { user.aiTokensUsed += data.aiTokensUsed.increment; }) }, aIQuotaReservation: { deleteMany: vi.fn(async ({ where }) => { if (where.id) reservations.delete(where.id); }), aggregate: vi.fn(async () => ({ _sum: { tokens: [...reservations.values()].reduce((a,b) => a+b,0) } })), create: vi.fn(async ({ data }) => { reservations.set(data.id, data.tokens); }) } };
  const db = { user: { findUnique: vi.fn(async () => user) }, notification: { createMany: vi.fn(async () => ({ count: 1 })) }, $transaction: (fn: (tx: unknown) => Promise<unknown>) => { const pending = queue.then(() => fn(tx)); queue = pending.then(() => undefined, () => undefined); return pending; } };
  return { user, reservations, tx, db: db as unknown as PrismaClient };
}
describe("per-user AI allowance", () => {
  it.each([{ aiEnabled: false }, { active: false }])("blocks disabled/inactive users before any provider call", async overrides => { const f=fixture(overrides), run=vi.fn(); await expect(withAIAllowance(input,run,f.db)).rejects.toMatchObject({code:"AI_ACCESS_DISABLED"}); expect(run).not.toHaveBeenCalled(); });
  it("blocks exhausted allowance", () => { expect(() => assertAIAccess({active:true,aiEnabled:true,aiTokenLimit:100000,aiTokensUsed:100000})).toThrow(); });
  it("charges reported usage and releases reservation", async () => { const f=fixture(); await withAIAllowance(input,async () => result,f.db); expect(f.user.aiTokensUsed).toBe(50); expect(f.reservations.size).toBe(0); });
  it("releases failed and offline calls without charging", async () => { const f=fixture(); await expect(withAIAllowance(input,async () => {throw Error("offline")},f.db)).rejects.toThrow("offline"); await withAIAllowance(input,async () => ({...result,provider:"fallback"}),f.db); expect(f.user.aiTokensUsed).toBe(0);expect(f.reservations.size).toBe(0); });
  it("prevents concurrent calls reserving the same remaining allowance", async () => { const f=fixture({aiTokenLimit:1000}); let release!:()=>void; const gate=new Promise<void>(r=>{release=r}); const first=withAIAllowance(input,async()=>{await gate;return result},f.db); await vi.waitFor(()=>expect(f.reservations.size).toBe(1)); const run=vi.fn(); await expect(withAIAllowance(input,run,f.db)).rejects.toMatchObject({code:"AI_ACCESS_LIMIT_REACHED"});expect(run).not.toHaveBeenCalled();release();await first; });
  it("rejects missing user identity", async () => {const f=fixture();await expect(withAIAllowance({...input,userId:undefined},vi.fn(),f.db)).rejects.toMatchObject({code:"AI_ACCESS_IDENTITY_REQUIRED"});});
  it("charges a conservative estimate when a provider omits usage", async () => { const f=fixture();await withAIAllowance(input,async()=>({...result,usage:undefined}),f.db); expect(f.user.aiTokensUsed).toBeGreaterThan(100);expect(f.reservations.size).toBe(0); });
});

it("allows an efficient vision request within the remaining 14588-token allowance", async () => {
 const f = fixture({aiTokensUsed:85412});
 const scoped = {...input, image:{mimeType:"image/png",base64:"fixture"},maxOutputTokens:3000,message:"x".repeat(2546)};
 const run=vi.fn(async()=>result);
 await withAIAllowance(scoped,run,f.db,3000);
 expect(run).toHaveBeenCalledOnce(); expect(f.user.aiTokensUsed).toBe(85462);expect(f.reservations.size).toBe(0);
 await expect(withAIAllowance(scoped,run,f.db,50000)).rejects.toMatchObject({code:"AI_ACCESS_LIMIT_REACHED"});
 expect(run).toHaveBeenCalledOnce();
});

it("uses a million-token default while preserving accumulated usage", async () => {
  expect(DEFAULT_AI_TOKEN_LIMIT).toBe(1_000_000);
  const f = fixture({ aiTokenLimit: DEFAULT_AI_TOKEN_LIMIT, aiTokensUsed: 100_000 });
  await withAIAllowance(input, async () => result, f.db);
  expect(f.user.aiTokensUsed).toBe(100_050);
  expect(f.reservations.size).toBe(0);
  expect(() => assertAIAccess({ active: true, aiEnabled: true, aiTokenLimit: DEFAULT_AI_TOKEN_LIMIT, aiTokensUsed: 1_000_000 })).toThrow();
});

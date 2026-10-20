import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("../../api/client", () => ({ api: mocks.api }));
import { rulaAiRequest } from "./rulaAiRequest";
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());
it("retries a transient image failure once and returns the actual recovered result", async () => {
  mocks.api.mockRejectedValueOnce(Object.assign(new Error("Unavailable"), { status: 503, retryable: true })).mockResolvedValueOnce({ data: { aiStatus: "connected", provider: "arvancloud", score: 5 } });
  const result = rulaAiRequest("/rula/posture-image-analysis", { method: "POST" }); await vi.runAllTimersAsync(); expect((await result).data).toMatchObject({ score: 5 }); expect(mocks.api).toHaveBeenCalledTimes(2);
});
it("does not retry non-retryable 503 image capability/configuration failures", async () => {
  mocks.api.mockRejectedValue(Object.assign(new Error("Vision unavailable"), { status: 503, code: "RULA_IMAGE_AI_UNAVAILABLE", retryable: false }));
  await expect(rulaAiRequest("/rula/posture-image-analysis", { method: "POST" })).rejects.toMatchObject({ retryable: false });
  expect(mocks.api).toHaveBeenCalledTimes(1);
});
it("does not retry malformed image analysis responses", async () => {
  mocks.api.mockRejectedValue(Object.assign(new Error("Invalid response"), { status: 502, code: "RULA_IMAGE_AI_INVALID_RESPONSE", retryable: false }));
  await expect(rulaAiRequest("/rula/posture-image-analysis", { method: "POST" })).rejects.toMatchObject({ code: "RULA_IMAGE_AI_INVALID_RESPONSE" });
  expect(mocks.api).toHaveBeenCalledTimes(1);
});
it("does not automatically repeat an image upload after an ambiguous network drop", async () => {
  mocks.api.mockRejectedValue(Object.assign(new Error("Connection dropped"), { code: "NETWORK_ERROR" }));
  await expect(rulaAiRequest("/rula/posture-image-analysis", { method: "POST" })).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  expect(mocks.api).toHaveBeenCalledTimes(1);
});
it("retries unavailable suggestions but does not retry successful real vision fallback", async () => {
  mocks.api.mockResolvedValueOnce({ data: { aiStatus: "unavailable", reasonCode: "AI_INVALID_RESPONSE" } }).mockResolvedValueOnce({ data: { aiStatus: "connected" } });
  const result = rulaAiRequest("/rula/action-suggestions", {}); await vi.runAllTimersAsync(); expect((await result).data).toMatchObject({ aiStatus: "connected" });
 mocks.api.mockClear().mockResolvedValue({ data: { aiStatus: "fallback", provider: "arvancloud", model: "GPT-5-Mini" } }); await rulaAiRequest("/rula/posture-image-analysis", {}); expect(mocks.api).toHaveBeenCalledTimes(1);
});
it.each([400, 401, 403, 413, 415])("does not retry status %s", async status => {
  mocks.api.mockRejectedValue(Object.assign(new Error("Rejected"), { status })); await expect(rulaAiRequest("/rula/posture-analysis", {})).rejects.toMatchObject({ status }); expect(mocks.api).toHaveBeenCalledTimes(1);
});
it("stops retries when the assessment context changes or the page is left", async () => {
  const controller = new AbortController(); mocks.api.mockRejectedValue(Object.assign(new Error("Unavailable"), { status: 503 }));
  const result = rulaAiRequest("/rula/posture-analysis", { signal: controller.signal }); const rejection = expect(result).rejects.toMatchObject({ name: "AbortError" }); await vi.advanceTimersByTimeAsync(0); controller.abort(); await rejection; expect(mocks.api).toHaveBeenCalledTimes(1);
});
it("stops after a second transient failure", async () => {
  mocks.api.mockRejectedValue(Object.assign(new Error("Unavailable"), { status: 503 })); const result = rulaAiRequest("/rula/posture-analysis", {}); const rejection = expect(result).rejects.toMatchObject({ status: 503 }); await vi.runAllTimersAsync(); await rejection; expect(mocks.api).toHaveBeenCalledTimes(2);
});

it("does not retry a depleted user allowance", async () => {
  mocks.api.mockRejectedValue(Object.assign(new Error("Quota exhausted"), { status: 429, code: "AI_ACCESS_LIMIT_REACHED" }));
  await expect(rulaAiRequest("/rula/posture-analysis", {})).rejects.toMatchObject({ code: "AI_ACCESS_LIMIT_REACHED" });
  expect(mocks.api).toHaveBeenCalledTimes(1);
});

it("automatically recovers an image on the third attempt without changing its photo or side", async () => {
 const body=new FormData();body.append("bodySide","LEFT");body.append("file",new Blob(["photo"],{type:"image/png"}),"photo.png");
 mocks.api.mockRejectedValueOnce(Object.assign(new Error("Unavailable"),{status:503,retryable:true})).mockRejectedValueOnce(Object.assign(new Error("Timeout"),{status:504,retryable:true})).mockResolvedValueOnce({data:{provider:"arvancloud",aiStatus:"connected",sides:{LEFT:{score:4}}}});
 const result=rulaAiRequest("/rula/posture-image-analysis",{method:"POST",body});await vi.runAllTimersAsync();expect((await result).data).toMatchObject({sides:{LEFT:{score:4}}});expect(mocks.api).toHaveBeenCalledTimes(3);expect(mocks.api.mock.calls.every(call=>call[1].body===body)).toBe(true);
});
it("rejects unavailable image responses without retrying or claiming analysis succeeded", async()=>{
 mocks.api.mockResolvedValue({data:{provider:"fallback",aiStatus:"unavailable"}});await expect(rulaAiRequest("/rula/posture-image-analysis",{})).rejects.toMatchObject({code:"RULA_IMAGE_AI_UNAVAILABLE",retryable:false});expect(mocks.api).toHaveBeenCalledTimes(1);
});

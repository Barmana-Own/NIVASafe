import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: mocks.spawn }));
import { detectRulaLocalPose, isRulaLocalPoseConfigured, RULA_POSE_PROTOCOL, RULA_POSE_SOURCE } from "./rula-pose-provider.js";

class Worker extends EventEmitter {
  stdin = new PassThrough();
  stdout = new PassThrough();
  stderr = new PassThrough();
  kill = vi.fn(() => true);
}
type Request = { protocol: string; requestId: string; image: { mimeType: string; base64: string; width: number; height: number } };
type Reply = {
  protocol: string; requestId: string; modelSha256: string; width: number; height: number;
  poses: { landmarks: { name: string; x: number; y: number; visibility: number; presence?: number }[] }[];
};
const modelBytes = Buffer.from("isolated-model-fixture-not-a-production-model");
const modelSha256 = createHash("sha256").update(modelBytes).digest("hex");
const image = { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]), width: 1200, height: 800, normalized: true as const };
let directory: string;
let modelPath: string;
let workerPath: string;
let worker: Worker | undefined;

function reply(request: Request): Reply {
  return {
    protocol: RULA_POSE_PROTOCOL, requestId: request.requestId, modelSha256,
    width: request.image.width, height: request.image.height,
    poses: [{ landmarks: [
      { name: "right_shoulder", x: .71, y: .32, visibility: .95, presence: .99 },
      { name: "left_shoulder", x: .66, y: .34, visibility: .12, presence: .9 },
    ] }],
  };
}
function setWorker(handler?: (request: Request, child: Worker) => void) {
  mocks.spawn.mockImplementation(() => {
    worker = new Worker();
    const child = worker;
    const chunks: Buffer[] = [];
    child.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stdin.on("finish", () => handler?.(JSON.parse(Buffer.concat(chunks).toString("utf8")) as Request, child));
    return child;
  });
}
function successfulWorker(change?: (response: Reply) => unknown) {
  setWorker((request, child) => {
    child.stdout.write(JSON.stringify(change ? change(reply(request)) : reply(request)));
    queueMicrotask(() => child.emit("close", 0));
  });
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "nivasafe-pose-boundary-"));
  modelPath = join(directory, "fixture.task");
  workerPath = join(directory, "worker.py");
  await writeFile(modelPath, modelBytes);
  await writeFile(workerPath, "# isolated process-boundary fixture\n");
});
beforeEach(() => {
  mocks.spawn.mockReset();
  worker = undefined;
  vi.stubEnv("RULA_POSE_PYTHON", process.execPath);
  vi.stubEnv("RULA_POSE_WORKER_PATH", workerPath);
  vi.stubEnv("RULA_POSE_MODEL_PATH", modelPath);
  vi.stubEnv("RULA_POSE_MODEL_SHA256", modelSha256);
});
afterEach(() => {
  // A failed process remains busy until close; explicitly reap every fake worker.
  worker?.emit("close", 1);
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  const expectedPrefix = join(tmpdir(), "nivasafe-pose-boundary-");
  if (!directory.startsWith(expectedPrefix)) throw new Error("Unexpected fixture cleanup path");
  await rm(directory, { recursive: true });
});

describe("server-local pose boundary", () => {
  it("uses a pinned local model, isolated Python and a secret-free shell-free process", async () => {
    vi.stubEnv("DATABASE_URL", "must-not-enter-worker");
    vi.stubEnv("ARVANCLOUD_API_KEY", "must-not-enter-worker");
    setWorker((request, child) => {
      expect(request).toMatchObject({ protocol: RULA_POSE_PROTOCOL, image: { mimeType: "image/png", width: 1200, height: 800 } });
      expect(Buffer.from(request.image.base64, "base64")).toEqual(image.buffer);
      child.stdout.write(JSON.stringify(reply(request)));
      queueMicrotask(() => child.emit("close", 0));
    });
    const result = await detectRulaLocalPose(image);
    expect(result).toMatchObject({ source: RULA_POSE_SOURCE, width: 1200, height: 800, modelSha256 });
    expect(result.poses[0]?.landmarks[0]).toEqual({ name: "right_shoulder", x: .71, y: .32, visibility: .95, presence: .99 });
    expect(result.poses[0]?.landmarks[1]?.name).toBe("left_shoulder");
    const [command, args, options] = mocks.spawn.mock.calls[0]!;
    expect(command).toBe(process.execPath);
    expect(args).toEqual(["-I", "-u", workerPath, "--model", modelPath, "--model-sha256", modelSha256]);
    expect(options).toMatchObject({ shell: false, windowsHide: true, cwd: directory });
    expect(options.env).not.toHaveProperty("DATABASE_URL");
    expect(options.env).not.toHaveProperty("ARVANCLOUD_API_KEY");
    expect(options.env).not.toHaveProperty("PYTHONPATH");
  });

  it("accepts an explicit no-person response without inventing template landmarks", async () => {
    successfulWorker((response) => ({ ...response, poses: [] }));
    expect((await detectRulaLocalPose(image)).poses).toEqual([]);
  });

  it.each([
    ["request ID", (response: Reply) => ({ ...response, requestId: "ab597e1d-7573-45cd-a61a-72254e78c953" })],
    ["dimensions", (response: Reply) => ({ ...response, width: 800, height: 1200 })],
    ["model hash", (response: Reply) => ({ ...response, modelSha256: "0".repeat(64) })],
    ["protocol", (response: Reply) => ({ ...response, protocol: "different-protocol" })],
    ["unknown fields", (response: Reply) => ({ ...response, debugImage: image.buffer.toString("base64") })],
    ["too many subjects", (response: Reply) => ({ ...response, poses: [response.poses[0], response.poses[0], response.poses[0]] })],
    ["duplicate landmarks", (response: Reply) => ({ ...response, poses: [{ landmarks: [response.poses[0]!.landmarks[0], response.poses[0]!.landmarks[0]] }] })],
    ["unrecognized landmark", (response: Reply) => ({ ...response, poses: [{ landmarks: [{ name: "guessed_joint", x: .5, y: .5, visibility: .9 }] }] })],
    ["out-of-frame point", (response: Reply) => ({ ...response, poses: [{ landmarks: [{ name: "right_ankle", x: 1.01, y: .5, visibility: .9 }] }] })],
    ["non-finite point", (response: Reply) => ({ ...response, poses: [{ landmarks: [{ name: "right_ankle", x: Number.NaN, y: .5, visibility: .9 }] }] })],
  ])("rejects mismatched or malformed %s without returning model coordinates", async (_name, change) => {
    successfulWorker(change);
    await expect(detectRulaLocalPose(image)).rejects.toMatchObject({ code: "RULA_POSE_RESPONSE_INVALID", statusCode: 503, retryable: false });
  });

  it("bounds subprocess output and terminates the offending worker", async () => {
    setWorker((_request, child) => child.stdout.write("x".repeat(64 * 1024 + 1)));
    await expect(detectRulaLocalPose(image)).rejects.toMatchObject({ code: "RULA_POSE_RESPONSE_INVALID" });
    expect(worker?.kill).toHaveBeenCalledOnce();
  });

  it("rejects concurrent expensive inference rather than queueing uploads", async () => {
    let request: Request | undefined;
    setWorker((value) => { request = value; });
    const first = detectRulaLocalPose(image);
    await vi.waitFor(() => expect(request).toBeDefined());
    await expect(detectRulaLocalPose(image)).rejects.toMatchObject({ code: "RULA_POSE_BUSY", statusCode: 429 });
    expect(mocks.spawn).toHaveBeenCalledOnce();
    worker!.stdout.write(JSON.stringify(reply(request!)));
    worker!.emit("close", 0);
    await expect(first).resolves.toHaveProperty("source", RULA_POSE_SOURCE);
  });

  it("times out at twenty seconds and retains the slot until process exit is confirmed", async () => {
    vi.useFakeTimers();
    setWorker();
    const pending = expect(detectRulaLocalPose(image)).rejects.toMatchObject({ code: "RULA_POSE_TIMEOUT", statusCode: 503 });
    await vi.waitFor(() => expect(mocks.spawn).toHaveBeenCalledOnce());
    await vi.advanceTimersByTimeAsync(20_001);
    await pending;
    expect(worker?.kill).toHaveBeenCalledOnce();
    await expect(detectRulaLocalPose(image)).rejects.toMatchObject({ code: "RULA_POSE_BUSY" });
    worker!.emit("close", 1);
    successfulWorker();
    await expect(detectRulaLocalPose(image)).resolves.toHaveProperty("source", RULA_POSE_SOURCE);
  });

  it("withholds inference for a changed model before starting Python", async () => {
    vi.stubEnv("RULA_POSE_MODEL_SHA256", "0".repeat(64));
    await expect(detectRulaLocalPose(image)).rejects.toMatchObject({ code: "RULA_POSE_UNAVAILABLE" });
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it.each(["RULA_POSE_PYTHON", "RULA_POSE_WORKER_PATH", "RULA_POSE_MODEL_PATH", "RULA_POSE_MODEL_SHA256"])("fails closed on missing %s", async (name) => {
    vi.stubEnv(name, "");
    expect(isRulaLocalPoseConfigured()).toBe(false);
    await expect(detectRulaLocalPose(image)).rejects.toMatchObject({ code: "RULA_POSE_UNAVAILABLE" });
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it("rejects remote/relative execution paths and invalid decoded-image frames", async () => {
    vi.stubEnv("RULA_POSE_WORKER_PATH", "relative-worker.py");
    expect(isRulaLocalPoseConfigured()).toBe(false);
    vi.stubEnv("RULA_POSE_WORKER_PATH", "\\\\remote-host\\share\\worker.py");
    expect(isRulaLocalPoseConfigured()).toBe(false);
    await expect(detectRulaLocalPose({ ...image, width: 0 })).rejects.toMatchObject({ code: "RULA_POSE_IMAGE_INVALID" });
    await expect(detectRulaLocalPose({ ...image, buffer: Buffer.from("not a PNG") })).rejects.toMatchObject({ code: "RULA_POSE_IMAGE_INVALID" });
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it("hides worker crashes and diagnostics from the caller", async () => {
    setWorker((_request, child) => {
      child.stderr.write("private-path-and-untrusted-worker-diagnostic");
      queueMicrotask(() => child.emit("close", 1));
    });
    await expect(detectRulaLocalPose(image)).rejects.toMatchObject({ code: "RULA_POSE_UNAVAILABLE" });
    await expect(detectRulaLocalPose(image)).rejects.not.toThrow("private-path");
  });
});

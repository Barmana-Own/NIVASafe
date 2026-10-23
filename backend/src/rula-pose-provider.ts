import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { z } from "zod";

export const RULA_POSE_PROTOCOL = "nivasafe-rula-pose-v1";
export const RULA_POSE_SOURCE = "MEDIAPIPE_POSE_LANDMARKER";
export const rulaPoseLandmarkNames = [
  "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner", "right_eye", "right_eye_outer",
  "left_ear", "right_ear", "mouth_left", "mouth_right", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "left_pinky", "right_pinky", "left_index", "right_index", "left_thumb", "right_thumb",
  "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle", "left_heel", "right_heel",
  "left_foot_index", "right_foot_index",
] as const;

const probability = z.number().finite().min(0).max(1);
const landmarkSchema = z.object({
  name: z.enum(rulaPoseLandmarkNames),
  x: probability,
  y: probability,
  /** Detector visibility and presence are not calibrated ergonomic accuracy. */
  visibility: probability,
  presence: probability.optional(),
}).strict();
const poseSchema = z.object({
  // Out-of-frame/unsupported points are omitted by the worker, never clamped.
  landmarks: z.array(landmarkSchema).min(1).max(33).refine(
    (points) => new Set(points.map((point) => point.name)).size === points.length,
    "Duplicate pose landmark",
  ),
}).strict();
const responseSchema = z.object({
  protocol: z.literal(RULA_POSE_PROTOCOL),
  requestId: z.string().uuid(),
  width: z.number().int().positive().max(16384),
  height: z.number().int().positive().max(16384),
  modelSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  poses: z.array(poseSchema).max(2),
}).strict();

export type RulaLocalPoseResult = Omit<z.infer<typeof responseSchema>, "protocol" | "requestId"> & {
  source: typeof RULA_POSE_SOURCE;
};
export type RulaPoseLandmark = z.infer<typeof landmarkSchema>;
export type RulaNormalizedPoseImage = { buffer: Buffer; width: number; height: number; normalized: true };

type Configuration = { pythonPath: string; workerPath: string; modelPath: string; modelSha256: string };
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_MODEL_BYTES = 64 * 1024 * 1024;
const MAX_STDOUT_BYTES = 64 * 1024;
const INFERENCE_TIMEOUT_MS = 20_000;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
let inferenceActive = false;

function failure(code = "RULA_POSE_UNAVAILABLE", statusCode = 503) {
  return Object.assign(new Error("Local posture localization is unavailable; continue with manual review or retry later."), {
    code, statusCode, retryable: false,
  });
}

function configuration(): Configuration | null {
  const pythonPath = process.env.RULA_POSE_PYTHON;
  const workerPath = process.env.RULA_POSE_WORKER_PATH;
  const modelPath = process.env.RULA_POSE_MODEL_PATH;
  const modelSha256 = process.env.RULA_POSE_MODEL_SHA256;
  // The operator selects local artifacts. No paths or execution options come from uploads.
  if (![pythonPath, workerPath, modelPath].every((path) => path && isAbsolute(path) && !/^[/\\]{2}/u.test(path))
      || !modelSha256 || !/^[a-f0-9]{64}$/u.test(modelSha256)) return null;
  return { pythonPath: pythonPath!, workerPath: workerPath!, modelPath: modelPath!, modelSha256 };
}

/** Configuration presence only; artifact/model validation is enforced for every inference. */
export function isRulaLocalPoseConfigured() {
  return configuration() !== null;
}

export function isRulaLocalPoseEnabled() {
  return process.env.RULA_LOCAL_POSE_ENABLED === "true";
}

async function verifyArtifacts(config: Configuration) {
  try {
    const [python, worker, model] = await Promise.all([
      stat(config.pythonPath), stat(config.workerPath), stat(config.modelPath),
    ]);
    if (!python.isFile() || !worker.isFile() || !model.isFile() || worker.size < 1 || worker.size > 1024 * 1024
        || model.size < 1 || model.size > MAX_MODEL_BYTES) throw failure();
    const modelHash = createHash("sha256").update(await readFile(config.modelPath)).digest("hex");
    if (modelHash !== config.modelSha256) throw failure();
  } catch {
    throw failure();
  }
}

function workerEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP", "LANG", "LC_ALL"]) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  return {
    ...env,
    PYTHONDONTWRITEBYTECODE: "1", PYTHONNOUSERSITE: "1", PYTHONUNBUFFERED: "1",
    OMP_NUM_THREADS: "1", OPENBLAS_NUM_THREADS: "1", TF_CPP_MIN_LOG_LEVEL: "3",
  };
}

/** CPU inference stays on this server. No image file, generic shell, network, or generative fallback is used. */
export async function detectRulaLocalPose(image: RulaNormalizedPoseImage): Promise<RulaLocalPoseResult> {
  if (image.normalized !== true || !Buffer.isBuffer(image.buffer) || image.buffer.length < 8
      || image.buffer.length > MAX_IMAGE_BYTES || !image.buffer.subarray(0, 8).equals(pngSignature)
      || ![image.width, image.height].every((size) => Number.isInteger(size) && size > 0 && size <= 16384)
      || image.width * image.height > 24_000_000) throw failure("RULA_POSE_IMAGE_INVALID", 415);
  if (inferenceActive) throw failure("RULA_POSE_BUSY", 429);
  const config = configuration();
  if (!config) throw failure();
  inferenceActive = true;
  let childRunning = false;
  try {
    await verifyArtifacts(config);
    const requestId = randomUUID();
    return await new Promise<RulaLocalPoseResult>((resolve, reject) => {
      let settled = false;
      let stdoutBytes = 0;
      const stdout: Buffer[] = [];
      const child = spawn(config.pythonPath, [
        "-I", "-u", config.workerPath, "--model", config.modelPath, "--model-sha256", config.modelSha256,
      ], { shell: false, windowsHide: true, cwd: dirname(config.workerPath), env: workerEnvironment(), stdio: ["pipe", "pipe", "pipe"] });
      childRunning = true;
      const finish = (error?: Error, result?: RulaLocalPoseResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) {
          child.kill();
          reject(error);
        } else resolve(result!);
      };
      const timer = setTimeout(() => finish(failure("RULA_POSE_TIMEOUT")), INFERENCE_TIMEOUT_MS);
      child.on("error", () => finish(failure()));
      child.stdin.on("error", () => finish(failure()));
      child.stdout.on("data", (chunk: Buffer | string) => {
        if (settled) return;
        const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        stdoutBytes += data.length;
        if (stdoutBytes > MAX_STDOUT_BYTES) finish(failure("RULA_POSE_RESPONSE_INVALID"));
        else stdout.push(data);
      });
      // Drain diagnostics without logging or exposing paths, image bytes, or process environment.
      child.stderr.resume();
      child.on("close", (code) => {
        childRunning = false;
        inferenceActive = false;
        if (settled) return;
        if (code !== 0) return finish(failure());
        try {
          const response = responseSchema.parse(JSON.parse(Buffer.concat(stdout).toString("utf8")));
          if (response.requestId !== requestId || response.width !== image.width || response.height !== image.height
              || response.modelSha256 !== config.modelSha256) throw failure();
          finish(undefined, {
            source: RULA_POSE_SOURCE, modelSha256: response.modelSha256,
            width: response.width, height: response.height, poses: response.poses,
          });
        } catch {
          finish(failure("RULA_POSE_RESPONSE_INVALID"));
        }
      });
      child.stdin.end(`${JSON.stringify({
        protocol: RULA_POSE_PROTOCOL, requestId,
        image: { mimeType: "image/png", base64: image.buffer.toString("base64"), width: image.width, height: image.height },
      })}\n`);
    });
  } finally {
    // A killed worker retains the slot until its exit is confirmed. A failed kill
    // must not permit a second expensive inference beside an unresponsive process.
    if (!childRunning) inferenceActive = false;
  }
}

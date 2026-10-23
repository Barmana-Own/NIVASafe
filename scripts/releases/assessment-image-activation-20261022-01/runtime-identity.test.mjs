import { test } from "node:test";
import assert from "node:assert/strict";
import { assertApiRuntimeIdentity } from "./runtime-identity.mjs";

const app = { script: "C:/ProgramData/NIVASafe/releases/new/backend/dist/server.js", interpreter: "C:/Runtime/node/node.exe" };
const managed = { name: "nivasafe-api", pid: 1234, pm2_env: { pm_exec_path: app.script, APP_VERSION: "new" } };
const actual = { ProcessId: 1234, CommandLine: '"C:\\Runtime\\node\\node.exe" C:/ProgramData/NIVASafe/releases/new/backend/dist/server.js' };

test("accepts matching manager, OS executable and listening process", () => assertApiRuntimeIdentity(managed, app, actual, 1234));
test("rejects new version label attached to old PM2 executable", () => assert.throws(() => assertApiRuntimeIdentity({ ...managed, pm2_env: { ...managed.pm2_env, pm_exec_path: "C:/old/server.js" } }, app, actual, 1234)));
test("rejects new PM2 path when OS still runs old executable", () => assert.throws(() => assertApiRuntimeIdentity(managed, app, { ...actual, CommandLine: "C:/Runtime/node/node.exe C:/old/server.js" }, 1234)));
test("rejects another process owning the listening socket", () => assert.throws(() => assertApiRuntimeIdentity(managed, app, actual, 5678)));
test("rejects matching path present only as an argument to the wrong entry", () => assert.throws(() => assertApiRuntimeIdentity(managed, app, { ...actual, CommandLine: `C:/Runtime/node/node.exe C:/old/server.js ${app.script}` }, 1234)));

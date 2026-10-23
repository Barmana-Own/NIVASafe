import assert from "node:assert/strict";

const normalized = value => String(value).replaceAll("\\", "/").toLowerCase();

/** A version label alone does not identify the executable that serves requests. */
export function assertApiRuntimeIdentity(managed, app, osProcess, listenerPid) {
  assert.equal(managed.name, "nivasafe-api");
  assert.equal(normalized(managed.pm2_env.pm_exec_path), normalized(app.script), "Managed executable path mismatch");
  assert(Number.isSafeInteger(managed.pid) && managed.pid > 0, "Missing managed process");
  assert.equal(osProcess.ProcessId, managed.pid, "OS process identity mismatch");
  assert.equal(listenerPid, managed.pid, "API listener belongs to another process");
  const command = osProcess.CommandLine.match(/"[^"]+"|\S+/gu)?.map(part => part.replace(/^"|"$/gu, "")) ?? [];
  assert.equal(normalized(command[0]), normalized(app.interpreter), "Unexpected interpreter");
  assert.equal(normalized(command[1]), normalized(app.script), "OS process is running another executable");
}

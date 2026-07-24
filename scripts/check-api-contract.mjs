import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readFiles = (dir, suffix) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? readFiles(full, suffix) : entry.name.endsWith(suffix) ? [full] : [];
});

const backendText = readFiles(path.join(root, "apps/api/src"), ".ts").map((file) => fs.readFileSync(file, "utf8")).join("\n");
const frontendText = readFiles(path.join(root, "apps/web/src"), ".tsx").concat(readFiles(path.join(root, "apps/web/src"), ".ts")).map((file) => fs.readFileSync(file, "utf8")).join("\n");

const backend = [...backendText.matchAll(/app\.(?:get|post|patch|delete|put)\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1].replace(/^\/api\/v1/, ""));
const calls = [...frontendText.matchAll(/(?:api|download|useLoad)(?:<[^>]+>)?\(\s*(["'`])([\s\S]*?)\1/g)]
  .map((m) => m[2])
  .filter((value) => value.startsWith("/"))
  .map((value) => value.replace(/\$\{[^}]+\}/g, ":param"))
  .filter((value) => !value.includes("${"));

const unique = [...new Set(calls)].sort();
const matches = (front, back) => {
  const a = front.split("/").filter(Boolean);
  const b = back.split("/").filter(Boolean);
  if (a.length !== b.length) return false;
  return a.every((segment, index) => segment === ":param" || b[index]?.startsWith(":") || segment === b[index]);
};
const missing = unique.filter((front) => !backend.some((back) => matches(front, back)));
console.log(`Frontend API paths: ${unique.length}`);
console.log(`Backend routes: ${backend.length}`);
if (missing.length) {
  console.error("Missing backend matches:");
  missing.forEach((item) => console.error(` - ${item}`));
  process.exit(1);
}
console.log("[OK] Every frontend API path has a matching backend route.");

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import { root, task, id, evidence, candidate, sha } from "./prepare.mjs";

export function databaseConnection() {
  process.loadEnvFile(`${root}/.env`);
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.protocol, "mysql:");
  const database = decodeURIComponent(url.pathname.slice(1));
  assert(/^[A-Za-z0-9_]+$/u.test(database));
  const args = ["--no-defaults", "--protocol=tcp", `--host=${url.hostname}`, `--port=${url.port || "3306"}`, `--user=${decodeURIComponent(url.username)}`, "--default-character-set=utf8mb4"];
  const env = { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) };
  const sql = (input, selected = true) => {
    const result = spawnSync("C:/Runtime/mariadb/bin/mysql.exe", [...args, "--batch", "--raw", "--skip-column-names", ...(selected ? [database] : [])], { input, env, encoding: "utf8", windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
    assert(!result.error && result.status === 0, "Private database command failed; credentials and SQL output withheld");
    return result.stdout.trim();
  };
  return { args, env, database, sql };
}

export function preflight() {
  const connection = databaseConnection();
  const hasHistory = connection.sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations';") === "1";
  const history = hasHistory ? connection.sql("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name;").split("\n").filter(Boolean) : [];
  const unfinished = hasHistory ? Number(connection.sql("SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL;")) : 0;
  const result = { status: unfinished ? "BLOCKED_UNFINISHED_MIGRATION" : "PASS_READ_ONLY", at: new Date().toISOString(), hasMigrationHistory: hasHistory, history, unfinished, tables: Number(connection.sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE();")), attachments: Number(connection.sql("SELECT COUNT(*) FROM Attachment;")), rawCredentialsExposed: false };
  fs.writeFileSync(`${evidence}/database-preflight.json`, JSON.stringify(result, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ status: result.status, hasMigrationHistory: hasHistory, appliedMigrations: history.length, unfinished, tables: result.tables, attachments: result.attachments }));
  return result;
}

export async function backupDatabase(directory) {
  assert.equal(path.resolve(directory).toLowerCase(), path.resolve(`C:/ProgramData/NIVASafe/backups/${id}`).toLowerCase());
  const connection = databaseConnection(), destination = `${directory}/database.sql`;
  const descriptor = fs.openSync(destination, "wx");
  const child = spawn("C:/Runtime/mariadb/bin/mysqldump.exe", [...connection.args, "--single-transaction", "--quick", "--hex-blob", "--routines", "--triggers", connection.database], { env: connection.env, windowsHide: true, shell: false, stdio: ["ignore", descriptor, "pipe"] });
  let errorOutput = "";
  child.stderr.on("data", value => { if (errorOutput.length < 100000) errorOutput += value; });
  const code = await new Promise(resolve => { child.once("error", () => resolve(-1)); child.once("close", value => resolve(value ?? -1)); });
  fs.closeSync(descriptor);
  if (code !== 0) { fs.writeFileSync(`${directory}/database-backup-error.private.txt`, errorOutput, { flag: "wx" }); throw new Error("Private database backup failed; production schema has not been changed"); }
  const stats = fs.statSync(destination);
  assert(stats.size > 1000);
  const record = { status: "PASS", task, path: destination, bytes: stats.size, sha256: sha(destination), singleTransaction: true, privateAcl: true, containsProductionData: true, neverPublished: true };
  fs.writeFileSync(`${evidence}/database-backup.json`, JSON.stringify(record, null, 2), { flag: "wx" });
  return record;
}

if (process.argv.includes("--preflight")) preflight();

import { mkdirSync, createWriteStream } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const url = new URL(process.env.DATABASE_URL ?? "");
if (url.protocol !== "mysql:") throw new Error("DATABASE_URL must use mysql://");
const directory = resolve(process.env.BACKUP_DIR ?? "backups");
mkdirSync(directory, { recursive: true });
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const file = resolve(directory, `nivasafe-${stamp}.sql`);
const binary = process.env.MYSQLDUMP_BIN ?? "mysqldump";
const child = spawn(binary, ["--single-transaction", "--routines", "--triggers", "--default-character-set=utf8mb4", "-h", url.hostname, "-P", url.port || "3306", "-u", decodeURIComponent(url.username), decodeURIComponent(url.pathname.slice(1))], { env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) }, stdio: ["ignore", "pipe", "inherit"] });
child.stdout.pipe(createWriteStream(file));
child.on("exit", (code) => { if (code) process.exit(code); else process.stdout.write(`${file}\n`); });

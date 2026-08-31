import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const input = resolve(process.env.RESTORE_FILE ?? process.argv[2] ?? "");
if (!input || !existsSync(input)) throw new Error("Set RESTORE_FILE or pass a SQL backup path");
const url = new URL(process.env.DATABASE_URL ?? "");
if (url.protocol !== "mysql:") throw new Error("DATABASE_URL must use mysql://");
const binary = process.env.MYSQL_BIN ?? "mysql";
const child = spawn(binary, ["--default-character-set=utf8mb4", "-h", url.hostname, "-P", url.port || "3306", "-u", decodeURIComponent(url.username), decodeURIComponent(url.pathname.slice(1))], { env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) }, stdio: ["pipe", "inherit", "inherit"] });
createReadStream(input).pipe(child.stdin);
child.on("exit", (code) => process.exit(code ?? 1));

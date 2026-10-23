import { defineConfig } from "vitest/config";
import { unitTestDatabaseUrl } from "./test/database-isolation";

// The package test script selects Vite's runner config loader so esbuild does
// not scan ACL-protected Windows profile parents for isolated workspaces.
export default defineConfig({
  // Test configuration is injected by the runner. Do not load backend/.env
  // while collecting tests because it contains runtime credentials.
  envDir: false,
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    env: { DATABASE_URL: unitTestDatabaseUrl(process.env.NIVASAFE_TEST_DATABASE_URL), AI_ENABLED: "false", SMTP_HOST: "127.0.0.1", SMTP_PORT: "1", SMTP_USER: "", SMTP_PASS: "" },
    setupFiles: ["./test/setup.ts"],
  },
});

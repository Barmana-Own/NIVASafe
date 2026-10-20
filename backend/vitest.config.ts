import { defineConfig } from "vitest/config";

// The package test script selects Vite's runner config loader so esbuild does
// not scan ACL-protected Windows profile parents for isolated workspaces.
export default defineConfig({
  // Test configuration is injected by the runner. Do not load backend/.env
  // while collecting tests because it contains runtime credentials.
  envDir: false,
});

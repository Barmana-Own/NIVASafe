import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // The workspace root is the parent of the frontend package. Using ../..
  // makes Vite scan the entire drive on Windows while loading env files.
  envDir: fileURLToPath(new URL("..", import.meta.url)),
  server: {
    host: "0.0.0.0",
    port: 5043,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 5043,
    strictPort: true,
  },
});

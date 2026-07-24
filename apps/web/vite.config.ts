import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
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

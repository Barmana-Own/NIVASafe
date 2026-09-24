import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite resolves its production flag before the config callback runs. The
// repository-level `.env` is intentionally configured for local development,
// so set the process mode early for build/preview commands to keep React from
// emitting the development-only jsxDEV runtime into production assets.
const productionCommand = process.argv.some((argument) => argument === "build" || argument === "preview");
if (productionCommand) {
  process.env.NODE_ENV = "production";
}

export default defineConfig(({ mode }) => {
  // Keep a developer's repository `.env` from selecting React's development
  // runtime during an otherwise production Vite build. This also prevents
  // development-only console output from being shipped to the live bundle.
  process.env.NODE_ENV = mode === "production" ? "production" : "development";

  return {
    plugins: [react()],
    define: {
      // React's package exports can still see the repository's loaded `.env`
      // value during dependency resolution; define the same value for the
      // final bundle so production builds never ship the development runtime.
      "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
    },
    // Explicitly override Vite's JSX transform as well as NODE_ENV. Vite reads
    // NODE_ENV before the config callback, so an environment file can otherwise
    // leave `config.isProduction` false and emit calls to React's unavailable
    // production `jsxDEV` export.
    esbuild: {
      jsxDev: mode !== "production",
    },
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
  };
});

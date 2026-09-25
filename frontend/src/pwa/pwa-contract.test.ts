import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));
const manifest = JSON.parse(readFileSync(`${publicDirectory}/manifest.webmanifest`, "utf8")) as {
  id: string;
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
};
const serviceWorker = readFileSync(`${publicDirectory}/sw.js`, "utf8");
const favicon = readFileSync(`${publicDirectory}/favicon-white.svg`, "utf8");
const appIcon = readFileSync(`${publicDirectory}/icon.svg`, "utf8");
const indexHtml = readFileSync(fileURLToPath(new URL("../../index.html", import.meta.url)), "utf8");
const manager = readFileSync(fileURLToPath(new URL("./PwaManager.tsx", import.meta.url)), "utf8");

describe("PWA release contract", () => {
  it("contains installable desktop and mobile manifest metadata", () => {
    expect(manifest.id).toBe("/");
    expect(manifest.name).toBe("NIVASafe");
    expect(manifest.short_name).toBe("NIVASafe");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" }),
      expect.objectContaining({ src: "/icon-512.png", sizes: "512x512", purpose: "any maskable" }),
      expect.objectContaining({ src: "/icon.svg", type: "image/svg+xml", purpose: "any" }),
    ]));
  });

  it("keeps service-worker updates bounded and isolated from private API data", () => {
    expect(serviceWorker).toContain("const VERSION = \"v15\";");
    expect(serviceWorker).toContain("const FORCE_MIGRATION = VERSION === \"v15\";");
    expect(serviceWorker).toContain("if (FORCE_MIGRATION) self.skipWaiting();");
    expect(serviceWorker).toContain('self.clients.matchAll({ type: "window", includeUncontrolled: true })');
    expect(serviceWorker).toContain("client.navigate(client.url)");
    expect(serviceWorker).toContain("new AbortController()");
    expect(serviceWorker).toContain("async function precacheShell()");
    expect(serviceWorker).toContain("function cacheRequestFor(request)");
    expect(serviceWorker).toContain('url.pathname === "/sw.js"');
    expect(serviceWorker).toContain('url.pathname === "/manifest.webmanifest"');
    expect(serviceWorker).toContain('url.pathname.startsWith("/api/")');
    expect(serviceWorker).toContain('url.pathname.startsWith("/docs")');
    expect(serviceWorker).toContain('url.pathname.startsWith("/uploads/")');
    expect(serviceWorker).toContain('"/favicon-white.svg"');
    expect(serviceWorker).toContain('event.data?.type === "SKIP_WAITING"');
    expect(serviceWorker).toContain("self.clients.claim()");
  });

  it("uses a self-contained white-backed NIVASafe favicon for the browser title", () => {
    expect(indexHtml).toContain('<link rel="icon" type="image/svg+xml" href="/favicon-white.svg"/>');
    expect(indexHtml).toContain('<meta name="application-name" content="NIVASafe"/>');
    expect(indexHtml).toContain("<title>NIVASafe</title>");
    expect(indexHtml).not.toContain("NIVASafe | مدیریت ایمنی");
    expect(favicon).toContain('<rect width="64" height="64" rx="9" fill="#ffffff"/>');
    expect(favicon).toContain('href="data:image/png;base64,');
    expect(appIcon).toContain('href="data:image/png;base64,');
    expect(appIcon).not.toContain('fill="#0b6b61"');
  });

  it("registers the worker without browser cache pinning and checks for releases", () => {
    expect(manager).toContain('register("/sw.js", { updateViaCache: "none" })');
    expect(manager).toContain('window.addEventListener("pageshow"');
    expect(manager).toContain('window.addEventListener("online"');
    expect(manager).toContain("UPDATE_CHECK_INTERVAL");
    expect(manager).toContain('waiting.postMessage({ type: "SKIP_WAITING" })');
    expect(manager).toContain("UPDATE_RELOAD_TIMEOUT");
  });
});

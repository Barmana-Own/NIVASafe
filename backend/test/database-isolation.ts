const unreachableUnitDatabase = "mysql://unit_test:unit_test@127.0.0.1:1/nivasafe_test_unreachable?connect_timeout=1";

/** A missed unit-test mock must never inherit the application's live database. */
export function unitTestDatabaseUrl(override: string | undefined): string {
  if (!override) return unreachableUnitDatabase;
  let url: URL;
  try { url = new URL(override); } catch { throw new Error("Invalid disposable unit-test database configuration"); }
  if (url.protocol !== "mysql:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.port !== "53306" || !/^\/nivasafe_test_[a-z0-9_]+$/.test(url.pathname) || url.search || url.hash) throw new Error("Unit-test database override must target an explicitly named disposable loopback test schema on port 53306");
  return url.toString();
}

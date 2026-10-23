import { expect, it } from "vitest";
import { unitTestDatabaseUrl } from "./database-isolation";

it("replaces inherited runtime credentials with an unreachable unit database", () => {
  const url = new URL(unitTestDatabaseUrl(undefined));
  expect(url.hostname).toBe("127.0.0.1");
  expect(url.port).toBe("1");
  expect(url.pathname).toBe("/nivasafe_test_unreachable");
  expect(process.env.DATABASE_URL).toContain("nivasafe_test_");
});
it.each([
  "mysql://user:secret@127.0.0.1:3306/nivasafe",
  "mysql://user:secret@production.example:53306/nivasafe_test_fixture",
  "mysql://user:secret@127.0.0.1:53306/nivasafe",
  "mysql://user:secret@127.0.0.1:53306/nivasafe_test_fixture?socket=/production.sock",
  "postgres://user:secret@127.0.0.1:53306/nivasafe_test_fixture",
])("rejects an unsafe unit database override %#", url => {
  expect(() => unitTestDatabaseUrl(url)).toThrow();
});
it("allows only the explicit disposable test server and schema convention", () => {
  expect(unitTestDatabaseUrl("mysql://unit_test:unit_test@127.0.0.1:53306/nivasafe_test_fixture")).toContain(":53306/nivasafe_test_fixture");
});
it("denies unmocked provider HTTP by default", async () => {
  await expect(fetch("https://api.arvancloudai.ir/v1/chat/completions")).rejects.toThrow("External HTTP is disabled");
});

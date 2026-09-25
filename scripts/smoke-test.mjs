const base = (process.env.SMOKE_API_URL ?? "http://localhost:5044/api/v1").replace(/\/+$/, "");
const email = process.env.SMOKE_EMAIL ?? "admin@nivasafe.local";
const password = process.env.SMOKE_PASSWORD ?? "Demo123!";
const created = {};
let accessToken = "";
let orgId = "";

async function request(path, options = {}, expected = [200, 201, 202]) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body == null || options.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(orgId ? { "x-organization-id": orgId } : {}),
      ...options.headers,
    },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("json") ? await response.json() : await response.arrayBuffer();
  if (!expected.includes(response.status)) throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status}: ${JSON.stringify(data)}`);
  process.stdout.write(`[OK] ${options.method ?? "GET"} ${path} (${response.status})\n`);
  return data;
}
const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });
const patch = (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) });
const del = (path) => request(path, { method: "DELETE" });

async function main() {
  const health = await request("/health");
  if (health.data.database !== "up" || health.data.databaseEngine !== "mysql") throw new Error("Health check did not confirm MySQL");
  const login = await post("/auth/login", { email, password });
  accessToken = login.data.accessToken;
  orgId = login.data.organizations?.[0]?.id;
  if (!orgId) throw new Error("Smoke user has no active organization");

  for (const path of ["/profile", "/organizations/current", "/dashboard", "/projects", "/processes", "/activities", "/fmea", "/rula", "/actions", "/files", "/knowledge", "/knowledge/categories", "/ai/providers", "/ai/requests", "/chat/conversations", "/notifications", "/notifications/preferences", "/members", "/roles", "/activity-log", "/audit"]) await request(path);

  const suffix = Date.now().toString(36);
  created.project = (await post("/projects", { name: `Smoke ${suffix}`, code: `SMK-${suffix}`, description: "Automated delivery smoke test" })).data.id;
  created.process = (await post("/processes", { projectId: created.project, name: `Process ${suffix}` })).data.id;
  created.activity = (await post("/activities", { projectId: created.project, processId: created.process, title: `Activity ${suffix}`, location: "Test" })).data.id;
  created.fmea = (await post("/fmea", { projectId: created.project, activityId: created.activity, title: `FMEA ${suffix}`, code: `F-${suffix}` })).data.id;
  created.fmeaItem = (await post(`/fmea/${created.fmea}/items`, { rowNumber: 1, processStep: "Test", failureMode: "Failure", effect: "Effect", cause: "Cause", severity: 4, occurrence: 3, detection: 2 })).data.id;
  await request(`/reports/fmea/${created.fmea}.pdf`);
  await request(`/reports/fmea/${created.fmea}.xlsx`);
  await request(`/reports/fmea/${created.fmea}.docx`);
  created.rula = (await post("/rula", { projectId: created.project, activityId: created.activity, title: `RULA ${suffix}`, bodySide: "RIGHT", inputs: { upperArm: 2, lowerArm: 2, wrist: 2, wristTwist: 1, neck: 2, trunk: 2, legs: 1, muscleUse: false, force: 0 } })).data.id;
  await request(`/reports/rula/${created.rula}.pdf`);
  await request(`/reports/rula/${created.rula}.xlsx`);
  await request(`/reports/rula/${created.rula}.docx`);
  created.action = (await post("/actions", { projectId: created.project, fmeaId: created.fmea, title: `Action ${suffix}`, description: "Automated test action", priority: "MEDIUM" })).data.id;
  await patch(`/actions/${created.action}`, { status: "COMPLETED" });
  created.category = (await post("/knowledge/categories", { name: `Category ${suffix}` })).data.id;
  created.knowledge = (await post("/knowledge", { title: `Knowledge ${suffix}`, content: "Automated knowledge document", tags: ["smoke"], categoryId: created.category })).data.id;
  created.conversation = (await post("/chat/conversations", { title: `Conversation ${suffix}`, projectId: created.project })).data.id;
  await post(`/chat/conversations/${created.conversation}/messages`, { content: "راهنمای کنترل ریسک چیست؟" });
  await post("/ai/requests", { type: "RISK_GUIDANCE", provider: "fallback", message: "راهنمای کنترل ریسک" });

  const form = new FormData();
  form.append("file", new Blob(["NIVASafe smoke file"], { type: "text/plain" }), `smoke-${suffix}.txt`);
  created.file = (await request("/files", { method: "POST", body: form })).data.id;
  await request(`/files/${created.file}/download`);

  await del(`/files/${created.file}`);
  await del(`/knowledge/${created.knowledge}`);
  await del(`/knowledge/categories/${created.category}`);
  await del(`/actions/${created.action}`);
  await del(`/fmea/${created.fmea}/items/${created.fmeaItem}`);
  await del(`/fmea/${created.fmea}`);
  await del(`/rula/${created.rula}`);
  await del(`/activities/${created.activity}`);
  await del(`/processes/${created.process}`);
  await del(`/projects/${created.project}`);
  process.stdout.write("\nNIVASafe runtime smoke test completed successfully.\n");
}

main().catch((error) => { console.error(`\n[FAILED] ${error.stack ?? error}`); process.exitCode = 1; });

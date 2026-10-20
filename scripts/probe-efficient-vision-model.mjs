// Historical name retained; this is a text-only probe, not posture-image acceptance.
const requestedModel = "GPT-5-Mini";
const gateway = new URL(process.env.ARVAN_BASE_URL ?? "https://api.arvancloudai.ir/v1");
if (gateway.href.replace(/\/+$/u, "") !== "https://api.arvancloudai.ir/v1") throw new Error("Approved ArvanCloud assessment gateway is required.");
const credential = process.env.ARVAN_API_KEY?.trim();
if (!credential) throw new Error("Approved provider credential is unavailable.");
const response = await fetch(`${gateway.href.replace(/\/+$/u, "")}/chat/completions`, {
  method: "POST",
  headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: requestedModel, messages: [{ role: "user", content: "Reply OK." }], max_completion_tokens: 256 }),
  signal: AbortSignal.timeout(45_000),
});
const payload = await response.json().catch(() => ({}));
const effectiveModel = typeof payload.model === "string" && /^(?:gpt-5-mini(?:-\d{4}-\d{2}-\d{2})?|openai\/gpt-5-mini)$/iu.test(payload.model) ? payload.model : null;
const hasAnswer = typeof payload.choices?.[0]?.message?.content === "string" && payload.choices[0].message.content.trim().length > 0;
console.log(JSON.stringify({ status: response.status, requestedModel, effectiveModel, accepted: response.ok && Boolean(effectiveModel) && hasAnswer }));
if (!response.ok || !effectiveModel || !hasAnswer) process.exitCode = 1;

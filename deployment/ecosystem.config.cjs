// Non-secret production AI profile. Provision ARVAN_API_KEY in the server
// environment once; it must never be included in this tracked file.
const productionAI = {
  AI_ENABLED: "true", AI_DEFAULT_PROVIDER: "arvancloud",
  AI_CHAT_PROVIDER: "arvancloud", AI_CHAT_MODEL: "DeepSeek-V4-Flash",
  AI_RISK_PROVIDER: "arvancloud", AI_RISK_MODEL: "GPT-5-Mini",
  AI_RISK_FALLBACK_PROVIDER: "arvancloud", AI_RISK_FALLBACK_MODEL: "GPT-5-Mini",
  ARVAN_BASE_URL: "https://api.arvancloudai.ir/v1",
};
module.exports = {
  apps: [
    {
      name: "nivasafe-api",
      cwd: ".",
      script: "backend/dist/server.js",
      interpreter: "C:\\Runtime\\node\\node.exe",
      instances: 1,
      exec_mode: "fork",
      env: { ...productionAI, NODE_ENV: "production", HOST: "127.0.0.1", APP_URL: "https://app.nivasafe.com", PORT: 5044 },
      max_memory_restart: "750M",
      time: true,
    },
    {
      name: "nivasafe-worker",
      cwd: "./backend",
      script: "dist/worker.js",
      interpreter: "C:\\Runtime\\node\\node.exe",
      instances: 1,
      exec_mode: "fork",
      env: { ...productionAI, NODE_ENV: "production" },
      max_memory_restart: "500M",
      time: true,
    },
  ],
};

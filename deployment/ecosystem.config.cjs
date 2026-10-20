// Non-secret production AI profile. Provision ARVAN_API_KEY in the server
// environment once; it must never be included in this tracked file.
const productionAI = {
  AI_ENABLED: "true", AI_DEFAULT_PROVIDER: "arvancloud",
  AI_CHAT_PROVIDER: "arvancloud",
  AI_RISK_PROVIDER: "arvancloud", AI_RISK_FALLBACK_PROVIDER: "arvancloud",
  RULA_IMAGE_PRIVACY_APPROVED_PROVIDER: "",
  RULA_IMAGE_VISION_SUPPORTED_PROVIDER: "",
  FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER: "",
  FMEA_IMAGE_VISION_SUPPORTED_PROVIDER: "",
  ARVAN_BASE_URL: "https://api.arvancloudai.ir/v1",
};
module.exports = {
  apps: [
    {
      name: "nivasafe-api",
      cwd: "C:\\NIVASafe",
      script: "C:\\ProgramData\\NIVASafe\\releases\\release-rula-account-consent-20261019-01\\backend\\dist\\server.js",
      interpreter: "C:\\Runtime\\node\\node.exe",
      instances: 1,
      exec_mode: "fork",
      env: { ...productionAI, NODE_ENV: "production", HOST: "127.0.0.1", APP_URL: "https://app.nivasafe.com", PORT: 5044, APP_VERSION: "release-rula-account-consent-20261019-01" },
      max_memory_restart: "750M",
      time: true,
    },
    {
      name: "nivasafe-worker",
      cwd: "C:\\NIVASafe",
      script: "C:\\ProgramData\\NIVASafe\\releases\\release-20261019-safe-r8-uiux-handoff\\backend\\dist\\worker.js",
      interpreter: "C:\\Runtime\\node\\node.exe",
      instances: 1,
      exec_mode: "fork",
      env: { ...productionAI, NODE_ENV: "production", APP_VERSION: "release-20261019-safe-r8-uiux-handoff" },
      max_memory_restart: "500M",
      time: true,
    },
  ],
};

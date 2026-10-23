// Non-secret production AI profile. Provision ARVAN_API_KEY in the server
// environment once; it must never be included in this tracked file.
const productionAI = {
  AI_ENABLED: "true", AI_DEFAULT_PROVIDER: "arvancloud",
  AI_CHAT_PROVIDER: "arvancloud",
  AI_RISK_PROVIDER: "arvancloud", AI_RISK_FALLBACK_PROVIDER: "arvancloud",
  RULA_IMAGE_PRIVACY_APPROVED_PROVIDER: "",
  RULA_IMAGE_VISION_SUPPORTED_PROVIDER: "arvancloud",
  FMEA_IMAGE_PRIVACY_APPROVED_PROVIDER: "",
  FMEA_IMAGE_VISION_SUPPORTED_PROVIDER: "",
  ARVAN_BASE_URL: "https://api.arvancloudai.ir/v1",
};
module.exports = {
  apps: [
    {
      name: "nivasafe-api",
      cwd: "C:\\NIVASafe",
      script: "C:/ProgramData/NIVASafe/releases/release-rula-review-population-20261023-01/backend/dist/server.js",
      interpreter: "C:\\Runtime\\node\\node.exe",
      instances: 1,
      exec_mode: "fork",
      env: { ...productionAI, NODE_ENV: "production", HOST: "127.0.0.1", APP_URL: "https://app.nivasafe.com", PORT: 5044, APP_VERSION: "release-rula-review-population-20261023-01",
        RULA_LOCAL_POSE_ENABLED: "true",
        RULA_POSE_PYTHON: "C:/ProgramData/NIVASafe/runtimes/rula-pose-20261022/python.exe",
        RULA_POSE_WORKER_PATH: "C:/ProgramData/NIVASafe/releases/release-rula-landmark-accuracy-20261022-01/backend/python/rula_pose_worker.py",
        RULA_POSE_MODEL_PATH: "C:/ProgramData/NIVASafe/models/rula-pose-20261022/pose_landmarker_full.task",
        RULA_POSE_MODEL_SHA256: "5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1",
        // Explicit owner-authorized operation; vendor retention/training terms remain unverified.
        RULA_IMAGE_PROCESSING_ENABLED_PROVIDER: "arvancloud",
        FMEA_IMAGE_PROCESSING_ENABLED_PROVIDER: "arvancloud",
        FMEA_IMAGE_VISION_SUPPORTED_PROVIDER: "arvancloud",
      },
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

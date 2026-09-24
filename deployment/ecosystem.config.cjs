module.exports = {
  apps: [
    {
      name: "nivasafe-api",
      cwd: ".",
      script: "backend/dist/server.js",
      interpreter: "C:\\Runtime\\node\\node.exe",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production", HOST: "127.0.0.1", APP_URL: "https://app.nivasafe.com", PORT: 5044 },
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
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
      time: true,
    },
  ],
};

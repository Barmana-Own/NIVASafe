module.exports = {
  apps: [
    {
      name: "nivasafe-api",
      cwd: "./apps/api",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production", PORT: 5044 },
      max_memory_restart: "750M",
      time: true,
    },
    {
      name: "nivasafe-worker",
      cwd: "./apps/api",
      script: "dist/worker.js",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
      time: true,
    },
  ],
};

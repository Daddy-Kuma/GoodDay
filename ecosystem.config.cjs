module.exports = {
  apps: [
    {
      name: "worldcup-odds-pwa",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: "8081",
        CACHE_TTL_MS: "45000",
      },
      max_memory_restart: "256M",
    },
  ],
};

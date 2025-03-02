module.exports = {
  apps: [
    {
      name: "divine-backend",
      script: "index.js",
      args: "run start",
      watch: false,
      env: {
        NODE_ENV: "local",
        PORT: 4200,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 4200,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8000,
      },
    },
  ],
};

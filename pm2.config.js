module.exports = {
  apps: [
    {
      name: "divine-backend",
      script: "npm",
      args: "run prod",
      watch: false,
      env: {
        NODE_ENV: "local",
        PORT: 4200, // specify the port for the development environment
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8000, // specify the port for the production environment
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 4200, // specify the port for the production environment
      },
    },
  ],
};

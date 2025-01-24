module.exports = {
  apps: [
    {
      name: 'classified-website-api',
      script: 'npm',
      args: 'run start',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3306 // specify the port for the development environment
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3306 // specify the port for the production environment
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3306 // specify the port for the production environment
      }
    }
  ]
};


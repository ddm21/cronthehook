// PM2 Ecosystem configuration file
//
// To customize:
// - Change the API port: set PORT in your .env or add to env section below
// - Change the worker schedule: edit cron_restart (e.g., '*/5 * * * *' for every 5 minutes)
// - Add more environment variables: add to env section
// - Change script paths if your entry points are different
// - For more info: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: 'cronthehook-api',
      script: 'index.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        // PORT: 3000, // Uncomment to override API port
      },
    },
    {
      name: 'cronthehook-worker',
      script: 'worker/index.js',
      watch: false,
      // Change the cron expression below to adjust how often the worker runs
      // E.g., '*/5 * * * *' for every 5 minutes, '0 * * * *' for every hour
      cron_restart: '* * * * *', // every minute
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}; 
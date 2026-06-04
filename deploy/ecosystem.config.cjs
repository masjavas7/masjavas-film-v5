module.exports = {
  apps: [
    {
      name: 'masjavas-film-v5',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        SERVE_STATIC: 'true',
        PORT: 3000,
        LOG_ACCESS: 'true'
      },
      max_memory_restart: '1G',
      error_file: './server/logs/pm2-error.log',
      out_file: './server/logs/pm2-out.log'
    }
  ]
};
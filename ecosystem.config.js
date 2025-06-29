module.exports = {
  apps: [
    {
      name: 'star-citizen-bot',
      script: 'index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      // Redémarrage automatique en cas d'erreur
      max_restarts: 10,
      min_uptime: '10s',
      // Variables d'environnement spécifiques
      env_production: {
        NODE_ENV: 'production',
        SCRAPE_INTERVAL_HOURS: 6
      }
    },
    {
      name: 'howmeship-panel',
      script: 'web-panel.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        WEB_PORT: 3001
      },
      error_file: './logs/panel-err.log',
      out_file: './logs/panel-out.log',
      log_file: './logs/panel-combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};

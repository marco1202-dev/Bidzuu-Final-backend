export default {
  apps: [
    {
      name: 'bidzuu-backend',
      script: 'dist/index.js',
      cwd: '/root/Bidzuu-Final-backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 7777
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 7777
      },
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git', 'dist'],
      autorestart: true,
      exp_backoff_restart_delay: 100,
      pmx: true,
      merge_logs: true,
      source_map_support: false
    }
  ]
};

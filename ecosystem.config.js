/**
 * PM2 process configuration for the Arkeza Referral Bot.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 reload ecosystem.config.js   # zero-downtime reload after code change
 *   pm2 logs arkeza-bot
 *   pm2 monit
 *
 * After saving once: `pm2 save && pm2 startup` so the bot restarts on reboot.
 */

module.exports = {
  apps: [
    {
      name: 'arkeza-bot',
      script: 'index.js',
      cwd: __dirname,
      // Single instance only — running multiple Telegram bots with the same
      // token causes 409 Conflict errors. Do NOT increase to >1.
      instances: 1,
      exec_mode: 'fork',
      // Restart policy: if the bot crashes, give up after 10 quick restarts to
      // avoid silent crash-loops eating disk via log spam.
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 2000,
      // Resource limits — the bot is light; if it grows past this something
      // is probably leaking and a restart helps.
      max_memory_restart: '300M',
      // Logging
      out_file: './logs/arkeza-bot.out.log',
      error_file: './logs/arkeza-bot.err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // dotenv handles .env at runtime; PM2 doesn't need to inject env.
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

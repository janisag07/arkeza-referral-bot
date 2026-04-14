/**
 * Express webhook server for the Arkeza Telegram Bot.
 *
 * Two responsibilities:
 *   1. Receive Telegram Bot updates (replaces long-polling, fixes 409 Conflict)
 *      → POST {WEBHOOK_TELEGRAM_PATH}  (default: /webhook/telegram)
 *      → secured via X-Telegram-Bot-Api-Secret-Token header.
 *
 *   2. Receive Arkeza backend events (milestones + admin announcements)
 *      → POST {ARKEZA_WEBHOOK_PATH}  (default: /webhook/arkeza)
 *      → optionally secured via X-Arkeza-Signature header (shared secret).
 *
 *   Plus GET /health for uptime checks.
 */

const express = require('express');
const { webhookCallback } = require('grammy');

const PORT = parseInt(process.env.PORT || '3000', 10);
const TELEGRAM_PATH = process.env.WEBHOOK_TELEGRAM_PATH || '/webhook/telegram';
const ARKEZA_PATH = process.env.ARKEZA_WEBHOOK_PATH || '/webhook/arkeza';
const TG_SECRET = process.env.WEBHOOK_SECRET_TOKEN || '';
const ARKEZA_SECRET = process.env.ARKEZA_WEBHOOK_SECRET || '';

/**
 * Create and start the Express server.
 *
 * @param {object} opts
 * @param {import('grammy').Bot} opts.bot
 * @param {(payload: object) => Promise<void>} opts.onArkezaEvent
 * @param {() => object} [opts.getStatus] Optional status snapshot for /health
 */
function startWebhookServer({ bot, onArkezaEvent, getStatus }) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // ---- Health ----
  app.get('/health', (_req, res) => {
    const base = {
      ok: true,
      service: 'arkeza-bot',
      uptime_seconds: Math.floor(process.uptime()),
      time: new Date().toISOString(),
    };
    let extra = {};
    try {
      if (getStatus) extra = getStatus() || {};
    } catch (e) {
      extra = { status_error: e.message };
    }
    res.json({ ...base, ...extra });
  });

  // ---- Telegram updates ----
  // grammY's webhookCallback handles secret-token verification when secretToken is set.
  app.post(
    TELEGRAM_PATH,
    webhookCallback(bot, 'express', {
      secretToken: TG_SECRET || undefined,
    })
  );

  // ---- Arkeza milestone / announcement events ----
  app.post(ARKEZA_PATH, async (req, res) => {
    if (ARKEZA_SECRET) {
      const provided = req.get('X-Arkeza-Signature') || req.get('x-arkeza-signature');
      if (provided !== ARKEZA_SECRET) {
        console.warn('[webhook] arkeza event rejected: bad/missing signature');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
    }

    try {
      const payload = req.body || {};
      console.log(`[webhook] arkeza event received: ${payload.event || 'unknown'}`);
      // Always ack first per spec recommendation, then process async.
      res.json({ success: true });
      Promise.resolve(onArkezaEvent(payload)).catch((err) => {
        console.error('[webhook] arkeza handler threw:', err.message);
      });
    } catch (err) {
      console.error('[webhook] arkeza route error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Internal error' });
      }
    }
  });

  // ---- 404 ----
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Not found: ${req.method} ${req.path}` });
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`🌐 Webhook server listening on :${PORT}`);
      console.log(`   • Telegram updates → POST ${TELEGRAM_PATH}`);
      console.log(`   • Arkeza events    → POST ${ARKEZA_PATH}`);
      console.log(`   • Health           → GET  /health`);
      resolve(server);
    });
  });
}

module.exports = {
  startWebhookServer,
  paths: {
    telegram: TELEGRAM_PATH,
    arkeza: ARKEZA_PATH,
  },
};

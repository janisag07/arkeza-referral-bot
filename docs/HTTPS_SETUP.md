# HTTPS Setup for Telegram Webhooks

Telegram requires HTTPS for webhook URLs. The bot will work in **long-polling
mode** without HTTPS (just leave `WEBHOOK_BASE_URL` empty in `.env`), but
**webhook mode is more robust** in production:

- No long-polling overhead
- No 409 Conflict risk if multiple instances briefly overlap during deploy
- Updates arrive instantly

## Quick path: nginx + Let's Encrypt on Ubuntu

Assumes:
- A domain (or subdomain) you control, e.g. `bot.arkeza.io`
- DNS A record pointing the domain to `147.182.225.47`
- Bot already running on the server (in long-polling mode is fine for now)

### 1. Install nginx and certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Create the nginx site

```bash
sudo tee /etc/nginx/sites-available/arkeza-bot <<'EOF'
server {
    listen 80;
    server_name bot.arkeza.io;   # ← change to your domain

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Telegram-Bot-Api-Secret-Token must be passed through.
        proxy_pass_request_headers on;
        proxy_read_timeout 30s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/arkeza-bot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Issue the TLS certificate

```bash
sudo certbot --nginx -d bot.arkeza.io --non-interactive --agree-tos -m you@example.com
```

This auto-edits the nginx config to add the `listen 443 ssl` block and sets up
auto-renewal.

### 4. Update `.env` and restart the bot

```bash
cd /root/arkeza-referral-bot
cat >> .env <<EOF
WEBHOOK_BASE_URL=https://bot.arkeza.io
WEBHOOK_SECRET_TOKEN=$(openssl rand -hex 32)
EOF

pm2 restart arkeza-bot
pm2 logs arkeza-bot --lines 30 --nostream
```

You should see:

```
✅ Telegram webhook registered: https://bot.arkeza.io/webhook/telegram
🟢 Bot is now LIVE and listening for updates.
```

### 5. Verify

```bash
curl https://bot.arkeza.io/health
# → {"ok":true,"service":"arkeza-bot","mode":"webhook",...}
```

And from Telegram's side:

```bash
TOKEN=$(grep BOT_TOKEN .env | cut -d= -f2)
curl -s "https://api.telegram.org/bot${TOKEN}/getWebhookInfo"
# Should show "url":"https://bot.arkeza.io/webhook/telegram", "pending_update_count":0
```

## Alternative: Cloudflare Tunnel (no domain DNS surgery needed)

If you don't want to manage DNS / nginx / certbot, Cloudflare Tunnel gives you
a free public HTTPS endpoint for your local port 3000:

```bash
# Install
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cf.deb
sudo dpkg -i cf.deb

# Login (opens browser link to log into Cloudflare)
cloudflared tunnel login

# Create + run a tunnel
cloudflared tunnel create arkeza-bot
cloudflared tunnel route dns arkeza-bot bot.<your-cloudflare-zone>
cloudflared tunnel run --url http://localhost:3000 arkeza-bot
```

Then set `WEBHOOK_BASE_URL=https://bot.<your-cloudflare-zone>` in `.env`.

## Falling back to polling later

If anything goes wrong with HTTPS, simply remove or comment out
`WEBHOOK_BASE_URL` in `.env` and `pm2 restart arkeza-bot` — the bot will
automatically switch to long-polling and keep working.

#!/usr/bin/env bash
# Arkeza Bot — One-shot diagnostic dump.
#
# Usage:  bash scripts/diagnose.sh
# Run on the server. Paste the entire output to whoever is helping you debug.
#
# This script never modifies anything. It only reads state.

set -u  # error on unset vars (but not on command failures — we want full output)

SEP="-----------------------------------------------------------"

print_section() {
  echo ""
  echo "$SEP"
  echo "## $1"
  echo "$SEP"
}

print_section "Environment"
echo "Time:       $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "Hostname:   $(hostname)"
echo "Node:       $(node --version 2>/dev/null || echo 'not installed')"
echo "NPM:        $(npm --version 2>/dev/null || echo 'not installed')"
echo "PM2:        $(pm2 --version 2>/dev/null || echo 'not installed')"
echo "PWD:        $(pwd)"

# Try to locate the bot directory if not already in it.
if [ ! -f index.js ] && [ -d /root/arkeza-referral-bot ]; then
  cd /root/arkeza-referral-bot
  echo "Switched to: $(pwd)"
fi

if [ ! -f index.js ]; then
  echo ""
  echo "❌ index.js not found in $(pwd) — adjust the path and re-run."
  exit 1
fi

print_section "Git state"
git log --oneline -5 2>&1
echo ""
echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>&1)"
echo "Modified files: $(git status --porcelain 2>/dev/null | wc -l)"
git status --short 2>&1 | head -20

print_section "PM2 process list"
pm2 list 2>&1

print_section "Raw node processes (any duplicates here = double-instance / 409 risk)"
ps aux | grep -E '(node|index\.js)' | grep -v grep | grep -v "diagnose.sh"

print_section "Last 80 PM2 log lines for arkeza-bot"
pm2 logs arkeza-bot --lines 80 --nostream 2>&1 || echo "(pm2 process 'arkeza-bot' not found)"

print_section "Env variables defined in .env (names only, NOT values)"
if [ -f .env ]; then
  grep -oE '^[A-Z_][A-Z0-9_]*=' .env | sort -u
else
  echo "❌ .env file not found at $(pwd)/.env"
fi

print_section "Telegram getWebhookInfo (the smoking gun)"
TOKEN=""
if [ -f .env ]; then
  TOKEN=$(grep -E '^BOT_TOKEN=' .env | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
fi
if [ -n "$TOKEN" ]; then
  curl -sS "https://api.telegram.org/bot${TOKEN}/getWebhookInfo" 2>&1
  echo ""
else
  echo "❌ BOT_TOKEN not found in .env"
fi

print_section "Local /health endpoint (only works if bot is running on localhost:PORT)"
PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
PORT=${PORT:-3000}
curl -sS -m 3 "http://127.0.0.1:${PORT}/health" 2>&1
echo ""

print_section "Arkeza API reachability from this server"
ARKEZA_BASE=$(grep -E '^ARKEZA_API_BASE_URL=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
ARKEZA_BASE=${ARKEZA_BASE:-https://arkza-api.arkeza.io/api/telegram/v1}
echo "Probing: ${ARKEZA_BASE}/is-linked"
curl -sS -o /tmp/arkeza-probe.out -w "HTTP %{http_code}, time %{time_total}s, size %{size_download}b\n" \
  --max-time 10 \
  -X POST "${ARKEZA_BASE}/is-linked" \
  -H "Content-Type: application/json" \
  -d '{"telegramId":"0"}' 2>&1
echo "Body (first 400 chars):"
head -c 400 /tmp/arkeza-probe.out 2>/dev/null
echo ""
rm -f /tmp/arkeza-probe.out

print_section "Done"
echo "Paste this entire output to whoever is helping you debug."
echo "Note: BOT_TOKEN, API keys, and DB content were NOT included."

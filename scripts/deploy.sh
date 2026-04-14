#!/usr/bin/env bash
# Arkeza Bot — Safe one-shot deploy.
#
# What it does:
#   1. Pulls the latest commit from origin/main (non-destructive — refuses
#      to run if there are uncommitted local changes on the server).
#   2. Runs `npm install` (picks up new dependencies).
#   3. Restarts the bot via PM2 (using ecosystem.config.js if present).
#   4. Waits for boot and reports status + version.
#
# Usage (on the server):
#   bash scripts/deploy.sh
#
# If this script refuses to run because of local changes, you have two
# options:
#   - Review them: `git status && git diff`
#   - If they are unwanted garbage: `bash scripts/force-deploy.sh`
#     (destructive — overwrites local changes).

set -e

cd "$(dirname "$0")/.."
BOT_DIR="$(pwd)"
echo "== Arkeza Bot Deploy =="
echo "   dir:  $BOT_DIR"
echo "   time: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo ""

# ---- 1. Safety check: no uncommitted local changes ----
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Refusing to deploy: uncommitted local changes present:"
  git status --short
  echo ""
  echo "Review them with: git diff"
  echo "If they are unwanted: bash scripts/force-deploy.sh  (destructive!)"
  exit 1
fi

# ---- 2. Pull latest main ----
echo "== Fetching origin/main =="
git fetch origin main
CURRENT=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$CURRENT" = "$REMOTE" ]; then
  echo "   Already up to date at $(git rev-parse --short HEAD)"
else
  echo "   Updating from $(git rev-parse --short HEAD) → $(git rev-parse --short origin/main)"
  git checkout main
  git merge --ff-only origin/main
fi
echo ""

# ---- 3. Dependencies ----
echo "== Installing dependencies =="
npm install --omit=dev 2>&1 | tail -5
echo ""

# ---- 4. Restart via PM2 ----
echo "== Restarting PM2 process =="
if pm2 describe arkeza-bot >/dev/null 2>&1; then
  # Existing process — reload (zero-downtime) or restart
  pm2 restart arkeza-bot --update-env
else
  # First launch
  if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js
  else
    pm2 start index.js --name arkeza-bot
  fi
  pm2 save
fi
echo ""

# ---- 5. Wait for boot + health check ----
echo "== Waiting 4s for boot =="
sleep 4

echo ""
echo "== Boot log (last 40 lines) =="
pm2 logs arkeza-bot --lines 40 --nostream 2>&1 | tail -40

echo ""
echo "== Health check =="
PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
PORT=${PORT:-3000}
HEALTH_OUTPUT=$(curl -sS -m 5 "http://127.0.0.1:${PORT}/health" 2>&1)
echo "$HEALTH_OUTPUT"

echo ""
echo "== Current commit =="
git log --oneline -1

echo ""
echo "✅ Deploy complete."
echo ""
echo "Next: send /version to the bot in Telegram — it should return the"
echo "      commit SHA shown above, confirming the live code matches."

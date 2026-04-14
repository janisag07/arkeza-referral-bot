#!/usr/bin/env bash
# Arkeza Bot — DESTRUCTIVE force-deploy.
#
# WARNING: This script WIPES any uncommitted local changes on the server
# and forces the repo to match origin/main exactly. Use ONLY when you are
# certain the local-only state on the server is unwanted (e.g. an old
# bot version that someone hand-edited without committing).
#
# If in doubt, run scripts/deploy.sh instead — it refuses when local
# changes exist.
#
# Usage:
#   bash scripts/force-deploy.sh --yes-really-wipe
#
# The --yes-really-wipe flag is required as a safety gate.

set -e

if [ "$1" != "--yes-really-wipe" ]; then
  cat <<EOF
❌ This script is destructive. It will DELETE any local changes in this
   repo and force it to match origin/main.

   If you've reviewed the changes (git status, git diff) and you want
   to wipe them, re-run with:

       bash scripts/force-deploy.sh --yes-really-wipe

EOF
  exit 1
fi

cd "$(dirname "$0")/.."
BOT_DIR="$(pwd)"
echo "== Arkeza Bot FORCE Deploy =="
echo "   dir:  $BOT_DIR"
echo "   time: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Show what's about to be wiped so there's a record.
if [ -n "$(git status --porcelain)" ]; then
  echo "== Local changes about to be WIPED =="
  git status --short
  echo ""
  echo "   (diff snapshot saved to /tmp/arkeza-wipe-$(date +%s).diff)"
  git diff > "/tmp/arkeza-wipe-$(date +%s).diff" 2>/dev/null || true
  echo ""
fi

# Find any untracked files that aren't in .gitignore and back them up.
UNTRACKED=$(git ls-files --others --exclude-standard)
if [ -n "$UNTRACKED" ]; then
  BACKUP="/tmp/arkeza-untracked-backup-$(date +%s).tar.gz"
  echo "== Backing up untracked files to $BACKUP =="
  echo "$UNTRACKED" | xargs -I{} echo "   {}"
  tar -czf "$BACKUP" $UNTRACKED 2>/dev/null || echo "   (backup skipped)"
  echo ""
fi

echo "== Fetching origin =="
git fetch origin main

echo ""
echo "== Hard-reset to origin/main =="
git checkout main 2>/dev/null || git checkout -B main origin/main
git reset --hard origin/main
git clean -fd  # remove untracked files + directories
echo ""

echo "== Installing dependencies =="
npm install --omit=dev 2>&1 | tail -5
echo ""

echo "== Restarting PM2 process =="
pm2 delete arkeza-bot 2>/dev/null || true
if [ -f ecosystem.config.js ]; then
  pm2 start ecosystem.config.js
else
  pm2 start index.js --name arkeza-bot
fi
pm2 save
echo ""

sleep 4

echo "== Boot log (last 40 lines) =="
pm2 logs arkeza-bot --lines 40 --nostream 2>&1 | tail -40

echo ""
echo "== Health check =="
PORT=$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
PORT=${PORT:-3000}
curl -sS -m 5 "http://127.0.0.1:${PORT}/health" 2>&1

echo ""
echo "== Current commit =="
git log --oneline -1

echo ""
echo "✅ Force-deploy complete. Any previous un-committed bot code is gone."
echo "   Send /version to the bot in Telegram to confirm the new code is live."

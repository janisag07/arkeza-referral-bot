#!/usr/bin/env bash
# Arkeza Bot — Read-only server AUDIT.
#
# Purpose: figure out EXACTLY what is running on the bot server and what
# state it holds, so we can plan a takeover without destroying live data.
#
# This script NEVER modifies anything. Safe to run any time.
#
# Usage:  bash scripts/audit-server.sh > /tmp/audit.log 2>&1
# Paste /tmp/audit.log content to whoever is helping you debug.

set +e  # don't exit on individual command failures — we want a complete dump

SEP="=========================================================="
echo "$SEP"
echo "ARKEZA BOT SERVER AUDIT — $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "$SEP"

section() {
  echo ""
  echo "─── $1 ───"
}

# ---- 1. PM2 process detail (which file is it running?) ----
section "1. PM2 describe (resolves the actual script PM2 is executing)"
pm2 describe arkeza-bot 2>&1 | grep -E "script|cwd|pid|status|uptime|restarts|script args|node args|out log path|error log path|env_file|home path|NODE_ENV|PM_VERSION|name|instances|exec mode"

# ---- 2. All node / bot-like processes ----
section "2. Running node processes"
ps -eo pid,user,pcpu,pmem,cmd | grep -E 'node|index\.js' | grep -v grep | grep -v audit-server

# ---- 3. Directory structure ----
section "3. Bot directory contents"
cd /root/arkeza-referral-bot 2>/dev/null && pwd && ls -la | head -40

section "4. All js files (by size + date)"
ls -la /root/arkeza-referral-bot/*.js 2>/dev/null

section "5. Any OTHER bot directories on the server?"
find /root /home /opt /srv -maxdepth 4 -type d \( -iname "*arkeza*" -o -iname "*bot*" -o -iname "*telegram*" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -20

section "6. Git state of the bot directory"
cd /root/arkeza-referral-bot 2>/dev/null
echo "Branch:         $(git rev-parse --abbrev-ref HEAD 2>&1)"
echo "Current commit: $(git rev-parse HEAD 2>&1)"
echo "Remote URL:     $(git remote get-url origin 2>&1)"
echo ""
echo "--- Last 5 commits ---"
git log --oneline -5 2>&1
echo ""
echo "--- Local (unpushed) changes ---"
git status --porcelain 2>&1 | head -30
echo ""
echo "--- Files modified vs HEAD (size of diff) ---"
git diff --stat 2>&1 | tail -15
echo ""
echo "--- Any untracked files? ---"
git ls-files --others --exclude-standard 2>&1 | head -20

# ---- 4. Compare running code to repo HEAD ----
section "7. Does the running index.js match the git HEAD?"
if [ -f /root/arkeza-referral-bot/index.js ]; then
  LOCAL_HASH=$(sha256sum /root/arkeza-referral-bot/index.js | cut -d' ' -f1)
  HEAD_HASH=$(git show HEAD:index.js 2>/dev/null | sha256sum | cut -d' ' -f1)
  echo "Local index.js sha256:   $LOCAL_HASH"
  echo "HEAD  index.js sha256:   $HEAD_HASH"
  if [ "$LOCAL_HASH" = "$HEAD_HASH" ]; then
    echo "✅ Running file matches git HEAD."
  else
    echo "⚠️  RUNNING FILE DIFFERS FROM GIT HEAD — local modifications present."
  fi
fi

# ---- 5. Top-of-index.js fingerprint (to identify which codebase this is) ----
section "8. First 30 lines of /root/arkeza-referral-bot/index.js"
head -30 /root/arkeza-referral-bot/index.js 2>&1

# ---- 6. Search for Mystery-Bot specific log strings in index.js ----
section "9. Check index.js for Mystery-Bot-specific phrases"
for phrase in "Link prompt DM" "24h countdown" "PENDING" "confirmed →" "Auto-deleting bot message"; do
  count=$(grep -c "$phrase" /root/arkeza-referral-bot/index.js 2>/dev/null || echo 0)
  echo "  \"$phrase\": $count occurrences"
done

section "10. Check index.js for OUR-Bot-specific phrases"
for phrase in "handleLinkToken" "classifyStartToken" "arkezaApi.linkUser" "🟢 Bot is now LIVE" "Commit:" "GIT_SHA"; do
  count=$(grep -c "$phrase" /root/arkeza-referral-bot/index.js 2>/dev/null || echo 0)
  echo "  \"$phrase\": $count occurrences"
done

# ---- 7. Database(s) present ----
section "11. SQLite / JSON database files in bot directory"
find /root/arkeza-referral-bot -maxdepth 2 -type f \( -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" -o -name "*.json" \) -not -path "*/node_modules/*" -not -name "package*.json" 2>/dev/null | while read f; do
  size=$(du -h "$f" 2>/dev/null | cut -f1)
  mtime=$(stat -c '%y' "$f" 2>/dev/null | cut -d. -f1)
  echo "  $size  $mtime  $f"
done

section "12. SQLite schema (if referrals.db exists)"
if [ -f /root/arkeza-referral-bot/referrals.db ] && command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 /root/arkeza-referral-bot/referrals.db ".schema" 2>&1 | head -80
  echo ""
  echo "--- Row counts ---"
  sqlite3 /root/arkeza-referral-bot/referrals.db 'SELECT name FROM sqlite_master WHERE type="table";' 2>&1 | while read tbl; do
    count=$(sqlite3 /root/arkeza-referral-bot/referrals.db "SELECT count(*) FROM \"$tbl\";" 2>&1)
    echo "  $tbl: $count rows"
  done
else
  echo "(no referrals.db or sqlite3 CLI unavailable)"
fi

# ---- 8. Environment variable names present in .env ----
section "13. .env variables (names only, no values)"
if [ -f /root/arkeza-referral-bot/.env ]; then
  grep -oE '^[A-Z_][A-Z0-9_]*=' /root/arkeza-referral-bot/.env | sort -u
else
  echo "(no .env file)"
fi

# ---- 9. Last 100 log lines (live state) ----
section "14. Last 80 PM2 log lines for arkeza-bot"
pm2 logs arkeza-bot --lines 80 --nostream 2>&1 | tail -80

# ---- 10. Telegram's view ----
section "15. Telegram getWebhookInfo"
TOKEN=$(grep -E '^BOT_TOKEN=' /root/arkeza-referral-bot/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -n "$TOKEN" ]; then
  curl -sS "https://api.telegram.org/bot${TOKEN}/getWebhookInfo" 2>&1
fi
echo ""

# ---- 11. Arkeza API reachability ----
section "16. Can this server reach Arkeza API?"
curl -sS -o /tmp/arkeza-probe.out -w "HTTP %{http_code}, time %{time_total}s\n" --max-time 8 \
  -X POST https://arkza-api.arkeza.io/api/telegram/v1/is-linked \
  -H "Content-Type: application/json" -d '{"telegramId":"0"}' 2>&1
echo "Body: $(head -c 300 /tmp/arkeza-probe.out 2>/dev/null)"
rm -f /tmp/arkeza-probe.out

# ---- 12. Firewall / port 3000 ----
section "17. Is port 3000 bound / reachable?"
ss -tlnp 2>/dev/null | grep -E ':3000|:443|:80' || netstat -tlnp 2>/dev/null | grep -E ':3000|:443|:80'
echo ""
echo "Local /health:"
curl -sS -m 3 http://127.0.0.1:3000/health 2>&1 | head -c 500
echo ""

if command -v ufw >/dev/null 2>&1; then
  section "18. UFW firewall status"
  ufw status 2>&1
fi

echo ""
echo "$SEP"
echo "AUDIT COMPLETE — nothing was changed."
echo "Share this output with whoever is helping you debug."
echo "$SEP"

# 🚀 Arkeza Referral Bot

A professional Telegram referral tracking bot for the Arkeza community with advanced anti-bot measures and admin tools.

## ✨ Features

### Core Functionality
- **Unique Referral Links** - Every user gets their own tracking link
- **Full Referral Tracking** - Complete chain tracking with verification
- **Leaderboard System** - Top referrers with emoji rankings (🥇🥈🥉)
- **Activity Verification** - Users must send messages to verify referrals

### Anti-Bot Protection
- ✅ Minimum account age check
- ✅ Activity verification (message count requirement)
- ✅ Rate limiting (prevents mass fake joins)
- ✅ Automatic suspicious user flagging
- ✅ Admin review panel

### Admin Dashboard
- `/admin stats` - View overall system statistics
- `/admin suspicious` - List flagged users
- `/admin remove <user_id>` - Remove fake referrals
- `/admin export` - Export all data to CSV

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Grammy** - Modern Telegram Bot framework
- **SQLite** (better-sqlite3) - Lightweight, embedded database
- **dotenv** - Environment configuration

## 📦 Installation

### Prerequisites
- Node.js 16+ installed
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)

### Quick Start

1. **Clone/Download the project**
   ```bash
   cd /path/to/arkeza-referral-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your bot token:
   ```env
   BOT_TOKEN=8449004867:AAFPceUbBdz0ZBamWliizlh2ZOYEc-KqxcE
   ADMIN_IDS=YOUR_TELEGRAM_USER_ID
   ```

   **Get your Telegram User ID:**
   - Message [@userinfobot](https://t.me/userinfobot) on Telegram
   - Copy the ID and add it to `ADMIN_IDS`

4. **Start the bot**
   ```bash
   node index.js
   ```

That's it! Your bot is now running. ✅

## ⚙️ Configuration

All settings are in the `.env` file:

```env
# Required
BOT_TOKEN=your_bot_token_here
ADMIN_IDS=123456789,987654321

# Anti-Bot Settings (optional - defaults shown)
MIN_ACCOUNT_AGE_DAYS=7
RATE_LIMIT_MAX_JOINS=10
RATE_LIMIT_WINDOW_HOURS=24
MIN_MESSAGES_FOR_VERIFICATION=1
```

### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `BOT_TOKEN` | Your Telegram Bot token | **Required** |
| `ADMIN_IDS` | Comma-separated admin user IDs | None |
| `MIN_ACCOUNT_AGE_DAYS` | Minimum account age to avoid flagging | 7 |
| `RATE_LIMIT_MAX_JOINS` | Max joins per referrer in time window | 10 |
| `RATE_LIMIT_WINDOW_HOURS` | Time window for rate limiting | 24 |
| `MIN_MESSAGES_FOR_VERIFICATION` | Messages needed to verify referral | 1 |

## 📱 User Commands

- `/start` - Join and get your referral link
- `/start ref_<USER_ID>` - Join via referral link (automatic)
- `/leaderboard` - View top referrers
- `/stats` - View your referral statistics

## 🔐 Admin Commands

Must be configured as admin in `ADMIN_IDS`:

- `/admin` - Show all admin commands
- `/admin stats` - View system statistics
- `/admin suspicious` - List suspicious/flagged users
- `/admin remove <user_id>` - Remove a user and their referrals
- `/admin export` - Export all data to CSV

## 🎯 How It Works

### Referral Flow

1. **User joins** via link like `https://t.me/arkezahub?start=ref_123456789`
2. **System checks** account age and rate limits
3. **User is tracked** but marked as unverified
4. **User sends messages** to verify account
5. **After verification** referral counts toward leaderboard
6. **Referrer gets notified** when their referral is verified

### Anti-Bot Logic

The bot automatically flags suspicious behavior:
- New accounts (< 7 days old by default)
- Too many joins from one referrer in short time
- Accounts with no activity (no messages sent)

Admins get instant notifications when suspicious joins occur.

## 📊 Database Structure

SQLite database (`referrals.db`) with three tables:

- `users` - User profiles and referral info
- `referral_stats` - Aggregated referral counts
- `join_events` - Join history for rate limiting

All data is stored locally in the database file.

## 🚦 Production Deployment

### Option 1: Screen/tmux
```bash
screen -S arkeza-bot
node index.js
# Ctrl+A, D to detach
```

### Option 2: PM2 (Recommended)
```bash
npm install -g pm2
pm2 start index.js --name arkeza-bot
pm2 startup  # Auto-start on reboot
pm2 save
```

### Option 3: systemd service
Create `/etc/systemd/system/arkeza-bot.service`:
```ini
[Unit]
Description=Arkeza Referral Bot
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/arkeza-referral-bot
ExecStart=/usr/bin/node index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable arkeza-bot
sudo systemctl start arkeza-bot
```

## 🔧 Maintenance

### View Logs
```bash
# If using PM2
pm2 logs arkeza-bot

# If using systemd
sudo journalctl -u arkeza-bot -f
```

### Backup Database
```bash
cp referrals.db referrals.db.backup
```

### Export Data
Use `/admin export` command in Telegram to get CSV export.

## 🐛 Troubleshooting

**Bot doesn't respond:**
- Check if token is correct in `.env`
- Ensure bot is added to the group as admin
- Check logs for errors

**Referrals not tracking:**
- Ensure users use the `/start` command with referral parameter
- Check if bot has read/write permissions to database file

**Admin commands not working:**
- Verify your user ID is in `ADMIN_IDS`
- Get your ID from [@userinfobot](https://t.me/userinfobot)

## 📝 License

MIT License - Feel free to use and modify for your project.

## 🤝 Support

For issues or questions, contact Patrick oke (Upwork).

---

Built for the Arkeza Web3 community 🚀

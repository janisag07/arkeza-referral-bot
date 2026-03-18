# 🚀 Arkeza Referral Bot

A Telegram referral tracking bot for the Arkeza community with anti-bot protection and admin tools.

## ✨ Features

### Core Functionality
- **Unique Referral Links** - Every user gets their own tracking link
- **Instant Referral Tracking** - Referrals are confirmed immediately when a user clicks the link
- **Leaderboard System** - Top referrers with emoji rankings (🥇🥈🥉)
- **Referrer Notifications** - Instant notification when someone uses your referral link

### Anti-Bot Protection
- ✅ Rate limiting (prevents mass fake joins per referrer)
- ✅ Automatic suspicious user flagging
- ✅ Admin review panel for flagged users

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

1. **Clone the project**
   ```bash
   git clone https://github.com/janisag07/arkeza-referral-bot.git
   cd arkeza-referral-bot
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
   BOT_TOKEN=your_bot_token_here
   ADMIN_IDS=YOUR_TELEGRAM_USER_ID
   BOT_USERNAME=YourBotUsername
   GROUP_LINK=https://t.me/yourgroup
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

| Variable | Description | Default |
|----------|-------------|---------|
| `BOT_TOKEN` | Your Telegram Bot token | **Required** |
| `ADMIN_IDS` | Comma-separated admin user IDs | None |
| `BOT_USERNAME` | Your bot's username (without @) | **Required** |
| `GROUP_LINK` | Invite link to your Telegram group | **Required** |
| `RATE_LIMIT_MAX_JOINS` | Max joins per referrer in time window | 10 |
| `RATE_LIMIT_WINDOW_HOURS` | Time window for rate limiting | 24 |

## 📱 User Commands

- `/start` - Register and get your referral link
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

1. **User shares** their referral link: `https://t.me/YourBot?start=ref_123456789`
2. **New user clicks** the link → opens private chat with the bot
3. **Bot registers** the referral instantly and verifies the user
4. **Referrer gets notified** immediately
5. **Stats update** in real-time on the leaderboard

### Anti-Bot Logic

The bot automatically flags suspicious behavior:
- Too many joins from one referrer in a short time
- Admins get instant notifications when suspicious joins occur
- Admins can review and remove flagged users

## 📊 Database

SQLite database (`referrals.db`) with three tables:

- `users` - User profiles and referral info
- `referral_stats` - Aggregated referral counts
- `join_events` - Join history for rate limiting

## 🚦 Production Deployment

### Option 1: PM2 (Recommended)
```bash
npm install -g pm2
pm2 start index.js --name arkeza-bot
pm2 startup  # Auto-start on reboot
pm2 save
```

### Option 2: systemd service
```ini
[Unit]
Description=Arkeza Referral Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/arkeza-referral-bot
ExecStart=/usr/bin/node index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

## 📝 License

MIT License

---

Built for the Arkeza Web3 community 🚀

# 🚀 Quick Setup Guide

## Step 1: Get Your Telegram User ID

1. Open Telegram
2. Search for `@userinfobot`
3. Send `/start` to the bot
4. Copy your **User ID** (it's a number like `123456789`)

## Step 2: Configure Admin Access

1. Open `.env` file in this folder
2. Find the line `ADMIN_IDS=`
3. Add your User ID: `ADMIN_IDS=123456789`
4. If multiple admins, separate with commas: `ADMIN_IDS=123456789,987654321`
5. Save the file

## Step 3: Install & Start

Open Terminal in this folder and run:

```bash
npm install
node index.js
```

You should see:
```
🚀 Arkeza Referral Bot starting...
✅ Bot @arkezabot is now running!
```

## Step 4: Test the Bot

1. Open Telegram
2. Search for your bot (@arkezabot)
3. Send `/start`
4. You should get a welcome message with your referral link

## Step 5: Add Bot to Group

1. Add @arkezabot to https://t.me/arkezahub
2. Make it an **admin** (required to read messages)
3. Users can now join via referral links!

## Admin Commands

Once configured as admin, you can use:

- `/admin stats` - View statistics
- `/admin suspicious` - See flagged users
- `/admin remove <user_id>` - Remove fake accounts
- `/admin export` - Download CSV data

## 🎯 Referral Link Format

Your bot will generate links like:
```
https://t.me/arkezahub?start=ref_123456789
```

Share these links to track referrals!

## ⚠️ Important Notes

- Bot token is already configured in `.env`
- You MUST add your admin ID to use admin commands
- Users must send messages to verify their referrals
- Suspicious accounts are auto-flagged for review

## 🐛 Troubleshooting

**"BOT_TOKEN not found"**
- Make sure `.env` file exists and contains `BOT_TOKEN=...`

**Admin commands don't work**
- Get your user ID from @userinfobot
- Add it to `ADMIN_IDS=` in `.env`
- Restart the bot

**Bot doesn't respond in group**
- Make sure bot is added as admin to the group
- Check that Privacy Mode is disabled in @BotFather

## 🚦 Running 24/7

For production use, install PM2:

```bash
npm install -g pm2
pm2 start index.js --name arkeza-bot
pm2 startup
pm2 save
```

This will keep the bot running even after server restarts.

---

Need help? Check the full README.md or contact support.

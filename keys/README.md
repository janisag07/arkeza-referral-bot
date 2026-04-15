# Crypto keys

Place Arkeza's **public** key here:

```
keys/tg-public.pem
```

When this file is present, the bot automatically encrypts all Internal
Bot API requests (`/link-user`, `/user-data`, `/leaderboard`, `/is-linked`)
using **RSA-OAEP-SHA256**, matching the documented API spec.

The file is `.gitignore`d — it is delivered to the server out-of-band
(scp, pm2 secret, etc.), never committed.

## How to install on the server

```bash
# After receiving tg-public.pem from Mit (e.g. via Telegram / email):
mkdir -p /root/arkeza-referral-bot/keys
# paste the PEM content:
nano /root/arkeza-referral-bot/keys/tg-public.pem
# or transfer it:
#   scp tg-public.pem root@147.182.225.47:/root/arkeza-referral-bot/keys/

pm2 restart arkeza-bot
```

After restart, the boot log should say:

```
✅ Arkeza API encryption: RSA-OAEP-SHA256 active (public key loaded)
```

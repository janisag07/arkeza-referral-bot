require('dotenv').config();
const { Bot, GrammyError, HttpError, InlineKeyboard } = require('grammy');
const ReferralDatabase = require('./database');
const arkezaApi = require('./arkeza-api');
const { startWebhookServer, paths } = require('./webhook-server');
const fs = require('fs');
const { execSync } = require('child_process');

// ---- Build identity (so /version and boot log unambiguously identify which code is live) ----
const BOOT_TIME = Date.now();
let GIT_SHA = 'unknown';
let GIT_SUBJECT = 'unknown';
try {
  GIT_SHA = execSync('git rev-parse --short HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString().trim();
  GIT_SUBJECT = execSync('git log -1 --pretty=%s', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString().trim().slice(0, 80);
} catch (_) { /* not a git checkout — leave as 'unknown' */ }

// ---- Config ----
const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME || 'Arkezabot';
const GROUP_LINK = process.env.GROUP_LINK || 'https://t.me/arkezahub';
const ADMIN_IDS = process.env.ADMIN_IDS?.split(',').map((id) => parseInt(id.trim())) || [];
const RATE_LIMIT_MAX_JOINS = parseInt(process.env.RATE_LIMIT_MAX_JOINS || 10);
const RATE_LIMIT_WINDOW_HOURS = parseInt(process.env.RATE_LIMIT_WINDOW_HOURS || 24);
const ANNOUNCEMENT_CHANNEL_ID = process.env.ANNOUNCEMENT_CHANNEL_ID || '';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || '';
const WEBHOOK_SECRET_TOKEN = process.env.WEBHOOK_SECRET_TOKEN || '';
const WELCOME_NEW_MEMBERS = (process.env.WELCOME_NEW_MEMBERS || 'true').toLowerCase() === 'true';

// ---- Info URLs (exposed via /website, /twitter, /whitepaper, /app, /contract) ----
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://arkeza.io/';
const TWITTER_URL = process.env.TWITTER_URL || 'https://x.com/arkeza_hub';
const WHITEPAPER_URL = process.env.WHITEPAPER_URL || 'https://arkeza.io/assets/document/arkeza-whitepaper.pdf';
const APP_ANDROID_URL = process.env.APP_ANDROID_URL || 'https://play.google.com/store/apps/details?id=com.arkeza.app';
const APP_IOS_URL = process.env.APP_IOS_URL || 'https://apps.apple.com/us/app/arkeza/id6757733204';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'Token Launch Upcoming — Stay tuned!';

// ---- Auto-delete bot messages in groups ----
// Matches the old bot's behavior ("Auto-deleting bot message X (from bot: true)")
// which kept the community group clean. DMs stay (users want their history there).
const AUTO_DELETE_BOT_MESSAGES = (process.env.AUTO_DELETE_BOT_MESSAGES || 'true').toLowerCase() === 'true';
const AUTO_DELETE_SECONDS = parseInt(process.env.AUTO_DELETE_SECONDS || '60', 10);

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found in .env file');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const db = new ReferralDatabase();

// ---- Auto-delete middleware for group messages ----
// In groups/supergroups, wrap ctx.reply so every bot response is
// scheduled for deletion after AUTO_DELETE_SECONDS. In DMs, replies
// stay (personal history). Opt-out per-call by passing
// { autoDelete: false } or { autoDelete: <seconds> } in the reply
// options.
bot.use(async (ctx, next) => {
  if (
    AUTO_DELETE_BOT_MESSAGES &&
    (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup')
  ) {
    const originalReply = ctx.reply.bind(ctx);
    ctx.reply = async (text, options = {}) => {
      const { autoDelete, ...rest } = options || {};
      const msg = await originalReply(text, rest);
      const delaySec =
        autoDelete === false
          ? 0
          : typeof autoDelete === 'number'
          ? autoDelete
          : AUTO_DELETE_SECONDS;
      if (delaySec > 0) {
        setTimeout(async () => {
          try {
            await ctx.api.deleteMessage(msg.chat.id, msg.message_id);
          } catch (_) { /* may already be deleted */ }
        }, delaySec * 1000);
      }
      return msg;
    };
  }
  await next();
});

const isAdmin = (userId) => ADMIN_IDS.includes(userId);

const formatUsername = (user) => {
  if (user.username) return `@${user.username}`;
  return user.first_name || `User ${user.user_id}`;
};

const getReferralLink = (userId) => `https://t.me/${BOT_USERNAME}?start=ref_${userId}`;

const checkRateLimit = (referrerId) => {
  const recentJoins = db.getRecentJoins(referrerId, RATE_LIMIT_WINDOW_HOURS);
  if (recentJoins.count >= RATE_LIMIT_MAX_JOINS) {
    return { exceeded: true, count: recentJoins.count };
  }
  return { exceeded: false, count: recentJoins.count };
};

// ---- Token classification (for /start argument) ----
//
// Mit's app currently sends the raw JWT directly as ?start=<jwt>.
// The legacy referral system uses ?start=ref_<userId>.
// We support both, plus a future-proof ?start=link_<token> form.

function classifyStartToken(arg) {
  if (!arg) return { type: 'none' };
  if (arg.startsWith('ref_')) return { type: 'referral', value: arg.slice(4) };
  if (arg.startsWith('link_')) return { type: 'link', value: arg.slice(5) };
  // JWT heuristic: 3 base64url segments separated by dots, total length > 20.
  if (/^[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/.test(arg) && arg.length > 20) {
    return { type: 'link', value: arg };
  }
  // Length-only fallback so unusual short-token formats still get attempted.
  if (arg.length >= 20) return { type: 'link', value: arg };
  return { type: 'unknown', value: arg };
}

// ---- Linking flow (Arkeza app → bot) ----

async function handleLinkToken(ctx, token) {
  const telegramId = ctx.from.id;
  console.log(`[link] /start link attempt from ${telegramId}, token length=${token.length}`);

  const alreadyLinked = db.getLinkedUser(telegramId);
  if (alreadyLinked) {
    await ctx.reply(
      `✅ Your Telegram is already connected to Arkeza${alreadyLinked.arkeza_username ? ` as ${alreadyLinked.arkeza_username}` : ''}. No action needed.`
    );
    return;
  }

  await ctx.reply('🔗 Linking your Arkeza account, please wait...');

  const result = await arkezaApi.linkUser(telegramId, token);

  if (!result.ok) {
    console.error(`[link] failed for ${telegramId}: ${result.message}`);
    await ctx.reply(
      `❌ Linking failed: ${result.message || 'Unknown error'}\n\n` +
        `Please reopen the link from the Arkeza app and try again.`
    );
    return;
  }

  // Refresh cache: pull username from /user-data so /profile is instant later.
  let arkezaUsername = null;
  const userData = await arkezaApi.getUserData(telegramId);
  if (userData.ok && userData.data?.username) {
    arkezaUsername = userData.data.username;
  }
  db.upsertLinkedUser(telegramId, arkezaUsername);

  const kb = new InlineKeyboard()
    .text('👤 Profile', 'show_profile')
    .text('🏆 Leaderboard', 'show_leaderboard_xp')
    .row()
    .url('💬 Join Group', GROUP_LINK)
    .url('🌐 Website', WEBSITE_URL)
    .row()
    .url('Android 📱', APP_ANDROID_URL)
    .url('iOS 📱', APP_IOS_URL);

  await ctx.reply(
    `✅ Successfully linked${arkezaUsername ? ` as ${arkezaUsername}` : ''}!\n\n` +
      `You can now use /profile and /leaderboard.`,
    { reply_markup: kb }
  );
}

// ---- /start ----

bot.command('start', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;
  const arg = (ctx.match || '').trim();

  const token = classifyStartToken(arg);
  console.log(
    `[start] from ${userId} (@${username}) arg.len=${arg.length} ` +
      `head="${arg.slice(0, 12)}" type=${token.type}`
  );

  // Arkeza linking flows take priority over the legacy referral display.
  if (token.type === 'link') {
    await handleLinkToken(ctx, token.value);
    return;
  }

  // -------- Legacy M1-3 referral flow --------
  let existingUser = db.getUser(userId);

  if (existingUser) {
    const stats = db.getReferralStats(userId);
    const referralLink = getReferralLink(userId);

    await ctx.reply(
      `🌟 Welcome back, ${firstName}!\n\n` +
        `📊 Your Stats:\n` +
        `✅ Verified Referrals: ${stats.verified_referrals}\n` +
        `👥 Total Referrals: ${stats.total_referrals}\n\n` +
        `🔗 Your Referral Link:\n${referralLink}\n\n` +
        `Share this link to earn referrals!\n\n` +
        `👉 Join the group: ${GROUP_LINK}`
    );
    return;
  }

  let referrerId = null;
  if (token.type === 'referral') {
    referrerId = parseInt(token.value);
    if (referrerId === userId) {
      await ctx.reply('❌ You cannot refer yourself!');
      return;
    }
    const referrer = db.getUser(referrerId);
    if (!referrer) referrerId = null;
  }

  db.addUser(userId, username, firstName, referrerId, null);

  const suspiciousFlags = [];
  if (referrerId) {
    const rateLimit = checkRateLimit(referrerId);
    if (rateLimit.exceeded) {
      suspiciousFlags.push(
        `Rate limit exceeded for referrer (${rateLimit.count} joins in ${RATE_LIMIT_WINDOW_HOURS}h)`
      );
      db.markSuspicious(userId);
    }
  }

  const referralLink = getReferralLink(userId);
  let welcomeMessage = `🎉 Welcome to Arkeza Hub, ${firstName}!\n\n`;

  if (referrerId) {
    const referrer = db.getUser(referrerId);
    welcomeMessage += `👋 You were referred by ${formatUsername(referrer)}\n\n`;
  }

  welcomeMessage +=
    `👉 Join the group and send a message to verify: ${GROUP_LINK}\n\n` +
    `🔗 Your Referral Link:\n${referralLink}\n\n` +
    `Share this link to invite others and climb the leaderboard!\n\n` +
    `📊 Commands:\n` +
    `/profile - Your Arkeza profile (after linking)\n` +
    `/leaderboard - View top referrers / XP\n` +
    `/stats - Your referral statistics`;

  await ctx.reply(welcomeMessage);

  if (suspiciousFlags.length > 0 && ADMIN_IDS.length > 0) {
    for (const adminId of ADMIN_IDS) {
      try {
        await bot.api.sendMessage(
          adminId,
          `⚠️ Suspicious join detected!\n\n` +
            `User: ${formatUsername({ user_id: userId, username, first_name: firstName })}\n` +
            `ID: ${userId}\n` +
            `Referred by: ${referrerId || 'None'}\n\n` +
            `Flags:\n${suspiciousFlags.map((f) => `• ${f}`).join('\n')}`
        );
      } catch (error) {
        console.error(`Failed to notify admin ${adminId}:`, error.message);
      }
    }
  }
});

// ---- /link <token>  (manual alias for the deep-link flow) ----
//
// The Arkeza app's primary linking path is the deep-link `?start=<JWT>`,
// which our /start handler covers. But users who paste their token manually
// (or were instructed by older docs to use `/link <token>`) should also
// succeed instead of getting "unknown command" silence.

bot.command('link', async (ctx) => {
  const arg = (ctx.match || '').trim();
  if (!arg) {
    await ctx.reply(
      '❌ Usage: /link <your_token>\n\nGet your link token from the Arkeza app.'
    );
    return;
  }
  await handleLinkToken(ctx, arg);
});

// ---- /version (so anyone can verify WHICH code is running) ----
//
// Whenever there is doubt about what code the server is actually executing
// (e.g. after a redeploy, or when multiple bot codebases have historically
// been on the server), typing /version in chat returns the exact git SHA
// and boot time. This is the fastest possible way to confirm a deploy.

bot.command('version', async (ctx) => {
  const uptimeSec = Math.floor(process.uptime());
  const bootIso = new Date(BOOT_TIME).toISOString();
  await ctx.reply(
    `🤖 Arkeza Bot\n` +
      `• Repo: janisag07/arkeza-referral-bot\n` +
      `• Commit: ${GIT_SHA}\n` +
      `• Subject: ${GIT_SUBJECT}\n` +
      `• Booted: ${bootIso}\n` +
      `• Uptime: ${uptimeSec}s\n` +
      `• Mode: ${runtimeMode}\n` +
      `• Arkeza API: ${arkezaApi._config.BASE_URL}`
  );
});

// ---- Info commands (quick-links to Arkeza resources) ----

bot.command('website', async (ctx) => {
  await ctx.reply(`🌐 Arkeza website:\n${WEBSITE_URL}`);
});

bot.command('twitter', async (ctx) => {
  await ctx.reply(`🐦 Arkeza on X:\n${TWITTER_URL}`);
});

bot.command('whitepaper', async (ctx) => {
  await ctx.reply(`📄 Arkeza whitepaper:\n${WHITEPAPER_URL}`);
});

bot.command('app', async (ctx) => {
  await ctx.reply(
    `📱 Get the Arkeza app:\n\n` +
      `Android: ${APP_ANDROID_URL}\n` +
      `iOS:     ${APP_IOS_URL}`
  );
});

bot.command('contract', async (ctx) => {
  await ctx.reply(`📜 Contract address:\n${CONTRACT_ADDRESS}`);
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `🤖 Arkeza Bot — Commands\n\n` +
      `/start            — Link your Arkeza account (via deep-link) or view your stats\n` +
      `/link <token>     — Manual alternative to the deep-link\n` +
      `/connect          — Start the linking flow (for members already in the group)\n` +
      `/profile          — Your Arkeza profile (XP, referrals)\n` +
      `/leaderboard      — Group referral leaderboard\n` +
      `/refcontest       — App referral contest + last week's winners\n` +
      `/stats            — Your in-bot referral stats\n` +
      `/website          — Arkeza website\n` +
      `/twitter          — Arkeza on X\n` +
      `/whitepaper       — Whitepaper PDF\n` +
      `/app              — Android + iOS app links\n` +
      `/contract         — Token contract address\n` +
      `/version          — Which bot code is live\n` +
      `/help             — This message`
  );
});

// ---- New member welcome (in-group, NOT DM — avoids 403 spam) ----
//
// Previous bot versions on the server tried to DM new joiners with a link
// prompt; Telegram blocks that with "bot can't initiate conversation with a
// user" unless the user has started the bot first, producing hundreds of
// 403 errors. The correct approach is to post a short welcome in the group
// itself, mentioning the user and linking them to the bot's /start URL.
// Auto-delete after 60 s so the chat stays clean.

bot.on('message:new_chat_members', async (ctx) => {
  if (!WELCOME_NEW_MEMBERS) return;
  const newMembers = ctx.message.new_chat_members || [];
  for (const member of newMembers) {
    if (member.is_bot) continue;
    const displayName = member.username
      ? `@${member.username}`
      : member.first_name || `User ${member.id}`;
    const deepLink = `https://t.me/${BOT_USERNAME}`;
    console.log(`👋 New member: ${member.id} (${displayName})`);
    const welcomeKb = new InlineKeyboard()
      .url('🚀 Start Bot', deepLink)
      .url('🌐 Website', WEBSITE_URL)
      .row()
      .url('Android 📱', APP_ANDROID_URL)
      .url('iOS 📱', APP_IOS_URL);
    try {
      const msg = await ctx.reply(
        `👋 Welcome ${displayName}!\n\n` +
          `Tap "Start Bot" to link your Arkeza account and earn XP.`,
        { reply_markup: welcomeKb }
      );
      // Auto-delete after 60 s to keep the group tidy.
      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(msg.chat.id, msg.message_id);
        } catch (_) { /* message may already be deleted */ }
      }, 60_000);
    } catch (err) {
      console.error(`Failed to welcome ${member.id}: ${err.message}`);
    }
  }
});

// ---- /profile (Arkeza app data) ----

bot.command('profile', async (ctx) => {
  const telegramId = ctx.from.id;
  const result = await arkezaApi.getUserData(telegramId);

  if (!result.ok) {
    if (result.status === 404) {
      await ctx.reply('❌ You are not linked yet. Open the link from the Arkeza app first.');
      return;
    }
    // API unreachable → honest "coming soon" rather than confusing local stats
    // that look like Arkeza app stats but aren't.
    await ctx.reply(
      `⏳ Profile coming soon\n\n` +
        `Your XP and referral stats from the Arkeza app will appear here ` +
        `once the API integration is finalized. Thanks for your patience!`
    );
    return;
  }

  const d = result.data || {};
  await ctx.reply(
    `👤 Your Arkeza Profile\n\n` +
      `Username: ${d.username || '—'}\n` +
      `XP: ${d.xp ?? 0}\n` +
      `Referrals: ${d.referrals ?? 0}`
  );
});

// ---- /leaderboard ----
//
// Defaults to legacy bot leaderboard if no Arkeza data available; otherwise
// shows XP top users with a switch button to Referral leaderboard.

// ---- /leaderboard ----
//
// Primary: cycle-scoped group referral leaderboard (Patrick's campaign).
// Secondary (via inline button): Arkeza app XP / Referrals leaderboard.

async function renderArkezaLeaderboard(ctx, type) {
  const telegramId = ctx.from.id;
  const result = await arkezaApi.getLeaderboard(telegramId, type);

  if (!result.ok) {
    // Arkeza API unreachable / encryption not configured yet.
    console.warn(`[leaderboard] Arkeza API failed (${result.message}), pointing user back to group board`);
    const kb = new InlineKeyboard().text('🏆 Group Leaderboard', 'show_leaderboard_group');
    await ctx.reply(
      `⏳ Arkeza ${type === 'xp' ? 'XP' : 'Referral'} leaderboard coming soon\n\n` +
        `Once the Arkeza app integration is finalized, live ${type === 'xp' ? 'XP' : 'app-referral'} data from the app will appear here.\n\n` +
        `Meanwhile, check out the current group referral campaign:`,
      { reply_markup: kb }
    );
    return;
  }

  const board =
    type === 'xp' ? result.data?.xpLeaderboard : result.data?.referralLeaderboard;
  if (!board) {
    await ctx.reply('📊 No leaderboard data available yet.');
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const valueLabel = type === 'xp' ? 'XP' : 'Referrals';
  const valueKey = type === 'xp' ? 'xp' : 'referrals';
  let message = type === 'xp' ? '🏆 XP Leaderboard 🏆\n\n' : '🏆 Referral Leaderboard 🏆\n\n';

  (board.topUsers || []).forEach((u, i) => {
    const medal = medals[i] || `${u.rank ?? i + 1}.`;
    message += `${medal} ${u.username}: ${u[valueKey]} ${valueLabel}\n`;
  });

  if (board.userRank) {
    const ur = board.userRank;
    message += `\n— Your rank: #${ur.rank} (${ur[valueKey]} ${valueLabel})`;
  }

  const kb = new InlineKeyboard()
    .text(type === 'xp' ? '🔁 Show Referrals' : '🔁 Show XP',
          type === 'xp' ? 'show_leaderboard_referral' : 'show_leaderboard_xp');

  await ctx.reply(message, { reply_markup: kb });
}

// ---- Campaign cycle ----
//
// Per Patrick's spec, the leaderboard does NOT auto-rotate on a weekly
// schedule. Admins explicitly start a new cycle via `/admin cycle`.
// Only referrals verified at or after the current cycle's started_at
// timestamp count toward the current leaderboard.

function formatCycleHeader() {
  const startUnix = db.getCurrentCycleStart();
  const startIso = new Date(startUnix * 1000).toISOString();
  return `📅 Cycle since ${startIso.slice(0, 16).replace('T', ' ')} UTC`;
}

// ---- /leaderboard ----
// Default = current cycle's group referrals (Patrick's campaign).
// Toggle buttons switch to Arkeza XP / Referrals.

async function renderCycleGroupLeaderboard(ctx) {
  const cycleStart = db.getCurrentCycleStart();
  const rows = db.getCycleLeaderboard(cycleStart, 10);
  const header = formatCycleHeader();

  const kb = new InlineKeyboard()
    .text('🔁 XP', 'show_leaderboard_xp')
    .text('🏅 App Contest', 'show_refcontest');

  if (rows.length === 0) {
    await ctx.reply(
      `🏆 Group Referral Leaderboard 🏆\n${header}\n\n` +
        `No verified referrals yet this cycle — be the first!\n\n` +
        `Share your referral link and invite friends. They need to:\n` +
        `  1. Join the group via your link\n` +
        `  2. Send a message to confirm (Pending)\n` +
        `  3. Stay active: 3 messages after a 24h cool-down → Verified\n` +
        `Only Verified referrals count toward the current cycle.`,
      { reply_markup: kb }
    );
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  let message = `🏆 Group Referral Leaderboard 🏆\n${header}\n\n`;
  rows.forEach((u, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const name = u.username ? `@${u.username}` : u.first_name || `User ${u.user_id}`;
    message += `${medal} ${name}: ${u.verified_referrals} verified refs\n`;
  });

  const myCount = db.getCycleReferralCount(ctx.from.id, cycleStart);
  message += `\n— Your cycle: ${myCount} verified referral${myCount === 1 ? '' : 's'}`;

  await ctx.reply(message, { reply_markup: kb });
}

bot.command('leaderboard', async (ctx) => {
  await renderCycleGroupLeaderboard(ctx);
});

bot.callbackQuery('show_leaderboard_group', async (ctx) => {
  await ctx.answerCallbackQuery();
  await renderCycleGroupLeaderboard(ctx);
});

bot.callbackQuery('show_leaderboard_xp', async (ctx) => {
  await ctx.answerCallbackQuery();
  await renderArkezaLeaderboard(ctx, 'xp');
});

bot.callbackQuery('show_leaderboard_referral', async (ctx) => {
  await ctx.answerCallbackQuery();
  await renderArkezaLeaderboard(ctx, 'referral');
});

// ---- /refcontest — App Referral Contest Leaderboard (V2 endpoint) ----

async function renderRefContestLeaderboard(ctx) {
  const telegramId = ctx.from.id;
  const result = await arkezaApi.getReferralContestLeaderboard(telegramId);

  if (!result.ok) {
    await ctx.reply(`⏳ Referral contest leaderboard unavailable right now.`);
    return;
  }

  const d = result.data || {};
  const medals = ['🥇', '🥈', '🥉'];
  let msg = '🏆 App Referral Contest 🏆\n\n';

  const current = d.leaderboard || [];
  if (current.length > 0) {
    msg += '📊 Current standings:\n';
    current.forEach((u, i) => {
      const medal = medals[i] || `${u.rank || i + 1}.`;
      msg += `${medal} ${u.username}: ${u.referrals} referrals\n`;
    });
  } else {
    msg += 'No contest entries yet.\n';
  }

  const lastWeek = d.lastweekwinner || [];
  if (lastWeek.length > 0) {
    msg += '\n🏅 Last week\'s winners:\n';
    lastWeek.forEach((u) => {
      const medal = medals[(u.rank || 1) - 1] || `${u.rank}.`;
      msg += `${medal} ${u.username}: ${u.referrals} referrals\n`;
    });
  }

  const kb = new InlineKeyboard()
    .text('🔁 Group Board', 'show_leaderboard_group')
    .text('🔁 XP', 'show_leaderboard_xp');

  await ctx.reply(msg, { reply_markup: kb });
}

bot.command('refcontest', async (ctx) => {
  await renderRefContestLeaderboard(ctx);
});

bot.callbackQuery('show_refcontest', async (ctx) => {
  await ctx.answerCallbackQuery();
  await renderRefContestLeaderboard(ctx);
});

bot.callbackQuery('show_profile', async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from.id;
  const result = await arkezaApi.getUserData(telegramId);
  if (!result.ok) {
    await ctx.reply(`❌ Could not fetch profile: ${result.message}`);
    return;
  }
  const d = result.data || {};
  await ctx.reply(
    `👤 ${d.username || 'Profile'}\nXP: ${d.xp ?? 0}\nReferrals: ${d.referrals ?? 0}`
  );
});

// ---- /stats (legacy, in-bot referrals) ----

bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;
  const user = db.getUser(userId);
  if (!user) {
    await ctx.reply('❌ You are not registered yet. Use /start to begin!');
    return;
  }
  const stats = db.getReferralStats(userId);
  const referralLink = getReferralLink(userId);
  const cycleStart = db.getCurrentCycleStart();
  const cycleVerified = db.getCycleReferralCount(userId, cycleStart);
  await ctx.reply(
    `📊 Your Referral Stats\n\n` +
      `This cycle: ${cycleVerified} verified\n` +
      `All-time verified: ${stats.verified_referrals}\n` +
      `All-time total: ${stats.total_referrals}\n\n` +
      `🔗 Your Referral Link:\n${referralLink}\n\n` +
      `Share this link to climb the leaderboard!`
  );
});

// ---- /connect ----
//
// For users already in the group who want to link their Arkeza account
// without relying on the welcome-on-join message. Posts a short guide
// with buttons to the Arkeza app (so they can grab a fresh deep-link)
// and to the bot itself.

bot.command('connect', async (ctx) => {
  const linked = db.getLinkedUser(ctx.from.id);
  if (linked) {
    await ctx.reply(
      `✅ Your Telegram is already connected to Arkeza${linked.arkeza_username ? ` as ${linked.arkeza_username}` : ''}. No action needed.`
    );
    return;
  }
  const botLink = `https://t.me/${BOT_USERNAME}`;
  const kb = new InlineKeyboard()
    .url('Android 📱', APP_ANDROID_URL)
    .url('iOS 📱', APP_IOS_URL)
    .row()
    .url('🚀 Open Bot', botLink);
  await ctx.reply(
    `🔗 Link your Telegram to Arkeza\n\n` +
      `1. Open the Arkeza app and tap "Connect Telegram"\n` +
      `2. Follow the deep-link it gives you — the bot will pick it up\n` +
      `3. Or paste the token manually with /link <token>\n\n` +
      `Buttons below for the app + bot.`,
    { reply_markup: kb }
  );
});

// ---- /chatid ----
// Admin-only utility: prints the current chat's ID + type.
// Useful to grab the numeric ID of the Arkeza group/channel to feed into
// ANNOUNCEMENT_CHANNEL_ID in .env.

bot.command('chatid', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ Admin only.');
    return;
  }
  await ctx.reply(
    `Chat ID: \`${ctx.chat.id}\`\n` +
      `Type: ${ctx.chat.type}\n` +
      `Title: ${ctx.chat.title || '(none / DM)'}`,
    { autoDelete: false, parse_mode: 'Markdown' }
  );
});

// ---- /admin ----

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply('❌ This command is only for administrators.');
    return;
  }
  const args = ctx.match?.split(' ') || [];
  const command = args[0];

  if (!command) {
    await ctx.reply(
      '🔧 Admin Commands\n\n' +
        '/admin cycle - Start a NEW leaderboard cycle (rotates the board)\n' +
        '/admin cycles - List past cycles\n' +
        '/admin winners - Announce current cycle\'s 1st + 2nd place\n' +
        '/admin stats - Overall statistics\n' +
        '/admin suspicious - List suspicious users\n' +
        '/admin remove <user_id> - Remove a user\n' +
        '/admin export - Export CSV data'
    );
    return;
  }

  switch (command) {
    case 'winners': {
      const cycleStart = db.getCurrentCycleStart();
      const topN = db.getCycleLeaderboard(cycleStart, 2);
      if (topN.length === 0) {
        await ctx.reply(
          '📊 No verified referrals this cycle yet — nothing to announce.'
        );
        break;
      }
      const nameOf = (u) =>
        u.username ? `@${u.username}` : u.first_name || `User ${u.user_id}`;
      const [first, second] = topN;
      let msg = `🏆 Cycle Winners 🏆\n\n`;
      msg += `🥇 ${nameOf(first)} — ${first.verified_referrals} verified referrals\n`;
      if (second) {
        msg += `🥈 ${nameOf(second)} — ${second.verified_referrals} verified referrals\n`;
      }
      msg += `\nCongratulations! 🎉`;
      // autoDelete: false → announcement stays in chat history.
      await ctx.reply(msg, { autoDelete: false });
      break;
    }
    case 'cycle': {
      const startedAt = db.startNewCycle(ctx.from.id, args[1] || null);
      const iso = new Date(startedAt * 1000).toISOString();
      await ctx.reply(
        `🔄 New leaderboard cycle started.\n\n` +
          `Start: ${iso.slice(0, 16).replace('T', ' ')} UTC\n` +
          `Only referrals verified from this moment on will count in the ` +
          `current board. Past verifications are archived.`
      );
      break;
    }
    case 'cycles': {
      const cycles = db.listCycles(10);
      if (cycles.length === 0) {
        await ctx.reply('No cycles recorded yet.');
        break;
      }
      let msg = '📅 Recent cycles (newest first):\n\n';
      cycles.forEach((c, i) => {
        const iso = new Date(c.started_at * 1000).toISOString().slice(0, 16).replace('T', ' ');
        msg += `${i === 0 ? '🟢' : '⚪️'} #${c.id} — ${iso} UTC${c.label ? ` — ${c.label}` : ''}\n`;
      });
      msg += '\n🟢 = current open cycle';
      await ctx.reply(msg);
      break;
    }
    case 'stats': {
      const stats = db.getTotalStats();
      await ctx.reply(
        `📊 System Statistics\n\n` +
          `👥 Total Users: ${stats.totalUsers}\n` +
          `✅ Verified Users: ${stats.verifiedUsers}\n` +
          `⚠️ Suspicious Users: ${stats.suspiciousUsers}\n` +
          `🔗 Total Referrals: ${stats.totalReferrals}`
      );
      break;
    }
    case 'suspicious': {
      const suspicious = db.getSuspiciousUsers();
      if (suspicious.length === 0) {
        await ctx.reply('✅ No suspicious users found!');
        break;
      }
      let message = `⚠️ Suspicious Users (${suspicious.length})\n\n`;
      suspicious.slice(0, 20).forEach((user) => {
        const name = user.username
          ? `@${user.username}`
          : user.first_name || `User ${user.user_id}`;
        const joinDate = new Date(user.joined_at * 1000).toLocaleDateString();
        message += `• ${name} (ID: ${user.user_id})\n  Joined: ${joinDate}\n`;
      });
      if (suspicious.length > 20) {
        message += `\n...and ${suspicious.length - 20} more`;
      }
      await ctx.reply(message);
      break;
    }
    case 'remove': {
      const target = args[1];
      if (!target) {
        await ctx.reply('Usage: /admin remove <user_id>');
        break;
      }
      if (target.startsWith('@')) {
        await ctx.reply('❌ Username lookup not supported. Please use user ID.');
        break;
      }
      const userId = parseInt(target);
      const user = db.getUser(userId);
      if (!user) {
        await ctx.reply(`❌ User ${userId} not found.`);
        break;
      }
      db.removeUser(userId);
      await ctx.reply(`✅ Removed user ${formatUsername(user)} (ID: ${userId})`);
      break;
    }
    case 'export': {
      const csv = db.exportToCSV();
      const filename = `referrals_${Date.now()}.csv`;
      const filepath = `./${filename}`;
      fs.writeFileSync(filepath, csv);
      await ctx.replyWithDocument({ source: filepath, filename });
      fs.unlinkSync(filepath);
      break;
    }
    default:
      await ctx.reply('❌ Unknown admin command. Use /admin to see available commands.');
  }
});

// ---- Group message verification (legacy) ----

bot.on('message:text', async (ctx) => {
  console.log(
    `📨 Message from ${ctx.from.id} (@${ctx.from.username}) in ${ctx.chat.type} (${
      ctx.chat.title || 'private'
    }): "${ctx.message.text.substring(0, 50)}"`
  );
  if (ctx.message.text.startsWith('/')) return;
  if (ctx.chat.type === 'private') return;

  const userId = ctx.from.id;
  const state = db.handleGroupMessage(userId);

  if (state === 'confirmed') {
    console.log(`✅ ${userId} confirmed → PENDING (24h countdown started)`);
  } else if (state === 'counting') {
    const u = db.getUser(userId);
    console.log(`📝 ${userId} post-delay message ${u.message_count}/3 counted`);
  } else if (state === 'verified') {
    const user = db.getUser(userId);
    console.log(`✅ ${userId} → VERIFIED (post-delay messages met)`);
    const verifyMsg = await ctx.reply(
      `✅ ${ctx.from.first_name}, your account is now verified!`,
      { autoDelete: 10 }
    );
    // (verifyMsg auto-deletes via autoDelete=10 in groups thanks to our middleware;
    // in DMs — shouldn't happen here but — no auto-delete is applied anyway.)
    void verifyMsg;

    if (user.referred_by) {
      const referrer = db.getUser(user.referred_by);
      if (referrer) {
        try {
          await bot.api.sendMessage(
            user.referred_by,
            `🎉 Your referral just got verified!\n\n` +
              `User: ${formatUsername(ctx.from)}\n✅ Confirmed!`
          );
        } catch (error) {
          console.error('Failed to notify referrer:', error.message);
        }
      }
    }
  }
});

bot.on('my_chat_member', async (ctx) => {
  const status = ctx.myChatMember.new_chat_member.status;
  if (status === 'member' || status === 'administrator') {
    console.log(`✅ Bot added to chat: ${ctx.chat.title || ctx.chat.id}`);
  }
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx?.update?.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

// ---- Arkeza inbound webhook handler (milestones + announcements) ----
//
// Per Patrick's "arkeza milestone spec.docx":
//   - Each milestone fires BOTH a public post + a private DM simultaneously
//   - Public post uses custom 3-line templates (achievement / social pressure / CTA)
//   - Private DM only if telegramId is available
//   - Each milestone fires ONCE per user (dedup via milestone_log table)
//   - Admin announcements broadcast to channel as before

const milestoneTemplates = require('./milestone-templates');

async function handleArkezaEvent(payload) {
  if (!payload || !payload.event) {
    console.warn('[arkeza-event] payload missing "event" field');
    return;
  }

  const ev = payload.event;

  // ---- Admin announcement ----
  if (ev === 'admin_announcement') {
    const text = `📣 Announcement\n\n${payload.message || ''}`;
    if (ANNOUNCEMENT_CHANNEL_ID) {
      try {
        await bot.api.sendMessage(ANNOUNCEMENT_CHANNEL_ID, text);
      } catch (err) {
        console.error('[arkeza-event] failed to post announcement:', err.message);
      }
    } else {
      console.log('[arkeza-event] announcement (no channel configured):', payload.message);
    }
    return;
  }

  // ---- Milestone events ----
  if (ev.startsWith('milestone.')) {
    const type = payload.type;
    const newValue = payload.newValue;
    const username = payload.username || 'A user';
    const telegramId =
      payload.telegramId || db.getLinkedTelegramIdByUsername(username);

    // Dedup: each milestone fires once per user
    if (db.isMilestoneAnnounced(username, type, newValue)) {
      console.log(`[arkeza-event] ${ev} ${username}=${newValue} already announced, skipping`);
      return;
    }

    // Look up custom template
    const template = milestoneTemplates.getTemplate(type, newValue);

    // Build messages.
    // Priority: use Mit's `message` field (contains lines 1+2 separated by \n).
    // We append the CTA (line 3) + app buttons.
    // Fallback: our local template table if Mit's message is missing or empty.
    let publicText, dmText;

    if (payload.message && payload.message.includes('\n')) {
      // Mit sends line1\nline2 — we append CTA as line 3
      publicText = `${payload.message}\n${milestoneTemplates.CTA}`;
      dmText = `🎉 Congratulations ${username}!\n\n${payload.message.split('\n')[0]}\n\nKeep going — your grind is paying off!`;
    } else if (template) {
      publicText = milestoneTemplates.renderPublic(template, username);
      dmText = milestoneTemplates.renderPrivate(template, username);
    } else {
      const fallbackMsg = payload.message || `🎯 ${username} reached a milestone!`;
      publicText = `${fallbackMsg}\n${milestoneTemplates.CTA}`;
      dmText = `🎉 Congratulations ${username}!\n\n${fallbackMsg}`;
    }

    // 1) PUBLIC post — fires regardless of Telegram link status
    const appKb = new InlineKeyboard()
      .url('Android 📱', APP_ANDROID_URL)
      .url('iOS 📱', APP_IOS_URL);

    if (ANNOUNCEMENT_CHANNEL_ID) {
      try {
        await bot.api.sendMessage(ANNOUNCEMENT_CHANNEL_ID, publicText, {
          reply_markup: appKb,
        });
        console.log(`[arkeza-event] public milestone posted: ${ev} ${username}=${newValue}`);
      } catch (err) {
        console.error('[arkeza-event] failed to post public milestone:', err.message);
      }
    } else {
      console.log('[arkeza-event] public milestone (no channel configured):', publicText);
    }

    // 2) PRIVATE DM — only if telegramId is available
    if (telegramId) {
      try {
        await bot.api.sendMessage(telegramId, dmText);
        console.log(`[arkeza-event] DM sent to ${telegramId} for ${ev}`);
      } catch (err) {
        console.error(`[arkeza-event] DM to ${telegramId} failed:`, err.message);
      }
    }

    // Log the milestone to prevent duplicates
    db.logMilestone(username, type, newValue);
    return;
  }

  console.warn(`[arkeza-event] unhandled event type: ${ev}`);
}

// ---- Shutdown handlers ----

let serverRef = null;
let runtimeMode = 'unknown'; // 'webhook' | 'polling' | 'unknown'

async function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down...`);
  try {
    if (runtimeMode === 'webhook') {
      await bot.api.deleteWebhook({ drop_pending_updates: false });
    } else if (runtimeMode === 'polling') {
      await bot.stop();
    }
  } catch (e) {
    /* ignore — best effort */
  }
  if (serverRef) serverRef.close();
  db.close();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// ---- Boot ----
//
// Mode selection:
//   - WEBHOOK_BASE_URL set + reachable HTTPS → Webhook mode (preferred)
//   - WEBHOOK_BASE_URL empty/unset → Long-polling fallback (works without HTTPS)
//
// In both modes:
//   - We always start the Express server (so /webhook/arkeza milestone events
//     keep working from Mit's backend regardless of which Telegram-update
//     transport we use).
//   - We always call deleteWebhook(drop_pending_updates: true) before polling
//     to clear any stale webhook that would otherwise siphon off updates.

async function selfCheckArkezaApi() {
  // Quick reachability ping to Mit's API — does NOT validate auth, just DNS+TCP+TLS.
  const r = await arkezaApi.isLinked('0');
  if (r.ok || r.status === 200 || (r.status >= 200 && r.status < 500)) {
    return { ok: true, detail: `HTTP ${r.status || 200}` };
  }
  return { ok: false, detail: r.message || `HTTP ${r.status}` };
}

async function main() {
  const mode = WEBHOOK_BASE_URL ? 'webhook' : 'polling';
  console.log('================================================');
  console.log(`🚀 Arkeza Referral Bot starting (mode: ${mode.toUpperCase()})`);
  console.log(`   Commit:  ${GIT_SHA}`);
  console.log(`   Subject: ${GIT_SUBJECT}`);
  console.log(`   Booted:  ${new Date(BOOT_TIME).toISOString()}`);
  console.log('================================================');

  // Initialize bot so bot.api.* is usable.
  await bot.init();

  // Register the bot's command menu with Telegram so users see it in the "/" button.
  await bot.api.setMyCommands([
    { command: 'start', description: 'Link your Arkeza account or view stats' },
    { command: 'connect', description: 'Start the linking flow' },
    { command: 'profile', description: 'Your Arkeza profile (XP, referrals)' },
    { command: 'leaderboard', description: 'Group referral leaderboard' },
    { command: 'refcontest', description: 'App referral contest + last week winners' },
    { command: 'stats', description: 'Your referral stats' },
    { command: 'website', description: 'Arkeza website' },
    { command: 'twitter', description: 'Arkeza on X' },
    { command: 'app', description: 'Android + iOS app links' },
    { command: 'whitepaper', description: 'Whitepaper PDF' },
    { command: 'contract', description: 'Token contract address' },
    { command: 'help', description: 'List all commands' },
  ]);

  console.log(`✅ Telegram identity:    @${bot.botInfo.username} (id ${bot.botInfo.id})`);
  console.log(`✅ Admins configured:    ${ADMIN_IDS.length ? ADMIN_IDS.join(', ') : 'NONE'}`);
  console.log(`✅ Group link:           ${GROUP_LINK}`);
  console.log(`✅ Announcement channel: ${ANNOUNCEMENT_CHANNEL_ID || 'NOT SET (events will only log)'}`);
  console.log(`✅ Arkeza API base:      ${arkezaApi._config.BASE_URL}`);
  console.log(`✅ Arkeza API auth:      ${arkezaApi._config.hasApiKey ? 'Bearer token configured' : 'unauthenticated'}`);
  const encCfg = arkezaApi._config.encryption;
  console.log(
    `${encCfg.enabled ? '✅' : '⚠️ '} Arkeza API encryption: ${
      encCfg.enabled
        ? 'RSA-OAEP-SHA256 active (public key loaded)'
        : encCfg.forceDisabled
        ? 'force-disabled via ARKEZA_ENCRYPT=false'
        : `NOT configured — place tg-public.pem at ${encCfg.keyPathAttempted} (or set ARKEZA_PUBLIC_KEY / ARKEZA_PUBLIC_KEY_FILE)`
    }`
  );

  // API self-check — non-fatal, but tells Patrick at boot if DNS/TLS/firewall is OK.
  try {
    const apiCheck = await selfCheckArkezaApi();
    console.log(
      `${apiCheck.ok ? '✅' : '❌'} Arkeza API reachable: ${apiCheck.detail}`
    );
  } catch (e) {
    console.log(`❌ Arkeza API reachable: ${e.message}`);
  }

  // Express server (always on — handles inbound Arkeza webhooks regardless of TG mode).
  // IMPORTANT: register the Telegram-webhook route only in webhook mode.
  // grammY throws "already started via webhooks" if we call bot.start() after
  // webhookCallback() has been bound to the same Bot instance.
  serverRef = await startWebhookServer({
    bot,
    onArkezaEvent: handleArkezaEvent,
    enableTelegramWebhook: mode === 'webhook',
    getStatus: () => ({
      mode: runtimeMode,
      bot_username: bot.botInfo?.username || null,
      arkeza_api_base: arkezaApi._config.BASE_URL,
      arkeza_api_authenticated: arkezaApi._config.hasApiKey,
      announcement_channel_configured: !!ANNOUNCEMENT_CHANNEL_ID,
      admin_count: ADMIN_IDS.length,
    }),
  });

  // ---- Telegram update transport ----
  if (mode === 'webhook') {
    const fullUrl = `${WEBHOOK_BASE_URL.replace(/\/$/, '')}${paths.telegram}`;
    try {
      await bot.api.setWebhook(fullUrl, {
        secret_token: WEBHOOK_SECRET_TOKEN || undefined,
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query', 'my_chat_member'],
      });
      runtimeMode = 'webhook';
      console.log(`✅ Telegram webhook registered: ${fullUrl}`);
    } catch (err) {
      console.error(`❌ Failed to set Telegram webhook: ${err.message}`);
      if (/HTTPS|https/.test(err.message)) {
        console.error(
          "   → Telegram requires HTTPS for webhooks. Either put nginx + Let's Encrypt"
        );
        console.error('     (or Cloudflare Tunnel) in front of the server and update');
        console.error('     WEBHOOK_BASE_URL=https://<your-domain> in .env, or simply');
        console.error('     leave WEBHOOK_BASE_URL empty to fall back to long-polling.');
      }
      console.error('⚠️  Falling back to long-polling so the bot still works...');
      await startPolling();
    }
  } else {
    console.log('ℹ️  WEBHOOK_BASE_URL not set → using long-polling mode.');
    console.log('   (For production, configure HTTPS + WEBHOOK_BASE_URL to use webhooks.)');
    await startPolling();
  }

  console.log('================================================');
  console.log('🟢 Bot is now LIVE and listening for updates.');
  console.log('================================================');
}

async function startPolling() {
  // Critical: clear any previously-registered webhook AND any pending updates,
  // otherwise getUpdates returns 409 Conflict because Telegram won't deliver
  // long-polling responses while a webhook is set.
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    console.log('✅ Cleared stale webhook + pending updates (anti-409 protection).');
  } catch (err) {
    console.warn(`⚠️  deleteWebhook failed (continuing anyway): ${err.message}`);
  }

  // bot.start() is async-loop; it never resolves. Don't await it.
  bot
    .start({
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query', 'my_chat_member'],
      onStart: () => {
        runtimeMode = 'polling';
        console.log('✅ Long-polling started.');
      },
    })
    .catch((err) => {
      console.error('💥 Polling crashed:', err.message);
      process.exit(1);
    });
}

main().catch((err) => {
  console.error('💥 Fatal startup error:', err);
  process.exit(1);
});

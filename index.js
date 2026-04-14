require('dotenv').config();
const { Bot, GrammyError, HttpError, InlineKeyboard } = require('grammy');
const ReferralDatabase = require('./database');
const arkezaApi = require('./arkeza-api');
const { startWebhookServer, paths } = require('./webhook-server');
const fs = require('fs');

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

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN not found in .env file');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const db = new ReferralDatabase();

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
    .url('💬 Join Group', GROUP_LINK);

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

  console.log(`[start] from ${userId} (@${username}) arg.len=${arg.length}`);

  const token = classifyStartToken(arg);

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

// ---- /profile (Arkeza app data) ----

bot.command('profile', async (ctx) => {
  const telegramId = ctx.from.id;
  const result = await arkezaApi.getUserData(telegramId);

  if (!result.ok) {
    if (result.status === 404) {
      await ctx.reply('❌ You are not linked yet. Open the link from the Arkeza app first.');
      return;
    }
    await ctx.reply(`❌ Could not fetch profile: ${result.message}`);
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

async function renderArkezaLeaderboard(ctx, type) {
  const telegramId = ctx.from.id;
  const result = await arkezaApi.getLeaderboard(telegramId, type);

  if (!result.ok) {
    await ctx.reply(`❌ Could not fetch ${type} leaderboard: ${result.message}`);
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

bot.command('leaderboard', async (ctx) => {
  await renderArkezaLeaderboard(ctx, 'xp');
});

bot.callbackQuery('show_leaderboard_xp', async (ctx) => {
  await ctx.answerCallbackQuery();
  await renderArkezaLeaderboard(ctx, 'xp');
});

bot.callbackQuery('show_leaderboard_referral', async (ctx) => {
  await ctx.answerCallbackQuery();
  await renderArkezaLeaderboard(ctx, 'referral');
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
  await ctx.reply(
    `📊 Your Referral Stats\n\n` +
      `✅ Verified Referrals: ${stats.verified_referrals}\n` +
      `👥 Total Referrals: ${stats.total_referrals}\n\n` +
      `🔗 Your Referral Link:\n${referralLink}\n\n` +
      `Share this link to grow your referrals!`
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
        '/admin stats - Overall statistics\n' +
        '/admin suspicious - List suspicious users\n' +
        '/admin remove <user_id> - Remove a user\n' +
        '/admin export - Export CSV data'
    );
    return;
  }

  switch (command) {
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
  const user = db.getUser(userId);
  if (user && !user.is_verified) {
    db.incrementMessageCount(userId);
    const updatedUser = db.getUser(userId);
    if (updatedUser.is_verified) {
      const verifyMsg = await ctx.reply(
        `✅ ${ctx.from.first_name}, your account is now verified!`
      );
      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(verifyMsg.chat.id, verifyMsg.message_id);
        } catch (e) {
          /* may already be deleted */
        }
      }, 10000);

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

async function handleArkezaEvent(payload) {
  if (!payload || !payload.event) {
    console.warn('[arkeza-event] payload missing "event" field');
    return;
  }

  const ev = payload.event;

  // Admin announcement → broadcast to channel
  if (ev === 'admin_announcement') {
    const text = `📣 *Announcement*\n\n${payload.message || ''}`;
    if (ANNOUNCEMENT_CHANNEL_ID) {
      try {
        await bot.api.sendMessage(ANNOUNCEMENT_CHANNEL_ID, text, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('[arkeza-event] failed to post announcement:', err.message);
      }
    } else {
      console.log('[arkeza-event] announcement (no channel configured):', payload.message);
    }
    return;
  }

  // Milestone events: milestone.referrals / .tasks / .streak / .xp / .tier
  if (ev.startsWith('milestone.')) {
    const visibility = payload.milestonePostVisibility || 'public';
    const message = payload.message || `🎯 ${payload.username || 'A user'} reached a milestone.`;

    if (visibility === 'private') {
      const tgId =
        payload.telegramId || db.getLinkedTelegramIdByUsername(payload.username);
      if (!tgId) {
        console.warn(`[arkeza-event] private milestone but no telegramId resolvable: ${ev}`);
        return;
      }
      try {
        await bot.api.sendMessage(tgId, message);
      } catch (err) {
        console.error(`[arkeza-event] DM to ${tgId} failed:`, err.message);
      }
      return;
    }

    // public
    if (ANNOUNCEMENT_CHANNEL_ID) {
      try {
        await bot.api.sendMessage(ANNOUNCEMENT_CHANNEL_ID, message);
      } catch (err) {
        console.error('[arkeza-event] failed to post public milestone:', err.message);
      }
    } else {
      console.log('[arkeza-event] public milestone (no channel configured):', message);
    }
    return;
  }

  console.warn(`[arkeza-event] unhandled event type: ${ev}`);
}

// ---- Shutdown handlers ----

let serverRef = null;

async function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down...`);
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: false });
  } catch (e) {
    /* ignore */
  }
  if (serverRef) serverRef.close();
  db.close();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// ---- Boot ----

async function main() {
  console.log('🚀 Arkeza Referral Bot starting (M4: webhook mode)...');

  // Initialize bot so bot.api.* is usable.
  await bot.init();
  console.log(`✅ Bot @${bot.botInfo.username} initialized`);
  console.log(`📊 Admin IDs: ${ADMIN_IDS.join(', ') || 'None configured'}`);
  console.log(`⚙️  Rate limit: ${RATE_LIMIT_MAX_JOINS} joins / ${RATE_LIMIT_WINDOW_HOURS}h`);
  console.log(`🌍 Group: ${GROUP_LINK}`);
  console.log(`🔌 Arkeza API: ${arkezaApi._config.BASE_URL} (auth: ${arkezaApi._config.hasApiKey ? 'yes' : 'no'})`);

  // Start express + register routes BEFORE setting webhook so Telegram never
  // hits a 404 between setWebhook and the listener becoming ready.
  serverRef = await startWebhookServer({
    bot,
    onArkezaEvent: handleArkezaEvent,
  });

  // Register webhook with Telegram. This automatically drops any existing
  // long-polling session — fixes the 409 Conflict.
  if (!WEBHOOK_BASE_URL) {
    console.warn(
      '⚠️  WEBHOOK_BASE_URL not set — running server without registering Telegram webhook.\n' +
        '   Set WEBHOOK_BASE_URL=https://your-public-host in .env to receive updates.'
    );
  } else {
    const fullUrl = `${WEBHOOK_BASE_URL.replace(/\/$/, '')}${paths.telegram}`;
    try {
      await bot.api.setWebhook(fullUrl, {
        secret_token: WEBHOOK_SECRET_TOKEN || undefined,
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query', 'my_chat_member'],
      });
      console.log(`✅ Telegram webhook registered: ${fullUrl}`);
    } catch (err) {
      console.error('❌ Failed to set Telegram webhook:', err.message);
      console.error('   The bot will not receive updates until this is fixed.');
    }
  }
}

main().catch((err) => {
  console.error('💥 Fatal startup error:', err);
  process.exit(1);
});

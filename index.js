require('dotenv').config();
const { Bot, GrammyError, HttpError } = require('grammy');
const ReferralDatabase = require('./database');
const fs = require('fs');

const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME || 'Arkezabot';
const GROUP_LINK = process.env.GROUP_LINK || 'https://t.me/arkezahub';
const ADMIN_IDS = process.env.ADMIN_IDS?.split(',').map(id => parseInt(id.trim())) || [];
const RATE_LIMIT_MAX_JOINS = parseInt(process.env.RATE_LIMIT_MAX_JOINS || 10);
const RATE_LIMIT_WINDOW_HOURS = parseInt(process.env.RATE_LIMIT_WINDOW_HOURS || 24);

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

bot.command('start', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;
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

  const args = ctx.match;
  let referrerId = null;
  
  if (args && args.startsWith('ref_')) {
    referrerId = parseInt(args.replace('ref_', ''));
    
    if (referrerId === userId) {
      await ctx.reply('❌ You cannot refer yourself!');
      return;
    }
    
    const referrer = db.getUser(referrerId);
    if (!referrer) {
      referrerId = null;
    }
  }

  // Register user — NOT verified yet (must send message in group)
  db.addUser(userId, username, firstName, referrerId, null);
  
  let suspiciousFlags = [];
  
  if (referrerId) {
    const rateLimit = checkRateLimit(referrerId);
    if (rateLimit.exceeded) {
      suspiciousFlags.push(`Rate limit exceeded for referrer (${rateLimit.count} joins in ${RATE_LIMIT_WINDOW_HOURS}h)`);
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
    `/leaderboard - View top referrers\n` +
    `/stats - Your referral statistics`;

  await ctx.reply(welcomeMessage);

  // Notify admins of suspicious joins
  if (suspiciousFlags.length > 0 && ADMIN_IDS.length > 0) {
    for (const adminId of ADMIN_IDS) {
      try {
        await bot.api.sendMessage(
          adminId,
          `⚠️ Suspicious join detected!\n\n` +
          `User: ${formatUsername({ user_id: userId, username, first_name: firstName })}\n` +
          `ID: ${userId}\n` +
          `Referred by: ${referrerId || 'None'}\n\n` +
          `Flags:\n${suspiciousFlags.map(f => `• ${f}`).join('\n')}`
        );
      } catch (error) {
        console.error(`Failed to notify admin ${adminId}:`, error.message);
      }
    }
  }
});

bot.command('leaderboard', async (ctx) => {
  const leaderboard = db.getLeaderboard(10);
  
  if (leaderboard.length === 0) {
    await ctx.reply('📊 No referrals yet! Be the first to invite friends!');
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  let message = '🏆 Top Referrers 🏆\n\n';

  leaderboard.forEach((user, index) => {
    const rank = index + 1;
    const medal = medals[index] || `${rank}.`;
    const name = user.username ? `@${user.username}` : user.first_name || `User ${user.user_id}`;
    
    message += `${medal} ${name}: ${user.verified_referrals} referrals\n`;
  });

  await ctx.reply(message);
});

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

      let message = `⚠️ *Suspicious Users* (${suspicious.length})\n\n`;
      
      suspicious.slice(0, 20).forEach(user => {
        const name = user.username ? `@${user.username}` : user.first_name || `User ${user.user_id}`;
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
        await ctx.reply('Usage: /admin remove @username or /admin remove 123456789');
        break;
      }

      let userId;
      
      if (target.startsWith('@')) {
        await ctx.reply('❌ Username lookup not supported. Please use user ID.\nGet ID by forwarding a message from the user to @userinfobot');
        break;
      } else {
        userId = parseInt(target);
      }

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

// Message handler — verifies users when they send a message in the group
bot.on('message:text', async (ctx) => {
  console.log(`📨 Message from ${ctx.from.id} (@${ctx.from.username}) in ${ctx.chat.type} (${ctx.chat.title || 'private'}): "${ctx.message.text.substring(0, 50)}"`);
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
      // Auto-delete verification message after 10 seconds to keep chat clean
      setTimeout(async () => {
        try {
          await ctx.api.deleteMessage(verifyMsg.chat.id, verifyMsg.message_id);
        } catch (e) { /* message may already be deleted */ }
      }, 10000);
      
      if (user.referred_by) {
        const referrer = db.getUser(user.referred_by);
        if (referrer) {
          try {
            await bot.api.sendMessage(
              user.referred_by,
              `🎉 Your referral just got verified!\n\n` +
              `User: ${formatUsername(ctx.from)}\n` +
              `✅ Confirmed!`
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
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description);
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e);
  } else {
    console.error('Unknown error:', e);
  }
});

process.once('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  db.close();
  bot.stop();
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  db.close();
  bot.stop();
  process.exit(0);
});

console.log('🚀 Arkeza Referral Bot starting...');
bot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot @${botInfo.username} is now running!`);
    console.log(`📊 Admin IDs: ${ADMIN_IDS.join(', ') || 'None configured'}`);
    console.log(`⚙️ Settings:`);
    console.log(`   - Rate limit: ${RATE_LIMIT_MAX_JOINS} joins per ${RATE_LIMIT_WINDOW_HOURS}h`);
    console.log(`   - Group: ${GROUP_LINK}`);
  }
});

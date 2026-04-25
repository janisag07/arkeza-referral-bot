function isAnonymousGroupSender(ctx) {
  return Boolean(
    ctx?.message?.sender_chat ||
    ctx?.senderChat ||
    ctx?.from?.id === 1087968824 // Telegram's GroupAnonymousBot
  );
}

function anonymousSenderMessage() {
  return (
    '❌ Telegram sent this command as the group/channel identity, not as your personal account.\n\n' +
    'Please send the command from your normal Telegram user account, or turn off “Remain anonymous” for admins and try again.'
  );
}

async function ensureLinkedUser(telegramId, db, arkezaApi) {
  const local = db.getLinkedUser?.(telegramId);
  if (local) {
    return {
      linked: true,
      source: 'local',
      username: local.arkeza_username || null,
    };
  }

  const result = await arkezaApi.isLinked(telegramId);
  if (!result.ok || !result.data?.isLinked) {
    return {
      linked: false,
      source: 'api',
      status: result.status,
      message: result.message,
    };
  }

  const username =
    result.data?.username ||
    result.data?.arkezaUsername ||
    result.data?.arkeza_username ||
    result.data?.user?.username ||
    null;

  if (db.upsertLinkedUser) {
    db.upsertLinkedUser(telegramId, username);
  }

  return {
    linked: true,
    source: 'api',
    username,
  };
}

module.exports = { ensureLinkedUser, isAnonymousGroupSender, anonymousSenderMessage };

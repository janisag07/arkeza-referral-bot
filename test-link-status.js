const assert = require('assert');
const {
  ensureLinkedUser,
  isAnonymousGroupSender,
  anonymousSenderMessage,
} = require('./link-status');

async function testFallsBackToArkezaApiWhenLocalLinkMissing() {
  const calls = [];
  const db = {
    getLinkedUser: (telegramId) => {
      calls.push(['getLinkedUser', telegramId]);
      return null;
    },
    upsertLinkedUser: (telegramId, username) => {
      calls.push(['upsertLinkedUser', telegramId, username]);
    },
  };
  const api = {
    isLinked: async (telegramId) => {
      calls.push(['isLinked', telegramId]);
      return { ok: true, data: { isLinked: true, username: 'Patrick' } };
    },
  };

  const result = await ensureLinkedUser(12345, db, api);

  assert.deepStrictEqual(result, { linked: true, source: 'api', username: 'Patrick' });
  assert.deepStrictEqual(calls, [
    ['getLinkedUser', 12345],
    ['isLinked', 12345],
    ['upsertLinkedUser', 12345, 'Patrick'],
  ]);
}

async function testUsesLocalLinkFirst() {
  const calls = [];
  const db = {
    getLinkedUser: (telegramId) => {
      calls.push(['getLinkedUser', telegramId]);
      return { telegram_id: telegramId, arkeza_username: 'LocalUser' };
    },
    upsertLinkedUser: () => { throw new Error('should not write'); },
  };
  const api = { isLinked: async () => { throw new Error('should not call API'); } };

  const result = await ensureLinkedUser(777, db, api);

  assert.deepStrictEqual(result, { linked: true, source: 'local', username: 'LocalUser' });
  assert.deepStrictEqual(calls, [['getLinkedUser', 777]]);
}

async function testReturnsFalseWhenNeitherLocalNorApiLinked() {
  const db = { getLinkedUser: () => null, upsertLinkedUser: () => { throw new Error('should not cache'); } };
  const api = { isLinked: async () => ({ ok: true, status: 200, data: { isLinked: false }, message: 'Verification completed' }) };

  const result = await ensureLinkedUser(888, db, api);

  assert.deepStrictEqual(result, { linked: false, source: 'api', status: 200, message: 'Verification completed' });
}

function testAnonymousSenderDetection() {
  assert.strictEqual(isAnonymousGroupSender({ message: { sender_chat: { id: -100123 } }, from: { id: 42 } }), true);
  assert.strictEqual(isAnonymousGroupSender({ from: { id: 1087968824 } }), true);
  assert.strictEqual(isAnonymousGroupSender({ from: { id: 42 } }), false);
  assert.match(anonymousSenderMessage(), /normal Telegram user account/);
}

(async () => {
  await testFallsBackToArkezaApiWhenLocalLinkMissing();
  await testUsesLocalLinkFirst();
  await testReturnsFalseWhenNeitherLocalNorApiLinked();
  testAnonymousSenderDetection();
  console.log('✅ link-status tests passed');
})().catch(err => {
  console.error(err);
  process.exit(1);
});

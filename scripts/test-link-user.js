#!/usr/bin/env node
/**
 * Standalone /link-user smoke test.
 *
 * Lets Patrick verify that the Arkeza API is reachable AND that a given JWT
 * is accepted, WITHOUT having to go through the bot. Helps isolate "is the
 * problem in the bot, in the network, or in Mit's API?"
 *
 * Usage:
 *   node scripts/test-link-user.js <telegramId> <jwt>
 *
 * Example:
 *   node scripts/test-link-user.js 123456789 eyJhbGciOi...
 *
 * Requires: dotenv-loaded .env (so ARKEZA_API_BASE_URL etc. are picked up).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const arkezaApi = require('../arkeza-api');

const [, , telegramId, token] = process.argv;

if (!telegramId || !token) {
  console.error('Usage: node scripts/test-link-user.js <telegramId> <jwt>');
  process.exit(2);
}

console.log('--- Arkeza /link-user smoke test ---');
console.log(`API base:    ${arkezaApi._config.BASE_URL}`);
console.log(`Auth:        ${arkezaApi._config.hasApiKey ? 'Bearer token' : 'unauthenticated'}`);
console.log(`Telegram ID: ${telegramId}`);
console.log(`Token len:   ${token.length} chars`);
console.log(`Token head:  ${token.slice(0, 40)}...`);
console.log('');

(async () => {
  console.log('→ POST /link-user');
  const linkResult = await arkezaApi.linkUser(telegramId, token);
  console.log('  Result:', JSON.stringify(linkResult, null, 2));

  console.log('');
  console.log('→ POST /is-linked');
  const isLinkedResult = await arkezaApi.isLinked(telegramId);
  console.log('  Result:', JSON.stringify(isLinkedResult, null, 2));

  console.log('');
  console.log('→ POST /user-data');
  const userDataResult = await arkezaApi.getUserData(telegramId);
  console.log('  Result:', JSON.stringify(userDataResult, null, 2));

  console.log('');
  console.log('--- Done ---');
  process.exit(linkResult.ok ? 0 : 1);
})().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

/**
 * Arkeza Backend API Client
 *
 * Plain-JSON HTTP client for the 4 internal Telegram bot endpoints
 * defined in API_SPEC_V1:
 *   POST /link-user
 *   POST /user-data
 *   POST /leaderboard
 *   POST /is-linked
 *
 * Per spec: requests/responses are Plain JSON. No RSA / OAEP / crypto.
 * If Mit later issues an API key, set ARKEZA_API_KEY in .env and it will
 * be sent as `Authorization: Bearer <key>`.
 */

const axios = require('axios');

const BASE_URL = process.env.ARKEZA_API_BASE_URL || 'https://arkza-api.arkeza.io/api/telegram/v1';
const API_KEY = process.env.ARKEZA_API_KEY || '';
const TIMEOUT_MS = parseInt(process.env.ARKEZA_API_TIMEOUT_MS || '10000', 10);

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
  },
});

/**
 * Normalize errors so callers always get a predictable shape:
 *   { ok: false, status, message, data? }
 */
function wrapError(err, endpoint) {
  if (err.response) {
    const { status, data } = err.response;
    const message = data?.message || `Arkeza API ${endpoint} returned ${status}`;
    console.error(`[arkeza-api] ${endpoint} HTTP ${status}: ${message}`);
    return { ok: false, status, message, data };
  }
  if (err.request) {
    console.error(`[arkeza-api] ${endpoint} network error: ${err.message}`);
    return { ok: false, status: 0, message: `Network error: ${err.message}` };
  }
  console.error(`[arkeza-api] ${endpoint} unexpected error:`, err.message);
  return { ok: false, status: -1, message: err.message };
}

/**
 * POST /link-user
 * Connect a Telegram ID to an Arkeza account via JWT.
 *
 * @param {string|number} telegramId
 * @param {string} token  Raw JWT received from app deep-link
 * @returns {Promise<{ok: boolean, message: string, data?: any, status?: number}>}
 */
async function linkUser(telegramId, token) {
  try {
    const { data } = await client.post('/link-user', {
      telegramId: String(telegramId),
      token,
    });
    return { ok: !!data?.success, message: data?.message || '', data: data?.data };
  } catch (err) {
    return wrapError(err, '/link-user');
  }
}

/**
 * POST /user-data
 * Retrieve profile + game stats for a linked Telegram user.
 *
 * @param {string|number} telegramId
 * @returns {Promise<{ok, message, data?: {username, xp, referrals}, status?}>}
 */
async function getUserData(telegramId) {
  try {
    const { data } = await client.post('/user-data', {
      telegramId: String(telegramId),
    });
    return { ok: !!data?.success, message: data?.message || '', data: data?.data };
  } catch (err) {
    return wrapError(err, '/user-data');
  }
}

/**
 * POST /leaderboard
 * Fetch global XP or Referral leaderboard.
 *
 * @param {string|number} telegramId
 * @param {'xp'|'referral'} type
 */
async function getLeaderboard(telegramId, type) {
  if (type !== 'xp' && type !== 'referral') {
    return { ok: false, status: -1, message: `Invalid leaderboard type: ${type}` };
  }
  try {
    const { data } = await client.post('/leaderboard', {
      telegramId: String(telegramId),
      type,
    });
    return { ok: !!data?.success, message: data?.message || '', data: data?.data };
  } catch (err) {
    return wrapError(err, '/leaderboard');
  }
}

/**
 * POST /is-linked
 * Check whether a Telegram ID is already linked to an Arkeza account.
 *
 * @param {string|number} telegramId
 * @returns {Promise<{ok, message, data?: {isLinked: boolean}, status?}>}
 */
async function isLinked(telegramId) {
  try {
    const { data } = await client.post('/is-linked', {
      telegramId: String(telegramId),
    });
    return { ok: !!data?.success, message: data?.message || '', data: data?.data };
  } catch (err) {
    return wrapError(err, '/is-linked');
  }
}

module.exports = {
  linkUser,
  getUserData,
  getLeaderboard,
  isLinked,
  // exported for tests/diagnostics
  _client: client,
  _config: { BASE_URL, hasApiKey: !!API_KEY, TIMEOUT_MS },
};

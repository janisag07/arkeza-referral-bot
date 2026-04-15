/**
 * Arkeza API encryption — RSA-OAEP-SHA256 per official docs.
 *
 * Per the V1 docs (Security & Encryption section):
 *   - Algorithm: RSA-OAEP with SHA-256
 *   - Envelope:  { "data": "<base64 of ciphertext>" }
 *   - The plaintext JSON is encrypted directly with the server's public key
 *     (no hybrid AES wrapping). Payload must fit in a single RSA block:
 *       - RSA-2048 → ~190 bytes after OAEP-SHA256 padding
 *       - RSA-4096 → ~446 bytes after OAEP-SHA256 padding
 *
 * Public-key delivery:
 *   - Default path:      ./keys/tg-public.pem  (relative to project root)
 *   - Override path:     ARKEZA_PUBLIC_KEY_FILE=/absolute/path.pem
 *   - Or inline PEM:     ARKEZA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
 *
 * Auto-activation:
 *   Encryption turns ON automatically once a public key is readable. Set
 *   ARKEZA_ENCRYPT=false to force-disable it for debugging (returns plain
 *   JSON, which the API will reject — only useful to confirm the wire).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FORCE_DISABLED = (process.env.ARKEZA_ENCRYPT || '').toLowerCase() === 'false';
const DEFAULT_KEY_PATH = path.resolve(__dirname, 'keys', 'tg-public.pem');

let cachedKey = null;
let keyLoadAttempted = false;

function loadPublicKey() {
  if (keyLoadAttempted) return cachedKey;
  keyLoadAttempted = true;

  const inline = process.env.ARKEZA_PUBLIC_KEY;
  if (inline && inline.includes('-----BEGIN')) {
    cachedKey = inline.replace(/\\n/g, '\n');
    return cachedKey;
  }

  const filePath = process.env.ARKEZA_PUBLIC_KEY_FILE || DEFAULT_KEY_PATH;
  try {
    if (fs.existsSync(filePath)) {
      cachedKey = fs.readFileSync(filePath, 'utf8');
      return cachedKey;
    }
  } catch (_) { /* fall through */ }
  cachedKey = null;
  return null;
}

function isConfigured() {
  if (FORCE_DISABLED) return false;
  return !!loadPublicKey();
}

/**
 * Build the encrypted envelope the API expects.
 *
 * @param {object} payload  Plain JS object, e.g. { telegramId: "..." }
 * @returns {object}        { data: "<base64 ciphertext>" }
 * @throws  If the plaintext is too large for the configured RSA key
 */
function encryptPayload(payload) {
  const key = loadPublicKey();
  if (!key) {
    throw new Error(
      'Arkeza public key not found. Place tg-public.pem at ./keys/tg-public.pem ' +
        'or set ARKEZA_PUBLIC_KEY / ARKEZA_PUBLIC_KEY_FILE in .env.'
    );
  }
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = crypto.publicEncrypt(
    {
      key,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    plaintext
  );
  return { data: ciphertext.toString('base64') };
}

/**
 * Responses from the API are plain JSON per spec — just pass through.
 * Exported so callers can uniformly route responses even if we later
 * need to decrypt.
 */
function decryptResponse(responseBody) {
  return responseBody;
}

module.exports = {
  isConfigured,
  encryptPayload,
  decryptResponse,
  _config: {
    get enabled() { return isConfigured(); },
    get hasPublicKey() { return !!loadPublicKey(); },
    forceDisabled: FORCE_DISABLED,
    keyPathAttempted: process.env.ARKEZA_PUBLIC_KEY_FILE || DEFAULT_KEY_PATH,
  },
};

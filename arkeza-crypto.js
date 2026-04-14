/**
 * Arkeza API encryption layer.
 *
 * The V1 spec says "Plain JSON" but the live API actually rejects plain
 * requests with HTTP 400 "Missing encryption data". The task brief said
 * RSA-OAEP-SHA256 was the algorithm used in the previous working
 * implementation. Since RSA-2048-OAEP can only encrypt payloads up to
 * ~190 bytes, full request bodies are hybrid-encrypted: a random AES-256
 * key encrypts the JSON, and that key is in turn RSA-encrypted with
 * Arkeza's public key.
 *
 * This module is a drop-in helper. Toggle via env:
 *
 *   ARKEZA_ENCRYPT=true                       # enable encryption
 *   ARKEZA_PUBLIC_KEY_FILE=/path/tg-public.pem   # or inline:
 *   ARKEZA_PUBLIC_KEY=-----BEGIN PUBLIC KEY----- ...
 *   ARKEZA_ENCRYPTION_MODE=hybrid             # hybrid|rsa (default hybrid)
 *   ARKEZA_ENVELOPE_FORMAT=standard           # standard|flat (see below)
 *
 * Envelope formats (we guess "standard"; Mit may request different field
 * names — easy to adjust once we have his spec):
 *
 *   standard: { "data": "<base64-aes-ciphertext>",
 *               "key":  "<base64-rsa-encrypted-aes-key>",
 *               "iv":   "<base64-iv>" }
 *
 *   flat:     { "encryptedData": "<base64-concat(iv + key + ciphertext)>" }
 *
 * If Mit's actual format differs, only `buildEnvelope()` needs changing.
 */

const crypto = require('crypto');
const fs = require('fs');

const ENCRYPT = (process.env.ARKEZA_ENCRYPT || 'false').toLowerCase() === 'true';
const MODE = (process.env.ARKEZA_ENCRYPTION_MODE || 'hybrid').toLowerCase();
const ENVELOPE_FORMAT = (process.env.ARKEZA_ENVELOPE_FORMAT || 'standard').toLowerCase();

let publicKeyPem = null;
function loadPublicKey() {
  if (publicKeyPem !== null) return publicKeyPem;
  const keyFile = process.env.ARKEZA_PUBLIC_KEY_FILE;
  const keyInline = process.env.ARKEZA_PUBLIC_KEY;
  if (keyInline && keyInline.includes('-----BEGIN')) {
    publicKeyPem = keyInline.replace(/\\n/g, '\n');
  } else if (keyFile && fs.existsSync(keyFile)) {
    publicKeyPem = fs.readFileSync(keyFile, 'utf8');
  } else {
    publicKeyPem = '';
  }
  return publicKeyPem;
}

function isConfigured() {
  return ENCRYPT && !!loadPublicKey();
}

/**
 * Encrypt a payload object for the Arkeza API.
 * Returns the envelope the caller should send as the request body,
 * or `null` if encryption is not configured (caller sends plain JSON).
 *
 * @param {object} payload  Plain JS object, e.g. { telegramId, token }
 * @returns {object|null}   Envelope to send as JSON body
 */
function encryptPayload(payload) {
  if (!isConfigured()) return null;
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');

  if (MODE === 'rsa') {
    if (plaintext.length > 190) {
      throw new Error(
        `Payload too large for pure-RSA mode (${plaintext.length} bytes, max ~190). Use hybrid mode.`
      );
    }
    const encrypted = crypto.publicEncrypt(
      {
        key: loadPublicKey(),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      plaintext
    );
    return ENVELOPE_FORMAT === 'flat'
      ? { encryptedData: encrypted.toString('base64') }
      : { data: encrypted.toString('base64') };
  }

  // Hybrid: AES-256-CBC for the body, RSA-OAEP-SHA256 for the AES key.
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  const encryptedKey = crypto.publicEncrypt(
    {
      key: loadPublicKey(),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey
  );

  if (ENVELOPE_FORMAT === 'flat') {
    // iv || encryptedKey || ciphertext, all base64
    const blob = Buffer.concat([iv, encryptedKey, ciphertext]);
    return { encryptedData: blob.toString('base64') };
  }
  return {
    data: ciphertext.toString('base64'),
    key: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
  };
}

/**
 * If the API returns encrypted responses, decrypt them here.
 * Placeholder — the current error "Missing encryption data" is about
 * REQUESTS; responses might still be plain. Adjust when Mit clarifies.
 *
 * @param {object} responseBody  Parsed JSON from axios
 * @returns {object}             Decrypted payload (or the body unchanged)
 */
function decryptResponse(responseBody) {
  // If the response is an envelope we recognize AND we have a private key,
  // decrypt it here. For now we just pass through.
  return responseBody;
}

module.exports = {
  isConfigured,
  encryptPayload,
  decryptResponse,
  _config: {
    enabled: ENCRYPT,
    mode: MODE,
    envelopeFormat: ENVELOPE_FORMAT,
    hasPublicKey: !!loadPublicKey(),
  },
};

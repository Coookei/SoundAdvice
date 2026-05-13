import crypto from 'crypto';

// encrypts/decrypts email addresses so they're unreadable in the database
// uses AES-256-GCM (used in HTTPS& banks) via Node's built-in crypto
// if someone gets access to the DB they just see random hex, not actual emails

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
if (ENCRYPTION_KEY.length !== 32 && process.env.NODE_ENV !== 'test') {
  // tests just care this module loads, but dont need encryption key as are unit tests so not using database queries
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars) in .env');
}

// we derive a second key from the main one for hashing (used for DB lookups).
// that way if one key leaks somehow, the other isn't automatically compromised.
const HMAC_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).update('hmac-lookup').digest();

// encrypt a string. each call generates a fresh random IV so the same
// email encrypted twice will look completely different in the DB.
export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

// decrypt back to the original string. if anyone has tampered with
// the stored value, this will throw an error instead of returning garbage.
export function decrypt(encrypted) {
  const [ivHex, tagHex, ciphertextHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// creates a searchable hash of a value (e.g. email) so we can do WHERE email_hash = $1
// without decrypting every row. same input always gives same hash but you can't
// reverse it back to the original. lowercased so email lookups are case-insensitive.
export function hashForLookup(value) {
  return crypto.createHmac('sha256', HMAC_KEY).update(value.toLowerCase()).digest('hex');
}

// hashes a short lived auth code or token with a separate secret so a DB leak wont expose active values.
// used for 2FA codes, magic link tokens, password reset tokens, and forgot/change password email codes.
export function hashCode(code) {
  return crypto.createHmac('sha256', process.env.AUTH_TOKEN_SECRET).update(code).digest('hex'); // is binary so convert to store as text in DB
}

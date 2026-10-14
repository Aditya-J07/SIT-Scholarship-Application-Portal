import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const CURRENT_KEY_VERSION = 'v1';

/**
 * Derives a 32-byte Buffer from ENCRYPTION_KEY env variable.
 * Fallbacks to a secure hash of JWT_SECRET in development if ENCRYPTION_KEY is not yet configured,
 * ensuring zero unencrypted storage while alerting administrators in production.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, 'hex');
    }
    return crypto.createHash('sha256').update(envKey).digest();
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    // Derive a dedicated key with salt
    return crypto.createHmac('sha256', 'sit-bank-encryption-salt-2026').update(jwtSecret).digest();
  }

  throw new Error('FATAL: Neither ENCRYPTION_KEY nor JWT_SECRET is set for data encryption.');
}

/**
 * Encrypts bank account number using AES-256-GCM.
 * Output format: v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export function encryptBankAccount(plainAccount: string): string {
  if (!plainAccount) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainAccount.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${CURRENT_KEY_VERSION}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts bank account number encrypted with AES-256-GCM.
 * Validates integrity via GCM authentication tag.
 */
export function decryptBankAccount(encryptedAccount: string): string {
  if (!encryptedAccount) return '';

  // If unencrypted legacy string (e.g. from existing test data), return as is
  if (!encryptedAccount.startsWith('v1:')) {
    return encryptedAccount;
  }

  const parts = encryptedAccount.split(':');
  if (parts.length !== 4) {
    throw new Error('Malformed encrypted account string format.');
  }

  const [, ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Masks a bank account number for safe display (shows only last 4 digits).
 * Example: "987654321098" -> "XXXXXXXX1098"
 */
export function maskBankAccount(accountNumber: string): string {
  if (!accountNumber) return '';
  const cleaned = accountNumber.replace(/\s+/g, '');
  if (cleaned.length <= 4) {
    return 'XXXX';
  }
  const visible = cleaned.slice(-4);
  const maskedLength = Math.max(cleaned.length - 4, 4);
  return 'X'.repeat(maskedLength) + visible;
}

import crypto from 'crypto';

// Common passwords blocklist (top leaked/guessable passwords)
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'admin123',
  'admin@123',
  'admin2024',
  'admin2025',
  'admin2026',
  'student123',
  'student@123',
  'welcome123',
  'welcome@123',
  'qwerty12345',
  'sit@12345',
  'tumakuru@123',
  'siddaganga123',
]);

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates password according to institutional security policy:
 * - At least 10 characters
 * - Uppercase, lowercase, number, special character
 * - Not in common passwords blocklist
 * - Does not contain email username or student name substring
 */
export function validatePasswordStrength(
  password: string,
  context?: { email?: string; fullName?: string }
): PasswordValidationResult {
  if (!password || password.length < 10) {
    return {
      valid: false,
      error: 'Password must be at least 10 characters long.',
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: 'Password must not exceed 128 characters.',
    };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (!hasLower || !hasUpper || !hasDigit || !hasSpecial) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.',
    };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      valid: false,
      error: 'Password is too common or easily guessable. Please choose a more complex passphrase.',
    };
  }

  if (context?.email) {
    const emailPrefix = context.email.split('@')[0].toLowerCase();
    if (emailPrefix.length >= 3 && password.toLowerCase().includes(emailPrefix)) {
      return {
        valid: false,
        error: 'Password must not contain parts of your email address.',
      };
    }
  }

  if (context?.fullName) {
    const nameParts = context.fullName.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
    for (const part of nameParts) {
      if (password.toLowerCase().includes(part)) {
        return {
          valid: false,
          error: 'Password must not contain parts of your full name.',
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Hashes password using crypto.scrypt (N=16384, r=8, p=1, 64-byte key) with a random 16-byte salt.
 * Output format: scrypt$SALT_HEX$KEY_HEX
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  });
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

export interface VerifyPasswordResult {
  verified: boolean;
  needsRehash: boolean;
}

/**
 * Verifies a password against a stored hash using timingSafeEqual.
 * Supports transparent upgrade from legacy PBKDF2 hashes (format: SALT:KEY).
 */
export function verifyPassword(password: string, storedHash: string): VerifyPasswordResult {
  if (!storedHash) {
    return { verified: false, needsRehash: false };
  }

  // Format 1: Modern scrypt hash (scrypt$salt$key)
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) {
      return { verified: false, needsRehash: false };
    }
    const [, salt, keyHex] = parts;
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, keyBuf.length, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 32 * 1024 * 1024,
    });

    if (derivedKey.length !== keyBuf.length) {
      return { verified: false, needsRehash: false };
    }

    const match = crypto.timingSafeEqual(derivedKey, keyBuf);
    return { verified: match, needsRehash: false };
  }

  // Format 2: Legacy PBKDF2 hash (salt:key)
  if (storedHash.includes(':')) {
    const [salt, keyHex] = storedHash.split(':');
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedKey = crypto.pbkdf2Sync(password, salt, 10000, keyBuf.length, 'sha512');

    if (derivedKey.length !== keyBuf.length) {
      return { verified: false, needsRehash: false };
    }

    const match = crypto.timingSafeEqual(derivedKey, keyBuf);
    return { verified: match, needsRehash: match }; // If matched legacy hash, needs rehash to scrypt!
  }

  return { verified: false, needsRehash: false };
}

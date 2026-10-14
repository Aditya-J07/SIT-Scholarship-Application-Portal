// Common passwords blocklist (top guessable passwords)
const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "admin123",
  "admin2024",
  "admin2025",
  "admin2026",
  "student123",
  "welcome123",
  "qwerty12345",
  "tumakuru123",
  "siddaganga123",
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
 * - Does not contain parts of user email or full name
 */
export function validatePasswordStrength(
  password: string,
  context?: { email?: string; fullName?: string }
): PasswordValidationResult {
  if (!password || password.length < 10) {
    return {
      valid: false,
      error: "Password must be at least 10 characters long.",
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: "Password must not exceed 128 characters.",
    };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (!hasLower || !hasUpper || !hasDigit || !hasSpecial) {
    return {
      valid: false,
      error:
        "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
    };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      valid: false,
      error: "Password is too common or easily guessable. Please choose a more complex passphrase.",
    };
  }

  if (context?.email) {
    const emailPrefix = context.email.split("@")[0].toLowerCase();
    if (emailPrefix.length >= 3 && password.toLowerCase().includes(emailPrefix)) {
      return {
        valid: false,
        error: "Password must not contain parts of your email address.",
      };
    }
  }

  if (context?.fullName) {
    const nameParts = context.fullName.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
    for (const part of nameParts) {
      if (password.toLowerCase().includes(part)) {
        return {
          valid: false,
          error: "Password must not contain parts of your full name.",
        };
      }
    }
  }

  return { valid: true };
}

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const CURRENT_VERSION = "v1";
const PRIMARY_KEY_ID = "primary";

/**
 * Validates and returns a 32-byte encryption key from the environment.
 * The key must be 32 bytes base64 encoded.
 */
export function getEncryptionKey(
  envVar: "ENCRYPTION_KEY" | "ENCRYPTION_KEY_PREVIOUS" = "ENCRYPTION_KEY",
  required: boolean = true
): Buffer | null {
  const envVal = process.env[envVar];
  if (!envVal) {
    if (required) {
      throw new Error(
        `FATAL: Missing environment variable ${envVar}. A 32-byte base64 key is required for AES-256-GCM encryption.`
      );
    }
    return null;
  }

  const keyBuffer = Buffer.from(envVal, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error(
      `FATAL: Invalid ${envVar}. Expected 32 bytes decoded from base64, but got ${keyBuffer.length} bytes.`
    );
  }

  return keyBuffer;
}

/**
 * Encrypts a bank account number using AES-256-GCM.
 * Output format: v1:<keyId>:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptBankAccount(
  plainAccount: string,
  keyId: string = PRIMARY_KEY_ID
): string {
  const envKeyName = keyId === "previous" ? "ENCRYPTION_KEY_PREVIOUS" : "ENCRYPTION_KEY";
  const key = getEncryptionKey(envKeyName, true)!;
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plainAccount.trim(), "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${CURRENT_VERSION}:${keyId}:${iv.toString("hex")}:${authTag}:${ciphertext}`;
}

/**
 * Decrypts an encrypted bank account number using AES-256-GCM.
 * Supports current key, previous key (during rotation), and legacy format.
 */
export function decryptBankAccount(encryptedAccount: string): string {
  if (!encryptedAccount) return "";

  // Plain string compatibility
  if (!encryptedAccount.startsWith("v1:")) {
    return encryptedAccount;
  }

  const parts = encryptedAccount.split(":");

  // Standard format: v1:<keyId>:<iv>:<tag>:<ciphertext> (5 parts)
  if (parts.length === 5) {
    const [, keyId, ivHex, authTagHex, ciphertextHex] = parts;
    let key: Buffer;

    if (keyId === PRIMARY_KEY_ID || keyId === "k1") {
      key = getEncryptionKey("ENCRYPTION_KEY", true)!;
    } else if (keyId === "previous" || keyId === "k0") {
      const prevKey = getEncryptionKey("ENCRYPTION_KEY_PREVIOUS", false);
      if (!prevKey) {
        throw new Error(
          "ENCRYPTION_KEY_PREVIOUS is required to decrypt data encrypted with the previous key."
        );
      }
      key = prevKey;
    } else {
      // Default to primary if keyId unrecognized
      key = getEncryptionKey("ENCRYPTION_KEY", true)!;
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  // Legacy format without keyId: v1:<iv>:<tag>:<ciphertext> (4 parts)
  if (parts.length === 4) {
    const [, ivHex, authTagHex, ciphertextHex] = parts;
    const key = getEncryptionKey("ENCRYPTION_KEY", true)!;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  throw new Error("Malformed encrypted bank account format.");
}

/**
 * Extracts the last 4 digits of a bank account for safe plain storage.
 */
export function getBankAccLast4(accountNumber: string): string {
  if (!accountNumber) return "";
  const cleaned = accountNumber.replace(/\s+/g, "");
  return cleaned.length >= 4 ? cleaned.slice(-4) : cleaned;
}

/**
 * Masks a bank account number for display everywhere except authorized admin/owner view.
 * Example: "987654321098" -> "XXXXXXXX1098"
 */
export function maskBankAccount(accountNumber: string): string {
  if (!accountNumber) return "";
  const cleaned = accountNumber.replace(/\s+/g, "");
  if (cleaned.length <= 4) {
    return "XXXX";
  }
  const visible = cleaned.slice(-4);
  const maskedLength = Math.max(cleaned.length - 4, 4);
  return "X".repeat(maskedLength) + visible;
}

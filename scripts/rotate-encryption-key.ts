/**
 * Key Rotation Script for Bank Details Encryption
 * Usage:
 *   ENCRYPTION_KEY_PREVIOUS="<old-key-base64>" ENCRYPTION_KEY="<new-key-base64>" npx tsx scripts/rotate-encryption-key.ts
 */

import { createClient } from "@supabase/supabase-js";
import {
  decryptBankAccount,
  encryptBankAccount,
  getBankAccLast4,
  getEncryptionKey,
} from "../src/lib/crypto/field-encryption";

async function rotateKeys() {
  console.log("=== SIT Portal Encryption Key Rotation ===");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
    process.exit(1);
  }

  // Validate that both current and previous keys are available and 32 bytes
  try {
    getEncryptionKey("ENCRYPTION_KEY", true);
    getEncryptionKey("ENCRYPTION_KEY_PREVIOUS", true);
  } catch (err: unknown) {
    console.error("Key validation failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Rotate in profiles table
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, bank_acc_no_encrypted")
    .not("bank_acc_no_encrypted", "is", null);

  if (pErr) {
    console.error("Failed to query profiles:", pErr.message);
    process.exit(1);
  }

  let profilesRotated = 0;
  for (const prof of profiles || []) {
    if (prof.bank_acc_no_encrypted) {
      try {
        const plain = decryptBankAccount(prof.bank_acc_no_encrypted);
        const reEncrypted = encryptBankAccount(plain, "primary");
        const last4 = getBankAccLast4(plain);

        const { error: uErr } = await supabase
          .from("profiles")
          .update({
            bank_acc_no_encrypted: reEncrypted,
            bank_acc_last4: last4,
          })
          .eq("id", prof.id);

        if (uErr) {
          console.error(`Failed to update profile ${prof.id}:`, uErr.message);
        } else {
          profilesRotated++;
        }
      } catch (err: unknown) {
        console.error(`Failed to rotate profile ${prof.id}:`, err instanceof Error ? err.message : String(err));
      }
    }
  }

  console.log(`Successfully rotated ${profilesRotated} profile records.`);
  console.log("Key rotation completed successfully.");
}

rotateKeys().catch((err) => {
  console.error("Fatal error during rotation:", err);
  process.exit(1);
});

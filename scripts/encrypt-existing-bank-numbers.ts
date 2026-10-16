/**
 * One-time idempotent migration script to encrypt plain-text bank account numbers
 * stored in existing application rows (applications.data) per H1.
 *
 * Requirements:
 * - Idempotent (safe to run multiple times)
 * - Prints row counts only (NEVER outputs bank account numbers or personal data)
 *
 * Run with:
 *   npx tsx scripts/encrypt-existing-bank-numbers.ts
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";
import { encryptBankAccount } from "../src/lib/crypto/field-encryption";

async function migrate() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("[Migration] Fatal: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[Migration] Scanning applications for unencrypted bank account numbers...");

  const { data: apps, error } = await supabase
    .from("applications")
    .select("id, data");

  if (error) {
    console.error("[Migration] Error querying applications table:", error.message);
    process.exit(1);
  }

  if (!apps || apps.length === 0) {
    console.log("[Migration] No applications found in database.");
    return;
  }

  let encryptedCount = 0;
  let alreadyEncryptedCount = 0;
  let noBankDataCount = 0;
  let failedCount = 0;

  for (const app of apps) {
    const data = app.data || {};
    const plainBankAcc = data.bank_acc_no;
    const hasEncrypted = Boolean(data.bank_acc_no_encrypted);

    // If plaintext bank account exists and is not already in v1 format
    if (plainBankAcc && typeof plainBankAcc === "string" && !plainBankAcc.startsWith("v1:")) {
      try {
        const encrypted = encryptBankAccount(plainBankAcc);
        const last4 = plainBankAcc.slice(-4);

        const updatedData = {
          ...data,
          bank_acc_no_encrypted: encrypted,
          bank_acc_last4: last4,
        };

        // Always remove plaintext and confirmation numbers
        delete updatedData.bank_acc_no;
        delete updatedData.confirm_bank_acc_no;

        const { error: updateErr } = await supabase
          .from("applications")
          .update({ data: updatedData })
          .eq("id", app.id);

        if (updateErr) {
          failedCount++;
        } else {
          encryptedCount++;
        }
      } catch {
        failedCount++;
      }
    } else if (hasEncrypted) {
      // Clean up confirm_bank_acc_no or leftover plaintext if present
      if (data.confirm_bank_acc_no || data.bank_acc_no) {
        const cleaned = { ...data };
        delete cleaned.bank_acc_no;
        delete cleaned.confirm_bank_acc_no;
        await supabase
          .from("applications")
          .update({ data: cleaned })
          .eq("id", app.id);
      }
      alreadyEncryptedCount++;
    } else {
      noBankDataCount++;
    }
  }

  console.log("=== Bank Number Encryption Migration Report ===");
  console.log(`Total applications evaluated:   ${apps.length}`);
  console.log(`Successfully encrypted:          ${encryptedCount}`);
  console.log(`Already encrypted / compliant:  ${alreadyEncryptedCount}`);
  console.log(`No bank account data:           ${noBankDataCount}`);
  console.log(`Failed updates:                 ${failedCount}`);
  console.log("================================================");
}

migrate().catch((err) => {
  console.error("[Migration] Fatal uncaught error:", err instanceof Error ? err.message : "Unknown error");
  process.exit(1);
});

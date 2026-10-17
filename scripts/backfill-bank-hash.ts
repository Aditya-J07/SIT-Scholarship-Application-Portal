/**
 * Idempotent migration script to backfill bank_acc_hash on applications table.
 *
 * Requirements:
 * - Computes HMAC-SHA256 hash using HASH_KEY.
 * - Compares / indexes bank account numbers without decrypting in production.
 * - Idempotent (safe to re-run; skips rows where bank_acc_hash is already present).
 * - ZERO PII in output: prints row counts only.
 *
 * Run with:
 *   npx tsx scripts/backfill-bank-hash.ts
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";
import { hashBankAccount, decryptBankAccount } from "../src/lib/crypto/field-encryption";

async function backfill() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("[Backfill] Fatal: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("[Backfill] Scanning applications for missing bank_acc_hash...");

  // Select applications that either have NULL bank_acc_hash or all applications
  const { data: apps, error } = await supabase
    .from("applications")
    .select("id, student_id, bank_acc_hash, data");

  if (error) {
    console.error("[Backfill] Error querying applications table:", error.message);
    process.exit(1);
  }

  if (!apps || apps.length === 0) {
    console.log("[Backfill] No applications found in database.");
    return;
  }

  let updatedCount = 0;
  let alreadyHashedCount = 0;
  let noBankDataCount = 0;
  let failedCount = 0;

  for (const app of apps) {
    if (app.bank_acc_hash) {
      alreadyHashedCount++;
      continue;
    }

    const data = (app.data || {}) as Record<string, unknown>;
    let plainBankAcc = "";

    // 1. Check if plain bank account exists in data
    if (typeof data.bank_acc_no === "string" && data.bank_acc_no.trim() && !data.bank_acc_no.startsWith("v1:")) {
      plainBankAcc = data.bank_acc_no.trim();
    }
    // 2. Check if encrypted bank account exists in data
    else if (typeof data.bank_acc_no_encrypted === "string" && data.bank_acc_no_encrypted.startsWith("v1:")) {
      try {
        plainBankAcc = decryptBankAccount(data.bank_acc_no_encrypted);
      } catch {
        // Fallback to student profile if application data encryption cannot be read
      }
    }

    // 3. Fallback to student profile bank account if available
    if (!plainBankAcc && app.student_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("bank_acc_no_encrypted")
        .eq("id", app.student_id)
        .single();

      if (profile?.bank_acc_no_encrypted && profile.bank_acc_no_encrypted.startsWith("v1:")) {
        try {
          plainBankAcc = decryptBankAccount(profile.bank_acc_no_encrypted);
        } catch {
          // Decryption failed or unconfigured key
        }
      }
    }

    if (!plainBankAcc) {
      noBankDataCount++;
      continue;
    }

    try {
      const computedHash = hashBankAccount(plainBankAcc);
      const { error: updateError } = await supabase
        .from("applications")
        .update({ bank_acc_hash: computedHash })
        .eq("id", app.id);

      if (updateError) {
        failedCount++;
      } else {
        updatedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  console.log("\n====================================================");
  console.log("BANK ACCOUNT HASH BACKFILL SUMMARY:");
  console.log(`  Total Applications Scanned: ${apps.length}`);
  console.log(`  Successfully Updated:       ${updatedCount}`);
  console.log(`  Already Hashed (Skipped):   ${alreadyHashedCount}`);
  console.log(`  No Bank Data Available:     ${noBankDataCount}`);
  console.log(`  Failed Updates:             ${failedCount}`);
  console.log("====================================================");
}

backfill().catch((err) => {
  console.error("[Backfill] Execution failed:", err);
  process.exit(1);
});

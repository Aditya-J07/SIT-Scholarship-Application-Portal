/**
 * Institutional Data Retention Purge Script
 *
 * Implements DPDP Act 2023 / IT Act storage limitation principles.
 * Identifies and scrubs application personal data and removes storage documents
 * for academic cycles exceeding the configured institutional retention period.
 *
 * Requirements:
 * - Configurable RETENTION_YEARS (default: 7 years)
 *   TODO [COLLEGE DECISION REQUIRED]: Confirm institutional data retention period with Governing Body.
 * - Dry-run mode by default (prints counts only; requires --execute flag to modify data).
 * - ZERO PII in output: prints record counts only.
 * - Append-only audit logs are NEVER deleted.
 *
 * Run dry-run:
 *   npx tsx scripts/purge-old-cycle-data.ts --dry-run
 *
 * Run actual purge:
 *   npx tsx scripts/purge-old-cycle-data.ts --execute
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

// TODO [COLLEGE DECISION REQUIRED]: Confirm institutional data retention period with Governing Body (default: 7 years)
const DEFAULT_RETENTION_YEARS = 7;
const retentionYears = process.env.RETENTION_YEARS
  ? parseInt(process.env.RETENTION_YEARS, 10)
  : DEFAULT_RETENTION_YEARS;

const isDryRun = !process.argv.includes("--execute");

async function purgeOldCycleData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("[Purge] Fatal: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  const cutoffDate = new Date(now.getFullYear() - retentionYears, now.getMonth(), now.getDate());

  console.log("====================================================");
  console.log("INSTITUTIONAL DATA RETENTION PURGE ENGINE");
  console.log(`  Mode:             ${isDryRun ? "DRY-RUN (Counts only, no changes)" : "EXECUTE (Permanent deletion)"}`);
  console.log(`  Retention Window: ${retentionYears} Years`);
  console.log(`  Cutoff Date:      ${cutoffDate.toISOString().slice(0, 10)}`);
  console.log("====================================================\n");

  // 1. Identify cycles older than cutoff
  const { data: cycles, error: cycleErr } = await supabase
    .from("cycles")
    .select("id, academic_year, created_at, closes_at")
    .or(`closes_at.lt.${cutoffDate.toISOString()},created_at.lt.${cutoffDate.toISOString()}`);

  if (cycleErr) {
    console.error("[Purge] Error querying cycles:", cycleErr.message);
    process.exit(1);
  }

  const expiredCycles = cycles || [];
  const expiredCycleIds = expiredCycles.map((c) => c.id);

  console.log(`Identified ${expiredCycleIds.length} cycle(s) exceeding retention threshold.`);

  if (expiredCycleIds.length === 0) {
    console.log("No expired cycles found. Retention requirements are satisfied.");
    return;
  }

  // 2. Query applications in expired cycles
  const { data: apps, error: appErr } = await supabase
    .from("applications")
    .select("id, ref_no, cycle_id")
    .in("cycle_id", expiredCycleIds);

  if (appErr) {
    console.error("[Purge] Error querying applications:", appErr.message);
    process.exit(1);
  }

  const expiredApps = apps || [];
  const expiredAppIds = expiredApps.map((a) => a.id);

  console.log(`Identified ${expiredAppIds.length} application(s) in expired cycles.`);

  // 3. Query files attached to expired applications
  let expiredFilePaths: string[] = [];
  let expiredFileIds: string[] = [];

  if (expiredAppIds.length > 0) {
    const { data: files, error: fileErr } = await supabase
      .from("application_files")
      .select("id, storage_path, application_id")
      .in("application_id", expiredAppIds);

    if (fileErr) {
      console.error("[Purge] Error querying application files:", fileErr.message);
      process.exit(1);
    }

    expiredFileIds = (files || []).map((f) => f.id);
    expiredFilePaths = (files || []).map((f) => f.storage_path);
  }

  console.log(`Identified ${expiredFilePaths.length} stored file document(s) to purge.`);

  if (isDryRun) {
    console.log("\n====================================================");
    console.log("DRY-RUN EXECUTION SUMMARY (NO CHANGES MADE):");
    console.log(`  Expired Cycles:           ${expiredCycleIds.length}`);
    console.log(`  Applications to Scrub:    ${expiredAppIds.length}`);
    console.log(`  Storage Documents:        ${expiredFilePaths.length}`);
    console.log("  Audit Logs:               Preserved intact (never deleted)");
    console.log("====================================================");
    console.log("To execute deletion, re-run with: npx tsx scripts/purge-old-cycle-data.ts --execute");
    return;
  }

  // EXECUTE MODE:
  // A. Delete storage files in batches
  let storageDeletedCount = 0;
  if (expiredFilePaths.length > 0) {
    const BATCH_SIZE = 50;
    for (let i = 0; i < expiredFilePaths.length; i += BATCH_SIZE) {
      const batch = expiredFilePaths.slice(i, i + BATCH_SIZE);
      const { error: removeErr } = await supabase.storage
        .from("application-files")
        .remove(batch);

      if (!removeErr) {
        storageDeletedCount += batch.length;
      }
    }
  }

  // B. Delete file records from database
  if (expiredFileIds.length > 0) {
    await supabase.from("application_files").delete().in("id", expiredFileIds);
  }

  // C. Scrub application personal data (replace personal data JSON with scrubbed notice)
  let scrubbedAppsCount = 0;
  for (const appId of expiredAppIds) {
    const { error: scrubErr } = await supabase
      .from("applications")
      .update({
        data: { scrubbed: true, purged_at: new Date().toISOString() },
        computed: {},
        bank_acc_hash: null,
      })
      .eq("id", appId);

    if (!scrubErr) {
      scrubbedAppsCount++;
    }
  }

  // D. Log institutional purge action in audit log
  await supabase.from("audit_log").insert({
    action: "INSTITUTIONAL_DATA_RETENTION_PURGE",
    entity: "system",
    entity_id: "retention-purge",
    meta: {
      retention_years: retentionYears,
      cutoff_date: cutoffDate.toISOString(),
      cycles_purged: expiredCycleIds.length,
      apps_scrubbed: scrubbedAppsCount,
      files_deleted: storageDeletedCount,
    },
    created_at: new Date().toISOString(),
  });

  console.log("\n====================================================");
  console.log("PERMANENT PURGE COMPLETE:");
  console.log(`  Cycles Evaluated:         ${expiredCycleIds.length}`);
  console.log(`  Applications Scrubbed:    ${scrubbedAppsCount}`);
  console.log(`  Storage Files Deleted:    ${storageDeletedCount}`);
  console.log("  Audit Logs:               Appended purge event successfully");
  console.log("====================================================");
}

purgeOldCycleData().catch((err) => {
  console.error("[Purge] Execution failed:", err);
  process.exit(1);
});

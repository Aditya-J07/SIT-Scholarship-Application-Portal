/**
 * Database Seed Script for SIT Scholarship Portal
 * Seeds initial scholarships (MNC, SSKA, SITEB) and active academic cycle.
 * Run with:
 *   npx tsx scripts/seed.ts
 */

import { createClient } from "@supabase/supabase-js";

async function seed() {
  console.log("=== Seeding SIT Scholarship Database ===");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Scholarships
  const scholarships: Array<{
    id: string;
    code: string;
    name: string;
    active: boolean;
    fee_label: string;
    rules: Record<string, unknown>;
    requires_recommendation: boolean;
    description: string;
  }> = [
    {
      id: "sch_mnc",
      code: "MNC",
      name: "Dr. M.N. Channabasappa Endowment Fund Loan Scholarship",
      active: true,
      fee_label: "Total fee per year",
      rules: {
        income_limit: 300000,
        cet_required: true,
        max_assistance_pct: 30,
        max_scholarship_pct: 50,
        allow_backlog: false,
        max_awardees_per_year: 1,
      },
      requires_recommendation: false,
      description:
        "Endowment fund loan scholarship awarded on merit-cum-means for financially deserving students admitted through CET. Family annual income must not exceed Rs. 3,00,000.",
    },
    {
      id: "sch_sska",
      code: "SSKA",
      name: "Sri Sripathi K A Memorial Scholarship",
      active: true,
      fee_label: "Tuition fee per year",
      rules: {
        income_limit: 500000,
        requires_hod_proctor_recommendation: true,
      },
      requires_recommendation: true,
      description:
        "Merit scholarship with recommendation from Proctor and Head of Department. Awarded to meritorious students facing financial distress.",
    },
    {
      id: "sch_siteb",
      code: "SITEB",
      name: "SIT Scholarship to Economically Backward and Socially Challenged Students",
      active: false,
      fee_label: "Total fee per year",
      rules: {},
      requires_recommendation: false,
      description:
        "Institutional aid for economically backward and socially challenged students (Inactive pending committee guidelines).",
    },
  ];

  for (const s of scholarships) {
    const { error } = await supabase
      .from("scholarships")
      .upsert(s, { onConflict: "code" });
    if (error) {
      console.error(`Error inserting scholarship ${s.code}:`, error.message);
    } else {
      console.log(`✓ Seeded scholarship: ${s.code}`);
    }
  }

  // 2. Academic Cycle
  // TODO [COLLEGE DECISION REQUIRED]: Confirm exact opening and closing dates with Accounts Section.
  const cycles = [
    {
      id: "cycle_mnc_2026",
      scholarship_id: "sch_mnc",
      academic_year: "2026-2027",
      opens_at: "2026-09-01T00:00:00Z", // TODO: confirm official notification date with Accounts Section
      closes_at: "2026-12-31T23:59:59Z", // TODO: confirm with Accounts Section
      status: "open",
    },
    {
      id: "cycle_sska_2026",
      scholarship_id: "sch_sska",
      academic_year: "2026-2027",
      opens_at: "2026-09-01T00:00:00Z", // TODO: confirm official notification date with Accounts Section
      closes_at: "2026-12-31T23:59:59Z", // TODO: confirm with Accounts Section
      status: "open",
    },
  ];

  for (const c of cycles) {
    const { error } = await supabase
      .from("cycles")
      .upsert(c, { onConflict: "id" });
    if (error) {
      console.error(`Error inserting cycle ${c.id}:`, error.message);
    } else {
      console.log(`✓ Seeded cycle: ${c.id}`);
    }
  }

  // 3. Ensure private storage bucket exists
  const { error: bError } = await supabase.storage.createBucket("application-files", {
    public: false,
  });
  if (bError && !bError.message.includes("already exists")) {
    console.warn("Storage bucket note:", bError.message);
  } else {
    console.log("✓ Private storage bucket 'application-files' confirmed.");
  }

  console.log("=== Seed Completed Successfully ===");
}

seed().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});

import crypto from "crypto";
import readline from "readline";
import { createClient } from "@supabase/supabase-js";
import { validatePasswordStrength } from "../src/lib/auth/password-policy";

function promptText(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const stdoutWrite = process.stdout.write;
    process.stdout.write(query);
    // Mute stdout while user is typing password to prevent terminal shoulder-surfing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stdout as any).write = (chunk: unknown, encoding?: unknown, cb?: any) => {
      if (typeof chunk === "string" && (chunk.includes("\n") || chunk.includes("\r"))) {
        return stdoutWrite.call(process.stdout, chunk as string, encoding as BufferEncoding, cb);
      }
      return true;
    };
    rl.question("", (password) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.stdout as any).write = stdoutWrite;
      process.stdout.write("\n");
      rl.close();
      resolve(password.trim());
    });
  });
}

/**
 * Institutional Admin Bootstrap Script
 * Security Rules:
 * - Credentials must NEVER be passed as CLI arguments (prevents shell history leakage).
 * - Reads from environment variables (ADMIN_EMAIL, ADMIN_PASSWORD) or prompts via hidden stdin.
 */
async function createAdmin() {
  console.log("========================================================");
  console.log("SIT SCHOLARSHIP PORTAL - ADMINISTRATOR BOOTSTRAP");
  console.log("========================================================\n");

  // Prevent credentials in command line arguments
  if (process.argv.length > 2) {
    console.error("SECURITY ERROR: Do not pass credentials as command-line arguments.");
    console.error("Pass credentials via ADMIN_PASSWORD environment variable or enter via the interactive hidden prompt.");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment.");
    process.exit(1);
  }

  let email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD;

  if (!email) {
    email = (await promptText("Enter Admin Email: ")).toLowerCase();
  }

  if (!password) {
    password = await promptHidden("Enter Admin Password (hidden): ");
  }

  if (!email || !password) {
    console.error("ERROR: Both administrator email and password are required.");
    process.exit(1);
  }

  const fullName = process.env.ADMIN_NAME?.trim() || "SIT Portal Administrator";
  const mobile = process.env.ADMIN_MOBILE?.trim() || "9845000000";

  // Enforce institutional password policy
  const validation = validatePasswordStrength(password, { email, fullName });
  if (!validation.valid) {
    console.error(`ERROR: Password does not meet security requirements:\n  -> ${validation.error}`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if admin user already exists in auth.users
  const { data: userList } = await supabase.auth.admin.listUsers();
  const userMatch = userList?.users?.find((u) => u.email?.toLowerCase() === email);

  let adminId: string;

  if (userMatch) {
    console.log("User already exists in Supabase Auth. Updating password and confirming email...");
    adminId = userMatch.id;
    const { error: updateErr } = await supabase.auth.admin.updateUserById(adminId, {
      password,
      email_confirm: true,
    });
    if (updateErr) {
      console.error("Failed to update admin user in Supabase Auth:", updateErr.message);
      process.exit(1);
    }
  } else {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !newUser?.user) {
      console.error("Failed to create admin user in Supabase Auth:", createErr?.message);
      process.exit(1);
    }
    adminId = newUser.user.id;
  }

  // Create or update profile in PostgreSQL profiles table with must_change_password = true
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: adminId,
    role: "admin",
    full_name: fullName.toUpperCase(),
    mobile,
    email,
    must_change_password: true, // Forces immediate password change upon initial login
  });

  if (profileErr) {
    console.error("Failed to create admin profile in database:", profileErr.message);
    process.exit(1);
  }

  await supabase.from("audit_log").insert({
    id: crypto.randomUUID(),
    actor_id: adminId,
    actor_email: email,
    action: "ADMIN_BOOTSTRAPPED",
    entity: "profiles",
    entity_id: adminId,
    meta: {
      enforced_must_change_password: true,
      role: "admin",
    },
    ip: "127.0.0.1",
    created_at: new Date().toISOString(),
  });

  console.log("✓ Administrator account successfully created:");
  console.log(`  - ID: ${adminId}`);
  console.log(`  - Must Change Password: true`);
  console.log("\n[SECURITY NOTE] The administrator must log in and change their password before accessing portal features.\n");
}

createAdmin().catch((err) => {
  console.error("Failed to create admin:", err);
  process.exit(1);
});

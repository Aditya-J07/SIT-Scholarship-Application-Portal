import { db } from '../src/lib/db';
import { hashPassword, validatePasswordStrength } from '../src/lib/auth/password';
import crypto from 'crypto';

/**
 * Institutional Admin Bootstrap Script
 * Usage:
 *   ADMIN_EMAIL=principal@sit.ac.in ADMIN_PASSWORD='SecurePassphrase!2026' npx tsx scripts/create-admin.ts
 */
async function createAdmin() {
  console.log('========================================================');
  console.log('SIT SCHOLARSHIP PORTAL - ADMINISTRATOR BOOTSTRAP WIZARD');
  console.log('========================================================\n');

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || 'SIT Portal Administrator';
  const mobile = process.env.ADMIN_MOBILE?.trim() || '9845012345';

  if (!email || !password) {
    console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    console.log('\nExample execution:');
    console.log('  ADMIN_EMAIL="admin@sit.ac.in" ADMIN_PASSWORD="SecurePass123!#" npx tsx scripts/create-admin.ts\n');
    process.exit(1);
  }

  // Enforce institutional password policy
  const validation = validatePasswordStrength(password, { email, fullName });
  if (!validation.valid) {
    console.error(`ERROR: Password does not meet security requirements:\n  -> ${validation.error}`);
    process.exit(1);
  }

  // Check if admin already exists
  const existing = await db.findUserByEmail(email);
  if (existing) {
    console.error(`ERROR: An account with email "${email}" already exists.`);
    process.exit(1);
  }

  const passwordHash = hashPassword(password);
  const adminId = crypto.randomUUID();

  const newAdmin = await db.createUser({
    id: adminId,
    role: 'admin',
    full_name: fullName,
    mobile: mobile,
    email: email,
    password_hash: passwordHash,
    must_change_password: true, // Forces immediate password change upon initial login
    email_verified: true,
    token_version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await db.logAudit({
    actor_id: adminId,
    actor_email: email,
    action: 'ADMIN_BOOTSTRAPPED',
    entity: 'user',
    entity_id: adminId,
    meta: {
      enforced_must_change_password: true,
      role: 'admin',
    },
    ip: '127.0.0.1',
  });

  console.log('✓ Administrator account successfully created:');
  console.log(`  - ID: ${newAdmin.id}`);
  console.log(`  - Name: ${newAdmin.full_name}`);
  console.log(`  - Email: ${newAdmin.email}`);
  console.log(`  - Role: ${newAdmin.role}`);
  console.log(`  - Must Change Password: ${newAdmin.must_change_password}`);
  console.log('\n[SECURITY NOTE] The administrator must log in and change their password before accessing portal features.\n');
}

createAdmin().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});

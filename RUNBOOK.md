# SIT Scholarship Application Portal - Operational Runbook

This document defines standard operational procedures, security recovery runbooks, and key management policies for administrators of the **Siddaganga Institute of Technology Scholarship Portal**.

---

## 1. Field Encryption & Key Management

### 1.1 Encryption Key Safety (CRITICAL)
- Bank account numbers are encrypted at rest using **AES-256-GCM** via `src/lib/crypto/field-encryption.ts`.
- The key is supplied via the server-only environment variable `ENCRYPTION_KEY` (a 32-byte base64-encoded cryptographically random key).
- **WARNING / DATA LOSS NOTICE:** If `ENCRYPTION_KEY` is lost, destroyed, or corrupted, **all encrypted bank account numbers stored in the database become mathematically unrecoverable**. No recovery tool or backup decryption key exists.
- **MANDATORY POLICY:**
  1. The production `ENCRYPTION_KEY` must be securely backed up in an institutional enterprise password manager (e.g. 1Password or Bitwarden) with restricted access granted only to designated institutional administrators.
  2. The key must never be logged, printed to console, checked into version control, or shared over email/chat.

### 1.2 Key Rotation Procedure
Key rotation re-encrypts all database records without downtime using two keys: `ENCRYPTION_KEY_PREVIOUS` and `ENCRYPTION_KEY`.

1. Generate a new 32-byte base64 key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. In your deployment configuration (e.g. Vercel / environment):
   - Set `ENCRYPTION_KEY_PREVIOUS` to the current key.
   - Set `ENCRYPTION_KEY` to the newly generated key.
3. Deploy the application with both variables active. The decryption engine automatically uses `ENCRYPTION_KEY_PREVIOUS` when reading existing records encrypted with the previous key ID.
4. Execute the re-encryption rotation script:
   ```bash
   npx tsx scripts/rotate-encryption-key.ts
   ```
5. Confirm all profiles have been successfully migrated to the new key.
6. Remove `ENCRYPTION_KEY_PREVIOUS` from your production environment once rotation is complete.

---

## 2. Emergency Access: "Last Admin Locked Out" Procedure

If an institutional administrator loses their credentials or TOTP MFA device:

### Primary Procedure: Secondary Admin Reset
1. SIT security policy requires that **at least two active administrators** exist at all times.
2. A secondary administrator logs into the portal and navigates to **Admin → Users**.
3. Select the locked administrator and click **Reset MFA Factors**.
4. The acting administrator enters their password to confirm the operation. The action is recorded in the append-only `audit_log`.
5. The locked administrator can now log in with their password and enroll a new TOTP factor.

### Emergency Procedure: Supabase Dashboard
If all administrators are locked out simultaneously:
1. Log into the official [Supabase Management Dashboard](https://supabase.com/dashboard).
2. Open the SIT Scholarship project in **Mumbai (`ap-south-1`)**.
3. Navigate to **Authentication → Users**.
4. Locate the administrator user:
   - To reset MFA: Under user details, delete the enrolled TOTP factor.
   - To reset password: Send a password reset email or update the password directly.
5. If necessary, execute the bootstrap script to provision a new designated administrator:
   ```bash
   npx tsx scripts/create-admin.ts
   ```
   (Provide the email and password via the interactive hidden prompts).

---

## 3. Session & Timeout Settings

- **Idle Timeout:** Staff sessions automatically expire after **30 minutes of inactivity**.
- **Supabase Dashboard Recommendations:**
  - In **Authentication → Settings**:
    - Set **JWT Expiry limit** to `1800` seconds (30 minutes).
    - Set **Refresh Token Reuse Interval** to `10` seconds.

---

## 4. Academic Cycle Operations

1. In accordance with institutional security rules, new cycles are seeded with `status = 'closed'` and `NULL` dates.
2. The Accounts Section must confirm official notification circular dates before opening an application window.
3. When dates are approved, an administrator accesses **Admin → Cycles** to set `opens_at`, `closes_at`, and toggle the status to `open`.
4. Submissions are strictly prohibited outside the configured cycle window at both the application API level and the database trigger level.

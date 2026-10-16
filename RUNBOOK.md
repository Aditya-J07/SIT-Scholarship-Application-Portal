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

### 3.1 Server-Side Staff Idle Timeout (30 Minutes)
- **Idle Timeout:** Staff sessions automatically expire after **30 minutes (1,800 seconds) of inactivity**.
- **Why Server-Side `last_seen_at` is Required (Refresh Tokens Renew Access Tokens):**
  Under Supabase / OAuth token architecture, browser client libraries automatically use long-lived refresh tokens in the background to mint fresh short-lived JWT access tokens. Consequently, relying solely on client-side state or JWT expiry does **NOT** terminate an idle user session if the browser silently refreshes tokens.
  The portal therefore enforces a strict **server-side idle timeout**:
  - Each authenticated staff request (via `requireAdminOrReviewer`, `requireAdmin`, or proxy) checks `profiles.last_seen_at`.
  - If more than 30 minutes have elapsed since `last_seen_at`, the server rejects the request with HTTP 401 (`{ code: "IDLE_TIMEOUT" }`), signs out the user via Supabase Auth, and clears all session cookies.
  - On active requests within the 30-minute window, the server automatically updates `last_seen_at` to `NOW()`.
- **Supabase Dashboard Recommendations:**
  - In **Authentication → Settings**:
    - Set **JWT Expiry limit** to `1800` seconds (30 minutes).
    - Set **Refresh Token Reuse Interval** to `10` seconds.

---

## 4. Rate Limiting Maintenance & Cron Cleanup

### 4.1 Production Fail-Closed Behavior
- Production rate limiting runs against the PostgreSQL database function `public.rate_limit_hit(key, window, max_req)`.
- If the database call fails, critical authentication endpoints (`/api/auth/login` and `/api/auth/register`) **fail closed with HTTP 503 (Service Unavailable)** to protect against credential stuffing and brute force attacks during database degradation.
- In-memory rate limiting is strictly forbidden in production and only allowed in unit tests under `ALLOW_IN_MEMORY_RATE_LIMIT=1`.

### 4.2 Cleanup of Expired Rate Limits (`cleanup_expired_rate_limits`)
Over time, entries in `public.rate_limits` expire (`reset_at < now()`). The portal provides a cleanup routine `cleanup_expired_rate_limits()` in migration `003_phase2c.sql`.

- **Vercel Cron Setup (Recommended):**
  - Configured in `vercel.json` to call `/api/cron/cleanup-rate-limits` hourly (`0 * * * *`).
  - Secured via `Authorization: Bearer <CRON_SECRET>`.
  - **Required Action:** Set `CRON_SECRET` to a cryptographically random secret in Vercel Project Settings → Environment Variables.
- **PostgreSQL `pg_cron` Alternative:**
  If the `pg_cron` extension is enabled on your Supabase project (available on Pro plans):
  ```sql
  SELECT cron.schedule('cleanup-expired-rate-limits', '0 * * * *', 'SELECT public.cleanup_expired_rate_limits()');
  ```

---

## 5. Academic Cycle Operations

1. In accordance with institutional security rules, new cycles are seeded with `status = 'closed'` and `NULL` dates.
2. The Accounts Section must confirm official notification circular dates before opening an application window.
3. When dates are approved, an administrator accesses **Admin → Cycles** to set `opens_at`, `closes_at`, and toggle the status to `open`.
4. Submissions are strictly prohibited outside the configured cycle window at both the application API level and the database trigger level.

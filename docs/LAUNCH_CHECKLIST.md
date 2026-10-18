# Production Launch & Go-Live Checklist

This checklist provides the authoritative, step-by-step production deployment runbook for deploying the **SIT Scholarship Application Portal** at **Siddaganaga Institute of Technology (SIT), Tumkur**.

---

## 1. Cloud Infrastructure & Regional Requirement

- [ ] **Supabase Organization & Project:**
  - Create a new production Supabase project.
  - **MANDATORY REGION:** **AWS Asia Pacific (Mumbai) `ap-south-1`**. Under DPDP 2023 regulations and SIT data governance, student personal records and bank details must reside within Indian territory.
  - Plan: Pro tier recommended for Automated Daily Backups and Point-in-Time Recovery (PITR).
- [ ] **Hosting Environment (Vercel or AWS):**
  - Region configured to Mumbai (`bom1`) for minimal network latency.
  - Custom domain configured: `https://scholarships.sit.ac.in` <!-- TODO [COLLEGE DECISION REQUIRED: Confirm exact subdomain] -->
  - Valid SSL/TLS Certificate active with HSTS enabled.

---

## 2. Database Migration Sequence (001 to 009)

Execute the SQL migrations in strict numerical order using the Supabase SQL Editor or Supabase CLI:

```bash
# Using Supabase CLI linked to production:
supabase db push
```

If applying manually via Supabase Dashboard **SQL Editor**, execute in this exact sequence:
1. `001_init.sql` — Base tables (`profiles`, `scholarships`, `academic_cycles`, `applications`, `application_files`, `remarks`, `audit_logs`). Seeds initial scholarships (`MNC`, `SSKA`) and closed default cycles.
2. `002_phase2.sql` — Security hardening, role checks, AAL2 MFA functions, and baseline RLS policies.
3. `003_phase2c.sql` — Atomic PostgreSQL rate limiter table (`rate_limits`) and `check_rate_limit` RPC.
4. `004_fix_cleanup.sql` — Security definer privileges for `cleanup_expired_rate_limits`.
5. `005_lockdown.sql` — Direct PostgREST lockdown, privilege revocation for anonymous/student roles on audit logs and status updates.
6. `006_consent.sql` — DPDP consent versioning columns (`consent_version`, `consent_at`) and cycle date constraint updates.
7. `007_duplicate_flags.sql` — `bank_acc_hash` column, B-Tree index, and duplicate tracking flags.
8. `008_department.sql` — `reviewer_departments` text array column on `profiles` for reviewer scoping.
9. `009_data_requests.sql` — `data_requests` table for DPDP student correction/erasure requests with RLS policies.

- [ ] Verify that all 9 migrations completed with zero SQL errors.
- [ ] Ensure Supabase Storage private buckets exist:
  - `application-files` (Private, max file size 5MB, allow `image/jpeg`, `image/png`, `application/pdf`)
  - `application-pdfs` (Private, max file size 10MB, allow `application/pdf`)

---

## 3. Production Environment Variables Audit

Configure the following environment variables in your production hosting platform (e.g. Vercel Project Settings). **Never commit production keys to git!**

| Environment Variable | Description | Source / Requirement |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Canonical production URL (e.g. `https://scholarships.sit.ac.in`) | SIT IT DNS configuration |
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase API URL | Supabase Dashboard (Mumbai) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Public Anonymous Key | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secret Service Role Key (Server-only) | Supabase Dashboard |
| `ENCRYPTION_KEY` | 32-byte cryptographically secure random key (hex or base64) for AES-256-GCM bank account encryption | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `HASH_KEY` | 32-byte cryptographically secure random key for HMAC-SHA256 blind duplicate bank hashing | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile Public Site Key | Cloudflare Dashboard (Hostname: `scholarships.sit.ac.in`) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile Secret Key | Cloudflare Dashboard |
| `SMTP_HOST` | Campus or Cloud SMTP Host (e.g. `smtp.office365.com` or `email-smtp.ap-south-1.amazonaws.com`) | SIT Mail Server |
| `SMTP_PORT` | SMTP Port (`587` for STARTTLS or `465` for SSL) | SIT Mail Server |
| `SMTP_SECURE` | Set `false` for port 587, `true` for port 465 | SIT Mail Server |
| `SMTP_USER` | SMTP Authentication Username / IAM User | SIT Mail Server |
| `SMTP_PASS` | SMTP Password / App Password | SIT Mail Server |
| `SMTP_FROM` | From header (e.g. `SIT Scholarship Portal <scholarships@sit.ac.in>`) | Approved sender |
| `CRON_SECRET` | 32-byte secret authorizing scheduled cron jobs (e.g. rate limit cleanup) | Random secret |
| `REQUIRE_GUARDIAN_CONSENT_FOR_MINORS` | Set to `true` to strictly require parental consent for students < 18 | Default: `true` |
| `RETENTION_YEARS` | Statutory data retention period in years | Default: `7` |

---

## 4. Provisioning the Initial Bootstrap Administrator

1. Run the interactive administrator bootstrap script in your secure terminal:
   ```bash
   npx tsx scripts/create-admin.ts
   ```
2. Enter the designated institutional administrator email (e.g. `admin.scholarships@sit.ac.in`).
3. Enter a high-entropy password (min 12 chars).
4. Log into the portal at `https://scholarships.sit.ac.in/admin-login`.
5. **Enroll TOTP MFA:** Scan the QR code with an institutional authenticator app (Google Authenticator, Microsoft Authenticator). Enter the 6-digit TOTP code to establish **AAL2 assurance**.
6. Verify access to the Admin Dashboard (`/admin`).

---

## 5. Pre-Launch Verification Sequence (Smoke Tests)

Perform the following verification checks on the live production URL:

- [ ] **Security Headers:**
  - Verify CSP headers are present: `curl -I https://scholarships.sit.ac.in`
  - Ensure `frame-ancestors 'none'`, `object-src 'none'`, and Turnstile domains are allowed.
- [ ] **Cloudflare Turnstile:**
  - Open `/login` and `/register` in an incognito window.
  - Verify the Turnstile widget renders cleanly without console CSP errors.
  - Test registration with a test institutional email and confirm Turnstile token verification succeeds.
- [ ] **Email Delivery & Bilingual Content:**
  - Verify confirmation email is delivered to the student inbox.
  - Check that both English and Kannada instructions render legibly.
  - Confirm logs in Vercel do not contain any email address or personal name.
- [ ] **MFA Enforcement:**
  - Attempt accessing `/admin` as a student or with an AAL1 session; verify immediate redirect/403.
- [ ] **PDF Generation & Tamper-Evident Seal:**
  - Complete a test draft and view PDF preview. Verify barcode/seal and SHA-256 digest on document footer.

---

## 6. Official Opening of Scholarship Cycle

1. As an Administrator, navigate to **Admin → Scholarships (`/admin/scholarships`)**.
2. For the scholarship to activate (e.g. `MNC`):
   - Set the current academic year (e.g. `2026-2027`).
   - Set opening timestamp (`opens_at`) to current time.
   - Set deadline closing timestamp (`closes_at`).
   - Change Status from `closed` to `open` and save.
3. Verify the public home page now displays "Accepting Applications" with an active "Apply Now" button.
4. Issue public announcement to SIT students.

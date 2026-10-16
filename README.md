# SIT Scholarship Application Portal
**Siddaganga Institute of Technology (SIT), Tumakuru – 572103**  
*Autonomous Institution under Visvesvaraya Technological University (VTU), Belagavi*

---

## 1. Overview

The **SIT Scholarship Application Portal** (`sit-scholarship-portal`) is the official, fast, minimal, government-style web platform for Siddaganga Institute of Technology, Tumakuru. It automates scholarship applications, eligibility verification, merit ranking, document archiving, and print-ready PDF generation while strictly safeguarding student privacy in compliance with the Digital Personal Data Protection (DPDP) Act 2023.

### Supported Scholarships
1. **`MNC`**: *Dr. M.N. Channabasappa Endowment Fund Loan Scholarship*
   - Strict merit-cum-means selection for CET-admitted students.
   - Income ceiling: **Rs. 3,00,000/- per annum**.
   - Maximum other assistance: **30% of total annual fee**.
   - Years 2 to 4 requirement: **strictly zero backlog history**.
   - Annual quota: **One student selected each for 1st, 2nd, 3rd, and 4th year B.E.** (Top 10 per year interviewed).
2. **`SSKA`**: *Sri Sripathi K A Memorial Scholarship*
   - Uses *"Tuition fee"* reference.
   - Includes official Proctor and Head of the Department (HoD) recommendation verification block.
3. **`SITEB`**: *SIT Scholarship to Economically Backward and Socially Challenged Students*
   - Configured in the data model and marked **inactive** pending official committee circular.

---

## 2. Key Architecture & Security Controls

- **Authentication:** Powered by Supabase Auth (`@supabase/ssr` + `@supabase/supabase-js`). Session tokens are stored in secure HTTP-only cookies and refreshed via Next.js 16 request proxy (`src/proxy.ts`).
- **Database-Controlled Authorization:** User roles (`student`, `reviewer`, `admin`) reside exclusively in PostgreSQL `public.profiles.role`. Roles are never stored in or read from JWT metadata or client cookies.
- **PostgreSQL Row Level Security (RLS):** All tables have RLS enabled with access control policies.
- **Append-Only Immutable Audit Log:** Trigger `trg_audit_log_immutable` raises an exception on any `UPDATE` or `DELETE`, and privileges are revoked from application roles.
- **Database-Level Deadline Check:** Trigger `trg_check_application_submission_deadline` rejects status changes to `submitted` outside active cycle windows (`opens_at` to `closes_at`).
- **Idempotent Submission & Concurrency Checks:** Draft saves check client `updated_at` timestamps (returning `409` on concurrent edit conflict). Submissions are conditional updates on `status IN ('draft', 'needs_correction')`.
- **Field-Level Bank Account Encryption:** Student bank numbers are encrypted using **AES-256-GCM** (`v1:keyId:iv:tag:ciphertext`) via 32-byte base64 `ENCRYPTION_KEY`. Only the last 4 digits (`bank_acc_last4`) are stored unencrypted for masked display. Supports key rotation with `ENCRYPTION_KEY_PREVIOUS` and `scripts/rotate-encryption-key.ts`.
- **Private Cloud Storage:** Application enclosures and generated PDFs are stored in private Supabase Storage bucket `application-files` (`public = false`). Files are served strictly through authenticated, role-checked route `/api/files/[id]`.
- **Unlisted Staff Route:** The public "Administrator Login" link has been removed from the homepage. Staff authenticate via the unlisted `/admin-login` route.

---

## 3. Set Up a New Supabase Project (Checklist)

Follow this step-by-step checklist to configure a new Supabase project for the portal:

### 1. Create Supabase Project
- Log in to [Supabase Dashboard](https://supabase.com).
- Click **New Project**.
- Select Region: **`ap-south-1` (Mumbai, India)** — required for DPDP Act data residency compliance.
- Note your Project URL, Publishable Key, and Secret Key (Service Role Key).

### 2. Configure Authentication
- In Supabase Dashboard, go to **Authentication → URL Configuration**:
  - **Site URL:** Set to your production Vercel domain (e.g. `https://<your-project>.vercel.app`).
  - **Redirect URLs:** Add `http://localhost:3000` (for local development) and `https://<your-project>.vercel.app/**`.
- In **Authentication → Providers → Email**:
  - Turn **Confirm email** ON (required before student login or submission).

### 3. Run Database Migrations (Sequential Order)
When initializing an empty Supabase project, execute the SQL migration scripts in numerical sequence in the Supabase **SQL Editor**:
1. **`supabase/migrations/001_init.sql`**: Provisions core tables (`profiles`, `scholarships`, `cycles`, `applications`, `application_files`, `remarks`, `audit_log`, `rate_limits`), indexes, RLS policies, and immutable append-only audit log triggers.
2. **`supabase/migrations/002_phase2.sql`**: Applies Phase 2 security hardening, including canonical status constraints, statement-level truncate prevention, `auth.users` profile generation trigger, atomic `rate_limit_hit` function, and the hardened submission deadline trigger.
3. **`supabase/migrations/003_phase2c.sql`**: Adds `last_seen_at` column to `public.profiles` for server-side staff idle timeout and creates `cleanup_expired_rate_limits()` stored procedure for cron rate limit row purging.
4. **`supabase/migrations/004_fix_cleanup.sql`**: Replaces `cleanup_expired_rate_limits()` to explicitly purge on `public.rate_limits(expire_at)`.

> **Note on Migration Order:** Migration scripts must be executed in order (`001_init.sql` → `002_phase2.sql` → `003_phase2c.sql` → `004_fix_cleanup.sql`). For a fresh single-step setup, you may alternatively execute [`supabase/schema.sql`](supabase/schema.sql), which contains the consolidated idempotent schema.

### 4. Seed Initial Data
- Populate `.env.local` with your Supabase credentials (see section below).
- Run the seed script to initialize scholarships, active cycle, and ensure bucket configuration:
  ```bash
  npx tsx scripts/seed.ts
  ```

### 5. Bootstrap Initial Administrator
- Execute the bootstrap script using the interactive hidden prompt:
  ```bash
  npx tsx scripts/create-admin.ts
  ```
- The script will securely prompt for the administrator email and password (the password prompt mutes terminal output to prevent shoulder-surfing).
- **Security Rule:** Passwords must **never** be passed on the command line or stored in shell history.
- The script enforces the institutional password policy (minimum 10 characters, blocklist check, no name/email parts), creates the confirmed admin user in Supabase Auth, and marks `must_change_password = true`.
- Upon initial login at `/admin-login`, the portal enforces an immediate password change at `/change-password`.

---

## 3.1 Encryption Key Safety & Operational Procedures

> [!CAUTION]
> **CRITICAL DATA SAFETY NOTICE:** If `ENCRYPTION_KEY` is lost, corrupted, or deleted, **all bank account numbers encrypted in the database will be permanently unrecoverable**. 
> The 32-byte base64 encryption key must be securely stored in an institutional password manager (such as 1Password or Bitwarden).
> 
> Key rotation is handled without service disruption via `scripts/rotate-encryption-key.ts` using `ENCRYPTION_KEY_PREVIOUS` and `ENCRYPTION_KEY`. See [`RUNBOOK.md`](RUNBOOK.md) for full operational recovery procedures.

## 4. Environment Variables

Create `.env.local` in the project root based on `.env.example`:

| Name | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser & Server | Supabase Project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser & Server | Supabase Publishable Key (replaces old anon key) |
| `SUPABASE_SECRET_KEY` | Server Only | Supabase Secret Key (bypasses RLS for server data layer) |
| `ENCRYPTION_KEY` | Server Only | 32 random bytes, base64 encoded, for AES-256-GCM bank field encryption |
| `ENCRYPTION_KEY_PREVIOUS` | Server Only | (Optional) Previous 32-byte base64 key during key rotation |
| `NEXT_PUBLIC_APP_URL` | Browser & Server | Base URL of deployment (e.g. `http://localhost:3000` or production URL) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | CLI Only | Required only when running `scripts/create-admin.ts` |
| `TEST_SUPABASE_URL` | Test Only | Separate test Supabase project URL (must NOT equal production URL unless local development guard is bypassed) |
| `TEST_SUPABASE_PUBLISHABLE_KEY` | Test Only | Separate test Supabase publishable key |
| `TEST_SUPABASE_SECRET_KEY` | Test Only | Separate test Supabase secret key |
| `ALLOW_SAME_PROJECT_TEST` | Test Only | Set to 1 only while the single Supabase project holds no real data; remove before launch. Fails in `NODE_ENV=production`. |
| `CRON_SECRET` | Server Only | Secret token securing `/api/cron/cleanup-rate-limits` daily invocation |

Generate a 32-byte base64 encryption key using Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 5. Development & Testing

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
# If TEST_SUPABASE_* variables are configured, integration tests execute against the test database.
# In local development where test URL matches prod URL, pass ALLOW_SAME_PROJECT_TEST=1 (only while holding no real data; remove before launch):
npm test                      # Requires TEST_SUPABASE_URL, TEST_SUPABASE_PUBLISHABLE_KEY, TEST_SUPABASE_SECRET_KEY
SKIP_INTEGRATION=1 npm test   # Skips DB integration tests and runs all unit & simulated tests

# 3. Run linter
npm run lint

# 4. Build production bundle
npm run build

# 5. Start development server
npm run dev
```

The portal runs at **`http://localhost:3000`**.

---

## 6. Route Sitemap

### Public Routes
- `/`: Home page (announcements, active scholarship list, deadlines, apply actions)
- `/scholarships/[code]`: Guidelines and eligibility criteria for scholarships (`MNC`, `SSKA`)
- `/login`: Student authentication portal
- `/admin-login`: Unlisted staff and administrator authentication portal
- `/register`: Student self-registration with DPDP Act consent
- `/forgot-password`: Password reset request portal
- `/change-password`: Enforced password change portal
- `/verify/[ref_no]`: Public QR code verification endpoint

### Student Portal (Authentication Required)
- `/dashboard`: Applications overview, draft resumption, and PDF downloads
- `/apply/[code]`: Multi-step form wizard with live eligibility checker and auto-save
- `/applications/[id]`: Application detail view, status timeline, PDF viewer, remarks thread, withdrawal
- `/profile`: Reusable profile and bank account details

### Administrative Portal (Role Required)
- `/admin`: Metrics dashboard, status counts, recent candidate submissions
- `/admin/applications`: Scrutiny table with filters, search, and CSV/ZIP exports
- `/admin/applications/[id]`: Candidate detail view, document previews, PDF preview, decision actions
- `/admin/merit`: Merit ranking and Top 10 interview helper by academic year
- `/admin/scholarships`: Scholarship rules and cycle windows editor
- `/admin/users`: Reviewer and Administrator account management (invite only)
- `/admin/audit`: Immutable compliance audit trail

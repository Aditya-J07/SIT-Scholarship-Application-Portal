# SIT Scholarship Application Portal
**Siddaganga Institute of Technology (SIT), Tumakuru – 572103**  
*Autonomous Institution under Visvesvaraya Technological University (VTU), Belagavi*

---

## 1. Overview

The **SIT Scholarship Application Portal** (`sit-scholarship-portal`) is the official, fast, minimal, institutional web platform for Siddaganga Institute of Technology, Tumakuru. It automates scholarship applications, multi-factor authenticated scrutiny, merit ranking, document archiving, print-ready PDF generation, and bilingual notifications while strictly safeguarding student privacy in compliance with India's **Digital Personal Data Protection (DPDP) Act, 2023**.

### Supported Scholarships
1. **`MNC`**: *Dr. M.N. Channabasappa Endowment Fund Loan Scholarship*
   - Merit-cum-means financial assistance for CET-admitted students.
   - Income ceiling: **Rs. 3,00,000/- per annum**.
   - Maximum other assistance: **30% of total annual fee**.
   - Years 2 to 4 requirement: **strictly zero backlog history**.
   - Annual quota: **One student selected each for 1st, 2nd, 3rd, and 4th year B.E.** (Top 10 candidates per year shortlisted).
2. **`SSKA`**: *Sri Sripathi K A Memorial Scholarship*
   - Tuition fee scholarship for deserving engineering students.
   - Includes mandatory Proctor and Head of the Department (HoD) recommendation validation.
3. **`SITEB`**: *SIT Scholarship to Economically Backward and Socially Challenged Students*
   - Configured in the schema and marked inactive pending committee circular.

---

## 2. Key Architecture & Security Defenses

- **Authentication & AAL2 MFA:** Powered by Supabase Auth (`@supabase/ssr`). Student sessions operate at AAL1; Reviewers and Administrators are strictly mandated to enforce Authenticator (TOTP) Multi-Factor Authentication at **Authenticator Assurance Level 2 (AAL2)**.
- **Database-Controlled Authorization:** Roles (`student`, `reviewer`, `admin`) reside exclusively in PostgreSQL `public.profiles.role`. JWT metadata is never trusted for authorization decisions.
- **Reviewer Department Scoping:** Faculty reviewers are scoped strictly to their assigned academic departments (`profiles.reviewer_departments`), preventing unauthorized cross-department scrutiny.
- **Field-Level Encryption at Rest:** Student bank account numbers are encrypted using **AES-256-GCM** via 32-byte `ENCRYPTION_KEY`. Only the verified student owner and audited administrators can decrypt full account numbers.
- **Zero-Decryption Duplicate Detection:** Bank account duplicates are identified using HMAC-SHA256 blind hashing (`bank_acc_hash`) with secret `HASH_KEY`. The portal detects duplicate bank claims without ever decrypting student account numbers.
- **Strict Network & Browser Hardening:** Strict Content Security Policy (CSP), Cloudflare Turnstile CAPTCHA bot mitigation, atomic PostgreSQL rate limiting (`check_rate_limit`), and CSRF Origin validation on all state-changing requests.
- **Tamper-Evident Document Sealing:** Generated PDF applications are stamped with a cryptographic **SHA-256 digest** verifiable publicly at `/verify/[ref_no]`.
- **Zero-PII Logging Standard:** Application logs record event codes and non-identifying reference numbers only. Real student names, emails, phone numbers, and bank details are never printed to logs or console.

---

## 3. Technology Stack

- **Framework:** Next.js 16.4 (App Router, Turbopack)
- **Language:** TypeScript 5.x (Strict mode, zero `any` warnings)
- **Database:** Supabase PostgreSQL 15+ (Row Level Security enforced)
- **Storage:** Supabase Storage (Private encrypted buckets for uploads and PDFs)
- **PDF Generation:** `pdf-lib` (Server-side generated official A4 documents)
- **Email Delivery:** Direct campus/cloud SMTP via Nodemailer
- **Testing:** Custom zero-dependency test runner with 250+ unit and real database integration tests

---

## 4. Local Development Setup

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher
- A Supabase project (AWS Mumbai region `ap-south-1` recommended)

### 1. Clone & Install
```bash
git clone https://github.com/Aditya-J07/SIT-Scholarship-Application-Portal.git
cd SIT-Scholarship-Application-Portal
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory (refer to Section 5 below for full reference).

### 3. Run Migrations & Seed
Execute the SQL migrations in numerical order (`001` to `009`) in the Supabase SQL editor, or run the consolidated schema:
```bash
# Seed initial scholarships and closed test cycles
npx tsx scripts/seed.ts
```

### 4. Create Local Administrator
```bash
npx tsx scripts/create-admin.ts
```
Enter an email and password when prompted.

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Complete Environment Variables Table

Configure these variables in `.env.local` for local development and in your hosting platform (Vercel) for production:

> **Build-Time Note:** Variables prefixed with `NEXT_PUBLIC_` (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_COLLEGE_NAME`, `NEXT_PUBLIC_COLLEGE_LOCATION`) are inlined into client-side JavaScript bundles at build time (`npm run build`). Whenever any `NEXT_PUBLIC_` variable changes, a fresh build must be triggered.
>
> **Custom SMTP Required:** Supabase Auth built-in SMTP has strict default rate limits (e.g. 3 emails/hour). Custom SMTP is strictly required in production for both Supabase Auth settings and the portal's outbound Nodemailer engine (`SMTP_*`, `MAIL_FROM`) to prevent signup and invitation delivery throttling.

| Variable | Requirement | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | **Required** | Canonical site URL (used for origin guards & callbacks; baked in at build time) | `http://localhost:3000` (Dev) / `https://scholarships.sit.ac.in` (Prod) |
| `NEXT_PUBLIC_APP_URL` | **Required** | Canonical application URL (baked in at build time) | `http://localhost:3000` (Dev) / `https://scholarships.sit.ac.in` (Prod) |
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | Supabase Project API URL (baked in at build time) | `https://xyzcompany.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Required** | Supabase Public Publishable API Key (baked in at build time) | `pk_...` |
| `SUPABASE_SECRET_KEY` | **Required** | Supabase Secret Key (Server-only) | `sk_...` |
| `ENCRYPTION_KEY` | **Required** | 32-byte base64 key for AES-256-GCM bank account encryption | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `HASH_KEY` | **Required** | 32-byte base64 key for HMAC-SHA256 blind bank account hashing | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `CRON_SECRET` | Optional | Bearer secret authorizing automated rate limit purge cron | `random-32-char-token` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **Required** | Cloudflare Turnstile Public Site Key (baked in at build time) | `1x00000000000000000000AA` (Dummy test key) |
| `TURNSTILE_SECRET_KEY` | **Required** | Cloudflare Turnstile Secret Key | `1x0000000000000000000000000000000AA` (Dummy test key) |
| `SMTP_HOST` | Optional | Outbound SMTP relay hostname | `smtp.office365.com` / `email-smtp.ap-south-1.amazonaws.com` |
| `SMTP_PORT` | Optional | SMTP port (`587` for STARTTLS, `465` for SSL) | `587` |
| `SMTP_SECURE` | Optional | `false` for port 587, `true` for port 465 | `false` |
| `SMTP_USER` | Optional | SMTP authentication username / IAM user | `TODO_SMTP_USER` |
| `SMTP_PASS` | Optional | SMTP authentication password / App password | `********` |
| `MAIL_FROM` | Optional | Sender header displayed to students | `SIT Scholarship Portal <scholarships@sit.ac.in>` |
| `REQUIRE_GUARDIAN_CONSENT_FOR_MINORS` | Optional | Enforces legal guardian consent for students under 18 | `true` |
| `RETENTION_YEARS` | Optional | DPDP statutory retention window in years | No default (must be configured explicitly; runs dry-run only if unset) |

---

## 6. Chronological Database Migrations (001 to 011)

When setting up or updating Supabase databases, apply migrations in strict chronological order:

1. **`supabase/migrations/001_init.sql`**: Base schema (`profiles`, `scholarships`, `academic_cycles`, `applications`, `application_files`, `remarks`, `audit_logs`). Seeds scholarships and default closed cycles.
2. **`supabase/migrations/002_phase2.sql`**: RLS security policies, role check constraints, and AAL2 session functions.
3. **`supabase/migrations/003_phase2c.sql`**: Atomic database rate limiter table (`rate_limits`) and `check_rate_limit` stored procedure.
4. **`supabase/migrations/004_fix_cleanup.sql`**: Security definer execution permissions for rate limit row cleanup.
5. **`supabase/migrations/005_lockdown.sql`**: PostgREST lockdown, privilege revocation for anonymous/student roles on audit logs and status updates.
6. **`supabase/migrations/006_consent.sql`**: Consent versioning columns (`consent_version`, `consent_at`) and cycle date constraint updates.
7. **`supabase/migrations/007_duplicate_flags.sql`**: `bank_acc_hash` column, B-Tree index, and duplicate flag tracking.
8. **`supabase/migrations/008_department.sql`**: `department` column on `profiles` for reviewer scoping.
9. **`supabase/migrations/009_data_requests.sql`**: `data_requests` table for DPDP student data access, correction, and erasure requests.
10. **`supabase/migrations/010_application_department.sql`**: `department` column on `applications` for exact-match reviewer scoping and indexed filtering.
11. **`supabase/migrations/011_remarks_visibility.sql`**: `visible_to_student` column on `remarks` to explicitly govern visibility of staff remarks to students.

---

## 7. User Guides

### 7.1 Student User Guide
1. **Registration & Login:** Register with an institutional email (`@sit.ac.in`). Confirm email via the verification link, then log in. Complete Turnstile CAPTCHA.
2. **Applying for Scholarship:** From the homepage, select an open scholarship (e.g. MNC) and click **Apply Now**.
3. **Multi-Step Wizard:**
   - Step 1: Personal details & institutional identifiers. Minors (< 18 years) unlock the Guardian Consent Declaration block.
   - Step 2: Parent / Guardian income details. Enter annual family income and certificate date.
   - Step 3: Academic scores. Enter CET details, marks, and semester standing.
   - Step 4: Fees, other assistance, and monthly requested amount.
   - Step 5: Student's personal savings bank account number and IFSC code.
   - Step 6: Document uploads. Upload passport photo, digital signatures, and enclosures. Images are automatically compressed to < 300 KB.
   - Step 7: Review & Final Submit. Review all entered details, preview draft PDF, and submit.
4. **Tracking & Timeline:** Track application status in real-time from `/dashboard` and `/applications/[id]`. If the committee requests changes, follow the prominent "Correction Requested" banner to update and resubmit.
5. **Data Protection Rights:** Exercise DPDP rights (request data correction or account erasure) via `/profile`.

### 7.2 Staff User Guide (Reviewers & Administrators)
1. **Staff Login & Mandatory MFA:** Access the portal via `/admin-login`. Log in with staff credentials and complete TOTP MFA to achieve **AAL2 assurance**.
2. **Reviewer Scrutiny:**
   - Reviewers access applications scoped to their assigned academic departments.
   - Review student marks, income proofs, and bank details (bank accounts are displayed in masked format `XXXX1234`).
   - Add internal committee notes or issue correction requests directly to the student.
   - Mark hard-copy physical documents as received.
3. **Administrator Controls:**
   - Full institutional scrutiny across all engineering departments.
   - Decrypt student bank details when required for disbursement (strictly audited with IP and timestamp).
   - Resolve duplicate flags (Duplicate Bank Account, Duplicate Mobile).
   - Access **Merit Ranking View (`/admin/merit`)** to view Top 10 rankings per year and perform bulk shortlisting.
   - Manage staff roles and execute MFA factor resets in `/admin/users`.
   - Manage Academic Cycles (opening/closing deadlines) in `/admin/scholarships`.
   - Review DPDP data correction and deletion requests in `/admin/data-requests`.
   - Inspect append-only immutable logs in `/admin/audit`.

---

## 8. Running Tests

The test suite contains 250+ unit and real database integration tests:

```bash
# Run complete test suite (unit tests + integration tests against test Supabase project)
npm test

# Run unit tests only in memory (no external database required)
SKIP_INTEGRATION=1 npm test
```

### Pre-Commit Verification Sequence
Before committing code changes, run the full verification sequence:
```bash
npm run lint         # ESLint (must exit with 0 errors and 0 warnings)
npx tsc --noEmit     # TypeScript type check (strict mode)
npm run build        # Production Next.js build
npm test             # Full unit and integration test suite
```

---

## 9. Comprehensive Documentation Suite

For detailed technical references, refer to the documentation in [`docs/`](docs/):

- [`SECURITY.md`](SECURITY.md) — Vulnerability reporting policy, security contacts, threat defenses, and cryptographic specifications.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System architecture diagram, Mermaid data flows, role authorization matrix, and network layering.
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — Operational SOPs, staff onboarding, MFA recovery, key rotation, cycle management, and disaster recovery.
- [`docs/DPDP.md`](docs/DPDP.md) — Digital Personal Data Protection Act 2023 compliance breakdown, data inventory, minor consent rules, and retention policy.
- [`docs/EMAIL.md`](docs/EMAIL.md) — Bilingual email templates, custom Supabase SMTP setup, SPF/DKIM DNS records, and zero-PII logging rules.
- [`docs/MONITORING.md`](docs/MONITORING.md) — Observability strategy, rationale for omitting Sentry runtime SDK, client/server PII scrubbing filters, and health checks.
- [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) — Step-by-step production go-live checklist for SIT Tumkur.

---

## 10. Known Limitations & Future Enhancements

- **Direct Banking Gateway Integration:** Currently, scholarship award disbursements are processed by exporting verified bank data for institutional NEFT/RTGS batch processing. Direct integration with SBI or Canara Bank Corporate Payment APIs can be scheduled for future phases.
- **Biometric Aadhaar e-KYC:** Student identity is currently verified via institutional email, USN validation, and uploaded Aadhaar copy (last-4 digits). Integration with UIDAI e-KYC can be evaluated if mandated by VTU or the Government of Karnataka.
- **SMS Gateway Relay:** Notifications are delivered via institutional SMTP email. Integrating an institutional DLT-registered SMS gateway (CDAC or telecom provider) can provide parallel SMS alerts for critical deadlines.

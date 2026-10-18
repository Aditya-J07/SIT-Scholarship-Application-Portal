# Security Policy

## 1. Vulnerability Reporting & Disclosure Policy

Siddaganga Institute of Technology (SIT), Tumkur takes the security and privacy of student data with the utmost seriousness. If you discover a vulnerability or potential security flaw within the SIT Scholarship Application Portal, we encourage you to report it responsibly.

### How to Report
Please send an encrypted or direct email detailing your findings to:
- **Security Team Contact:** `TODO_SECURITY_CONTACT` <!-- TODO [COLLEGE DECISION REQUIRED: Designate official security contact] -->
- **Grievance Redressal / Nodal Officer:** `TODO_NODAL_OFFICER_CONTACT` <!-- TODO [COLLEGE DECISION REQUIRED: Confirm Nodal Officer contact] -->

Please include:
- A clear description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal proof of concept (PoC).
- Any relevant request identifiers or endpoints.
- **Do not** attempt to access, extract, modify, or destroy real student personal data or production databases during testing.
- Allow the SIT Technical & Administrative Team a reasonable window (typically 30–60 days) to investigate, remediate, and verify the patch before public disclosure.

---

## 2. Supported Versions

Only the active production release branch and its immediate pre-release hardening branch receive security updates and hotfixes.

| Version / Branch | Supported          | Status                       |
| ---------------- | ------------------ | ---------------------------- |
| `main`           | :white_check_mark: | Production (Phase 3 Hardened)|
| `hardening`      | :white_check_mark: | Active Staging / Validation  |
| `< 2.0`          | :x:                | Deprecated / Unsupported     |

---

## 3. Security Architecture & Threat Defenses

The SIT Scholarship Application Portal implements defense-in-depth across the entire stack:

### 3.1 Authentication & Session Security
- **MFA Enforcement for Staff (AAL2):** Reviewers and Administrators are strictly required to enforce Authenticator (TOTP) MFA at Authenticator Assurance Level 2 (AAL2). Sessions lacking AAL2 verification are rejected with HTTP 403 on all administrative and scrutiny routes (`/api/admin/*`, `/admin/*`).
- **MFA Isolation:** Students operate at AAL1, but cannot elevate privileges. Any attempted privilege escalation is blocked at the database level by PostgreSQL Row Level Security (RLS).
- **Session Expiry & Idle Timeouts:** Staff sessions expire after 12 hours of total duration or 15 minutes of inactivity (`last_seen_at` enforcement).

### 3.2 Sensitive Data Protection & Field-Level Encryption
- **AES-256-GCM Encryption:** Student bank account numbers are never stored in plain text. They are encrypted using authenticated AES-256-GCM (`src/lib/crypto/field-encryption.ts`) with a 32-byte key (`ENCRYPTION_KEY`). The initialization vector (IV) and authentication tag are prepended to ensure confidentiality and tamper-evident integrity.
- **Zero-Decryption Duplicate Detection:** Bank account duplicates are identified using HMAC-SHA256 blind hashing (`bank_acc_hash`) with a distinct secret (`HASH_KEY`). The system checks for multiple submissions of the same bank account across applications without ever decrypting the underlying account numbers.
- **Role-Based Bank Masking:** Reviewers only ever receive masked account numbers (e.g. `XXXX1234`). Only the verified student owner and an authorized, fully audited administrator can decrypt the full account number. All admin decryptions emit an immutable `ADMIN_DECRYPT_BANK_ACCOUNT` audit log with IP and timestamp.

### 3.3 Zero-PII Logging Standard
- **Zero PII Policy:** The application strictly forbids logging or printing passwords, session tokens, bank account numbers, email addresses, phone numbers, Aadhaar numbers, or student full names.
- Application and server logs are restricted solely to event types (e.g. `[NOTIFICATION_SENT] Type: submitted`) and non-sensitive reference identifiers (e.g. `Ref: SIT-MNC-2026-A1B2C3`).

### 3.4 Rate Limiting & Abuse Prevention
- **Atomic Database Rate Limiting:** All authentication and sensitive endpoints are protected by an atomic PostgreSQL stored procedure (`check_rate_limit`) with sliding expiration windows.
- Consecutive failed login attempts trigger progressive throttling: 5 failed attempts per 15-minute window lock the identifier with HTTP 429 (`Retry-After`).
- **Cloudflare Turnstile CAPTCHA:** Machine-speed attacks and brute-force credential stuffing are mitigated on `/login`, `/register`, `/forgot-password`, and `/admin-login` using Cloudflare Turnstile with server-side token verification.

### 3.5 Network & Browser Hardening
- **Strict Content Security Policy (CSP):** Configured in `next.config.ts`. Blocks inline scripts without nonces/hashes, disallows external framing (`frame-ancestors 'none'`), disallows object embeds (`object-src 'none'`), restricts styles and fonts to trusted college assets, and isolates API connections.
- **CSRF & Origin Verification:** All state-changing requests (`POST`, `PATCH`, `DELETE`) require a strictly matching `Origin` or `Referer` header validated against `NEXT_PUBLIC_SITE_URL`. Mismatches or absent origins on mutation requests return HTTP 403.
- **Cookie Security:** Auth tokens and session cookies are strictly configured with `HttpOnly`, `Secure` (HTTPS-only), and `SameSite=Lax`.

### 3.6 File Upload Security
- **Magic Byte Validation:** File uploads are inspected by binary signature (`file-type` header check) rather than trusting client MIME headers or file extensions.
- **Strict Allow-list:** Only `application/pdf`, `image/jpeg`, and `image/png` are permitted. SVG, HTML, executable binaries, and scripts are rejected.
- **Storage Isolation:** Uploaded files are renamed to cryptographically random UUIDs and placed in private Supabase Storage buckets accessible only through authenticated API routes (`/api/files/[id]`). Path traversal (`..`, slashes, NUL bytes) is strictly blocked.

### 3.7 Database Row Level Security (RLS) & Audit Logging
- Direct access via Supabase PostgREST client keys is locked down. Anonymous visitors and students cannot access audit tables, update foreign profiles, or tamper with merit scores.
- All administrative decisions, status overrides, MFA resets, and file accesses are permanently recorded in the append-only `audit_logs` table.

# Code Review: `hardening` branch (commit `81b07bd`)

**Repository:** Aditya-J07/SIT-Scholarship-Application-Portal, branch `hardening`
**Reviewed:** 16 Oct 2026

## Scope and limits
I cloned the branch and read: the session helper, admin guard, origin guard, proxy, rate limiter, login, register, change-password, MFA verify, reset-MFA, admin users, decision, export, application read/patch/submit/withdraw/create routes, file upload and download routes, the auth callback, the cron route, `next.config.ts`, `vercel.json`, `storage.ts`, the bank-field code, and all four migrations.

I did **not** read in depth: the PDF generator, notifications, the UI pages and components, translations, scripts, the IFSC and verify routes, the forgot-password route, the MFA enrol route, or the test file itself. I did not run the app, and I did not touch your Supabase project. The database problems below come from reading the SQL; confirm them with the check queries in `005_lockdown.sql` before relying on my conclusion.

**Good news:** no secrets are committed (I searched every commit for keys, the encryption key, the project ref and the old passwords). Only `.env.example` is tracked.

## Verdict
**Do not go live yet.** The route-level work is better than before, but the database is open to direct access from the browser, which makes every route check below it irrelevant. Fix C1 and C2 first (run `005_lockdown.sql`), then the High items.

---

## CRITICAL

### C1. Any logged-in student can make themselves an admin (database)
`001_init.sql` has the policy "Users can update their own non-role profile fields" on `profiles` with `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`. The name is misleading: row-level security cannot restrict columns, so this lets a user update **every** column of their own row, including `role`. Supabase gives the `authenticated` role table privileges by default, and the publishable key plus the user's login token is enough to call the REST API directly (`PATCH /rest/v1/profiles?id=eq.<own id>`), bypassing the whole app.

Your app then trusts `profiles.role` from the database. A student who sets `role = 'admin'` can enrol their own authenticator through `/api/auth/mfa/enroll`, reach aal2, and read every student's data, files and bank details. Anyone on the internet can register as a student, so this is open to everyone.

The test "Student cannot elevate own role to admin" appeared in an earlier test list but is **missing from the final test output**. The tests never exercised this direct path.

**Fix:** run `005_lockdown.sql` (revokes all direct table access from `anon` and `authenticated`; the browser never reads tables, so nothing breaks). Add a test that signs in as a student with the publishable key and tries to PATCH `profiles.role`, expecting failure.

### C2. Students can write their own application rows directly (database)
Same cause: "Students can create/update their own applications" lets a student INSERT or UPDATE their own rows through the REST API with any column values: `status = 'accepted'`, `merit_score`, `decided_by`, `pdf_path`, or editing after submission. This bypasses the eligibility rules, required files, the deadline check in the API (the DB trigger only checks the move to `submitted`), the PDF and the hash. Same fix: `005_lockdown.sql`.

### C3 (related). `rate_limit_hit` is callable by anyone
`REVOKE ... FROM anon, authenticated` does not remove the `PUBLIC` execute right that every function gets by default. Anyone can call `/rest/v1/rpc/rate_limit_hit` with a key like `login:email:someone@sit.ac.in` and fill that bucket, locking that person out of login (including the Dean) for 15 minutes, repeatedly. `005_lockdown.sql` fixes it.

---

## HIGH

**H1. Bank account numbers are stored in plain text in every application.** Encryption only covers `profiles.bank_acc_no_encrypted`. The application form saves `bank_acc_no` and `confirm_bank_acc_no` as plain text inside `applications.data` (JSON), and the admin pages, PDF and prefill read them from there. Fix: encrypt the account number when saving the application step (store ciphertext plus last 4 digits), drop `confirm_bank_acc_no` after validation, decrypt only for the owner and for admins viewing a single application (audited). Migrate existing rows.

**H2. Several routes skip the staff MFA and idle checks.** The report said the check was "universal". These routes still call `getCurrentSession()` directly: file upload, submit, withdraw, IFSC, profile, change-password. The ownership test in submit, withdraw and upload only blocks students, so a **reviewer or an admin at password-only level (aal1)** can upload files to, submit, or **withdraw any student's application**. Fix: use `getAuthorizedSession()` everywhere, and in submit, withdraw and upload require the application's owner (staff acting for a student, if ever needed, only at aal2 and audited).

**H3. The Origin (CSRF) check is missing on many state-changing routes:** submit, withdraw, create application (POST), change-password, profile PUT, logout, and admin cycles, scholarships and remarks. Supabase's cookies default to `SameSite=Lax`, which blocks most cross-site POSTs, but the requirement was for every route. Fix: do the check once in `proxy.ts` for every non-GET `/api/*` request instead of per route.

**H4. Open redirect in `/auth/callback`.** The `next` query value is appended to the host without validation (for example `?next=@evil.com` turns into `https://yourhost@evil.com`), and the code trusts the `x-forwarded-host` header. Attackers can send a real login link that ends on a phishing site. Fix: accept only a path that starts with a single `/` (not `//` or `/\`), and build the redirect only from `NEXT_PUBLIC_SITE_URL`.

**H5. The rate limits will block real students.** Login allows 5 attempts per 15 minutes per IP and register 5 per hour per IP, and every attempt counts, including successful ones. On a campus network or hostel Wi-Fi many students share one public IP, so the sixth student is blocked. Fix: IP limits of about 100 per 15 minutes for login and 30 per hour for registration, count only failed logins for the per-email limit, and add a CAPTCHA (Cloudflare Turnstile) on register and login.

---

## MEDIUM

- **M1. The seed in `001_init.sql` creates both cycles as `open` with invented dates** (1 Sep to 31 Dec 2026). Despite the report, the portal would accept submissions as soon as the SQL runs. For production, run the block at the bottom of `005_lockdown.sql`.
- **M2. No status-transition rules in the decision route.** An admin can accept a draft that was never submitted, or flip rejected to accepted. Reviewers can record a recommendation on any application, with no department scoping. Add an allowed-transitions table and record the reviewer's department.
- **M3. Change-password.** It does not require the current password (the field is accepted and ignored). If Supabase's own `updateUser` refuses (for example because MFA is enrolled and the session is only aal1), the code falls back to the admin API, which bypasses that protection. It also does not sign out other sessions. Require the current password for voluntary changes, remove the admin-API fallback, and call `signOut({ scope: 'others' })`.
- **M4. Reset-MFA** re-checks the admin's password with the cookie client, which creates a new aal1 session over the admin's aal2 one, so the admin is bounced to the MFA screen. Use a separate non-cookie client for the check, and rate-limit it.
- **M5. Upload route.** It deletes the old file before saving the new one (a failed save loses the student's file). `sharp` has no pixel limit (a small image that expands hugely can exhaust memory); set `limitInputPixels`. The WebP check ignores the `RIFF` header.
- **M6. The ZIP export builds everything in memory** and Vercel limits non-streaming responses to 4.5 MB, so a large export fails. Stream it, or limit each export to a small batch.
- **M7. Consent is not recorded.** The register form requires the box, but nothing stores the timestamp and policy version. Store them in `profiles` (DPDP).
- **M8. `__testSessionOverride` in `getCurrentSession()`** is a global that replaces the real session, protected only by `NODE_ENV`. Remove it from production code and inject it from tests another way.
- **M9. Unconfirmed accounts get the same "Invalid email or password"** as a wrong password, so students who have not clicked the email link are stuck. Add a "resend confirmation email" option on the login page.
- **M10. Submit.** The "email confirmed" check falls back to confirmed if the user lookup returns nothing (fail open). The third submission overwrites `final-v2.pdf` instead of keeping history. All nine file kinds are required for every scholarship, which may not match the SSKA enclosures list in the college's Word file.

## LOW
- Many routes read the IP from the raw `x-forwarded-for` instead of the shared `getClientIp()` helper (audit log accuracy).
- The origin guard allows `localhost` origins in production.
- The cron route compares its secret with `!==` (use a timing-safe compare).
- The notification fallback prints the whole email, including address and phone number, into the logs; log only the event type and reference.
- CSP still allows `'unsafe-inline'` scripts (accepted for now).

## What is good
No committed secrets; private storage bucket; append-only audit log (trigger plus TRUNCATE block); file kind allow-list and magic-byte checks; server-generated storage paths; EXIF stripping; CSV formula protection; rate limiter fails closed for login and register; file downloads check ownership and are audited; staff idle timeout and aal2 checks exist on admin routes and the file and application routes; security headers and a production CSP without `unsafe-eval`; the deadline is checked in the API and by a database trigger.

## Why the tests did not catch C1 and C2
The 98 tests call your route handlers and helper functions. They never call Supabase's REST API directly with a student's token, which is how an attacker would attack C1, C2 and C3. Add tests that do exactly that.

## Order to fix
1. Run `005_lockdown.sql` now and verify with its check queries.
2. Phase 2e prompt (in `Phase2e_Prompt.md`): C-level tests, H1 to H5, M1 to M4.
3. Then Phase 3 (privacy pages, real email, admin extras, CI, docs) and the remaining Medium and Low items.

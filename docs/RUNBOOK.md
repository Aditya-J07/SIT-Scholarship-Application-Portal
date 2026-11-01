# SIT Scholarship Portal - Operational Runbook

This document defines standard operating procedures (SOPs), administrative workflows, incident recovery playbooks, and security protocols for system administrators of the **Siddaganga Institute of Technology Scholarship Portal**.

---

## 1. Staff Account & Role Management

### 1.1 Provisioning New Reviewers or Administrators
1. Only an existing Administrator at **AAL2 (TOTP verified)** can create or promote staff.
2. Navigate to **Admin Portal → Staff Management (`/admin/users`)**.
3. Click **Add New Staff Member**:
   - Enter institutional email (`@sit.ac.in` domain required).
   - Enter full name and employee/faculty designation.
   - Select role: `reviewer` or `admin`.
   - **For Reviewers:** Specify assigned departments (e.g. `['Computer Science and Engineering', 'Mechanical Engineering']`). Leave empty only for institute-level roving reviewers.
4. The system sends an email invitation with a secure, one-time enrollment link.
5. On initial login, the staff member is required to configure Authenticator (TOTP) MFA before receiving access to administrative screens.

### 1.2 Deprovisioning / Offboarding Staff
1. In `/admin/users`, locate the departing faculty or staff member.
2. Select **Deactivate Account** or change their role to `student`.
3. The server immediately invalidates existing active sessions and revokes AAL2 permissions.
4. An immutable audit record (`DEACTIVATE_USER`) is recorded.

---

## 2. MFA Incident Response & Admin Recovery

### 2.1 Standard Procedure: Faculty / Reviewer Lost MFA Device
1. The affected staff member reports to an institutional Administrator.
2. The Administrator navigates to **Admin → Users** and selects the user.
3. Click **Reset MFA Factors**.
4. The acting administrator enters their own password to confirm authorization.
5. The user's enrolled TOTP factor is deleted from Supabase Auth.
6. The user can now log in with their password and scan a new QR code to re-enroll their TOTP factor.

### 2.2 Emergency Playbook: "Last Administrator Locked Out"
If all administrators have lost their credentials, devices, or access:
1. Log into the official [Supabase Management Console](https://supabase.com/dashboard) using institutional master credentials.
2. Select the SIT Scholarship project in **AWS Mumbai (`ap-south-1`)**.
3. Navigate to **Authentication → Users**.
4. Locate the administrator's account:
   - Click user details → **Multi-Factor Authentication** → Delete active TOTP factor.
   - Alternatively, trigger a Password Reset link.
5. If the account is completely inaccessible, run the secure console bootstrap script:
   ```bash
   npx tsx scripts/create-admin.ts
   ```
   Follow the interactive masked prompts to provision an emergency administrator.

---

## 3. Cryptographic Key Management & Rotation

### 3.1 Encryption Key Safety (CRITICAL)
- **Zero Loss Tolerance:** Student bank details are encrypted using AES-256-GCM via `ENCRYPTION_KEY`. If this key is lost, bank account data cannot be decrypted by any party.
- **Storage Policy:** The production `ENCRYPTION_KEY` and `HASH_KEY` must be stored in the institutional enterprise password manager with dual-custody access.

### 3.2 Key Rotation Procedure (Zero Downtime)
When rotating `ENCRYPTION_KEY` annually or following a suspected credential leak:
1. Generate a new 32-byte cryptographically random hex/base64 key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update environment configuration:
   - Set `ENCRYPTION_KEY_PREVIOUS` to the old active key.
   - Set `ENCRYPTION_KEY` to the newly generated key.
3. Restart/redeploy the application service so both keys are loaded.
4. Execute the automated re-encryption migration script:
   ```bash
   npx tsx scripts/rotate-encryption-key.ts
   ```
5. The script decrypts each record with `ENCRYPTION_KEY_PREVIOUS` and re-encrypts it under `ENCRYPTION_KEY`.
6. Once the script reports 100% completion, remove `ENCRYPTION_KEY_PREVIOUS` from environment settings.

---

## 4. Academic Cycle Operations

### 4.1 Opening an Application Cycle
1. Navigate to **Admin → Scholarships & Cycles (`/admin/scholarships`)**.
2. Select the scholarship (e.g. `MNC` or `SSKA`).
3. Set the Academic Year label (e.g. `2026-2027`).
4. Enter opening timestamp (`opens_at`) and closing timestamp (`closes_at`).
   - **Validation Enforcement:** `closes_at` must be strictly after `opens_at`. Setting a cycle to `open` with NULL or inverted dates is rejected by the API.
5. Set status to `open` and save.
6. The portal homepage will immediately display "Accepting Applications" for that scholarship.

### 4.2 Closing a Cycle & Managing Grace Periods
1. When the deadline passes, the database triggers prevent students from submitting new applications.
2. If an administrative grace period is approved for students under `needs_correction`:
   - Administrators can extend `closes_at` by updating cycle settings, or
   - Reviewers can evaluate existing submitted applications without changing cycle dates.
3. Once scrutiny is finalized, change cycle status to `closed`.

---

## 5. Data Retention & DPDP Purge Procedures

Under Section 8(7) of the DPDP Act 2023 and SIT institutional policy, student application data is retained for **7 academic years** for audit and statutory scholarship compliance, after which data must be erased.

### 5.1 Dry Run (Inspection)
To inspect records eligible for deletion without deleting anything:
```bash
npx tsx scripts/purge-old-cycle-data.ts --dry-run
```
The script outputs:
- Target cycles older than 7 years (`RETENTION_YEARS=7`)
- Total application count and associated storage files
- Zero personal information printed to console

### 5.2 Executing Data Purge
1. Confirm a current database backup exists (see Section 6).
2. Execute the purge command with explicit institutional confirmation:
   ```bash
   npx tsx scripts/purge-old-cycle-data.ts --confirm
   ```
3. The script:
   - Deletes supporting documents and PDFs from Supabase Storage buckets.
   - Deletes application rows, file records, and audit links.
   - Emits an administrative audit event recording the purge summary.

---

## 6. Backups & Disaster Recovery

### 6.1 Supabase Point-in-Time Recovery (PITR)
- **Region:** AWS Asia Pacific (Mumbai) `ap-south-1`.
- **Automated Daily Backups:** Retained for 30 days automatically by Supabase Pro.
- **Physical PITR:** Point-in-time recovery to any second within the retention window.

### 6.2 Manual Database Dump (Pre-Maintenance)
Prior to executing major schema migrations or data purges:
```bash
# Using Supabase CLI
supabase db dump -f sit_portal_backup_$(date +%Y%m%d).sql --project-ref <PROJECT_REF>
```
Store the encrypted dump on secure institutional offline storage.

---

## 7. Incident Troubleshooting Playbook

### Problem: Student Receives "409 Conflict: Application Modified Elsewhere"
- **Cause:** Optimistic concurrency control detected mismatched `last_updated_at`. This occurs if the student has multiple tabs open or network lag caused an out-of-order save.
- **Solution:** Instruct student to refresh their page. The portal will load the most recent auto-saved draft from the database.

### Problem: Faculty Reviewer Cannot See Applications from Another Department
- **Cause:** Reviewer departmental scoping is functioning correctly. Reviewers assigned to Department X are blocked from Department Y to uphold DPDP data minimization principles.
- **Solution:** If the reviewer was officially assigned to review multiple departments, an Administrator must update their `reviewer_departments` in `/admin/users`.

### Problem: Outbound Notification Emails Failing
- **Cause:** SMTP relay credentials invalid, campus firewall blocking port 587, or daily relay quota reached.
- **Action:** Check `SMTP_HOST`, `SMTP_PORT`, and `SMTP_USER` in server environment. Verify outbound connectivity from Vercel / server to the campus SMTP host.

# DPDP Act 2023 Compliance & Data Protection Policy

This document outlines the privacy governance model, data handling architecture, and compliance measures implemented within the **SIT Scholarship Application Portal** under India's **Digital Personal Data Protection (DPDP) Act, 2023**.

---

## 1. Institutional Data Fiduciary Overview

- **Data Fiduciary:** Siddaganga Institute of Technology (SIT), B.H. Road, Tumkur, Karnataka – 572103, India.
- **Data Protection / Grievance Redressal Officer:**
  - **Designation:** Dean / Nodal Officer, Scholarships <!-- TODO [COLLEGE DECISION REQUIRED: Designate official name & office] -->
  - **Email:** `TODO_DPO_CONTACT` / `TODO_SCHOLARSHIP_CONTACT` <!-- TODO [COLLEGE DECISION REQUIRED: Confirm official grievance contact] -->
  - **Address:** Administrative Block, SIT Campus, Tumkur – 572103
- **Primary Beneficiaries (Data Principals):** Students enrolled at SIT and their parent/guardian sponsors.

---

## 2. Personal Data Inventory & Purpose Specification

In accordance with Section 4 and Section 6 of the DPDP Act 2023, data collected by the portal is limited strictly to what is necessary for scholarship administration.

| Data Category | Specific Data Attributes | Purpose of Processing | Lawful Basis |
| :--- | :--- | :--- | :--- |
| **Identity & Contact** | Full Name, USN, Date of Birth, Gender, Mobile Number, Institutional Email, Address, Pincode | Student identification, quota eligibility, notification of status | Consent (Sec 6) |
| **Academic Records** | 10+2 / Diploma Marks, Gross Total, Percentage, Present Course, Semester, CGPA, Backlog History, Admission Quota (CET vs Non-CET) | Verification of academic standing, hard rule qualification, merit ranking calculation | Consent (Sec 6) / Legitimate Use |
| **Financial & Family Data** | Parent/Guardian Name & Occupation, Annual Family Income, Income Certificate Issue Date | Verification of economic need criteria (e.g. MNC income ceiling <= Rs. 3,00,000) | Consent (Sec 6) |
| **Sensitive Financial Data** | Student Savings Bank Account Number, Bank Name, Branch, IFSC Code | Direct Benefit Transfer (DBT) / scholarship award disbursement | Explicit Consent (AES-256-GCM encrypted) |
| **Supporting Documents** | Passport Photo, Student Signature, Parent Signature, Marks Cards, Income Certificate, CET Allotment Order, Fee Receipt | Scrutiny and verification of claims by faculty committee | Consent (Sec 6) |
| **System & Security Data** | IP Address, User Agent, Session Timestamps, Audit Actions | Fraud prevention, rate limiting, and immutable security audit logs | Legal & Security Compliance |

---

## 3. Consent Architecture & Versioning

### 3.1 Affirmative Consent & Version Tracking
- Consent is captured through unambiguous affirmative action (checkbox and explicit modal acknowledgment).
- The portal tracks consent versioning using `PRIVACY_VERSION = '2026-1'`.
- Whenever the college privacy policy or data handling terms are updated, the version string is incremented. Users are automatically prompted to review and re-accept the updated terms before submitting or modifying applications.

### 3.2 Processing Minors' Personal Data (Section 9)
Under Section 9 of the DPDP Act 2023, processing personal data of an individual below 18 years of age requires verifiable parental or lawful guardian consent.
1. The portal dynamically calculates age from Date of Birth (`isApplicantMinor`).
2. If the student is under 18 years on the date of application:
   - The wizard unlocks a mandatory **Parent / Legal Guardian Consent Declaration** block.
   - The student must input the Parent/Guardian Full Name and confirm legal authorization.
   - The parent/guardian must provide a digital signature (`sig_parent`).
   - The server enforces `REQUIRE_GUARDIAN_CONSENT_FOR_MINORS` validation before accepting submission.

---

## 4. Data Principal Rights & Institutional Workflows

The portal provides automated and audited workflows for students to exercise their statutory rights:

### 4.1 Right to Access Information (Section 11)
- Students can view their complete application data, status timeline, and committee remarks anytime from their dashboard (`/dashboard` and `/applications/[id]`).
- A full **PDF Summary** sealed with an authentic SHA-256 checksum is available for immediate download.
- Students can export a complete machine-readable copy of their personal data (`JSON format`) directly from `/profile`.

### 4.2 Right to Correction & Erasure (Section 12)
- **Draft Stage:** Students possess unrestricted rights to modify, correct, or discard draft applications.
- **Submitted Stage:** If an error is identified after submission, students can submit a formal **Data Correction or Erasure Request** via `/profile/data-requests`.
- **Review Workflow:** Requests appear in the administrative dashboard (`/admin/data-requests`). Administrators can:
  - Approve a correction and reopen the application into `needs_correction` status.
  - Approve a withdrawal or erasure request with an audited rationale.
  - Reject frivolous requests with written justification provided to the student.

---

## 5. Data Retention & Erasure Policy (Section 8)

### 5.1 Retention Schedule
Scholarship records are institutional financial records subject to Comptroller and Auditor General (CAG) inspection and state education audits.
- **Statutory Retention Period:** Application records, financial proofs, and committee minutes are retained for **7 academic years** (`RETENTION_YEARS=7`).
- **Drafts & Unsubmitted Incomplete Records:** Purged 90 days after cycle closure.

### 5.2 Secure Purge Runbook
Once the 7-year retention period elapses, data is permanently erased using the zero-PII purge automation script:
```bash
# Dry run to verify eligible records
npx tsx scripts/purge-old-cycle-data.ts --dry-run

# Execute certified erasure
npx tsx scripts/purge-old-cycle-data.ts --confirm
```
The script completely purges:
1. Associated physical files and PDFs from Supabase Storage buckets.
2. Application data records and remarks from PostgreSQL tables.
3. Records a certified audit event of the purge action.

---

## 6. Technical & Organizational Measures (TOMs)

- **Field-Level Authenticated Encryption:** AES-256-GCM encryption of bank account details with rotation support (`scripts/rotate-encryption-key.ts`).
- **Blind Hashing (Zero-Decryption Duplicate Detection):** HMAC-SHA256 blind hashing (`bank_acc_hash`) detects shared or duplicate accounts across applications without decrypting student account numbers.
- **Role-Based Masking:** Reviewers only ever view truncated account digits (e.g. `XXXX1234`). Only verified admins with logged audit justification can decrypt full account details.
- **Departmental Data Scoping:** Faculty reviewers are restricted strictly to students enrolled in their assigned academic departments, preventing lateral data browsing.
- **Zero-PII Logging Standard:** System logs strictly forbid recording passwords, account numbers, emails, phone numbers, or student names.
- **AAL2 Multi-Factor Authentication:** TOTP MFA is mandatory for all administrative and review staff.

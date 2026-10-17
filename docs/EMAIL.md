# Email Architecture & Configuration Guide

This document outlines the email delivery architecture for the SIT Scholarship Application Portal, covering both **Supabase Auth Emails** and **Application Lifecycle Notifications**, domain authentication (SPF/DKIM), template customization, and privacy rules.

---

## 1. System Overview

Email communication is separated into two channels:

| Email Category | Service Provider | Delivery Mechanism | Triggers |
| :--- | :--- | :--- | :--- |
| **Auth Emails** | Supabase Auth Service | Supabase Built-in Custom SMTP | Registration confirmation, Password reset, Staff invitation |
| **Application Notifications** | Next.js Server (`src/lib/email`) | Nodemailer SMTP (`SMTP_HOST`, `SMTP_PORT`, etc.) | Submitted, Correction requested, Shortlisted, Accepted, Rejected, Withdrawn, Deadline reminder |

---

## 2. Configuring Custom SMTP in Supabase Dashboard

By default, Supabase sends auth emails via a shared default service with strict rate limits (30 emails/hour). For production, custom SMTP must be configured:

1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Select the SIT Scholarship production project (Region: Mumbai `ap-south-1`).
3. Navigate to **Project Settings** (gear icon) > **Authentication**.
4. Scroll to **SMTP Settings** and toggle **Enable Custom SMTP** on.
5. Enter the SMTP server credentials:
   - **Sender email**: `scholarships@sit.ac.in` (or college-approved sender `TODO [COLLEGE DECISION REQUIRED]`)
   - **Sender name**: `SIT Scholarship Portal`
   - **Host**: Your institutional or cloud SMTP host (e.g., `smtp.office365.com`, `smtp.gmail.com`, or Amazon SES Mumbai `email-smtp.ap-south-1.amazonaws.com`)
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Username**: SMTP username
   - **Password**: Secure SMTP app password / IAM credential
6. Click **Save Changes** and send a test email.

---

## 3. DNS Authentication: SPF, DKIM, and DMARC for `@sit.ac.in`

To ensure emails reach student inboxes and are not rejected or flagged as spam/phishing by services like Gmail, Outlook, and Yahoo, the SIT IT network administrator must configure the following DNS records on the `sit.ac.in` domain:

### A. Sender Policy Framework (SPF)
SPF specifies which mail servers are authorized to send email on behalf of `@sit.ac.in`.
- **DNS Record Type**: `TXT`
- **Host**: `@` (or `sit.ac.in`)
- **Value**:
  ```text
  v=spf1 include:_spf.your-smtp-provider.com ~all
  ```
  *(If an existing SPF record exists on `sit.ac.in`, add the `include:` directive to the existing string before the `~all` or `-all`).*

### B. DomainKeys Identified Mail (DKIM)
DKIM provides cryptographic signature verification confirming that the email content was not altered in transit.
- Obtain the DKIM public key selectors from your SMTP provider.
- **DNS Record Type**: `CNAME` or `TXT`
- **Host**: `<selector>._domainkey.sit.ac.in`
- **Value**: Provided by the mail provider (e.g., `selector.domainkey.your-smtp-provider.com`)

### C. DMARC (Domain-based Message Authentication, Reporting, and Conformance)
DMARC ties SPF and DKIM together to protect the domain from unauthorized spoofing.
- **DNS Record Type**: `TXT`
- **Host**: `_dmarc.sit.ac.in`
- **Value**:
  ```text
  v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@sit.ac.in; pct=100
  ```

---

## 4. Supabase Auth Templates to Customise

In **Supabase Dashboard > Authentication > Email Templates**, customize the following templates to match the minimal government aesthetic (English + Kannada):

1. **Confirm Sign Up**: Sent when a student registers.
   - Subject: `Verify your SIT Scholarship Portal Account`
   - Content: Verification link with instructions and expiry time.
2. **Reset Password**: Sent when requesting password reset.
   - Subject: `Password Reset Request - SIT Scholarship Portal`
   - Content: One-time reset link valid for 15 minutes.
3. **Invite User**: Sent when an admin invites a reviewer or staff member.
   - Subject: `Staff Invitation - SIT Scholarship Portal`
   - Content: Setup link requiring MFA activation.

---

## 5. Application Notification Architecture (`src/lib/email`)

Application lifecycle emails are dispatched by the Next.js server using `src/lib/email/client.ts`.

### Supported Event Types
- `submitted`: Confirmation of application submission with reference number.
- `correction_requested`: Committee feedback specifying required corrections.
- `shortlisted`: Notification of shortlisting for interview/document verification.
- `accepted`: Formal notification of scholarship award.
- `rejected`: Decision notification regarding non-selection.
- `withdrawn`: Confirmation that student voluntarily withdrew their application.
- `deadline_reminder`: Notice regarding impending submission cutoff dates.

### Templates
All templates are located in `src/lib/email/templates/`:
- Formatted in plain text and clean, accessible HTML (no tracking pixels, responsive, inline styles).
- Bilingual: English text alongside Kannada machine-drafted text (marked with `TODO: review by college`).

---

## 6. Privacy & Zero-PII Logging Rule

In strict accordance with the project security guidelines and the DPDP Act 2023:
1. **Never Log Sensitive Data**: Logs must NEVER print, log, or commit student email addresses, full names, mobile numbers, bank details, or email message bodies.
2. **Permitted Log Information**: Logs may contain event types and reference numbers only:
   ```text
   [NOTIFICATION_SENT] Type: submitted | Ref: SIT/2026/0001
   [NOTIFICATION_SKIPPED] Type: correction_requested | Ref: SIT/2026/0002
   [NOTIFICATION_FAILED] Type: accepted | Ref: SIT/2026/0003
   [NOTIFICATION_ERROR] Type: shortlisted | Ref: SIT/2026/0004
   ```
3. **Subject Privacy**: Subject lines contain ONLY the reference number and scholarship name (e.g., `Application Update: SIT/2026/0001 - MNC`). Never include student names, email addresses, or reason details in the subject.
4. **Failure Handling**:
   - **Development**: When SMTP credentials are omitted, a warning is logged (`[NOTIFICATION_SKIPPED]`) and execution continues.
   - **Production**: When SMTP credentials are missing or fail, a sanitized error is logged (`[NOTIFICATION_FAILED]`), and the primary API transaction still succeeds so students are never blocked by email provider outages.

# Monitoring, Error Tracking & Privacy Safeguards

## 1. Architectural Choice & Rationale

### Choice Made: Runtime SDK Omitted (Documentation & Scrubbing Provided)
For the SIT Scholarship Application Portal, we explicitly chose **NOT to install the third-party Sentry runtime SDK (`@sentry/nextjs`) in `package.json`**.

### Rationale
1. **Zero-PII Compliance & DPDP Act 2023:** Student scholarship data includes sensitive financial records (bank accounts, family income) and personal identification. Embedding third-party telemetry SDKs risks accidental data egress to offshore cloud telemetry collectors.
2. **Bundle Size & Client Performance:** Keeping the application lean ensures fast load times on student mobile devices across low-bandwidth 3G/4G connections.
3. **Institutional Sovereignty:** SIT IT policies favor self-hosted or strictly controlled campus monitoring solutions over commercial SaaS aggregators.

---

## 2. Step-by-Step Setup Guide (If College Enables Sentry)

If the SIT Technical Committee decides to enable error monitoring via an institutional Sentry organization (or self-hosted [GlitchTip](https://glitchtip.com/)), follow these step-by-step instructions.

### Step 1: Install Sentry SDK
```bash
npm install @sentry/nextjs
```

### Step 2: Environment Variables
Add to your production environment configuration (never commit secrets):
```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_AUTH_TOKEN=sntrys_...
```

### Step 3: Client-Side Configuration (`sentry.client.config.ts`)
Create `sentry.client.config.ts` in the repository root. **You MUST include the mandatory PII scrubber below:**

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  
  // CRITICAL: Disable automated PII harvesting
  sendDefaultPii: false,

  beforeSend(event) {
    // 1. Scrub User Identification
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }

    // 2. Scrub Breadcrumb Inputs & URL Query Strings
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((crumb) => {
        if (crumb.category === 'ui.input' || crumb.category === 'xhr' || crumb.category === 'fetch') {
          if (crumb.data) {
            delete crumb.data.value;
            delete crumb.data.body;
          }
        }
        return crumb;
      });
    }

    // 3. Scrub Request Data if present
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.data;
    }

    return event;
  },
});
```

### Step 4: Server-Side Configuration (`sentry.server.config.ts`)
Create `sentry.server.config.ts` in the repository root:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,

  beforeSend(event) {
    // Scrub request bodies, authorization headers, cookies
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-forwarded-for'];
      }
    }

    // Strip student email or identifier from exception messages
    if (event.exception?.values) {
      for (const val of event.exception.values) {
        if (val.value) {
          // Mask 16-digit bank accounts
          val.value = val.value.replace(/\b\d{9,18}\b/g, '[REDACTED_ACCOUNT]');
          // Mask 10-digit phone numbers
          val.value = val.value.replace(/\b[6-9]\d{9}\b/g, '[REDACTED_PHONE]');
          // Mask email addresses
          val.value = val.value.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
        }
      }
    }

    return event;
  },
});
```

---

## 3. Recommended Self-Hosted Alternative: GlitchTip or Grafana

For complete institutional data sovereignty, the college can deploy **GlitchTip** on campus hardware or an AWS Mumbai EC2 instance:
1. GlitchTip is an open-source, Sentry-compatible backend.
2. Direct all client and server DSNs to `https://glitchtip.sit.ac.in`.
3. All telemetry data remains on college-controlled servers located in India, fulfilling DPDP local processing preferences.

---

## 4. Infrastructure Health Monitoring

The portal includes built-in operational observability:

### 4.1 Automated Rate Limit & DB Health
- The `/api/cron/cleanup-rate-limits` endpoint runs via a scheduled cron job to purge expired rate limit counters and test database responsiveness.
- It requires the `CRON_SECRET` authorization header.

### 4.2 Supabase Dashboard Metrics (Mumbai `ap-south-1`)
Administrators should monitor the following metrics in the Supabase Dashboard:
1. **Connection Pooling (PgBouncer):** Ensure pool utilization remains under 80% during peak application deadlines.
2. **Database Disk IOPS & CPU:** Normal operating load is < 15% CPU.
3. **Storage Bucket Egress:** Monitor private bucket downloads to identify unusual bulk scraping attempts.

### 4.3 Uptime Monitoring
Configure an external HTTPS uptime probe (e.g. Better Uptime or UptimeRobot) pinging:
- **Target URL:** `https://scholarships.sit.ac.in/api/auth/session`
- **Expected Status:** HTTP 200
- **Alert Recipients:** SIT Systems Administrator <!-- TODO [COLLEGE DECISION REQUIRED: Designate on-call mobile/email] -->

# SIT Scholarship Application Portal
**Siddaganga Institute of Technology (SIT), Tumakuru – 572103**  
*Autonomous Institution under Visvesvaraya Technological University (VTU), Belagavi*

---

## 1. Overview

The **SIT Scholarship Application Portal** is an official, fast, minimal, government-style web platform designed to eliminate paper handwriting on scholarship forms and automate eligibility verification, merit ranking, document archiving, and PDF generation.

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
   - Configured in the data model and marked **inactive** pending official committee form circular.

---

## 2. Key Features

- **Government-Style Aesthetic:** Minimalist light-only UI adhering to institutional standards with a tri-color header ribbon (`#FF9933`, `#FFFFFF`, `#138808`), official SIT brand maroon (`rgb(172, 61, 71)` / `#AC3D47`), and grey section bars (`#EEF1F6`). Square corners, 1px borders, base 16px font, WCAG 2.1 AA accessible, and mobile responsive (360px+).
- **Multi-Step Form Wizard:** Progress tracker, auto-save as draft, maximum ~6 fields per screen, auto-uppercasing, and field normalization.
- **Instant IFSC Auto-Lookup:** Auto-fills bank name, branch address, and city using IFSC lookup with manual entry fallback.
- **Live Eligibility Feedback Panel:** Real-time feedback identifying hard rule blocking failures vs. advisory warnings before submission.
- **Server-Side Official PDF Generator:** Produces print-ready A4 PDFs matching the exact layout of the official college form from the docx specification, including photo, signatures, certification line, and a verification QR code.
- **Public QR Code Verification:** Public endpoint `/verify/[ref_no]` allowing college staff to verify physical printouts without exposing sensitive student personal data (DPDP Act 2023 compliant).
- **Admin & Scrutiny Portal:**
  - Overview dashboard with submission counts and cycle statuses.
  - Candidate table with server-side filtering, sorting (merit score, income, date), search, and flag chips (e.g. *Income > 3L*, *Backlog*, *Hard Copy Received*).
  - Merit Ranking and Top 10 Selection Helper for MNC Endowment interviews and committee tie-breaks.
  - Reviewer workflow (HoD/Proctor recommendation) and Admin decision buttons (Accept, Reject with mandatory reason, Request Correction, Shortlist).
  - Bulk actions: Export CSV reports and ZIP archive of all generated PDFs.
  - Dynamic scholarship rules, income limits, and application window cycles editor.
  - Immutable chronological audit trail.

---

## 3. Demo Accounts & Credentials

For testing and demonstration, pre-seeded accounts are available on the login page:

| Role | Email | Password | Access / Purpose |
|---|---|---|---|
| **Student** | `student@sit.ac.in` | `Student@123` | Apply online, save drafts, upload documents, track status, download PDF |
| **Reviewer (HoD/Proctor)** | `reviewer@sit.ac.in` | `Reviewer@123` | Review applications, add internal remarks, mark *Recommended* / *Not Recommended* |
| **Admin (Accounts / Committee)** | `admin@sit.ac.in` | `Admin@123` | Scrutiny dashboard, Accept/Reject, Merit selection helper, manage scholarships, export CSV/ZIP |

*Quick-fill demo buttons are provided on the login page (`/login`) for convenience.*

---

## 4. Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Vanilla Tailwind CSS (Institutional government palette)
- **Validation:** Zod schemas shared between browser and server
- **Forms & Signatures:** HTML5 Canvas SignaturePad + image upload fallback
- **PDF Generation:** Server-side `pdf-lib` + `qrcode`
- **Database & Storage:** Atomic file-persisted repository in `.data/` + complete PostgreSQL RLS schema in `supabase/schema.sql`

---

## 5. Getting Started & Local Development

### Prerequisites
- Node.js v20+ or v24+
- npm v10+

### Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Run unit and integration tests (27/27 automated checks)
npm test

# 3. Build production bundle
npm run build

# 4. Start production server
npm start
```

The portal will be active at: **`http://localhost:3000`**

---

## 6. Route Sitemap

### Public Routes
- `/`: Home page (announcements, scholarship list, deadlines, apply buttons)
- `/scholarships/[code]`: Detailed guidelines and rules for specific scholarships (`MNC`, `SSKA`)
- `/login`: Student and staff authentication
- `/register`: Student registration with DPDP Act 2023 consent checkbox
- `/forgot-password`: Official password assistance instructions
- `/verify/[ref_no]`: Public QR code verification endpoint

### Student Portal (Login Required)
- `/dashboard`: Applications overview, statuses, draft resumption, and PDF downloads
- `/apply/[code]`: 7-Step form wizard with live eligibility checker and auto-save
- `/applications/[id]`: Application detail view, status timeline, PDF viewer, remarks thread, and withdrawal
- `/profile`: Reusable profile and savings bank details for multi-year pre-filling

### Admin & Scrutiny Portal (Role Required)
- `/admin`: Overview metrics, status counts, recent candidate submissions
- `/admin/applications`: Applications scrutiny table with filters, search, and CSV/ZIP exports
- `/admin/applications/[id]`: Full candidate detail view, document previews, PDF preview, and decision actions
- `/admin/merit`: Merit ranking and Top 10 interview selection helper by year of study
- `/admin/scholarships`: Scholarship parameters, rules (JSON), and cycle windows editor
- `/admin/users`: Reviewer and Administrator account management
- `/admin/audit`: Immutable compliance audit trail

---

## 7. Cloud Deployment (Supabase & Vercel)

1. **Database:** Execute `supabase/schema.sql` inside the Supabase SQL Editor. This initializes all tables, indexes, Row Level Security (RLS) policies, and seed data.
2. **Storage:** Create a private bucket named `scholarship_files`.
3. **Environment Variables:**
   ```env
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
   JWT_SECRET=your-random-32-character-secret
   # Optional Supabase credentials:
   # NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   # SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. **Deploy:** Deploy directly to Vercel (recommended region: Mumbai `ap-south-1`).

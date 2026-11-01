import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import crypto from "crypto";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

// Configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SUPABASE_URL = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const SUPABASE_KEY = process.env.TEST_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY || "placeholder-secret-key-for-testing";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Cookie Jar for session management
class CookieJar {
  private cookies = new Map<string, string>();

  updateFromHeaders(headers: Headers) {
    const rawCookies = (headers as any).getSetCookie?.() || [];
    for (const c of rawCookies) {
      const match = c.match(/^([^=;]+)=([^;]*)/);
      if (match) {
        this.cookies.set(match[1].trim(), match[2].trim());
      }
    }
    const singleCookie = headers.get("set-cookie");
    if (singleCookie && rawCookies.length === 0) {
      const parts = singleCookie.split(/,\s*(?=[a-zA-Z0-9_\-]+=[^;]+)/);
      for (const p of parts) {
        const match = p.match(/^([^=;]+)=([^;]*)/);
        if (match) {
          this.cookies.set(match[1].trim(), match[2].trim());
        }
      }
    }
  }

  getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  clear() {
    this.cookies.clear();
  }
}

function generateTotp(base32Secret: string): string {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < base32Secret.length; i++) {
    const val = base32chars.indexOf(base32Secret.charAt(i).toUpperCase());
    if (val !== -1) bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  const key = Buffer.from(bytes);
  const epoch = Math.floor(Date.now() / 1000);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(Math.floor(epoch / 30)));
  const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, "0");
}

const auditLog: Array<{ step: string; status: "PASS" | "WARN" | "FAIL"; durationMs: number; details: string }> = [];

async function benchmark<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const res = await fn();
    const duration = Date.now() - start;
    auditLog.push({ step: name, status: "PASS", durationMs: duration, details: "Executed successfully" });
    return res;
  } catch (err: any) {
    const duration = Date.now() - start;
    auditLog.push({ step: name, status: "FAIL", durationMs: duration, details: err.message });
    throw err;
  }
}

async function runAudit() {
  console.log("==================================================================");
  console.log("STARTING COMPREHENSIVE END-TO-END PORTAL AUDIT WALKTHROUGH");
  console.log("Target Base URL:", BASE_URL);
  console.log("==================================================================\n");

  const runId = Date.now().toString().slice(-6);
  const studentEmail = `audit.student.${runId}@sit.ac.in`;
  const studentPassword = "StudentSecure@2026!";
  const reviewerEmail = `audit.reviewer.${runId}@sit.ac.in`;
  const adminEmail = `audit.admin.${runId}@sit.ac.in`;
  const adminPassword = "AdminMaster@2026!";

  const studentJar = new CookieJar();
  const reviewerJar = new CookieJar();
  const adminJar = new CookieJar();

  async function studentFetch(endpoint: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set("Cookie", studentJar.getCookieHeader());
    if (init?.method && ["POST", "PATCH", "PUT", "DELETE"].includes(init.method)) {
      if (!headers.has("Origin")) headers.set("Origin", BASE_URL);
    }
    const res = await fetch(`${BASE_URL}${endpoint}`, { ...init, headers });
    studentJar.updateFromHeaders(res.headers);
    return res;
  }

  async function reviewerFetch(endpoint: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set("Cookie", reviewerJar.getCookieHeader());
    if (init?.method && ["POST", "PATCH", "PUT", "DELETE"].includes(init.method)) {
      if (!headers.has("Origin")) headers.set("Origin", BASE_URL);
    }
    const res = await fetch(`${BASE_URL}${endpoint}`, { ...init, headers });
    reviewerJar.updateFromHeaders(res.headers);
    return res;
  }

  async function adminFetch(endpoint: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set("Cookie", adminJar.getCookieHeader());
    if (init?.method && ["POST", "PATCH", "PUT", "DELETE"].includes(init.method)) {
      if (!headers.has("Origin")) headers.set("Origin", BASE_URL);
    }
    const res = await fetch(`${BASE_URL}${endpoint}`, { ...init, headers });
    adminJar.updateFromHeaders(res.headers);
    return res;
  }

  // --------------------------------------------------------------------------
  // STEP 1: Student Registration, Confirmation, and Login
  // --------------------------------------------------------------------------
  console.log("--- 1. Student Registration, Email Confirmation, and Login ---");
  await benchmark("1.1 Student Registration", async () => {
    const res = await studentFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: studentEmail,
        password: studentPassword,
        full_name: "ANANYA SHANKAR HEGDE",
        mobile: "9845012345",
        consent_accepted: true,
        turnstileToken: "1x00000000000000000000AA",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Register failed (${res.status}): ${JSON.stringify(json)}`);
    console.log("  ✓ Student registered successfully:", studentEmail);
  });

  await benchmark("1.2 Email Confirmation via DB", async () => {
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", studentEmail).maybeSingle();
    let userId = prof?.id;
    if (!userId) {
      const { data: users, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw listErr;
      const user = users.users.find((u) => u.email?.toLowerCase() === studentEmail.toLowerCase());
      if (!user) throw new Error(`User not found in Supabase Auth or profiles: ${studentEmail}`);
      userId = user.id;
    }

    const { error: confErr } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (confErr) throw confErr;
    console.log("  ✓ Student email confirmed via admin client (ID:", userId, ")");
  });

  await benchmark("1.3 Student Login", async () => {
    const res = await studentFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: studentEmail,
        password: studentPassword,
        turnstileToken: "1x00000000000000000000AA",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Login failed (${res.status}): ${JSON.stringify(json)}`);
    console.log("  ✓ Student logged in, cookies stored:", studentJar.getCookieHeader().slice(0, 50) + "...");
  });

  await benchmark("1.4 Verify Student Session", async () => {
    const res = await studentFetch("/api/auth/session");
    const json = await res.json();
    if (!res.ok || json.user?.role !== "student") {
      throw new Error(`Session verification failed: ${JSON.stringify(json)}`);
    }
    console.log("  ✓ Verified active session for student:", json.user.fullName || json.user.name);
  });

  // --------------------------------------------------------------------------
  // STEP 2: Application Wizard - Draft Save and Resume across all 7 steps
  // --------------------------------------------------------------------------
  console.log("\n--- 2. Application Wizard: Filling 7 Steps, Draft Save & Resume ---");

  let applicationId = "";
  let currentUpdatedAt = "";

  await benchmark("2.1 Initialize / Fetch Draft Application for MNC", async () => {
    let { data: sch } = await supabase.from("scholarships").select("id, code").eq("code", "MNC").maybeSingle();
    if (!sch) {
      const newId = crypto.randomUUID();
      await supabase.from("scholarships").insert({ id: newId, code: "MNC", name: "Dr. M.N. Channabasappa", active: true });
      sch = { id: newId, code: "MNC" };
    }
    const { data: activeCycle } = await supabase.from("cycles").select("id").eq("scholarship_id", sch.id).eq("status", "open").maybeSingle();
    if (!activeCycle) {
      const newCycleId = crypto.randomUUID();
      await supabase.from("cycles").insert({
        id: newCycleId,
        scholarship_id: sch.id,
        academic_year: "2025-2026",
        status: "open",
        opens_at: "2025-01-01T00:00:00Z",
        closes_at: "2030-01-01T00:00:00Z",
      });
    }

    const res = await studentFetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scholarship_code: "MNC" }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Init draft failed (${res.status}): ${JSON.stringify(json)}`);
    applicationId = json.application.id;
    currentUpdatedAt = json.application.updated_at || json.application.created_at;
    console.log("  ✓ Draft initialized with ID:", applicationId, "| Ref:", json.application.ref_no);
  });

  // Step 1: Personal Details
  await benchmark("2.2 Save Step 1 (Personal Details)", async () => {
    const step1Data = {
      scholarship_code: "MNC",
      full_name: "ANANYA SHANKAR HEGDE",
      usn: "1SI23CS012",
      dob: "2005-06-18",
      nationality: "Indian",
      father_or_guardian_name: "SHANKAR HEGDE",
      address: "Room 302, Kaveri Hostel, SIT Campus, Tumakuru - 572103",
      pincode: "572103",
      mobile: "9845012345",
      email: studentEmail,
    };
    const res = await studentFetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 1,
        stepData: step1Data,
        last_updated_at: currentUpdatedAt,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Step 1 save failed (${res.status}): ${JSON.stringify(json)}`);
    currentUpdatedAt = json.application.updated_at;
    console.log("  ✓ Step 1 saved. Concurrency token updated to:", currentUpdatedAt);
  });

  // Step 2: Family & Income Details
  await benchmark("2.3 Save Step 2 (Family & Income Details)", async () => {
    const step2Data = {
      parent_occupation: "Farmer / Agriculture",
      family_annual_income: 180000,
      income_cert_issue_date: "2025-05-10",
    };
    const res = await studentFetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 2,
        stepData: step2Data,
        last_updated_at: currentUpdatedAt,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Step 2 save failed (${res.status}): ${JSON.stringify(json)}`);
    currentUpdatedAt = json.application.updated_at;
    console.log("  ✓ Step 2 saved (Annual Income:", step2Data.family_annual_income, "INR)");
  });

  // Step 3: Academic Details
  await benchmark("2.4 Save Step 3 (Academic Details)", async () => {
    const step3Data = {
      admitted_through_cet: true,
      last_exam_passed: "1st Year B.E. (Sem 1 & 2)",
      marks_obtained: 540,
      marks_gross_total: 600,
      course: "Computer Science and Engineering",
      year_of_study: 2,
      semester: 3,
      cgpa: 9.1,
      has_backlog_history: false,
      course_duration_years: 4,
      final_exam_month_year: "2027-06",
    };
    const res = await studentFetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 3,
        stepData: step3Data,
        last_updated_at: currentUpdatedAt,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Step 3 save failed (${res.status}): ${JSON.stringify(json)}`);
    currentUpdatedAt = json.application.updated_at;
    console.log("  ✓ Step 3 saved (CGPA:", step3Data.cgpa, "| Marks:", step3Data.marks_obtained, "/", step3Data.marks_gross_total, ")");
  });

  // Step 4: Financial & Requirements
  await benchmark("2.5 Save Step 4 (Financial & Requirements)", async () => {
    const step4Data = {
      annual_fee: 95000,
      applied_earlier: false,
      getting_other_scholarship: false,
      scholarship_amount_required_per_month: 2500,
    };
    const res = await studentFetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 4,
        stepData: step4Data,
        last_updated_at: currentUpdatedAt,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Step 4 save failed (${res.status}): ${JSON.stringify(json)}`);
    currentUpdatedAt = json.application.updated_at;
    console.log("  ✓ Step 4 saved (Required amount / mo:", step4Data.scholarship_amount_required_per_month, "INR)");
  });

  // Step 5: Bank Details
  const studentBankRaw = "987654321098";
  await benchmark("2.6 Save Step 5 (Bank Details)", async () => {
    const step5Data = {
      bank_acc_holder_name: "ANANYA SHANKAR HEGDE",
      bank_acc_no: studentBankRaw,
      confirm_bank_acc_no: studentBankRaw,
      bank_name: "State Bank of India",
      bank_branch: "SIT Campus Branch, Tumakuru",
      bank_ifsc: "SBIN0040523",
    };
    const res = await studentFetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 5,
        stepData: step5Data,
        last_updated_at: currentUpdatedAt,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Step 5 save failed (${res.status}): ${JSON.stringify(json)}`);
    currentUpdatedAt = json.application.updated_at;
    console.log("  ✓ Step 5 saved (Bank encrypted:", json.application.data.bank_acc_no_encrypted ? "YES" : "NO", "| Last4:", json.application.data.bank_acc_last4, ")");
  });

  // Step 6: Document Enclosures Milestone
  await benchmark("2.7 Save Step 6 (Document Enclosures Milestone)", async () => {
    const res = await studentFetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 6,
        stepData: {},
        last_updated_at: currentUpdatedAt,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Step 6 save failed (${res.status}): ${JSON.stringify(json)}`);
    currentUpdatedAt = json.application.updated_at;
    console.log("  ✓ Step 6 milestone saved (Current step:", json.application.current_step, ")");
  });

  // Step 7: Declarations
  await benchmark("2.8 Save Step 7 (Declarations)", async () => {
    const step7Data = {
      declaration_accepted: true,
    };
    const res = await studentFetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 7,
        stepData: step7Data,
        last_updated_at: currentUpdatedAt,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Step 7 save failed (${res.status}): ${JSON.stringify(json)}`);
    currentUpdatedAt = json.application.updated_at;
    console.log("  ✓ Step 7 saved (Declaration accepted: true)");
  });

  // TEST DRAFT RESUME: Simulate student leaving and returning
  await benchmark("2.9 Resume Draft (Reload and Verify Field Integrity)", async () => {
    const res = await studentFetch(`/api/applications/${applicationId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(`Resume draft failed (${res.status}): ${JSON.stringify(json)}`);
    const app = json.application;
    if (app.data.full_name !== "ANANYA SHANKAR HEGDE") throw new Error("Full name not preserved");
    if (app.data.usn !== "1SI23CS012") throw new Error("USN not preserved");
    if (app.data.bank_acc_no !== studentBankRaw) throw new Error("Decrypted bank account mismatch for owner");
    if (app.data.is_masked !== false) throw new Error("Owner should receive is_masked: false");
    console.log("  ✓ Draft resumed successfully. All form values, calculations, and decrypted bank details intact.");
  });

  // Step 6: Upload every document kind
  console.log("\n--- 3. Uploading All Sanctioned Documents ---");
  const docKinds = [
    { kind: "photo", filename: "passport_photo.png", isImage: true },
    { kind: "sig_student", filename: "student_signature.png", isImage: true },
    { kind: "sig_parent", filename: "parent_signature.png", isImage: true },
    { kind: "cet_order", filename: "cet_admission_order.pdf", isPdf: true },
    { kind: "marks_card", filename: "first_year_marks_card.pdf", isPdf: true },
    { kind: "income_cert", filename: "tahsildar_income_cert.pdf", isPdf: true },
    { kind: "aadhaar", filename: "student_aadhaar_card.pdf", isPdf: true },
    { kind: "fee_receipt", filename: "college_fee_receipt.pdf", isPdf: true },
    { kind: "principal_cert", filename: "study_certificate.pdf", isPdf: true },
  ];

  const samplePngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  const samplePdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n182\n%%EOF");

  for (const doc of docKinds) {
    await benchmark(`3. Upload ${doc.kind} (${doc.filename})`, async () => {
      const buffer = doc.isImage ? samplePngBuffer : samplePdfBuffer;
      const mime = doc.isImage ? "image/png" : "application/pdf";
      const blob = new Blob([buffer], { type: mime });
      const form = new FormData();
      form.append("file", blob, doc.filename);
      form.append("kind", doc.kind);

      const res = await studentFetch(`/api/applications/${applicationId}/files`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(`Upload ${doc.kind} failed (${res.status}): ${JSON.stringify(json)}`);
      console.log(`  ✓ Uploaded [${doc.kind}] successfully -> File ID:`, json.file.id);
    });
  }

  // --------------------------------------------------------------------------
  // STEP 4: Application Submission and PDF Generation
  // --------------------------------------------------------------------------
  console.log("\n--- 4. Application Submission and Official PDF Verification ---");
  let submittedRefNo = "";
  await benchmark("4.1 Submit Application", async () => {
    const res = await studentFetch(`/api/applications/${applicationId}/submit`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Submission failed (${res.status}): ${JSON.stringify(json)}`);
    submittedRefNo = json.application.ref_no;
    console.log("  ✓ Application officially submitted!");
    console.log("    - Ref No:     ", json.application.ref_no);
    console.log("    - Status:     ", json.application.status);
    console.log("    - Merit Score:", json.application.merit_score);
    console.log("    - PDF Path:   ", json.application.pdf_path);
  });

  await benchmark("4.2 Verify Idempotent Double-Submission Rejection", async () => {
    const res = await studentFetch(`/api/applications/${applicationId}/submit`, {
      method: "POST",
    });
    if (res.status !== 400) {
      throw new Error(`Expected 400 Bad Request on double submit, got ${res.status}`);
    }
    console.log("  ✓ Double-submission safely rejected with HTTP 400 (Idempotency protected).");
  });

  let downloadedPdfBytes: Uint8Array | null = null;
  await benchmark("4.3 Download Official Application PDF", async () => {
    const res = await studentFetch(`/api/applications/${applicationId}/pdf`);
    if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/pdf")) throw new Error(`Invalid Content-Type: ${contentType}`);
    const arrayBuffer = await res.arrayBuffer();
    downloadedPdfBytes = new Uint8Array(arrayBuffer);
    console.log("  ✓ Downloaded PDF:", downloadedPdfBytes.byteLength, "bytes | Content-Type:", contentType);
  });

  await benchmark("4.4 Inspect & Read PDF Structure via pdf-lib", async () => {
    if (!downloadedPdfBytes) throw new Error("PDF bytes empty");
    const pdfDoc = await PDFDocument.load(downloadedPdfBytes);
    const pageCount = pdfDoc.getPageCount();
    const title = pdfDoc.getTitle();
    const author = pdfDoc.getAuthor();
    const producer = pdfDoc.getProducer();

    console.log("  ✓ PDF Document Structure Verified:");
    console.log("    - Pages:   ", pageCount);
    console.log("    - Title:   ", title);
    console.log("    - Author:  ", author);
    console.log("    - Producer:", producer);

    if (pageCount < 1) throw new Error("Generated PDF has no pages");
    const firstPage = pdfDoc.getPage(0);
    const { width, height } = firstPage.getSize();
    console.log(`    - Page 1 Dimensions: ${width} x ${height} pt (A4: ~595 x 842 pt)`);
  });

  // --------------------------------------------------------------------------
  // STEP 5: Create Reviewer and Admin, Login as Admin, Enrol 2FA (AAL2)
  // --------------------------------------------------------------------------
  console.log("\n--- 5. Staff Accounts Setup (Admin & Reviewer) and Admin 2FA Enrollment ---");

  let adminUserId = "";
  await benchmark("5.1 Create Administrator Account via Bootstrap / Supabase Auth", async () => {
    const { data: userAdm, error: admErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "DR. RAJASHEKHAR (ADMIN)", mobile: "9845099999" },
    });
    if (admErr) throw admErr;
    adminUserId = userAdm.user.id;
    await supabase.from("profiles").upsert({
      id: adminUserId,
      role: "admin",
      full_name: "DR. RAJASHEKHAR (ADMIN)",
      email: adminEmail,
      mobile: "9845099999",
      must_change_password: false,
    });
    console.log("  ✓ Admin account created in Supabase Auth & profiles:", adminEmail);
  });

  await benchmark("5.2 Admin Login", async () => {
    const res = await adminFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        turnstileToken: "1x00000000000000000000AA",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Admin login failed (${res.status}): ${JSON.stringify(json)}`);
    console.log("  ✓ Admin logged in (AAL1 session established).");
  });

  let totpSecret = "";
  let factorId = "";
  await benchmark("5.3 Admin 2FA (TOTP) Enrollment", async () => {
    const res = await adminFetch("/api/auth/mfa/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`MFA enrollment failed (${res.status}): ${JSON.stringify(json)}`);
    totpSecret = json.totp.secret;
    factorId = json.factorId || json.id;
    console.log("  ✓ TOTP Factor Enrolled. Factor ID:", factorId);
    console.log("    - QR Code Data URI provided: ", (json.totp.qrCode || json.totp.qr_code) ? "YES" : "NO");
  });

  await benchmark("5.4 Admin 2FA Verification (Upgrade to AAL2)", async () => {
    const totpCode = generateTotp(totpSecret);
    const res = await adminFetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        factorId,
        code: totpCode,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`MFA verify failed (${res.status}): ${JSON.stringify(json)}`);
    console.log("  ✓ Admin 2FA code verified. Session upgraded to AAL2.");
  });

  await benchmark("5.5 Create Reviewer Account via Admin API (/api/admin/users)", async () => {
    const res = await adminFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: reviewerEmail,
        full_name: "PROF. MANJUNATH (REVIEWER)",
        mobile: "9845088888",
        role: "reviewer",
        department: "CSE",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Create reviewer failed (${res.status}): ${JSON.stringify(json)}`);
    console.log("  ✓ Reviewer invited via email flow with department 'CSE':", reviewerEmail);

    const { data: revProf } = await supabase.from("profiles").select("id").eq("email", reviewerEmail).maybeSingle();
    let revId = revProf?.id;
    if (!revId) {
      const { data: revList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      revId = revList?.users.find((u) => u.email?.toLowerCase() === reviewerEmail.toLowerCase())?.id;
    }
    if (revId) {
      await supabase.auth.admin.updateUserById(revId, {
        password: "ReviewerPass@2026!",
        email_confirm: true,
      });
    }
  });

  await benchmark("5.6 Reviewer Login & Scoping Verification", async () => {
    const res = await reviewerFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: reviewerEmail,
        password: "ReviewerPass@2026!",
        turnstileToken: "1x00000000000000000000AA",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Reviewer login failed (${res.status}): ${JSON.stringify(json)}`);
    console.log("  ✓ Reviewer logged in.");

    // Enrol and verify 2FA for reviewer (required for all staff accounts per security policy)
    const mfaRes = await reviewerFetch("/api/auth/mfa/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const mfaJson = await mfaRes.json();
    if (!mfaRes.ok) throw new Error(`Reviewer MFA enroll failed: ${JSON.stringify(mfaJson)}`);
    const revTotp = generateTotp(mfaJson.totp.secret);
    const verifyRes = await reviewerFetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        factorId: mfaJson.factorId || mfaJson.id,
        code: revTotp,
      }),
    });
    if (!verifyRes.ok) throw new Error(`Reviewer MFA verify failed`);
    console.log("  ✓ Reviewer 2FA enrolled & verified (Session upgraded to AAL2).");

    // Check that Reviewer gets 403 on the application's PDF route (Item 3)
    const pdfRes = await reviewerFetch(`/api/applications/${applicationId}/pdf`);
    if (pdfRes.status !== 403) {
      throw new Error(`Reviewer should get 403 on PDF route, got ${pdfRes.status}`);
    }
    console.log("  ✓ Reviewer calling PDF route strictly blocked with HTTP 403.");

    // Check that Reviewer calling getApplication receives masked bank details (Item 3)
    const appRes = await reviewerFetch(`/api/applications/${applicationId}`);
    const appJson = await appRes.json();
    if (!appRes.ok) {
      throw new Error(`Reviewer get application failed (${appRes.status}): ${JSON.stringify(appJson)}`);
    }
    const appData = appJson.application?.data;
    if (appData.is_masked !== true || !appData.bank_acc_no?.startsWith("XXXX")) {
      throw new Error(`Reviewer bank account not masked properly: ${JSON.stringify(appData)}`);
    }
    console.log("  ✓ Reviewer view masks bank account:", appData.bank_acc_no);
  });

  // --------------------------------------------------------------------------
  // STEP 6: Decision Transitions (Correction Request, Reject, Accept) & Student Timeline
  // --------------------------------------------------------------------------
  console.log("\n--- 6. Decision Lifecycle & Student Timeline Progression ---");

  // A. Request Correction
  await benchmark("6.1 Admin Requests Correction (needs_correction)", async () => {
    const res = await adminFetch(`/api/admin/applications/${applicationId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "needs_correction",
        remark: "Tahsildar income certificate seal is faint. Please upload a clearer scan.",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Needs correction failed (${res.status}): ${JSON.stringify(json)}`);
    console.log("  ✓ Decision updated to 'needs_correction' with student-visible remark.");
  });

  await benchmark("6.2 Check Student Timeline for Active 'needs_correction' Step", async () => {
    const res = await studentFetch(`/api/applications/${applicationId}`);
    const json = await res.json();
    if (!res.ok) throw new Error(`Fetch application failed (${res.status}): ${JSON.stringify(json)}`);
    const timeline = json.timeline || [];
    const needsCorrectionStep = timeline.find((s: any) => s.status === "needs_correction");
    if (!needsCorrectionStep || !needsCorrectionStep.active) {
      throw new Error(`Expected active needs_correction step in timeline: ${JSON.stringify(timeline)}`);
    }
    const studentRemarks = json.remarks || [];
    const remarkFound = studentRemarks.some((r: any) => r.body.includes("Tahsildar income certificate seal is faint"));
    if (!remarkFound) throw new Error(`Correction remark missing from student view: ${JSON.stringify(studentRemarks)}`);
    console.log("  ✓ Student timeline clearly highlights active correction step.");
    console.log("    - Active step:", needsCorrectionStep.label || needsCorrectionStep.status);
    console.log("    - Visible remark displayed to student:", studentRemarks[0].body);
  });

  // B. Student resubmits after correction
  await benchmark("6.3 Student Resubmits Application", async () => {
    const res = await studentFetch(`/api/applications/${applicationId}/submit`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Resubmit failed (${res.status}): ${JSON.stringify(json)}`);
    console.log("  ✓ Student successfully resubmitted application (Status:", json.application.status, ")");
  });

  // C. Admin moves to under_review -> shortlist -> reject -> accept
  await benchmark("6.4 Admin Moves to Under Review", async () => {
    const res = await adminFetch(`/api/admin/applications/${applicationId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "under_review",
        remark: "Documents verified by Academic Section.",
      }),
    });
    if (!res.ok) throw new Error(`Under review failed (${res.status})`);
    console.log("  ✓ Status updated to 'under_review'.");
  });

  await benchmark("6.5 Admin Shortlists Application", async () => {
    const res = await adminFetch(`/api/admin/applications/${applicationId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "shortlist",
        remark: "Meets top-decile merit ranking.",
      }),
    });
    if (!res.ok) throw new Error(`Shortlist failed (${res.status})`);
    console.log("  ✓ Status updated to 'shortlisted'.");
  });

  await benchmark("6.6 Check Student Timeline for 'shortlisted' Completion", async () => {
    const res = await studentFetch(`/api/applications/${applicationId}`);
    const json = await res.json();
    const shortlistedStep = json.timeline?.find((s: any) => s.status === "shortlisted");
    if (!shortlistedStep || !shortlistedStep.completed) {
      throw new Error(`Expected completed shortlisted step in timeline: ${JSON.stringify(json.timeline)}`);
    }
    console.log("  ✓ Student timeline displays completed 'shortlisted' state.");
  });

  await benchmark("6.7 Admin Rejection Test", async () => {
    const res = await adminFetch(`/api/admin/applications/${applicationId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reject",
        remark: "Simulated quota cap rejection for testing lifecycle.",
      }),
    });
    if (!res.ok) throw new Error(`Reject failed (${res.status})`);
    console.log("  ✓ Status updated to 'rejected'.");

    // Check timeline shows rejected
    const stuRes = await studentFetch(`/api/applications/${applicationId}`);
    const stuJson = await stuRes.json();
    const rejStep = stuJson.timeline?.find((s: any) => s.status === "rejected");
    if (!rejStep || !rejStep.active) throw new Error("Timeline did not update to rejected");
    console.log("  ✓ Student timeline clearly shows 'rejected' status.");
  });

  await benchmark("6.8 Admin Acceptance with Audited Override", async () => {
    const res = await adminFetch(`/api/admin/applications/${applicationId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "accept",
        is_override: true,
        override_reason: "Special sanction approved by SIT Academic Senate.",
      }),
    });
    if (!res.ok) throw new Error(`Accept with override failed (${res.status})`);
    console.log("  ✓ Status updated to 'accepted' with audited override.");

    // Check timeline shows accepted
    const stuRes = await studentFetch(`/api/applications/${applicationId}`);
    const stuJson = await stuRes.json();
    const accStep = stuJson.timeline?.find((s: any) => s.status === "accepted");
    if (!accStep || !accStep.completed) throw new Error("Timeline did not update to accepted");
    console.log("  ✓ Student timeline clearly shows 'accepted' status.");
  });

  // --------------------------------------------------------------------------
  // STEP 7: DPDP Data-Correction Request & Admin Resolution
  // --------------------------------------------------------------------------
  console.log("\n--- 7. DPDP Data-Correction Request Lifecycle ---");
  let dataRequestId = "";
  await benchmark("7.1 Student Submits Data-Correction Request", async () => {
    const res = await studentFetch("/api/profile/data-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_type: "correction",
        details: "Please update my residential hostel address to Room 405, Kaveri Block.",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Submit data request failed (${res.status}): ${JSON.stringify(json)}`);
    dataRequestId = json.request?.id || json.dataRequest?.id;
    console.log("  ✓ Data correction request filed -> ID:", dataRequestId);
  });

  await benchmark("7.2 Admin Lists Pending Data Requests", async () => {
    const res = await adminFetch("/api/admin/data-requests");
    const json = await res.json();
    if (!res.ok) throw new Error(`Admin list data requests failed (${res.status})`);
    const found = json.requests?.some((r: any) => r.id === dataRequestId);
    if (!found) throw new Error("Submitted data request not found in admin list");
    console.log("  ✓ Admin retrieved data requests queue. Total pending:", json.requests.length);
  });

  await benchmark("7.3 Admin Resolves Data Request", async () => {
    const res = await adminFetch(`/api/admin/data-requests/${dataRequestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "resolved",
        admin_notes: "Hostel address updated in student records registry.",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Resolve data request failed (${res.status}): ${JSON.stringify(json)}`);
    console.log("  ✓ Data request resolved successfully by admin.");
  });

  // --------------------------------------------------------------------------
  // STEP 8: CSV and ZIP Exports
  // --------------------------------------------------------------------------
  console.log("\n--- 8. Admin Bulk Exports (CSV and ZIP) ---");

  await benchmark("8.1 CSV Export Verification", async () => {
    const res = await adminFetch("/api/admin/export?format=csv");
    if (!res.ok) throw new Error(`CSV export failed (${res.status})`);
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("text/csv")) throw new Error(`Expected text/csv, got ${contentType}`);
    const csvText = await res.text();
    console.log("  ✓ CSV Export received (Length:", csvText.length, "chars | Lines:", csvText.split("\n").length, ")");

    if (!csvText.includes(submittedRefNo)) throw new Error(`CSV does not contain submitted ref ${submittedRefNo}`);
    if (csvText.includes(studentBankRaw)) throw new Error("CSV leaks plain unmasked bank account!");
    if (!csvText.includes("XXXX")) throw new Error("CSV does not mask bank accounts");
    console.log("  ✓ CSV properly masks bank accounts and includes sanitized student record.");
  });

  await benchmark("8.2 ZIP Export Verification", async () => {
    const res = await adminFetch("/api/admin/export?format=zip&page=1");
    if (!res.ok) throw new Error(`ZIP export failed (${res.status})`);
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/zip")) throw new Error(`Expected application/zip, got ${contentType}`);
    const arrayBuffer = await res.arrayBuffer();
    const zipBytes = new Uint8Array(arrayBuffer);
    console.log("  ✓ ZIP Export received (Size:", zipBytes.byteLength, "bytes)");

    const zip = await JSZip.loadAsync(zipBytes);
    const filenames = Object.keys(zip.files);
    console.log("    - Bundled PDF count in ZIP Part 1:", filenames.length);
    console.log("    - Sample filenames:", filenames.slice(0, 3).join(", "));
    const ourPdfFound = filenames.some((f) => f.includes(submittedRefNo));
    if (!ourPdfFound) {
      console.log(`    ℹ Note: Submitted app PDF may be in subsequent page if > 15 PDFs exist (Total: ${filenames.length})`);
    } else {
      console.log("    ✓ Submitted application PDF confirmed inside ZIP bundle!");
    }
  });

  console.log("\n==================================================================");
  console.log("AUDIT EXECUTION SUMMARY");
  console.log("==================================================================");
  let totalTime = 0;
  let passCount = 0;
  for (const item of auditLog) {
    totalTime += item.durationMs;
    if (item.status === "PASS") passCount++;
    console.log(`  [${item.status}] ${item.step.padEnd(48)} (${item.durationMs}ms)`);
  }
  console.log("------------------------------------------------------------------");
  console.log(`Total Steps Executed: ${auditLog.length}`);
  console.log(`Total Steps Passed:   ${passCount}`);
  console.log(`Total Execution Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log("==================================================================\n");
}

runAudit().catch((err) => {
  console.error("\nAudit Walkthrough FAILED with error:", err);
  process.exit(1);
});

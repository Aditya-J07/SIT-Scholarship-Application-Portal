-- ==============================================================================
-- SIDDAGANGA INSTITUTE OF TECHNOLOGY (SIT), TUMAKURU - 572103
-- SCHOLARSHIP APPLICATION PORTAL - PRODUCTION POSTGRESQL SCHEMA
-- Migration: 001_init.sql
-- Region: ap-south-1 (Mumbai, India) - Required for DPDP Act Compliance
-- ==============================================================================

-- Enable required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Students, Evaluators/Reviewers, and Administrators)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('student', 'reviewer', 'admin')) DEFAULT 'student',
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    token_version INTEGER NOT NULL DEFAULT 1,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret TEXT,
    two_factor_recovery_codes TEXT[],
    bank_account_holder TEXT,
    bank_acc_no_encrypted TEXT, -- Encrypted with AES-256-GCM (v1:iv:authTag:cipher)
    bank_name TEXT,
    bank_branch TEXT,
    bank_ifsc TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ------------------------------------------------------------------------------
-- 2. SCHOLARSHIPS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scholarships (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    fee_label TEXT NOT NULL DEFAULT 'Total fee per year',
    rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    requires_recommendation BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. CYCLES TABLE (Annual academic submission windows)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cycles (
    id TEXT PRIMARY KEY,
    scholarship_id TEXT NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL, -- e.g. "2026-2027"
    opens_at TIMESTAMPTZ NOT NULL,
    closes_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'upcoming')) DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. APPLICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_no TEXT NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id TEXT NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (
        status IN ('draft', 'submitted', 'under_review', 'needs_correction', 'shortlisted', 'accepted', 'rejected', 'withdrawn')
    ) DEFAULT 'draft',
    current_step INTEGER NOT NULL DEFAULT 1,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    computed JSONB NOT NULL DEFAULT '{}'::jsonb,
    merit_score NUMERIC DEFAULT 0.0,
    submitted_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    decided_by UUID REFERENCES public.profiles(id),
    decision_remark TEXT,
    pdf_path TEXT,
    pdf_sha256 TEXT,
    hard_copy_received BOOLEAN NOT NULL DEFAULT FALSE,
    recommendation_status TEXT CHECK (recommendation_status IN ('pending', 'recommended', 'not_recommended')),
    recommendation_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_cycle_merit ON public.applications(cycle_id, merit_score DESC);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_ref_no ON public.applications(ref_no);
CREATE INDEX IF NOT EXISTS idx_applications_updated_at ON public.applications(updated_at);

-- Database-level check trigger to reject submissions after cycle closes
CREATE OR REPLACE FUNCTION check_application_submission_deadline()
RETURNS trigger AS $$
DECLARE
    cycle_closes_at TIMESTAMPTZ;
BEGIN
    IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
        SELECT closes_at INTO cycle_closes_at FROM public.cycles WHERE id = NEW.cycle_id;
        IF cycle_closes_at IS NOT NULL AND now() > cycle_closes_at THEN
            RAISE EXCEPTION 'Application deadline has passed. Cycle closed at %', cycle_closes_at;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_application_submission_deadline ON public.applications;
CREATE TRIGGER trg_check_application_submission_deadline
BEFORE INSERT OR UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION check_application_submission_deadline();

-- ------------------------------------------------------------------------------
-- 5. APPLICATION FILES (Stored in private 'application-files' bucket)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (
        kind IN ('photo', 'sig_student', 'sig_parent', 'cet_order', 'marks_card', 'income_cert', 'aadhaar', 'fee_receipt', 'principal_cert')
    ),
    storage_path TEXT NOT NULL,
    mime TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256 TEXT NOT NULL,
    original_name TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_files_app_id ON public.application_files(application_id);

-- ------------------------------------------------------------------------------
-- 6. REMARKS (Reviewer notes, correction notices, committee decisions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.remarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('internal_note', 'correction_request', 'recommendation', 'decision')),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remarks_app_id ON public.remarks(application_id);

-- ------------------------------------------------------------------------------
-- 7. AUDIT LOG (Immutable, append-only security log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id TEXT,
    actor_email TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- Append-only trigger: raise exception on UPDATE or DELETE regardless of caller
CREATE OR REPLACE FUNCTION prevent_audit_log_tamper()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable and append-only. Modification or deletion is strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON public.audit_log;
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tamper();

-- Revoke UPDATE and DELETE privileges on audit_log
REVOKE UPDATE, DELETE ON public.audit_log FROM anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. DISTRIBUTED RATE LIMITS (Atomic rate limiting for serverless execution)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    points INTEGER NOT NULL DEFAULT 1,
    expire_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expire_at ON public.rate_limits(expire_at);

-- ------------------------------------------------------------------------------
-- 9. PASSWORD RESETS & EMAIL VERIFICATION TOKENS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 10. SEED DATA (Official Scholarships & Open Cycle)
-- ------------------------------------------------------------------------------
INSERT INTO public.scholarships (id, code, name, active, fee_label, rules, requires_recommendation, description)
VALUES 
(
    'sch_mnc',
    'MNC',
    'Dr. M.N. Channabasappa Endowment Fund Loan Scholarship',
    true,
    'Total fee per year',
    '{
        "income_limit": 300000,
        "cet_required": true,
        "max_assistance_pct": 30,
        "max_scholarship_pct": 50,
        "allow_backlog": false,
        "max_awardees_per_year": 1
    }'::jsonb,
    false,
    'Endowment fund loan scholarship awarded on merit-cum-means for financially deserving students admitted through CET. Family annual income must not exceed Rs. 3,00,000.'
),
(
    'sch_sska',
    'SSKA',
    'Sri Sripathi K A Memorial Scholarship',
    true,
    'Tuition fee per year',
    '{
        "income_limit": 500000,
        "requires_hod_proctor_recommendation": true
    }'::jsonb,
    true,
    'Merit scholarship with recommendation from Proctor and Head of Department. Awarded to meritorious students facing financial distress.'
),
(
    'sch_siteb',
    'SITEB',
    'SIT Scholarship to Economically Backward and Socially Challenged Students',
    false,
    'Total fee per year',
    '{}'::jsonb,
    false,
    'Institutional aid for economically backward and socially challenged students (Inactive pending committee guidelines).'
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    rules = EXCLUDED.rules,
    description = EXCLUDED.description;

-- Active Academic Cycle
-- TODO [COLLEGE DECISION REQUIRED]: Confirm circular dates for Academic Year 2026-2027
INSERT INTO public.cycles (id, scholarship_id, academic_year, opens_at, closes_at, status)
VALUES 
(
    'cycle_mnc_2026',
    'sch_mnc',
    '2026-2027',
    '2026-09-01T00:00:00Z', -- TODO: Confirm official notification date
    '2026-12-31T23:59:59Z', -- TODO: Confirm official last submission date
    'open'
),
(
    'cycle_sska_2026',
    'sch_sska',
    '2026-2027',
    '2026-09-01T00:00:00Z',
    '2026-12-31T23:59:59Z',
    'open'
)
ON CONFLICT (id) DO NOTHING;

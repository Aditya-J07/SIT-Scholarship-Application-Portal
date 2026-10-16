-- ==============================================================================
-- SIDDAGANGA INSTITUTE OF TECHNOLOGY (SIT), TUMAKURU - 572103
-- SCHOLARSHIP APPLICATION PORTAL - PRODUCTION POSTGRESQL SCHEMA
-- Migration: 001_init.sql / schema.sql
-- Region: ap-south-1 (Mumbai, India) - Required for DPDP Act Compliance
-- ==============================================================================

-- Enable required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked directly to Supabase Auth auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('student', 'reviewer', 'admin')) DEFAULT 'student',
    full_name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    bank_account_holder TEXT,
    bank_acc_no_encrypted TEXT, -- AES-256-GCM encrypted (v1:keyId:iv:tag:cipher)
    bank_acc_last4 TEXT,        -- Plain last 4 digits for masked display
    bank_name TEXT,
    bank_branch TEXT,
    bank_ifsc TEXT,
    last_seen_at TIMESTAMPTZ,          -- Staff session activity tracker for 30-min idle timeout
    consent_accepted_at TIMESTAMPTZ,   -- DPDP Act 2023 Consent timestamp
    consent_version TEXT,              -- Privacy policy version consented to
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
    opens_at TIMESTAMPTZ,        -- NULL until confirmed and activated by Accounts Section
    closes_at TIMESTAMPTZ,       -- NULL until confirmed and activated by Accounts Section
    status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'upcoming')) DEFAULT 'closed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cycles_scholarship ON public.cycles(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_cycles_status ON public.cycles(status);

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

-- Hardened submission deadline trigger
CREATE OR REPLACE FUNCTION public.check_application_submission_deadline()
RETURNS TRIGGER AS $$
DECLARE
  v_cycle RECORD;
BEGIN
  IF NEW.status = 'submitted' AND (OLD.status IS DISTINCT FROM 'submitted') THEN
    SELECT opens_at, closes_at, status INTO v_cycle
    FROM public.cycles
    WHERE id = NEW.cycle_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Scholarship cycle record not found for application.';
    END IF;

    IF v_cycle.status != 'open' THEN
      RAISE EXCEPTION 'Application window is not currently open for this scholarship cycle.';
    END IF;

    IF v_cycle.opens_at IS NULL OR v_cycle.closes_at IS NULL THEN
      RAISE EXCEPTION 'Official scholarship cycle dates have not been confirmed by the Accounts Section.';
    END IF;

    IF NOW() < v_cycle.opens_at THEN
      RAISE EXCEPTION 'Application window has not opened yet.';
    END IF;

    IF NOW() > v_cycle.closes_at THEN
      RAISE EXCEPTION 'Application deadline has passed. Submissions are closed.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_application_submission_deadline ON public.applications;
CREATE TRIGGER trg_check_application_submission_deadline
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.check_application_submission_deadline();

-- ------------------------------------------------------------------------------
-- 5. APPLICATION FILES (Metadata for files in private 'application-files' bucket)
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

-- Revoke UPDATE, DELETE, TRUNCATE on audit_log from application roles
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM anon, authenticated;

-- ------------------------------------------------------------------------------
-- 8. DISTRIBUTED RATE LIMITS (Atomic rate limiting for serverless execution)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    points INTEGER NOT NULL DEFAULT 1,
    expire_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expire_at ON public.rate_limits(expire_at);

-- Atomic Rate Limiting Function
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key TEXT,
  p_window_seconds INT,
  p_max INT
)
RETURNS TABLE(allowed BOOLEAN, retry_after INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_reset_at TIMESTAMPTZ;
  v_count INT;
BEGIN
  INSERT INTO public.rate_limits (key, points, expire_at)
  VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::interval)
  ON CONFLICT (key) DO UPDATE
  SET 
    points = CASE 
      WHEN public.rate_limits.expire_at <= v_now THEN 1
      ELSE public.rate_limits.points + 1
    END,
    expire_at = CASE
      WHEN public.rate_limits.expire_at <= v_now THEN v_now + (p_window_seconds || ' seconds')::interval
      ELSE public.rate_limits.expire_at
    END
  RETURNING public.rate_limits.points, public.rate_limits.expire_at INTO v_count, v_reset_at;

  IF v_count > p_max THEN
    allowed := false;
    retry_after := GREATEST(1, EXTRACT(EPOCH FROM (v_reset_at - v_now))::int);
  ELSE
    allowed := true;
    retry_after := 0;
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) TO service_role;
ALTER FUNCTION public.rate_limit_hit(TEXT, INT, INT) SET search_path = '';

-- Expired Rate Limits Cleanup Function
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.rate_limits
  WHERE expire_at < clock_timestamp();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() TO service_role;
ALTER FUNCTION public.cleanup_expired_rate_limits() SET search_path = '';

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES & SCHEMA LOCKDOWN
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Remove direct table and sequence access for anon and authenticated (005_lockdown)
-- Application reads and writes execute exclusively server-side via service_role.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- Profiles read policy
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Scholarships policies (publicly viewable active scholarships)
CREATE POLICY "Anyone can view active scholarships"
    ON public.scholarships FOR SELECT
    TO anon, authenticated
    USING (active = true);

-- Cycles policies (publicly viewable cycles)
CREATE POLICY "Anyone can view academic cycles"
    ON public.cycles FOR SELECT
    TO anon, authenticated
    USING (true);

-- Applications read policy
CREATE POLICY "Students can view their own applications"
    ON public.applications FOR SELECT
    TO authenticated
    USING (auth.uid() = student_id);

-- Application files read policy
CREATE POLICY "Students can view their own application files"
    ON public.application_files FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = application_files.application_id AND a.student_id = auth.uid()
        )
    );

-- Remarks policies
CREATE POLICY "Students can view published correction requests and decisions"
    ON public.remarks FOR SELECT
    TO authenticated
    USING (
        kind IN ('correction_request', 'decision') AND
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = remarks.application_id AND a.student_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 10. PRIVATE STORAGE BUCKET
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-files', 'application-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ------------------------------------------------------------------------------
-- 11. INITIAL SEED DATA
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
-- TODO [COLLEGE DECISION REQUIRED]: Confirm exact opening date and closing date with Accounts Section
INSERT INTO public.cycles (id, scholarship_id, academic_year, opens_at, closes_at, status)
VALUES 
(
    'cycle_mnc_2026',
    'sch_mnc',
    '2026-2027',
    NULL, -- Official opening circular date to be confirmed by Accounts Section
    NULL, -- Official last submission date to be confirmed by Accounts Section
    'closed'
),
(
    'cycle_sska_2026',
    'sch_sska',
    '2026-2027',
    NULL,
    NULL,
    'closed'
)
ON CONFLICT (id) DO NOTHING;


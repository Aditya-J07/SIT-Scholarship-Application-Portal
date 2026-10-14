-- ==============================================================================
-- SIT SCHOLARSHIP PORTAL - PHASE 2 MIGRATION (002_phase2.sql)
-- Supabase Region: ap-south-1 (Mumbai, India)
-- Applies:
-- 1. Canonical Status Consistency Check Constraint
-- 2. Statement-Level Truncate Prevention on Audit Log & Service Role Revocation
-- 3. Automatic Profile Creation Trigger on auth.users insert
-- 4. Atomic Rate Limiting Function (rate_limit_hit)
-- 5. Hardened Application Submission Window Database Trigger
-- ==============================================================================

-- 1. CANONICAL STATUS CONSISTENCY
-- Canonical statuses: draft, submitted, under_review, needs_correction, shortlisted, accepted, rejected, withdrawn
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('draft', 'submitted', 'under_review', 'needs_correction', 'shortlisted', 'accepted', 'rejected', 'withdrawn'));

-- 2. AUDIT LOG TRUNCATE & TAMPER PREVENTION
-- Audit log has NO foreign keys to profiles or auth.users (stores plain UUIDs and email snapshot)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_truncate()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable. Truncation is strictly forbidden.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_log_truncate ON public.audit_log;
CREATE TRIGGER trg_audit_log_truncate
BEFORE TRUNCATE ON public.audit_log
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_truncate();

-- Revoke TRUNCATE, UPDATE, DELETE from all roles including service_role
REVOKE TRUNCATE, UPDATE, DELETE ON public.audit_log FROM anon, authenticated, service_role;

-- 3. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.USERS INSERT
-- Creates profile with role = 'student' hardcoded; copies full_name and mobile from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    mobile,
    role,
    must_change_password
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    'student',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ATOMIC RATE LIMITING FUNCTION
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
  -- Atomic upsert: if window expired, reset to 1; otherwise increment
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

REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INT, INT) TO service_role;

-- 5. HARDENED SUBMISSION DEADLINE TRIGGER
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

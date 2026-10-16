-- ==============================================================================
-- SIT SCHOLARSHIP PORTAL - PHASE 2c MIGRATION (003_phase2c.sql)
-- Supabase Region: ap-south-1 (Mumbai, India)
-- Applies:
-- 1. Server-side staff activity tracking (profiles.last_seen_at)
-- 2. Stored procedure for rate_limits garbage collection (cleanup_expired_rate_limits)
-- ==============================================================================

-- 1. SERVER-SIDE STAFF SESSION TIMEOUT TRACKING
-- Tracks the last active timestamp of staff requests (admin & reviewer).
-- Enforces 30-minute idle session revocation.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 2. EXPIRED RATE LIMITS CLEANUP FUNCTION
-- Purges rows where expire_at < clock_timestamp().
-- Can be scheduled via pg_cron (if available) or invoked via Vercel Cron.
DROP FUNCTION IF EXISTS public.cleanup_expired_rate_limits();

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

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() TO service_role;

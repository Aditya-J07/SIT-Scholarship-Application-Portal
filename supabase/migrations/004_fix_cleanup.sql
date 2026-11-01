-- ==============================================================================
-- SIT SCHOLARSHIP PORTAL - MIGRATION 004 (004_fix_cleanup.sql)
-- Supabase Region: ap-south-1 (Mumbai, India)
-- Applies:
-- Explicitly defines cleanup_expired_rate_limits() purging on public.rate_limits(expire_at).
-- Resolves any discrepancy where previous function drafts checked reset_at.
-- ==============================================================================

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

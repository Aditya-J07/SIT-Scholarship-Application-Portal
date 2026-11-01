-- ==============================================================================
-- SIT SCHOLARSHIP PORTAL - MIGRATION 006 (006_consent.sql)
-- Supabase Region: ap-south-1 (Mumbai, India)
-- Applies:
-- DPDP Act 2023 Consent Recording in public.profiles:
-- - consent_accepted_at: Timestamp when the student provided consent.
-- - consent_version: The version string of the privacy policy consented to.
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_version TEXT;

-- Allow closed cycles without confirmed dates
ALTER TABLE public.cycles ALTER COLUMN opens_at DROP NOT NULL;
ALTER TABLE public.cycles ALTER COLUMN closes_at DROP NOT NULL;


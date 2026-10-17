-- ==============================================================================
-- SIT SCHOLARSHIP APPLICATION PORTAL - MIGRATION 007
-- 007_duplicate_flags.sql
-- Region: ap-south-1 (Mumbai, India)
--
-- Purpose:
-- 1. Add bank_acc_hash column to applications table for server-side duplicate
--    bank account detection without decrypting (HMAC-SHA256 with HASH_KEY).
-- 2. Add hard_copy_received_at timestamp for document physical submission tracking.
-- ==============================================================================

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS bank_acc_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_applications_bank_acc_hash ON public.applications(bank_acc_hash);

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS hard_copy_received_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_applications_hard_copy ON public.applications(hard_copy_received);

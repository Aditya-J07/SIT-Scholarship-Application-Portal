-- ==============================================================================
-- SIT SCHOLARSHIP APPLICATION PORTAL - MIGRATION 008
-- 008_department.sql
-- Region: ap-south-1 (Mumbai, India)
--
-- Purpose:
-- Add department column to profiles table for scoping reviewer access
-- to applications matching the student's engineering department / course.
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);

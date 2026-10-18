-- 010_application_department.sql
-- Phase 3c: Store normalized department on the application at submission
-- Allows exact-match reviewer department scoping and indexed filtering

ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS department TEXT;
CREATE INDEX IF NOT EXISTS idx_applications_department ON public.applications(department);

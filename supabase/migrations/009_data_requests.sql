-- ==============================================================================
-- SIT SCHOLARSHIP APPLICATION PORTAL - MIGRATION 009
-- 009_data_requests.sql
-- Region: ap-south-1 (Mumbai, India)
--
-- Purpose:
-- Implement DPDP Act 2023 Student Data Rights table (data_requests).
-- Students can request correction or deletion of their account and application data.
-- Notice: student_id has no foreign key constraint to profiles so that deletion
-- of a student profile does not break or delete historical request logs or the
-- append-only audit trail.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.data_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    student_email TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('correction', 'deletion')),
    details TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')) DEFAULT 'pending',
    admin_notes TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_requests_student_id ON public.data_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_status ON public.data_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_requests_created_at ON public.data_requests(created_at DESC);

-- Enable Row Level Security (RLS) and enforce backend-only mediation
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.data_requests FROM anon, authenticated;
GRANT ALL ON TABLE public.data_requests TO service_role;

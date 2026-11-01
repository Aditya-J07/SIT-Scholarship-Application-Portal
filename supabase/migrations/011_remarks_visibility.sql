-- 011_remarks_visibility.sql
-- Add visible_to_student column to public.remarks to explicitly govern remark visibility for students
ALTER TABLE public.remarks ADD COLUMN IF NOT EXISTS visible_to_student BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_remarks_visible_to_student ON public.remarks(visible_to_student);

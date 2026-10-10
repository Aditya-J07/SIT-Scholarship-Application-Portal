-- ==============================================================================
-- SIDDAGANGA INSTITUTE OF TECHNOLOGY (SIT), TUMAKURU - 572103
-- SCHOLARSHIP APPLICATION PORTAL - POSTGRESQL & ROW LEVEL SECURITY SCHEMA
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (Linked with auth.users if deployed on Supabase)
create table if not exists public.profiles (
    id uuid primary key default uuid_generate_v4(),
    role text not null check (role in ('student', 'admin')) default 'student',
    full_name text not null,
    mobile text not null,
    email text not null unique,
    password_hash text, -- For standalone auth or mirrored from auth
    bank_account_holder text,
    bank_acc_no_encrypted text,
    bank_name text,
    bank_branch text,
    bank_ifsc text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. SCHOLARSHIPS TABLE
create table if not exists public.scholarships (
    id text primary key,
    code text not null unique,
    name text not null,
    active boolean not null default true,
    fee_label text not null default 'Total fee per year',
    rules jsonb not null default '{}'::jsonb,
    requires_recommendation boolean not null default false,
    created_at timestamptz not null default now()
);

-- 3. CYCLES TABLE (Annual academic windows)
create table if not exists public.cycles (
    id text primary key,
    scholarship_id text not null references public.scholarships(id) on delete cascade,
    academic_year text not null,
    opens_at timestamptz not null,
    closes_at timestamptz not null,
    status text not null check (status in ('open', 'closed', 'upcoming')) default 'open',
    created_at timestamptz not null default now()
);

-- 4. APPLICATIONS TABLE
create table if not exists public.applications (
    id uuid primary key default uuid_generate_v4(),
    ref_no text not null unique,
    student_id uuid not null references public.profiles(id) on delete cascade,
    cycle_id text not null references public.cycles(id) on delete cascade,
    status text not null check (status in ('draft', 'submitted', 'under_review', 'needs_correction', 'shortlisted', 'accepted', 'rejected', 'withdrawn')) default 'draft',
    data jsonb not null default '{}'::jsonb,
    computed jsonb not null default '{}'::jsonb,
    merit_score numeric default 0.0,
    submitted_at timestamptz,
    decided_at timestamptz,
    decided_by uuid references public.profiles(id),
    decision_remark text,
    pdf_path text,
    pdf_sha256 text,
    hard_copy_received boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(student_id, cycle_id)
);

-- Indexes for lightning fast queries
create index if not exists idx_applications_status on public.applications(status);
create index if not exists idx_applications_cycle_merit on public.applications(cycle_id, merit_score desc);
create index if not exists idx_applications_student_id on public.applications(student_id);
create index if not exists idx_applications_ref_no on public.applications(ref_no);

-- 5. APPLICATION FILES (Stored securely in private storage bucket)
create table if not exists public.application_files (
    id uuid primary key default uuid_generate_v4(),
    application_id uuid not null references public.applications(id) on delete cascade,
    kind text not null, -- photo, sig_student, sig_parent, cet_order, marks_card, income_cert, aadhaar, fee_receipt, principal_cert
    storage_path text not null,
    mime text not null,
    size_bytes bigint not null,
    sha256 text not null,
    original_name text not null,
    uploaded_at timestamptz not null default now()
);

create index if not exists idx_app_files_app_id on public.application_files(application_id);

-- 6. REMARKS (Internal reviewer/admin remarks & student correction notices)
create table if not exists public.remarks (
    id uuid primary key default uuid_generate_v4(),
    application_id uuid not null references public.applications(id) on delete cascade,
    author_id uuid not null references public.profiles(id) on delete cascade,
    author_name text not null,
    author_role text not null,
    kind text not null check (kind in ('internal_note', 'correction_request', 'recommendation', 'decision')),
    body text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_remarks_app_id on public.remarks(application_id);

-- 7. AUDIT LOG (Immutable record of all actions)
create table if not exists public.audit_log (
    id uuid primary key default uuid_generate_v4(),
    actor_id text,
    actor_email text,
    action text not null,
    entity text not null,
    entity_id text not null,
    meta jsonb default '{}'::jsonb,
    ip text,
    created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.application_files enable row level security;
alter table public.remarks enable row level security;
alter table public.audit_log enable row level security;

-- Profiles: Students can see and edit only their own profile
create policy "Users can view own profile" on public.profiles
    for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
    for update using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
    for select using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    );

-- Applications:
create policy "Students can view own applications" on public.applications
    for select using (auth.uid() = student_id);

create policy "Students can insert own drafts" on public.applications
    for insert with check (auth.uid() = student_id);

create policy "Students can update own drafts or correction requests" on public.applications
    for update using (
        auth.uid() = student_id and status in ('draft', 'needs_correction')
    );

create policy "Staff can view all applications" on public.applications
    for select using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    );

create policy "Only Admins can update decisions" on public.applications
    for update using (
        exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    );

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

insert into public.scholarships (id, code, name, active, fee_label, rules, requires_recommendation)
values 
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
    false
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
    true
),
(
    'sch_siteb',
    'SITEB',
    'SIT Scholarship to Economically Backward and Socially Challenged Students',
    false,
    'Total fee per year',
    '{}'::jsonb,
    false
)
on conflict (code) do nothing;

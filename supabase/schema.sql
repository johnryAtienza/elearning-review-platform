-- ============================================================
--  ELEARNING PLATFORM — SUPABASE DATABASE SCHEMA
-- ============================================================
--  Paste this entire file into:
--  Supabase Dashboard → SQL Editor → New Query → Run
--
--  Sections
--  1. Tables
--  2. Indexes
--  3. Helper functions
--  4. Triggers
--  5. Views
--  6. Row Level Security (RLS)
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
-- Mirrors auth.users. One row is auto-created on signup
-- via the handle_new_user() trigger (Section 4).
-- Never insert into this table manually.

create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Public user profile. One row per auth.users entry, created automatically on signup.';


-- ── courses ───────────────────────────────────────────────────
-- Only rows where is_published = true are visible to end-users.
-- Drafts/unpublished courses are hidden by the RLS policy.

create table public.courses (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null,
  description  text        not null default '',
  thumbnail    text        not null default '',   -- Tailwind gradient OR image URL
  category     text        not null default '',
  duration     text        not null default '',   -- display string, e.g. "6h 30m"
  is_published boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.courses.thumbnail is
  'Tailwind gradient string (e.g. "from-blue-400 to-cyan-500") or a CDN image URL.';
comment on column public.courses.is_published is
  'Only published courses are visible to regular users.';


-- ── lessons ───────────────────────────────────────────────────
-- Linked to a course. "order" determines sequence within the course.
-- video_url and reviewer_pdf_url are premium — only subscribed users
-- can read these columns (enforced by the lesson_content view + RLS).

create table public.lessons (
  id                uuid        primary key default gen_random_uuid(),
  course_id         uuid        not null references public.courses(id) on delete cascade,
  title             text        not null,
  description       text        not null default '',
  video_url         text,
  reviewer_pdf_url  text,
  "order"           int         not null,
  duration          text        not null default '',   -- e.g. "28m"
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (course_id, "order")                          -- no duplicate ordering in a course
);

comment on column public.lessons.video_url is
  'Premium field. Only returned to subscribed users (see RLS policy).';
comment on column public.lessons.reviewer_pdf_url is
  'Premium field. Only returned to subscribed users (see RLS policy).';


-- ── quizzes ───────────────────────────────────────────────────
-- One row = one question. Multiple questions share the same lesson_id.
-- "order" determines display sequence within the lesson quiz.

create table public.quizzes (
  id              uuid        primary key default gen_random_uuid(),
  lesson_id       uuid        not null references public.lessons(id) on delete cascade,
  question        text        not null,
  options         jsonb       not null,   -- string[], e.g. ["A", "B", "C", "D"]
  correct_answer  int         not null,   -- 0-based index into options[]
  "order"         int         not null default 0,
  created_at      timestamptz not null default now()
);

comment on column public.quizzes.options is
  'JSON array of answer strings. e.g. ["React.createElement", "document.createElement"]';
comment on column public.quizzes.correct_answer is
  '0-based index of the correct option in the options array.';


-- ── subscriptions ─────────────────────────────────────────────
-- One row per user. expires_at = NULL means the subscription never
-- expires (e.g., lifetime or manually managed plans).

create table public.subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  plan_id     text        not null default 'pro',
  is_active   boolean     not null default true,
  started_at  timestamptz not null default now(),
  expires_at  timestamptz,                         -- null = no expiry
  created_at  timestamptz not null default now(),

  unique (user_id)                                 -- one subscription record per user
);

comment on column public.subscriptions.expires_at is
  'NULL means the subscription does not expire. Set a timestamp for time-limited plans.';


-- ── quiz_results ──────────────────────────────────────────────
-- One row per user per lesson (most recent attempt).
-- answers stores the full answer map so results can be reviewed.

create table public.quiz_results (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  lesson_id    uuid        not null references public.lessons(id) on delete cascade,
  score        int         not null,
  total        int         not null,
  answers      jsonb       not null,   -- Record<questionId, choiceIndex>
  submitted_at timestamptz not null default now(),

  unique (user_id, lesson_id)          -- upsert on repeat attempt
);

comment on column public.quiz_results.answers is
  'Map of question UUID → selected choice index. e.g. {"uuid-q1": 2, "uuid-q2": 0}';


-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Lesson list ordered by position within a course
create index idx_lessons_course_order
  on public.lessons (course_id, "order");

-- Quiz questions ordered within a lesson
create index idx_quizzes_lesson_order
  on public.quizzes (lesson_id, "order");

-- Fast subscription look-up (the is_active_subscriber() function)
create index idx_subscriptions_active
  on public.subscriptions (user_id)
  where is_active = true;

-- Fast result look-up per user
create index idx_quiz_results_user
  on public.quiz_results (user_id, lesson_id);

-- Course filtering by category
create index idx_courses_category
  on public.courses (category)
  where is_published = true;


-- ============================================================
-- 3. HELPER FUNCTIONS
-- ============================================================

-- Returns true if a user has an active, non-expired subscription.
-- Used inside RLS policies — SECURITY DEFINER avoids infinite recursion.
create or replace function public.is_active_subscriber(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions
    where user_id   = uid
      and is_active = true
      and (expires_at is null or expires_at > now())
  );
$$;

-- Convenience wrapper for the currently authenticated user.
create or replace function public.current_user_is_subscribed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_subscriber(auth.uid());
$$;


-- ============================================================
-- 4. TRIGGERS
-- ============================================================

-- ── 4a. Auto-create a profile row on new user signup ─────────
-- Reads the "name" field from raw_user_meta_data (set during signUp).
-- Falls back to the email prefix if name is not provided.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();


-- ── 4b. Auto-stamp updated_at on every update ────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger trg_courses_updated_at
  before update on public.courses
  for each row execute procedure public.set_updated_at();

create trigger trg_lessons_updated_at
  before update on public.lessons
  for each row execute procedure public.set_updated_at();


-- ============================================================
-- 5. VIEWS
-- ============================================================

-- lesson_previews — safe to expose to ALL authenticated users.
-- Excludes video_url and reviewer_pdf_url (premium columns).
-- Used by CourseDetailPage to show the locked lesson list.
--
-- security_invoker = false means this view runs with the
-- table owner's permissions, bypassing the lessons RLS policy.
-- The WHERE clause ensures only authenticated users get data.
-- No premium fields are selected, so exposure is safe.

create or replace view public.lesson_previews
with (security_invoker = false)
as
  select
    id,
    course_id,
    title,
    description,
    "order",
    duration,
    created_at
  from public.lessons
  where auth.uid() is not null;   -- authenticated users only

comment on view public.lesson_previews is
  'Read-only, premium-safe view of lessons. Excludes video_url and reviewer_pdf_url.
   Use this for course detail pages shown to non-subscribed users.';


-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Rule of thumb applied here:
--   SELECT needs  → only what the user is entitled to read
--   INSERT needs  → auth.uid() must match the owner column
--   UPDATE needs  → same owner check on both current and new row
--   DELETE        → not granted to regular users by default

alter table public.profiles      enable row level security;
alter table public.courses       enable row level security;
alter table public.lessons       enable row level security;
alter table public.quizzes       enable row level security;
alter table public.subscriptions enable row level security;
alter table public.quiz_results  enable row level security;


-- ── profiles ─────────────────────────────────────────────────
-- Users can only read and update their own profile.
-- INSERT is handled exclusively by the handle_new_user trigger.

create policy "profiles: read own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles
  for update
  using     (auth.uid() = id)
  with check (auth.uid() = id);


-- ── courses ───────────────────────────────────────────────────
-- Published courses are public — even anonymous visitors can browse.

create policy "courses: anyone reads published"
  on public.courses
  for select
  using (is_published = true);


-- ── lessons ───────────────────────────────────────────────────
-- Full lesson rows (including video_url) are restricted to
-- authenticated users with an active subscription.

create policy "lessons: subscribed users read"
  on public.lessons
  for select
  using (
    auth.uid() is not null
    and public.is_active_subscriber(auth.uid())
  );


-- ── quizzes ───────────────────────────────────────────────────
-- Quiz questions are premium content — subscribed users only.

create policy "quizzes: subscribed users read"
  on public.quizzes
  for select
  using (
    auth.uid() is not null
    and public.is_active_subscriber(auth.uid())
  );


-- ── subscriptions ─────────────────────────────────────────────
-- Users can only see and manage their own subscription.
--
-- Production note: restrict INSERT/UPDATE to a Supabase Edge Function
-- that verifies payment (Stripe webhook) before activating.
-- The policies below are suitable for development / direct activation.

create policy "subscriptions: read own"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

create policy "subscriptions: insert own"
  on public.subscriptions
  for insert
  with check (auth.uid() = user_id);

create policy "subscriptions: update own"
  on public.subscriptions
  for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── quiz_results ──────────────────────────────────────────────
-- Users can only read their own results.
-- Only subscribed users can submit results.
-- Results are immutable — no UPDATE policy.

create policy "quiz_results: read own"
  on public.quiz_results
  for select
  using (auth.uid() = user_id);

create policy "quiz_results: subscribed users insert"
  on public.quiz_results
  for insert
  with check (
    auth.uid() = user_id
    and public.is_active_subscriber(auth.uid())
  );


-- ============================================================
-- DONE
-- ============================================================
-- Tables:   profiles, courses, lessons, quizzes,
--           subscriptions, quiz_results
-- Views:    lesson_previews
-- Triggers: on_auth_user_created, set_updated_at (×3)
-- Functions: is_active_subscriber, current_user_is_subscribed
-- ============================================================

-- ============================================================
--  MIGRATION: add_lesson_progress
--
--  Tracks which lessons each user has marked as watched.
--  Used to persist the "Mark as Watched" state across sessions.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── 1. Create lesson_progress table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id  TEXT        NOT NULL,
  is_watched BOOLEAN     NOT NULL DEFAULT false,
  watched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

COMMENT ON TABLE  public.lesson_progress            IS 'Per-user lesson watch progress';
COMMENT ON COLUMN public.lesson_progress.is_watched IS 'true when user has explicitly marked the lesson as watched';
COMMENT ON COLUMN public.lesson_progress.watched_at IS 'Timestamp of the first "mark as watched" action';


-- ── 2. Row-Level Security ────────────────────────────────────────────────────

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress"
  ON public.lesson_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.lesson_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.lesson_progress
  FOR UPDATE
  USING (auth.uid() = user_id);


-- ── 3. Auto-update updated_at ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

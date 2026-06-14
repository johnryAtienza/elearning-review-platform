-- Add lifecycle status to parent courses.
-- Existing courses are published so currently live navbar content stays visible.
-- New courses default to draft until an admin explicitly publishes them.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'courses'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.courses
      ADD COLUMN status text NOT NULL DEFAULT 'draft';

    UPDATE public.courses
    SET status = 'published';
  END IF;
END $$;

UPDATE public.courses
SET status = 'published'
WHERE status IS NULL;

ALTER TABLE public.courses
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'courses_status_check'
      AND conrelid = 'public.courses'::regclass
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_status_check
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_courses_status
  ON public.courses (status);

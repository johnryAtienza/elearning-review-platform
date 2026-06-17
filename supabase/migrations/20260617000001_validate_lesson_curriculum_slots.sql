-- ============================================================
--  MIGRATION: validate_lesson_curriculum_slots
--
--  Enforces the Admin Lessons curriculum shape:
--    - one lesson per subject/week/day slot
--    - at most 6 lesson days per subject/week
--
--  Existing overfull weeks are allowed to remain editable when the
--  lesson stays in the exact same subject/week/day slot. Creating a
--  new row or moving a lesson into an already-full week is rejected.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_lesson_curriculum_slot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ignored_lesson_id uuid;
  existing_slot_count integer;
  existing_week_count integer;
BEGIN
  IF NEW.subject_id IS NULL OR NEW.week_number IS NULL OR NEW.day_number IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.week_number < 1 OR NEW.day_number < 1 THEN
    RAISE EXCEPTION 'lesson_invalid_curriculum_slot: Week and day must be positive.'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.subject_id IS NOT DISTINCT FROM OLD.subject_id
     AND NEW.week_number IS NOT DISTINCT FROM OLD.week_number
     AND NEW.day_number IS NOT DISTINCT FROM OLD.day_number THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    ignored_lesson_id := OLD.id;
  END IF;

  SELECT COUNT(*)
  INTO existing_slot_count
  FROM public.lessons l
  WHERE l.subject_id = NEW.subject_id
    AND l.week_number = NEW.week_number
    AND l.day_number = NEW.day_number
    AND (ignored_lesson_id IS NULL OR l.id <> ignored_lesson_id);

  IF existing_slot_count > 0 THEN
    RAISE EXCEPTION 'lesson_duplicate_curriculum_slot: Week %, Day % is already used for this subject.',
      NEW.week_number,
      NEW.day_number
      USING ERRCODE = '23505';
  END IF;

  SELECT COUNT(*)
  INTO existing_week_count
  FROM public.lessons l
  WHERE l.subject_id = NEW.subject_id
    AND l.week_number = NEW.week_number
    AND (ignored_lesson_id IS NULL OR l.id <> ignored_lesson_id);

  IF existing_week_count >= 6 THEN
    RAISE EXCEPTION 'lesson_week_full: This subject already has 6 days for Week %. Delete or move an existing lesson before adding another day.',
      NEW.week_number
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lesson_curriculum_slot ON public.lessons;

CREATE TRIGGER trg_validate_lesson_curriculum_slot
  BEFORE INSERT OR UPDATE OF subject_id, week_number, day_number
  ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lesson_curriculum_slot();

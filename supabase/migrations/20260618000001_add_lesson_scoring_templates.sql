-- ============================================================
--  MIGRATION: add_lesson_scoring_templates
--
--  Admin-managed lesson-level scoring/grade templates for
--  Problem Sets. One template may be assigned to each lesson.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.lesson_scoring_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  max_score integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lesson_scoring_templates_lesson_id_key
  ON public.lesson_scoring_templates (lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_scoring_templates_created_at
  ON public.lesson_scoring_templates (created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lesson_scoring_templates_title_not_blank'
      AND conrelid = 'public.lesson_scoring_templates'::regclass
  ) THEN
    ALTER TABLE public.lesson_scoring_templates
      ADD CONSTRAINT lesson_scoring_templates_title_not_blank
      CHECK (btrim(title) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lesson_scoring_templates_max_score_positive'
      AND conrelid = 'public.lesson_scoring_templates'::regclass
  ) THEN
    ALTER TABLE public.lesson_scoring_templates
      ADD CONSTRAINT lesson_scoring_templates_max_score_positive
      CHECK (max_score > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_lesson_scoring_templates_updated_at ON public.lesson_scoring_templates;
    CREATE TRIGGER trg_lesson_scoring_templates_updated_at
      BEFORE UPDATE ON public.lesson_scoring_templates
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lesson_scoring_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.lesson_scoring_templates(id) ON DELETE CASCADE,
  min_score integer NOT NULL,
  max_score integer NOT NULL,
  class_label text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_scoring_bands_template_sort
  ON public.lesson_scoring_bands (template_id, sort_order, min_score DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lesson_scoring_bands_score_bounds'
      AND conrelid = 'public.lesson_scoring_bands'::regclass
  ) THEN
    ALTER TABLE public.lesson_scoring_bands
      ADD CONSTRAINT lesson_scoring_bands_score_bounds
      CHECK (min_score >= 0 AND max_score >= 0 AND min_score <= max_score);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lesson_scoring_bands_label_not_blank'
      AND conrelid = 'public.lesson_scoring_bands'::regclass
  ) THEN
    ALTER TABLE public.lesson_scoring_bands
      ADD CONSTRAINT lesson_scoring_bands_label_not_blank
      CHECK (btrim(class_label) <> '');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lesson_scoring_bands_no_overlap'
      AND conrelid = 'public.lesson_scoring_bands'::regclass
  ) THEN
    ALTER TABLE public.lesson_scoring_bands
      ADD CONSTRAINT lesson_scoring_bands_no_overlap
      EXCLUDE USING gist (
        template_id WITH =,
        int4range(min_score, max_score, '[]') WITH &&
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_lesson_scoring_band()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template_max_score integer;
BEGIN
  SELECT max_score
  INTO template_max_score
  FROM public.lesson_scoring_templates
  WHERE id = NEW.template_id;

  IF template_max_score IS NULL THEN
    RAISE EXCEPTION 'Scoring template does not exist.'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.min_score < 0 OR NEW.max_score > template_max_score THEN
    RAISE EXCEPTION 'Score ranges must stay within 0 and the template max score.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_lesson_scoring_band ON public.lesson_scoring_bands;
CREATE TRIGGER trg_validate_lesson_scoring_band
  BEFORE INSERT OR UPDATE ON public.lesson_scoring_bands
  FOR EACH ROW EXECUTE FUNCTION public.validate_lesson_scoring_band();

ALTER TABLE public.lesson_scoring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_scoring_bands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_scoring_templates: admin reads all" ON public.lesson_scoring_templates;
CREATE POLICY "lesson_scoring_templates: admin reads all"
  ON public.lesson_scoring_templates FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "lesson_scoring_templates: admin insert" ON public.lesson_scoring_templates;
CREATE POLICY "lesson_scoring_templates: admin insert"
  ON public.lesson_scoring_templates FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "lesson_scoring_templates: admin update" ON public.lesson_scoring_templates;
CREATE POLICY "lesson_scoring_templates: admin update"
  ON public.lesson_scoring_templates FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "lesson_scoring_templates: admin delete" ON public.lesson_scoring_templates;
CREATE POLICY "lesson_scoring_templates: admin delete"
  ON public.lesson_scoring_templates FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "lesson_scoring_bands: admin reads all" ON public.lesson_scoring_bands;
CREATE POLICY "lesson_scoring_bands: admin reads all"
  ON public.lesson_scoring_bands FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "lesson_scoring_bands: admin insert" ON public.lesson_scoring_bands;
CREATE POLICY "lesson_scoring_bands: admin insert"
  ON public.lesson_scoring_bands FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "lesson_scoring_bands: admin update" ON public.lesson_scoring_bands;
CREATE POLICY "lesson_scoring_bands: admin update"
  ON public.lesson_scoring_bands FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "lesson_scoring_bands: admin delete" ON public.lesson_scoring_bands;
CREATE POLICY "lesson_scoring_bands: admin delete"
  ON public.lesson_scoring_bands FOR DELETE
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.save_lesson_scoring_template(
  p_template_id uuid,
  p_lesson_id uuid,
  p_title text,
  p_max_score integer,
  p_bands jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  input_band record;
  normalized_bands jsonb := '[]'::jsonb;
  normalized_band jsonb;
  existing_template_id uuid;
  saved_template_id uuid;
  band_min integer;
  band_max integer;
  band_label text;
  band_description text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin role required.'
      USING ERRCODE = '42501';
  END IF;

  IF p_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Please select a lesson.'
      USING ERRCODE = '23514';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'Please enter a scoring template title.'
      USING ERRCODE = '23514';
  END IF;

  IF p_max_score IS NULL OR p_max_score <= 0 THEN
    RAISE EXCEPTION 'Max score must be a positive number.'
      USING ERRCODE = '23514';
  END IF;

  IF p_bands IS NULL
    OR jsonb_typeof(p_bands) <> 'array'
    OR jsonb_array_length(p_bands) = 0 THEN
    RAISE EXCEPTION 'Add at least one grade band.'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = p_lesson_id) THEN
    RAISE EXCEPTION 'Selected lesson does not exist.'
      USING ERRCODE = '23503';
  END IF;

  SELECT id
  INTO existing_template_id
  FROM public.lesson_scoring_templates
  WHERE lesson_id = p_lesson_id
    AND (p_template_id IS NULL OR id <> p_template_id)
  LIMIT 1;

  IF existing_template_id IS NOT NULL THEN
    RAISE EXCEPTION 'This lesson already has a scoring template.'
      USING ERRCODE = '23505';
  END IF;

  FOR input_band IN
    SELECT value, ordinality
    FROM jsonb_array_elements(p_bands) WITH ORDINALITY AS band(value, ordinality)
  LOOP
    IF coalesce(input_band.value->>'min_score', '') !~ '^[0-9]+$'
      OR coalesce(input_band.value->>'max_score', '') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Band scores must be whole numbers.'
        USING ERRCODE = '23514';
    END IF;

    band_min := (input_band.value->>'min_score')::integer;
    band_max := (input_band.value->>'max_score')::integer;
    band_label := btrim(coalesce(input_band.value->>'class_label', ''));
    band_description := btrim(coalesce(input_band.value->>'description', ''));

    IF band_label = '' THEN
      RAISE EXCEPTION 'Each grade band needs a class label.'
        USING ERRCODE = '23514';
    END IF;

    IF band_min > band_max THEN
      RAISE EXCEPTION 'Band min score cannot be greater than max score.'
        USING ERRCODE = '23514';
    END IF;

    IF band_min < 0 OR band_max > p_max_score THEN
      RAISE EXCEPTION 'Score ranges must stay within 0 and the template max score.'
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(normalized_bands)
        AS existing(min_score integer, max_score integer)
      WHERE int4range(existing.min_score, existing.max_score, '[]')
        && int4range(band_min, band_max, '[]')
    ) THEN
      RAISE EXCEPTION 'Grade band score ranges cannot overlap.'
        USING ERRCODE = '23P01';
    END IF;

    normalized_band := jsonb_build_object(
      'min_score', band_min,
      'max_score', band_max,
      'class_label', band_label,
      'description', band_description,
      'sort_order', input_band.ordinality::integer
    );
    normalized_bands := normalized_bands || jsonb_build_array(normalized_band);
  END LOOP;

  IF p_template_id IS NULL THEN
    INSERT INTO public.lesson_scoring_templates (lesson_id, title, max_score)
    VALUES (p_lesson_id, btrim(p_title), p_max_score)
    RETURNING id INTO saved_template_id;
  ELSE
    UPDATE public.lesson_scoring_templates
    SET
      lesson_id = p_lesson_id,
      title = btrim(p_title),
      max_score = p_max_score
    WHERE id = p_template_id
    RETURNING id INTO saved_template_id;

    IF saved_template_id IS NULL THEN
      RAISE EXCEPTION 'Scoring template not found.'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  DELETE FROM public.lesson_scoring_bands
  WHERE template_id = saved_template_id;

  INSERT INTO public.lesson_scoring_bands (
    template_id,
    min_score,
    max_score,
    class_label,
    description,
    sort_order
  )
  SELECT
    saved_template_id,
    band.min_score,
    band.max_score,
    band.class_label,
    band.description,
    band.sort_order
  FROM jsonb_to_recordset(normalized_bands)
    AS band(
      min_score integer,
      max_score integer,
      class_label text,
      description text,
      sort_order integer
    );

  RETURN saved_template_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_lesson_scoring_template(uuid, uuid, text, integer, jsonb) TO authenticated;

COMMENT ON TABLE public.lesson_scoring_templates IS
  'Admin-managed scoring templates assigned one-to-one to lessons.';

COMMENT ON TABLE public.lesson_scoring_bands IS
  'Inclusive score ranges and class labels for a lesson scoring template.';

COMMENT ON COLUMN public.lesson_scoring_templates.max_score IS
  'Admin-managed total questions / max score for validating grade bands.';

COMMENT ON FUNCTION public.save_lesson_scoring_template(uuid, uuid, text, integer, jsonb) IS
  'Admin-only transactional save for a lesson scoring template and its inclusive, non-overlapping grade bands.';

NOTIFY pgrst, 'reload schema';

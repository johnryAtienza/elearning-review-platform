-- ============================================================
--  MIGRATION: add_quiz_result_grade_snapshots
--
--  Persist the lesson scoring template band matched at quiz
--  submission time so historical attempts remain stable even
--  after admins edit or delete scoring templates.
-- ============================================================

ALTER TABLE public.quiz_results
  ADD COLUMN IF NOT EXISTS scoring_template_id uuid REFERENCES public.lesson_scoring_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score_class text,
  ADD COLUMN IF NOT EXISTS score_class_description text,
  ADD COLUMN IF NOT EXISTS score_percentage numeric(6,2),
  ADD COLUMN IF NOT EXISTS score_snapshot_json jsonb;

CREATE INDEX IF NOT EXISTS idx_quiz_results_scoring_template_id
  ON public.quiz_results (scoring_template_id);

COMMENT ON COLUMN public.quiz_results.scoring_template_id IS
  'Lesson scoring template used when this attempt was submitted. Nullable and set null if the template is deleted.';

COMMENT ON COLUMN public.quiz_results.score_class IS
  'Frozen class label from the matched scoring band, e.g. Class A.';

COMMENT ON COLUMN public.quiz_results.score_class_description IS
  'Frozen class description from the matched scoring band, e.g. Board Passer.';

COMMENT ON COLUMN public.quiz_results.score_percentage IS
  'Score percentage at submission time, rounded to two decimals.';

COMMENT ON COLUMN public.quiz_results.score_snapshot_json IS
  'Frozen JSON snapshot of the matched scoring band at submission time.';

CREATE OR REPLACE FUNCTION public.save_quiz_result_with_grade(
  p_quiz_id uuid,
  p_lesson_id uuid,
  p_score integer,
  p_total integer,
  p_answers jsonb
)
RETURNS TABLE (
  id uuid,
  scoring_template_id uuid,
  score_class text,
  score_class_description text,
  score_percentage numeric,
  score_snapshot_json jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_template_id uuid := NULL;
  v_template_title text := NULL;
  v_template_max_score integer := NULL;
  v_band_id uuid := NULL;
  v_band_min_score integer := NULL;
  v_band_max_score integer := NULL;
  v_band_class_label text := NULL;
  v_band_description text := NULL;
  v_snapshot jsonb := NULL;
  v_score_percentage numeric(6,2);
  v_attempt_id uuid;
  v_scoring_template_id uuid := NULL;
  v_score_class text := NULL;
  v_score_class_description text := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF p_quiz_id IS NULL OR p_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Quiz and lesson are required.'
      USING ERRCODE = '23514';
  END IF;

  IF p_total IS NULL OR p_total <= 0 THEN
    RAISE EXCEPTION 'Total questions must be greater than zero.'
      USING ERRCODE = '23514';
  END IF;

  IF p_score IS NULL OR p_score < 0 OR p_score > p_total THEN
    RAISE EXCEPTION 'Score must be between zero and the total.'
      USING ERRCODE = '23514';
  END IF;

  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RAISE EXCEPTION 'Answers must be a JSON object.'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.quizzes q
    WHERE q.id = p_quiz_id
      AND q.lesson_id = p_lesson_id
  ) THEN
    RAISE EXCEPTION 'Quiz does not belong to the selected lesson.'
      USING ERRCODE = '23503';
  END IF;

  IF NOT (
    public.is_active_subscriber(v_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.id = p_lesson_id
        AND l.is_free_preview = TRUE
    )
  ) THEN
    RAISE EXCEPTION 'Not allowed to save quiz result for this lesson.'
      USING ERRCODE = '42501';
  END IF;

  v_score_percentage := round((p_score::numeric / p_total::numeric) * 100, 2);

  SELECT
    template.id,
    template.title,
    template.max_score
  INTO
    v_template_id,
    v_template_title,
    v_template_max_score
  FROM public.lesson_scoring_templates template
  WHERE template.lesson_id = p_lesson_id
  LIMIT 1;

  IF v_template_id IS NOT NULL THEN
    SELECT
      band.id,
      band.min_score,
      band.max_score,
      band.class_label,
      band.description
    INTO
      v_band_id,
      v_band_min_score,
      v_band_max_score,
      v_band_class_label,
      v_band_description
    FROM public.lesson_scoring_bands band
    WHERE band.template_id = v_template_id
      AND p_score BETWEEN band.min_score AND band.max_score
    ORDER BY band.sort_order, band.min_score DESC, band.max_score DESC
    LIMIT 1;

    IF v_band_id IS NOT NULL THEN
      v_scoring_template_id := v_template_id;
      v_score_class := v_band_class_label;
      v_score_class_description := v_band_description;
      v_snapshot := jsonb_build_object(
        'class', v_band_class_label,
        'description', v_band_description,
        'minScore', v_band_min_score,
        'maxScore', v_band_max_score,
        'templateId', v_template_id,
        'templateTitle', v_template_title,
        'templateMaxScore', v_template_max_score,
        'score', p_score,
        'total', p_total,
        'percentage', v_score_percentage
      );
    END IF;
  END IF;

  INSERT INTO public.quiz_results (
    user_id,
    lesson_id,
    quiz_id,
    score,
    total,
    answers,
    scoring_template_id,
    score_class,
    score_class_description,
    score_percentage,
    score_snapshot_json
  )
  VALUES (
    v_user_id,
    p_lesson_id,
    p_quiz_id,
    p_score,
    p_total,
    p_answers,
    v_scoring_template_id,
    v_score_class,
    v_score_class_description,
    v_score_percentage,
    v_snapshot
  )
  RETURNING quiz_results.id INTO v_attempt_id;

  RETURN QUERY
  SELECT
    v_attempt_id,
    v_scoring_template_id,
    v_score_class,
    v_score_class_description,
    v_score_percentage,
    v_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.save_quiz_result_with_grade(uuid, uuid, integer, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_quiz_result_with_grade(uuid, uuid, integer, integer, jsonb) TO authenticated;

DROP FUNCTION IF EXISTS public.get_quiz_history(int);

CREATE FUNCTION public.get_quiz_history(p_limit int DEFAULT 50)
RETURNS TABLE (
  id                       uuid,
  lesson_id                uuid,
  lesson_title             text,
  subject_id               uuid,
  subject_title            text,
  quiz_id                  uuid,
  quiz_title               text,
  score                    int,
  total                    int,
  scoring_template_id      uuid,
  score_class              text,
  score_class_description  text,
  score_percentage         numeric,
  score_snapshot_json      jsonb,
  submitted_at             timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    qr.id,
    qr.lesson_id,
    l.title       AS lesson_title,
    l.subject_id,
    s.title       AS subject_title,
    q.id          AS quiz_id,
    q.title       AS quiz_title,
    qr.score,
    qr.total,
    qr.scoring_template_id,
    qr.score_class,
    qr.score_class_description,
    qr.score_percentage,
    qr.score_snapshot_json,
    qr.submitted_at
  FROM public.quiz_results qr
  JOIN public.lessons  l ON l.id = qr.lesson_id
  JOIN public.subjects s ON s.id = l.subject_id
  LEFT JOIN public.quizzes q ON q.id = qr.quiz_id
  WHERE qr.user_id = auth.uid()
  ORDER BY qr.submitted_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.save_quiz_result_with_grade(uuid, uuid, integer, integer, jsonb) IS
  'Authenticated quiz-result insert that freezes the matched lesson scoring band, when available.';

COMMENT ON FUNCTION public.get_quiz_history(int) IS
  'Returns the calling user''s quiz attempts (newest first) joined with lesson, subject, problem set, and frozen score class details.';

REVOKE ALL ON FUNCTION public.get_quiz_history(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_history(int) TO authenticated;

NOTIFY pgrst, 'reload schema';

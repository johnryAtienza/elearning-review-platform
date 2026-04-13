-- ============================================================
--  SCRIPT: reset_lesson_progress
--
--  Resets all users' watched lesson progress.
--
--  Two options are provided below — choose one:
--
--  Option A (HARD RESET — recommended)
--    Deletes every row. The table is left empty. Users start
--    from zero; rows will be re-created as they re-watch lessons.
--
--  Option B (SOFT RESET)
--    Keeps every row but marks every lesson as un-watched and
--    clears the watched_at timestamp. Useful if you want to
--    preserve the record that a row exists while wiping state.
--
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── Option A: Hard reset (DELETE) ───────────────────────────────────────────
--
--  Uncomment the block below to use this option.
--  Comment out Option B first.

DELETE FROM public.lesson_progress;


-- ── Option B: Soft reset (UPDATE) ───────────────────────────────────────────
--
--  Comment out Option A above, then uncomment the block below.

-- UPDATE public.lesson_progress
-- SET
--   is_watched = false,
--   watched_at = NULL,
--   updated_at = NOW()
-- WHERE is_watched = true;


-- ── Verification ─────────────────────────────────────────────────────────────
--
--  Run this after the reset to confirm the result.

SELECT
  COUNT(*)                                          AS total_rows,
  COUNT(*) FILTER (WHERE is_watched = true)         AS still_watched   -- should be 0
FROM public.lesson_progress;

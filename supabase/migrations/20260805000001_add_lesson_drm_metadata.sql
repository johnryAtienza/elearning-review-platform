-- ============================================================
-- MIGRATION: add_lesson_drm_metadata
--
-- Backward-compatible DRM migration metadata. Existing lessons continue to
-- use video_url until an asset is packaged, encrypted, licensed, and tested.
-- Only rows explicitly marked drm_enabled=true and processing_status='ready'
-- are eligible for the DRM playback path.
-- ============================================================

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS drm_provider text,
  ADD COLUMN IF NOT EXISTS drm_asset_id text,
  ADD COLUMN IF NOT EXISTS drm_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS drm_processing_status text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS drm_dash_manifest_url text,
  ADD COLUMN IF NOT EXISTS drm_hls_manifest_url text,
  ADD COLUMN IF NOT EXISTS drm_original_source text,
  ADD COLUMN IF NOT EXISTS drm_last_processing_error text,
  ADD COLUMN IF NOT EXISTS drm_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS drm_migrated_at timestamptz;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_drm_processing_status_check;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_drm_processing_status_check
  CHECK (drm_processing_status IN ('legacy', 'pending', 'processing', 'ready', 'failed', 'retired'));

COMMENT ON COLUMN public.lessons.drm_provider IS
  'Opaque provider identifier, e.g. the selected multi-DRM vendor. No provider secret.';
COMMENT ON COLUMN public.lessons.drm_asset_id IS
  'Provider asset identifier used by the server-side DRM session broker.';
COMMENT ON COLUMN public.lessons.drm_enabled IS
  'When true, playback must use the DRM session path; legacy video_url is retained for rollback until retired.';
COMMENT ON COLUMN public.lessons.drm_processing_status IS
  'Migration state. Only ready assets are eligible for DRM playback.';
COMMENT ON COLUMN public.lessons.drm_dash_manifest_url IS
  'Optional provider manifest reference. The broker may override it with a short-lived URL.';
COMMENT ON COLUMN public.lessons.drm_hls_manifest_url IS
  'Optional FairPlay/HLS manifest reference. The broker may override it with a short-lived URL.';
COMMENT ON COLUMN public.lessons.drm_original_source IS
  'Internal source object reference used for reprocessing; never returned to students.';
COMMENT ON COLUMN public.lessons.drm_last_processing_error IS
  'Operational error retained for admin migration tooling; never returned to students.';

CREATE INDEX IF NOT EXISTS lessons_drm_ready_idx
  ON public.lessons (drm_enabled, drm_processing_status)
  WHERE drm_enabled = true;

CREATE UNIQUE INDEX IF NOT EXISTS lessons_drm_provider_asset_idx
  ON public.lessons (drm_provider, drm_asset_id)
  WHERE drm_provider IS NOT NULL AND drm_asset_id IS NOT NULL;

-- Do not expose these fields through the student-safe lesson_previews view.
-- Existing video_url remains intact for the controlled coexistence period.

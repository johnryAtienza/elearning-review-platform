/**
 * lessonUploadService.ts
 *
 * Service layer for persisting lesson file paths after upload.
 * Components call this instead of importing supabaseClient directly.
 */

import { supabase } from '@/services/supabaseClient'
import { ApiError } from '@/services/ApiError'

export interface LessonFileUpdate {
  videoPath?: string
  pdfPath?: string
}

/**
 * Saves the R2 storage paths for a lesson's video and/or PDF.
 * Passes empty string to clear a field.
 */
export async function updateLessonFiles(
  lessonId: string,
  update: LessonFileUpdate,
): Promise<void> {
  const patch: Record<string, string> = {}
  if (update.videoPath !== undefined) patch.video_url        = update.videoPath
  if (update.pdfPath   !== undefined) patch.reviewer_pdf_url = update.pdfPath

  if (Object.keys(patch).length === 0) return

  const { error } = await supabase
    .from('lessons')
    .update(patch)
    .eq('id', lessonId)

  if (error) {
    throw new ApiError(500, 'LESSON_UPDATE_FAILED', error.message)
  }
}

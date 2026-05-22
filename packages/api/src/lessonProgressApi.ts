/**
 * lessonProgressApi.ts
 *
 * Reads and writes per-user lesson watch progress from the
 * `lesson_progress` Supabase table.
 *
 * RLS ensures each user can only touch their own rows.
 */

import { supabase } from './supabaseClient'

/**
 * Returns true when the authenticated user has previously marked
 * this lesson as watched. Returns false if unauthenticated or no record.
 */
export async function getLessonWatchedStatus(lessonId: string): Promise<boolean> {
  const { data } = await supabase
    .from('lesson_progress')
    .select('is_watched')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  return data?.is_watched ?? false
}

/**
 * Upserts an `is_watched = true` row for the current user + lesson.
 * Idempotent — safe to call multiple times.
 */
export async function markLessonWatched(lessonId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id:    user.id,
        lesson_id:  lessonId,
        is_watched: true,
        watched_at: now,
        updated_at: now,
      },
      { onConflict: 'user_id,lesson_id' },
    )

  if (error) throw new Error(error.message)
}

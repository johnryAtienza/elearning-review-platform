/**
 * savedSubjectsApi.ts
 *
 * All Supabase queries for the saved_subjects table and related
 * dashboard RPC functions.
 *
 * Prerequisites:
 *   - 20260606000001_rename_to_course_subject_hierarchy migration must be applied
 *
 * Naming note: this file was savedCoursesApi.ts before the Phase 1 DB rename.
 * Exported type identifiers (`CourseProgress`, `DashboardStats`) and field
 * names (`coursesSaved`, `courseId`) still use the old vocabulary because
 * Phase 3 of the domain refactor renames those types. The mapper below
 * bridges the new DB column / RPC field names (snake_case) to the
 * still-old TS property names (camelCase) — Phase 3 catches the TS side up.
 */

import { supabase } from './supabaseClient'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CourseProgress {
  courseId:       string
  watchedLessons: number
  totalLessons:   number
  addedAt:        string
}

export interface DashboardStats {
  coursesSaved:     number
  lessonsCompleted: number
  quizzesTaken:     number
}

// ── Saved subjects ────────────────────────────────────────────────────────────

/** Returns the IDs of all subjects the user has saved, newest first. */
export async function getSavedSubjectIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_subjects')
    .select('subject_id')
    .order('added_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.subject_id as string)
}

/**
 * Saves a subject to the user's dashboard.
 * Idempotent — safe to call if already saved.
 */
export async function addSavedSubject(subjectId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('saved_subjects')
    .upsert(
      { user_id: user.id, subject_id: subjectId },
      { onConflict: 'user_id,subject_id' },
    )

  if (error) throw new Error(error.message)
}

/** Removes a subject from the user's dashboard. */
export async function removeSavedSubject(subjectId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('saved_subjects')
    .delete()
    .eq('user_id', user.id)
    .eq('subject_id', subjectId)

  if (error) throw new Error(error.message)
}

// ── Progress & stats ──────────────────────────────────────────────────────────

/**
 * Returns per-subject progress (watched + total lessons) for all saved subjects.
 * Uses the get_saved_subjects_progress() RPC defined in the Phase 1 migration.
 */
export async function getSavedSubjectsProgress(): Promise<CourseProgress[]> {
  const { data, error } = await supabase.rpc('get_saved_subjects_progress')
  if (error) throw new Error(error.message)

  return ((data as unknown[]) ?? []).map((row) => {
    const r = row as {
      subject_id:      string
      watched_lessons: number
      total_lessons:   number
      added_at:        string
    }
    return {
      courseId:       r.subject_id,
      watchedLessons: Number(r.watched_lessons),
      totalLessons:   Number(r.total_lessons),
      addedAt:        r.added_at,
    }
  })
}

/**
 * Returns aggregated dashboard metrics for the calling user.
 * Uses the get_dashboard_stats() RPC. The JSON key `subjects_saved` was
 * renamed from `courses_saved` in the Phase 1 migration; the TS property
 * `coursesSaved` is kept until Phase 3 renames the DashboardStats type.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  if (error) throw new Error(error.message)

  const d = data as {
    subjects_saved:    number
    lessons_completed: number
    quizzes_taken:     number
  }

  return {
    coursesSaved:     d.subjects_saved    ?? 0,
    lessonsCompleted: d.lessons_completed ?? 0,
    quizzesTaken:     d.quizzes_taken     ?? 0,
  }
}

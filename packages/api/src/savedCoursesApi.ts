/**
 * savedCoursesApi.ts
 *
 * All Supabase queries for the saved_courses table and related
 * dashboard RPC functions.
 *
 * Prerequisites:
 *   - add_saved_courses.sql migration must be run in Supabase
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

// ── Saved courses ─────────────────────────────────────────────────────────────

/** Returns the IDs of all courses the user has saved, newest first. */
export async function getSavedCourseIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_courses')
    .select('course_id')
    .order('added_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.course_id as string)
}

/**
 * Saves a course to the user's dashboard.
 * Idempotent — safe to call if already saved.
 */
export async function addSavedCourse(courseId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('saved_courses')
    .upsert(
      { user_id: user.id, course_id: courseId },
      { onConflict: 'user_id,course_id' },
    )

  if (error) throw new Error(error.message)
}

/** Removes a course from the user's dashboard. */
export async function removeSavedCourse(courseId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('saved_courses')
    .delete()
    .eq('user_id', user.id)
    .eq('course_id', courseId)

  if (error) throw new Error(error.message)
}

// ── Progress & stats ──────────────────────────────────────────────────────────

/**
 * Returns per-course progress (watched + total lessons) for all saved courses.
 * Uses the get_saved_courses_progress() RPC defined in add_saved_courses.sql.
 */
export async function getSavedCoursesProgress(): Promise<CourseProgress[]> {
  const { data, error } = await supabase.rpc('get_saved_courses_progress')
  if (error) throw new Error(error.message)

  return ((data as unknown[]) ?? []).map((row) => {
    const r = row as {
      course_id:       string
      watched_lessons: number
      total_lessons:   number
      added_at:        string
    }
    return {
      courseId:       r.course_id,
      watchedLessons: Number(r.watched_lessons),
      totalLessons:   Number(r.total_lessons),
      addedAt:        r.added_at,
    }
  })
}

/**
 * Returns aggregated dashboard metrics for the calling user.
 * Uses the get_dashboard_stats() RPC defined in add_saved_courses.sql.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats')
  if (error) throw new Error(error.message)

  const d = data as {
    courses_saved:     number
    lessons_completed: number
    quizzes_taken:     number
  }

  return {
    coursesSaved:     d.courses_saved     ?? 0,
    lessonsCompleted: d.lessons_completed ?? 0,
    quizzesTaken:     d.quizzes_taken     ?? 0,
  }
}

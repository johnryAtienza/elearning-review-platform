/**
 * quizResultsApi.ts
 *
 * Reads and writes per-user quiz results from the `quiz_results`
 * Supabase table.
 *
 * RLS ensures each user can only insert their own rows (and only
 * for subscribed users or Day-1-free lessons).
 *
 * Prerequisites:
 *   - 20260520000002_quiz_results_history.sql migration must be run
 */

import { supabase } from './supabaseClient'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuizAttempt {
  id:          string
  lessonId:    string
  lessonTitle: string
  courseId:    string
  courseTitle: string
  score:       number
  total:       number
  submittedAt: string
}

export interface SaveQuizResultInput {
  lessonId: string
  score:    number
  total:    number
  answers:  Record<string, number>
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Inserts a new quiz_results row for the current user.
 * Every call is a new row — the UNIQUE constraint was dropped so
 * retries become separate history entries.
 *
 * Returns true on success, false if the RLS check blocked the insert
 * (e.g. free user submitting a non-Day-1 quiz). Never throws — the
 * caller treats failure as "skip persistence" rather than crashing
 * the quiz UI.
 */
export async function saveQuizResult(input: SaveQuizResultInput): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('quiz_results')
    .insert({
      user_id:   user.id,
      lesson_id: input.lessonId,
      score:     input.score,
      total:     input.total,
      answers:   input.answers,
    })

  return !error
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Returns the user's quiz attempts (newest first), joined with
 * lesson and course titles. Uses the get_quiz_history() RPC.
 */
export async function getQuizHistory(limit = 50): Promise<QuizAttempt[]> {
  const { data, error } = await supabase.rpc('get_quiz_history', { p_limit: limit })
  if (error) throw new Error(error.message)

  return ((data as unknown[]) ?? []).map((row) => {
    const r = row as {
      id:           string
      lesson_id:    string
      lesson_title: string
      course_id:    string
      course_title: string
      score:        number
      total:        number
      submitted_at: string
    }
    return {
      id:          r.id,
      lessonId:    r.lesson_id,
      lessonTitle: r.lesson_title,
      courseId:    r.course_id,
      courseTitle: r.course_title,
      score:       Number(r.score),
      total:       Number(r.total),
      submittedAt: r.submitted_at,
    }
  })
}

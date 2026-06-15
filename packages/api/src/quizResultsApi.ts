/**
 * quizResultsApi.ts
 *
 * Reads and writes per-user quiz results from the `quiz_results`
 * Supabase table.
 *
 * RLS ensures each user can only insert their own rows (and only
 * for subscribed users or authenticated free-preview lessons).
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
  quizId:      string | null
  quizTitle:   string | null
  score:       number
  total:       number
  submittedAt: string
}

export interface QuizAttemptDetail extends QuizAttempt {
  answers: Record<string, number>
}

export interface SaveQuizResultInput {
  quizId:   string
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
 * (e.g. free user submitting a non-preview lesson quiz). Never throws — the
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
      quiz_id:   input.quizId,
      score:     input.score,
      total:     input.total,
      answers:   input.answers,
    })

  if (error) {
    console.error('Failed to save quiz result', {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
      quizId: input.quizId,
      lessonId: input.lessonId,
      total: input.total,
      answerCount: Object.keys(input.answers).length,
    })
    return false
  }

  return true
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Returns the user's quiz attempts (newest first), joined with
 * lesson, subject, and problem set titles. Uses the get_quiz_history() RPC.
 *
 * The RPC return shape changed in the Phase 1 migration:
 * `course_id` / `course_title` → `subject_id` / `subject_title`.
 * The QuizAttempt TS fields (`courseId`, `courseTitle`) keep their
 * old names until a future cleanup; the values point at the parent
 * SUBJECT.
 */
export async function getQuizHistory(limit = 50): Promise<QuizAttempt[]> {
  const { data, error } = await supabase.rpc('get_quiz_history', { p_limit: limit })
  if (error) throw new Error(error.message)

  return ((data as unknown[]) ?? []).map((row) => {
    const r = row as {
      id:            string
      lesson_id:     string
      lesson_title:  string
      subject_id:    string
      subject_title: string
      quiz_id:       string | null
      quiz_title:    string | null
      score:         number
      total:         number
      submitted_at:  string
    }
    return {
      id:          r.id,
      lessonId:    r.lesson_id,
      lessonTitle: r.lesson_title,
      courseId:    r.subject_id,
      courseTitle: r.subject_title,
      quizId:      r.quiz_id,
      quizTitle:   r.quiz_title,
      score:       Number(r.score),
      total:       Number(r.total),
      submittedAt: r.submitted_at,
    }
  })
}

export async function getQuizAttempt(attemptId: string): Promise<QuizAttemptDetail | null> {
  const { data, error } = await supabase
    .from('quiz_results')
    .select(`
      id,
      lesson_id,
      quiz_id,
      score,
      total,
      answers,
      submitted_at,
      lessons!inner (
        title,
        subject_id,
        subjects!inner (
          title
        )
      ),
      quizzes (
        title
      )
    `)
    .eq('id', attemptId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as unknown as {
    id: string
    lesson_id: string
    quiz_id: string | null
    score: number
    total: number
    answers: Record<string, number>
    submitted_at: string
    lessons: {
      title: string
      subject_id: string
      subjects: {
        title: string
      }
    }
    quizzes: {
      title: string | null
    } | null
  }

  return {
    id:          row.id,
    lessonId:    row.lesson_id,
    lessonTitle: row.lessons.title,
    courseId:    row.lessons.subject_id,
    courseTitle: row.lessons.subjects.title,
    quizId:      row.quiz_id,
    quizTitle:   row.quizzes?.title ?? null,
    score:       Number(row.score),
    total:       Number(row.total),
    answers:     row.answers ?? {},
    submittedAt: row.submitted_at,
  }
}

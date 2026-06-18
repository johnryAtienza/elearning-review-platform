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
import type { QuizGradeSnapshot } from '@s-class/types/quiz'

// ── Types ─────────────────────────────────────────────────────────────────────

type GradeRow = {
  scoring_template_id: string | null
  score_class: string | null
  score_class_description: string | null
  score_percentage: number | string | null
  score_snapshot_json: unknown
}

export interface QuizAttempt {
  id:                    string
  lessonId:              string
  lessonTitle:           string
  courseId:              string
  courseTitle:           string
  quizId:                string | null
  quizTitle:             string | null
  score:                 number
  total:                 number
  scoringTemplateId:     string | null
  scoreClass:            string | null
  scoreClassDescription: string | null
  scorePercentage:       number | null
  scoreSnapshotJson:     Record<string, unknown> | null
  grade:                 QuizGradeSnapshot | null
  submittedAt:           string
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

export interface SaveQuizResultResponse {
  ok:              boolean
  attemptId:       string | null
  grade:           QuizGradeSnapshot | null
  scorePercentage: number | null
}

const UNSAVED_QUIZ_RESULT: SaveQuizResultResponse = {
  ok:              false,
  attemptId:       null,
  grade:           null,
  scorePercentage: null,
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Inserts a new quiz_results row for the current user through the grading RPC.
 * Every call is a new row — the UNIQUE constraint was dropped so
 * retries become separate history entries.
 *
 * Returns the saved attempt's frozen grade snapshot when one exists. Returns
 * ok: false if the RLS/eligibility check blocked the insert
 * (e.g. free user submitting a non-preview lesson quiz). Never throws — the
 * caller treats failure as "skip persistence" rather than crashing
 * the quiz UI.
 */
export async function saveQuizResult(input: SaveQuizResultInput): Promise<SaveQuizResultResponse> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return UNSAVED_QUIZ_RESULT

  const { data, error } = await supabase.rpc('save_quiz_result_with_grade', {
    p_quiz_id:   input.quizId,
    p_lesson_id: input.lessonId,
    p_score:     input.score,
    p_total:     input.total,
    p_answers:   input.answers,
  })

  if (error) {
    console.error('Failed to save quiz result', {
      code:        error.code,
      details:     error.details,
      hint:        error.hint,
      message:     error.message,
      quizId:      input.quizId,
      lessonId:    input.lessonId,
      total:       input.total,
      answerCount: Object.keys(input.answers).length,
    })
    return UNSAVED_QUIZ_RESULT
  }

  const row = (Array.isArray(data) ? data[0] : data) as (GradeRow & { id: string | null }) | undefined

  return {
    ok:              true,
    attemptId:       row?.id ?? null,
    grade:           row ? toQuizGradeSnapshot(row) : null,
    scorePercentage: row ? toNumberOrNull(row.score_percentage) : null,
  }
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
      id:                       string
      lesson_id:                string
      lesson_title:             string
      subject_id:               string
      subject_title:            string
      quiz_id:                  string | null
      quiz_title:               string | null
      score:                    number
      total:                    number
      scoring_template_id:      string | null
      score_class:              string | null
      score_class_description:  string | null
      score_percentage:         number | string | null
      score_snapshot_json:      unknown
      submitted_at:             string
    }
    const grade = toQuizGradeSnapshot(r)
    return {
      id:                    r.id,
      lessonId:              r.lesson_id,
      lessonTitle:           r.lesson_title,
      courseId:              r.subject_id,
      courseTitle:           r.subject_title,
      quizId:                r.quiz_id,
      quizTitle:             r.quiz_title,
      score:                 Number(r.score),
      total:                 Number(r.total),
      scoringTemplateId:     r.scoring_template_id,
      scoreClass:            r.score_class,
      scoreClassDescription: r.score_class_description,
      scorePercentage:       toNumberOrNull(r.score_percentage),
      scoreSnapshotJson:     toRecordOrNull(r.score_snapshot_json),
      grade,
      submittedAt:           r.submitted_at,
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
      scoring_template_id,
      score_class,
      score_class_description,
      score_percentage,
      score_snapshot_json,
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
    scoring_template_id: string | null
    score_class: string | null
    score_class_description: string | null
    score_percentage: number | string | null
    score_snapshot_json: unknown
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

  const grade = toQuizGradeSnapshot(row)

  return {
    id:                    row.id,
    lessonId:              row.lesson_id,
    lessonTitle:           row.lessons.title,
    courseId:              row.lessons.subject_id,
    courseTitle:           row.lessons.subjects.title,
    quizId:                row.quiz_id,
    quizTitle:             row.quizzes?.title ?? null,
    score:                 Number(row.score),
    total:                 Number(row.total),
    answers:               row.answers ?? {},
    scoringTemplateId:     row.scoring_template_id,
    scoreClass:            row.score_class,
    scoreClassDescription: row.score_class_description,
    scorePercentage:       toNumberOrNull(row.score_percentage),
    scoreSnapshotJson:     toRecordOrNull(row.score_snapshot_json),
    grade,
    submittedAt:           row.submitted_at,
  }
}

// ── Grade snapshots ──────────────────────────────────────────────────────────

function toQuizGradeSnapshot(row: GradeRow): QuizGradeSnapshot | null {
  const snapshot = toRecordOrNull(row.score_snapshot_json)
  const classLabel = toStringOrNull(row.score_class) ?? toStringOrNull(snapshot?.class)

  if (!classLabel) return null

  return {
    templateId:       row.scoring_template_id ?? toStringOrNull(snapshot?.templateId),
    templateTitle:    toStringOrNull(snapshot?.templateTitle),
    templateMaxScore: toNumberOrNull(snapshot?.templateMaxScore),
    classLabel,
    description:      toStringOrNull(row.score_class_description) ?? toStringOrNull(snapshot?.description),
    minScore:         toNumberOrNull(snapshot?.minScore),
    maxScore:         toNumberOrNull(snapshot?.maxScore),
    scorePercentage:  toNumberOrNull(row.score_percentage) ?? toNumberOrNull(snapshot?.percentage),
    snapshot,
  }
}

function toRecordOrNull(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

/**
 * lesson.service.ts
 *
 * All Supabase queries for lesson data live here.
 * Only the lesson_previews view is queried from the browser — it exposes
 * metadata (title, description, order, duration) to ALL authenticated users
 * regardless of subscription status.
 *
 * video_url and reviewer_pdf_url are NEVER fetched by the browser directly.
 * They are read server-side by the get-signed-urls Edge Function, which checks
 * subscription and returns short-lived presigned R2 GET URLs.
 *
 * Called by lessonApi.ts when VITE_AUTH_PROVIDER=supabase.
 */

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import type { Lesson, ReviewerContent } from '@/features/lessons/types'

// ── Raw DB row shapes ─────────────────────────────────────────────────────────

interface LessonPreviewRow {
  id: string
  course_id: string
  title: string
  description: string
  order: number
  duration: string
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function toAppLesson(row: LessonPreviewRow): Lesson {
  return {
    id:          row.id,
    courseId:    row.course_id,
    order:       row.order,
    title:       row.title,
    description: row.description,
    duration:    row.duration,
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch the preview list of lessons for a course.
 * Queries the `lesson_previews` view — excludes premium columns.
 * Accessible to all authenticated users regardless of subscription.
 */
export async function getLessonsByCourseId(courseId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('lesson_previews')
    .select('id, course_id, title, description, order, duration')
    .eq('course_id', courseId)
    .order('order', { ascending: true })

  if (error) {
    throw new ApiError(500, 'LESSONS_FETCH_FAILED', error.message)
  }

  return (data as LessonPreviewRow[]).map(toAppLesson)
}

/**
 * Fetch a single lesson's preview metadata by ID.
 * Queries `lesson_previews` — accessible to ALL authenticated users regardless
 * of subscription. Does NOT return video_url or reviewer_pdf_url; those are
 * fetched server-side by the get-signed-urls Edge Function.
 */
export async function getLessonPreviewById(lessonId: string): Promise<Lesson | undefined> {
  const { data, error } = await supabase
    .from('lesson_previews')
    .select('id, course_id, title, description, order, duration')
    .eq('id', lessonId)
    .maybeSingle()

  if (error) {
    throw new ApiError(500, 'LESSON_FETCH_FAILED', error.message)
  }

  return data ? toAppLesson(data as LessonPreviewRow) : undefined
}

/**
 * Fetch reviewer content for a lesson.
 *
 * The DB schema stores reviewer_pdf_url on the lessons row.
 * If your backend stores structured text (summary + keyPoints) instead,
 * point this query at a `reviewer_contents` table.
 *
 * Currently returns undefined when only a PDF URL is available —
 * structured text content is still served from mock data in that case.
 */
export async function getReviewerContent(_lessonId: string): Promise<ReviewerContent | undefined> {
  // TODO: query a `reviewer_contents` table once structured content is in the DB.
  // const { data } = await supabase
  //   .from('reviewer_contents')
  //   .select('summary, key_points')
  //   .eq('lesson_id', lessonId)
  //   .maybeSingle()
  // return data ? { summary: data.summary, keyPoints: data.key_points } : undefined
  return undefined
}

/**
 * course.service.ts
 *
 * All Supabase queries for the courses table live here.
 * Nothing outside this file imports from supabaseClient directly
 * for course-related data.
 *
 * Called by courseApi.ts when VITE_AUTH_PROVIDER=supabase.
 */

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import type { Course } from '@/features/courses/types'

// ── Raw DB row shape returned by Supabase ─────────────────────────────────────

interface CourseRow {
  id: string
  title: string
  description: string
  thumbnail: string
  category: string
  duration: string
  lessons: [{ count: number }]   // embedded count from .select('lessons(count)')
}

// ── Mapper: DB row → app type ─────────────────────────────────────────────────

function toAppCourse(row: CourseRow): Course {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description,
    thumbnail:   row.thumbnail,
    category:    row.category,
    duration:    row.duration,
    lessons:     row.lessons?.[0]?.count ?? 0,
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch all published courses, each including a lesson count.
 * Uses the `lessons(count)` embedded relation supported by Supabase.
 */
export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, thumbnail, category, duration, lessons:lessons(count)')
    .eq('is_published', true)
    .order('created_at', { ascending: true })

  if (error) {
    throw new ApiError(500, 'COURSES_FETCH_FAILED', error.message)
  }

  return (data as unknown as CourseRow[]).map(toAppCourse)
}

/**
 * Fetch a single published course by ID, including its lesson count.
 * Returns undefined when the course does not exist or is unpublished.
 */
export async function getCourseById(id: string): Promise<Course | undefined> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, thumbnail, category, duration, lessons:lessons(count)')
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (error) {
    throw new ApiError(500, 'COURSE_FETCH_FAILED', error.message)
  }

  return data ? toAppCourse(data as unknown as CourseRow) : undefined
}

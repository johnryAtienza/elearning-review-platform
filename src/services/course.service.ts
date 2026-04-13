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

interface CategoryRef {
  id: string
  name: string
  slug: string
}

interface CourseRow {
  id: string
  title: string
  description: string
  thumbnail: string
  thumbnail_url: string | null
  category: string
  category_id: string | null
  /** Joined from categories table via category_id FK */
  cat: CategoryRef | null
  duration: string
  difficulty: string | null
  tags: string[] | null
  created_at: string
  is_published: boolean
  lessons: [{ count: number }]
}

const COURSE_SELECT =
  'id, title, description, thumbnail, thumbnail_url, category, category_id, duration, difficulty, tags, created_at, is_published, lessons:lessons(count), cat:categories(id,name,slug)'

// ── Mapper: DB row → app type ─────────────────────────────────────────────────

function toAppCourse(row: CourseRow): Course {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description,
    thumbnail:   row.thumbnail,
    thumbnailUrl: row.thumbnail_url ?? null,
    // Prefer joined category name; fall back to legacy text column
    category:    row.cat?.name ?? row.category ?? '',
    categoryId:  row.category_id ?? null,
    duration:    row.duration,
    difficulty:  (row.difficulty as Course['difficulty']) ?? undefined,
    tags:        row.tags ?? [],
    createdAt:   row.created_at,
    isPublished: row.is_published,
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
    .select(COURSE_SELECT)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

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
    .select(COURSE_SELECT)
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (error) {
    throw new ApiError(500, 'COURSE_FETCH_FAILED', error.message)
  }

  return data ? toAppCourse(data as unknown as CourseRow) : undefined
}

/**
 * Admin-only: fetch a course by ID regardless of published status.
 * Used to allow admins to preview draft courses.
 */
export async function getCourseByIdAdmin(id: string): Promise<Course | undefined> {
  const { data, error } = await supabase
    .from('courses')
    .select(COURSE_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new ApiError(500, 'COURSE_FETCH_FAILED', error.message)
  }

  return data ? toAppCourse(data as unknown as CourseRow) : undefined
}

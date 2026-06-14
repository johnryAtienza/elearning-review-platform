/**
 * coursesApi.ts
 *
 * All Supabase queries for the courses table (the parent grouping in the
 * Course → Subject hierarchy). Public read is open to everyone; write
 * operations require admin role (enforced by RLS).
 */

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import type { Course, CourseStatus } from '@s-class/types/courses'

// ── Raw DB row ─────────────────────────────────────────────────────────────────

interface CourseRow {
  id: string
  name: string
  slug: string
  description: string | null
  status: CourseStatus | null
  created_at: string
  /** Reverse-FK count of subjects assigned to this course. */
  subjects?: { count: number }[]
}

function toAppCourse(row: CourseRow): Course {
  return {
    id:          row.id,
    name:        row.name,
    slug:        row.slug,
    description: row.description,
    status:      row.status ?? 'published',
    createdAt:   row.created_at,
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Fetch all courses ordered by name — for dropdowns and filter pills. */
export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, name, slug, description, status, created_at')
    .order('name')

  if (error) throw new ApiError(500, 'COURSES_FETCH_FAILED', error.message)

  return (data as CourseRow[]).map(toAppCourse)
}

/** Fetch courses visible in public navigation and marketing surfaces. */
export async function getPublishedCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, name, slug, description, status, created_at')
    .eq('status', 'published')
    .order('name')

  if (error) throw new ApiError(500, 'COURSES_FETCH_FAILED', error.message)

  return (data as CourseRow[]).map(toAppCourse)
}

/** Fetch all courses including the number of subjects assigned to each. */
export async function getCoursesWithCount(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, name, slug, description, status, created_at, subjects:subjects(count)')
    .order('name')

  if (error) throw new ApiError(500, 'COURSES_FETCH_FAILED', error.message)

  return (data as CourseRow[]).map((row) => ({
    ...toAppCourse(row),
    subjectCount: row.subjects?.[0]?.count ?? 0,
  }))
}

/** Create a new course. Throws if name or slug is already taken. */
export async function createCourse(data: {
  name: string
  slug: string
  description?: string
  status?: CourseStatus
}): Promise<Course> {
  const { data: row, error } = await supabase
    .from('courses')
    .insert({
      name:        data.name.trim(),
      slug:        data.slug.trim(),
      description: data.description?.trim() || null,
      status:      data.status ?? 'draft',
    })
    .select('id, name, slug, description, status, created_at')
    .single()

  if (error) throw new ApiError(500, 'COURSE_CREATE_FAILED', error.message)

  return toAppCourse(row as CourseRow)
}

/** Update name, slug, description, and/or status of an existing course. */
export async function updateCourse(
  id: string,
  data: Partial<{ name: string; slug: string; description: string; status: CourseStatus }>,
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (data.name        !== undefined) update.name        = data.name.trim()
  if (data.slug        !== undefined) update.slug        = data.slug.trim()
  if (data.description !== undefined) update.description = data.description?.trim() || null
  if (data.status      !== undefined) update.status      = data.status

  const { error } = await supabase
    .from('courses')
    .update(update)
    .eq('id', id)

  if (error) throw new ApiError(500, 'COURSE_UPDATE_FAILED', error.message)
}

/** Delete a course. Subjects with this course will have course_id set to NULL. */
export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id)

  if (error) throw new ApiError(500, 'COURSE_DELETE_FAILED', error.message)
}

// ── Slug helper ───────────────────────────────────────────────────────────────

/** Converts a display name to a URL-safe slug. */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

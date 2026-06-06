/**
 * coursesApi.ts
 *
 * All Supabase queries for the courses table (the parent grouping in the
 * Course → Subject hierarchy). Public read is open to everyone; write
 * operations require admin role (enforced by RLS).
 *
 * Naming note: this file was categoriesApi.ts before the Phase 1 DB rename.
 * The public TS type `Category` (still in @s-class/types/categories) will be
 * renamed to `Course` in Phase 3; for now the mapper outputs the old
 * `Category` shape against the new `courses` table.
 */

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import type { Category } from '@s-class/types/categories'

// ── Raw DB row ─────────────────────────────────────────────────────────────────

interface CourseRow {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
  /** Reverse-FK count of subjects assigned to this course. */
  subjects?: { count: number }[]
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Fetch all courses ordered by name — for dropdowns and filter pills. */
export async function getAllCourses(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, name, slug, description, created_at')
    .order('name')

  if (error) throw new ApiError(500, 'COURSES_FETCH_FAILED', error.message)

  return (data as CourseRow[]).map((row) => ({
    id:          row.id,
    name:        row.name,
    slug:        row.slug,
    description: row.description,
    createdAt:   row.created_at,
  }))
}

/** Fetch all courses including the number of subjects assigned to each. */
export async function getCoursesWithCount(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, name, slug, description, created_at, subjects:subjects(count)')
    .order('name')

  if (error) throw new ApiError(500, 'COURSES_FETCH_FAILED', error.message)

  return (data as CourseRow[]).map((row) => ({
    id:          row.id,
    name:        row.name,
    slug:        row.slug,
    description: row.description,
    courseCount: row.subjects?.[0]?.count ?? 0,
    createdAt:   row.created_at,
  }))
}

/** Create a new course. Throws if name or slug is already taken. */
export async function createCourse(data: {
  name: string
  slug: string
  description?: string
}): Promise<Category> {
  const { data: row, error } = await supabase
    .from('courses')
    .insert({
      name:        data.name.trim(),
      slug:        data.slug.trim(),
      description: data.description?.trim() || null,
    })
    .select('id, name, slug, description, created_at')
    .single()

  if (error) throw new ApiError(500, 'COURSE_CREATE_FAILED', error.message)

  const r = row as CourseRow
  return { id: r.id, name: r.name, slug: r.slug, description: r.description, createdAt: r.created_at }
}

/** Update name, slug, and/or description of an existing course. */
export async function updateCourse(
  id: string,
  data: Partial<{ name: string; slug: string; description: string }>,
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (data.name        !== undefined) update.name        = data.name.trim()
  if (data.slug        !== undefined) update.slug        = data.slug.trim()
  if (data.description !== undefined) update.description = data.description?.trim() || null

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

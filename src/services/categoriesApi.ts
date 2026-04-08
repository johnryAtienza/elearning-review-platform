/**
 * categoriesApi.ts
 *
 * All Supabase queries for the categories table.
 * Public read is open to everyone; write operations require admin role (enforced by RLS).
 */

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import type { Category } from '@/features/categories/types'

// ── Raw DB row ─────────────────────────────────────────────────────────────────

interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  created_at: string
  courses?: { count: number }[]
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Fetch all categories ordered by name — for dropdowns and filter pills. */
export async function getAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, created_at')
    .order('name')

  if (error) throw new ApiError(500, 'CATEGORIES_FETCH_FAILED', error.message)

  return (data as CategoryRow[]).map((row) => ({
    id:          row.id,
    name:        row.name,
    slug:        row.slug,
    description: row.description,
    createdAt:   row.created_at,
  }))
}

/** Fetch all categories including the number of courses assigned to each. */
export async function getCategoriesWithCount(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, created_at, courses:courses(count)')
    .order('name')

  if (error) throw new ApiError(500, 'CATEGORIES_FETCH_FAILED', error.message)

  return (data as CategoryRow[]).map((row) => ({
    id:          row.id,
    name:        row.name,
    slug:        row.slug,
    description: row.description,
    courseCount: row.courses?.[0]?.count ?? 0,
    createdAt:   row.created_at,
  }))
}

/** Create a new category. Throws if name or slug is already taken. */
export async function createCategory(data: {
  name: string
  slug: string
  description?: string
}): Promise<Category> {
  const { data: row, error } = await supabase
    .from('categories')
    .insert({
      name:        data.name.trim(),
      slug:        data.slug.trim(),
      description: data.description?.trim() || null,
    })
    .select('id, name, slug, description, created_at')
    .single()

  if (error) throw new ApiError(500, 'CATEGORY_CREATE_FAILED', error.message)

  const r = row as CategoryRow
  return { id: r.id, name: r.name, slug: r.slug, description: r.description, createdAt: r.created_at }
}

/** Update name, slug, and/or description of an existing category. */
export async function updateCategory(
  id: string,
  data: Partial<{ name: string; slug: string; description: string }>,
): Promise<void> {
  const update: Record<string, unknown> = {}
  if (data.name        !== undefined) update.name        = data.name.trim()
  if (data.slug        !== undefined) update.slug        = data.slug.trim()
  if (data.description !== undefined) update.description = data.description?.trim() || null

  const { error } = await supabase
    .from('categories')
    .update(update)
    .eq('id', id)

  if (error) throw new ApiError(500, 'CATEGORY_UPDATE_FAILED', error.message)
}

/** Delete a category. Courses with this category will have category_id set to NULL. */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw new ApiError(500, 'CATEGORY_DELETE_FAILED', error.message)
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

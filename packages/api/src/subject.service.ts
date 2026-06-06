/**
 * subject.service.ts
 *
 * All Supabase queries for the subjects table live here.
 * Nothing outside this file imports from supabaseClient directly
 * for subject-related data.
 *
 * Called by subjectApi.ts when VITE_AUTH_PROVIDER=supabase.
 */

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import type { Subject } from '@s-class/types/subjects'

// ── Raw DB row shape returned by Supabase ─────────────────────────────────────

interface CourseRef {
  id: string
  name: string
  slug: string
}

interface SubjectRow {
  id: string
  title: string
  description: string
  thumbnail: string
  thumbnail_url: string | null
  /** Legacy denormalized field — kept until plan §8a cleanup. */
  category: string
  course_id: string | null
  /** Joined from courses table via course_id FK. */
  course: CourseRef | null
  duration: string
  difficulty: string | null
  tags: string[] | null
  created_at: string
  is_published: boolean
  lessons: [{ count: number }]
}

const SUBJECT_SELECT =
  'id, title, description, thumbnail, thumbnail_url, category, course_id, duration, difficulty, tags, created_at, is_published, lessons:lessons(count), course:courses(id,name,slug)'

// ── Mapper: DB row → app type ─────────────────────────────────────────────────

function toAppSubject(row: SubjectRow): Subject {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description,
    thumbnail:   row.thumbnail,
    thumbnailUrl: row.thumbnail_url ?? null,
    // Prefer joined parent-Course name; fall back to legacy text column
    category:    row.course?.name ?? row.category ?? '',
    courseId:    row.course_id ?? null,
    duration:    row.duration,
    difficulty:  (row.difficulty as Subject['difficulty']) ?? undefined,
    tags:        row.tags ?? [],
    createdAt:   row.created_at,
    isPublished: row.is_published,
    lessons:     row.lessons?.[0]?.count ?? 0,
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch all published subjects, each including a lesson count.
 * Uses the `lessons(count)` embedded relation supported by Supabase.
 */
export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select(SUBJECT_SELECT)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw new ApiError(500, 'SUBJECTS_FETCH_FAILED', error.message)
  }

  return (data as unknown as SubjectRow[]).map(toAppSubject)
}

/**
 * Fetch a single published subject by ID, including its lesson count.
 * Returns undefined when the subject does not exist or is unpublished.
 */
export async function getSubjectById(id: string): Promise<Subject | undefined> {
  const { data, error } = await supabase
    .from('subjects')
    .select(SUBJECT_SELECT)
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle()

  if (error) {
    throw new ApiError(500, 'SUBJECT_FETCH_FAILED', error.message)
  }

  return data ? toAppSubject(data as unknown as SubjectRow) : undefined
}

/**
 * Admin-only: fetch a subject by ID regardless of published status.
 * Used to allow admins to preview draft subjects.
 */
export async function getSubjectByIdAdmin(id: string): Promise<Subject | undefined> {
  const { data, error } = await supabase
    .from('subjects')
    .select(SUBJECT_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new ApiError(500, 'SUBJECT_FETCH_FAILED', error.message)
  }

  return data ? toAppSubject(data as unknown as SubjectRow) : undefined
}

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import {
  DEFAULT_TESTIMONIALS_CONTENT,
  TESTIMONIALS_DB_KEYS,
  TESTIMONIALS_SECTION,
  mergeTestimonialsRows,
  type SiteContentTestimonialsRow,
} from './testimonialsContent'
import type { Testimonial, TestimonialsContent } from '@s-class/types/home'

interface TestimonialRow {
  id: string
  name: string
  initials: string
  title: string
  affiliation: string
  quote: string
  rating: number
  sort_order: number
}

interface TestimonialsStateRow {
  total_count: number
}

function sortByOrder<T extends { sort_order: number; id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
}

function clampRating(rating: number): number {
  if (!Number.isFinite(rating)) return 5
  return Math.min(5, Math.max(1, Math.trunc(rating)))
}

function toTestimonial(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    title: row.title,
    affiliation: row.affiliation,
    quote: row.quote,
    rating: clampRating(row.rating),
    sortOrder: row.sort_order,
  }
}

export async function getPublicTestimonialsContent(): Promise<TestimonialsContent> {
  const { data: sectionRows, error: sectionError } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', TESTIMONIALS_SECTION)
    .in('key', Array.from(TESTIMONIALS_DB_KEYS))

  if (sectionError) {
    throw new ApiError(500, 'TESTIMONIALS_COPY_FETCH_FAILED', sectionError.message)
  }

  const { data: testimonialRows, error: testimonialError } = await supabase
    .from('testimonials')
    .select('id, name, initials, title, affiliation, quote, rating, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (testimonialError) {
    throw new ApiError(500, 'TESTIMONIALS_FETCH_FAILED', testimonialError.message)
  }

  const testimonials = sortByOrder((testimonialRows ?? []) as TestimonialRow[]).map(toTestimonial)

  if (testimonials.length === 0) {
    const { data: stateRow, error: stateError } = await supabase
      .from('testimonials_state')
      .select('total_count')
      .maybeSingle()

    if (stateError) {
      throw new ApiError(500, 'TESTIMONIALS_STATE_FETCH_FAILED', stateError.message)
    }

    if ((stateRow as TestimonialsStateRow | null)?.total_count === 0) {
      return mergeTestimonialsRows(
        sectionRows as SiteContentTestimonialsRow[],
        DEFAULT_TESTIMONIALS_CONTENT.testimonials,
      )
    }
  }

  return mergeTestimonialsRows(sectionRows as SiteContentTestimonialsRow[], testimonials)
}

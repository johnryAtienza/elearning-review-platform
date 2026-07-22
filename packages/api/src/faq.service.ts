import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import {
  DEFAULT_FAQ_CATEGORIES,
  DEFAULT_FAQS,
  FAQ_PAGE_DB_KEYS,
  FAQ_PAGE_SECTION,
  groupFaqsByCategory,
  mergeFaqPageRows,
  type SiteContentFaqPageRow,
} from './faqContent'
import type { FaqCategory, FaqItem, FaqPageData } from '@s-class/types/home'

interface FaqCategoryRow {
  id: string
  name: string
  sort_order: number
}

interface FaqRow {
  id: string
  category: string | null
  category_id: string | null
  question: string
  answer: string
  sort_order: number
}

interface FaqStateRow {
  total_count: number
}

function toFaqCategory(row: FaqCategoryRow): FaqCategory {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  }
}

function toFaqItem(row: FaqRow, categoriesById: Map<string, FaqCategory>): FaqItem | null {
  const linkedCategory = row.category_id ? categoriesById.get(row.category_id) : null
  if (row.category_id && !linkedCategory) return null

  const fallbackCategory = row.category?.trim() || null
  const category = linkedCategory?.name ?? fallbackCategory

  if (!category) return null

  return {
    id: row.id,
    category,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
  }
}

export async function getPublicFaqPage(): Promise<FaqPageData> {
  const { data: pageRows, error: pageError } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', FAQ_PAGE_SECTION)
    .in('key', Array.from(FAQ_PAGE_DB_KEYS))

  if (pageError) throw new ApiError(500, 'FAQ_PAGE_COPY_FETCH_FAILED', pageError.message)

  const { data: categoryRows, error: categoryError } = await supabase
    .from('faq_categories')
    .select('id, name, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (categoryError) throw new ApiError(500, 'FAQ_CATEGORIES_FETCH_FAILED', categoryError.message)

  const categories = ((categoryRows ?? []) as FaqCategoryRow[]).map(toFaqCategory)
  const categoriesById = new Map(categories.map((category) => [category.id, category]))

  const { data: faqRows, error: faqError } = await supabase
    .from('faqs')
    .select('id, category, category_id, question, answer, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (faqError) throw new ApiError(500, 'FAQS_FETCH_FAILED', faqError.message)

  let faqs = ((faqRows ?? []) as FaqRow[])
    .map((row) => toFaqItem(row, categoriesById))
    .filter((faq): faq is FaqItem => faq !== null)

  if (faqs.length === 0) {
    const { data: stateRow, error: stateError } = await supabase
      .from('faqs_state')
      .select('total_count')
      .maybeSingle()

    if (stateError) throw new ApiError(500, 'FAQS_STATE_FETCH_FAILED', stateError.message)

    if ((stateRow as FaqStateRow | null)?.total_count === 0) {
      faqs = DEFAULT_FAQS
    }
  }

  return {
    page: mergeFaqPageRows(pageRows as SiteContentFaqPageRow[]),
    groups: groupFaqsByCategory(faqs, categories.length > 0 ? categories : DEFAULT_FAQ_CATEGORIES),
  }
}

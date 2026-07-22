import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import {
  DEFAULT_REVIEW_CLASSES,
  REVIEW_CLASSES_DB_KEYS,
  REVIEW_CLASSES_SECTION,
  mergeReviewClassesRows,
  type SiteContentReviewClassesRow,
} from './reviewClassesContent'
import type { ReviewClassesContent, ReviewPackage, ReviewPackageOption } from '@s-class/types/home'

interface ReviewPackageFeatureRow {
  id: string
  feature_text: string
  sort_order: number
}

interface ReviewPackageOptionRow {
  id: string
  title: string
  price: string
  sort_order: number
  review_package_option_features: ReviewPackageFeatureRow[] | null
}

interface ReviewPackageRow {
  id: string
  title: string
  description: string
  badge: string | null
  price: string | null
  online_access_months: number
  sort_order: number
  review_package_features: ReviewPackageFeatureRow[] | null
  review_package_options: ReviewPackageOptionRow[] | null
}

interface ReviewPackageStateRow {
  total_count: number
}

function sortByOrder<T extends { sort_order: number; id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
}

function toFeatureText(row: ReviewPackageFeatureRow): string {
  return row.feature_text
}

function toReviewPackageOption(row: ReviewPackageOptionRow): ReviewPackageOption {
  return {
    id: row.id,
    title: row.title,
    price: row.price,
    sortOrder: row.sort_order,
    features: sortByOrder(row.review_package_option_features ?? []).map(toFeatureText),
  }
}

function toReviewPackage(row: ReviewPackageRow): ReviewPackage {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    badge: row.badge,
    price: row.price,
    onlineAccessMonths: row.online_access_months,
    sortOrder: row.sort_order,
    features: sortByOrder(row.review_package_features ?? []).map(toFeatureText),
    options: sortByOrder(row.review_package_options ?? []).map(toReviewPackageOption),
  }
}

export async function getPublicReviewClassesContent(): Promise<ReviewClassesContent> {
  const { data: sectionRows, error: sectionError } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', REVIEW_CLASSES_SECTION)
    .in('key', Array.from(REVIEW_CLASSES_DB_KEYS))

  if (sectionError) {
    throw new ApiError(500, 'REVIEW_CLASSES_COPY_FETCH_FAILED', sectionError.message)
  }

  const { data: packageRows, error: packageError } = await supabase
    .from('review_packages')
    .select(`
      id,
      title,
      description,
      badge,
      price,
      online_access_months,
      sort_order,
      review_package_features (
        id,
        feature_text,
        sort_order
      ),
      review_package_options (
        id,
        title,
        price,
        sort_order,
        review_package_option_features (
          id,
          feature_text,
          sort_order
        )
      )
    `)
    .order('sort_order', { ascending: true })

  if (packageError) {
    throw new ApiError(500, 'REVIEW_PACKAGES_FETCH_FAILED', packageError.message)
  }

  const packages = sortByOrder((packageRows ?? []) as ReviewPackageRow[]).map(toReviewPackage)

  if (packages.length === 0) {
    const { data: stateRow, error: stateError } = await supabase
      .from('review_packages_state')
      .select('total_count')
      .maybeSingle()

    if (stateError) {
      throw new ApiError(500, 'REVIEW_PACKAGES_STATE_FETCH_FAILED', stateError.message)
    }

    if ((stateRow as ReviewPackageStateRow | null)?.total_count === 0) {
      return mergeReviewClassesRows(
        sectionRows as SiteContentReviewClassesRow[],
        DEFAULT_REVIEW_CLASSES.packages,
      )
    }
  }

  return mergeReviewClassesRows(sectionRows as SiteContentReviewClassesRow[], packages)
}

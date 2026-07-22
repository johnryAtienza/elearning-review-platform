import type { ReviewClassesContent } from '@s-class/types/home'

export const REVIEW_CLASSES_SECTION = 'home_review_classes'

export const DEFAULT_REVIEW_CLASSES: ReviewClassesContent = {
  eyebrow: 'Review Classes Offered',
  heading: 'Pick the package that fits your reviewer',
  packages: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Full Mechanical Engineering Review',
      description:
        'The complete board-prep package. All three reviewer books plus six ' +
        'months of online access and weekly topnotcher catch-up sessions.',
      badge: 'Most Complete',
      price: 'Php x,xxx',
      onlineAccessMonths: 6,
      sortOrder: 0,
      features: [
        'Engineering Mathematics book (hard copy)',
        'Machine Design book (hard copy)',
        'Power and Industrial Plant Engineering book (hard copy)',
        'Video book explainer for all subjects',
        'Daily Multiple Choice Practice Problems (Engineering Math) \u2014 with complete solutions',
        'Weekly Multiple Choice Practice Problems (Engineering Math) \u2014 with complete solutions',
        'Daily Multiple Choice Elements (Engineering Math) \u2014 with complete solutions',
        'Daily Multiple Choice Elements \u2014 terminologies and concepts',
        'Weekly online catch-up sessions with a board topnotcher (1st Place!!)',
      ],
      options: [],
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      title: 'Engineering Mathematics Special Review',
      description:
        'For any engineering course. Choose the package that fits how you ' +
        'study \u2014 printed reviewer included, or online-only.',
      badge: null,
      price: null,
      onlineAccessMonths: 6,
      sortOrder: 1,
      features: [],
      options: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Option 1 \u2014 with reviewer book',
          price: 'Php x,xxx',
          sortOrder: 0,
          features: [
            'Engineering Mathematics book (hard copy)',
            'Video book explainer (Engineering Math)',
            'Daily MC Practice Problems (Engineering Math) \u2014 with complete solutions',
            'Daily MC Elements (Engineering Math) \u2014 with complete solutions',
            'Daily MC Elements \u2014 terminologies and concepts',
          ],
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          title: 'Option 2 \u2014 online only',
          price: 'Php x,xxx',
          sortOrder: 1,
          features: [
            'Video book explainer (Engineering Math)',
            'Daily MC Practice Problems (Engineering Math) \u2014 with complete solutions',
            'Daily MC Elements \u2014 terminologies and concepts',
          ],
        },
      ],
    },
  ],
}

export const REVIEW_CLASSES_DB_KEYS = ['eyebrow', 'heading'] as const

export type ReviewClassesDbKey = typeof REVIEW_CLASSES_DB_KEYS[number]

export interface SiteContentReviewClassesRow {
  key: string
  value: string | null
}

function isReviewClassesDbKey(key: string): key is ReviewClassesDbKey {
  return (REVIEW_CLASSES_DB_KEYS as readonly string[]).includes(key)
}

export function mergeReviewClassesRows(
  rows: SiteContentReviewClassesRow[],
  packages = DEFAULT_REVIEW_CLASSES.packages,
): ReviewClassesContent {
  const content: ReviewClassesContent = {
    eyebrow: DEFAULT_REVIEW_CLASSES.eyebrow,
    heading: DEFAULT_REVIEW_CLASSES.heading,
    packages,
  }

  for (const row of rows) {
    if (!isReviewClassesDbKey(row.key)) continue
    const value = row.value?.trim()
    if (!value) continue
    content[row.key] = value
  }

  return content
}

export function reviewClassesContentToRows(content: Pick<ReviewClassesContent, 'eyebrow' | 'heading'>) {
  return REVIEW_CLASSES_DB_KEYS.map((key) => ({
    section: REVIEW_CLASSES_SECTION,
    key,
    value: content[key].trim(),
  }))
}

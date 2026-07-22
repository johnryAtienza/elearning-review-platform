import type { TestimonialsContent } from '@s-class/types/home'

export const TESTIMONIALS_SECTION = 'testimonials'

export const DEFAULT_TESTIMONIALS_CONTENT: TestimonialsContent = {
  eyebrow: 'What Our Reviewers Say',
  heading: 'Real results from real candidates',
  testimonials: [
    {
      id: '55555555-5555-4555-8555-555555555551',
      name: 'Juan Dela Cruz',
      initials: 'JD',
      title: 'Mechanical Engineering Board Topnotcher 2025',
      affiliation: 'University of the Philippines \u2014 Diliman',
      quote:
        'The daily MC drills and topnotcher catch-up sessions kept me sharp every single week. ' +
        'Walking into the boards I felt prepared, not anxious.',
      rating: 5,
      sortOrder: 0,
    },
    {
      id: '55555555-5555-4555-8555-555555555552',
      name: 'Maria Santos',
      initials: 'MS',
      title: 'Mechanical Engineering Licensee, April 2025',
      affiliation: 'Mapua University',
      quote:
        "I struggled with Engineering Math for years. S Class's video explainers finally made the " +
        'concepts click \u2014 and the printed reviewer is dog-eared from how often I used it.',
      rating: 5,
      sortOrder: 1,
    },
    {
      id: '55555555-5555-4555-8555-555555555553',
      name: 'Andrew Reyes',
      initials: 'AR',
      title: 'Mechanical Engineering Licensee, October 2024',
      affiliation: 'Technological Institute of the Philippines',
      quote:
        'Six months of structured review beats six months of cramming. The weekly exams kept me ' +
        'accountable; the catch-up sessions filled every gap I had.',
      rating: 5,
      sortOrder: 2,
    },
  ],
}

export const TESTIMONIALS_DB_KEYS = ['eyebrow', 'heading'] as const

export type TestimonialsDbKey = typeof TESTIMONIALS_DB_KEYS[number]

export interface SiteContentTestimonialsRow {
  key: string
  value: string | null
}

function isTestimonialsDbKey(key: string): key is TestimonialsDbKey {
  return (TESTIMONIALS_DB_KEYS as readonly string[]).includes(key)
}

export function mergeTestimonialsRows(
  rows: SiteContentTestimonialsRow[],
  testimonials = DEFAULT_TESTIMONIALS_CONTENT.testimonials,
): TestimonialsContent {
  const content: TestimonialsContent = {
    eyebrow: DEFAULT_TESTIMONIALS_CONTENT.eyebrow,
    heading: DEFAULT_TESTIMONIALS_CONTENT.heading,
    testimonials,
  }

  for (const row of rows) {
    if (!isTestimonialsDbKey(row.key)) continue
    const value = row.value?.trim()
    if (!value) continue
    content[row.key] = value
  }

  return content
}

export function testimonialsContentToRows(
  content: Pick<TestimonialsContent, 'eyebrow' | 'heading'>,
) {
  return TESTIMONIALS_DB_KEYS.map((key) => ({
    section: TESTIMONIALS_SECTION,
    key,
    value: content[key].trim(),
  }))
}

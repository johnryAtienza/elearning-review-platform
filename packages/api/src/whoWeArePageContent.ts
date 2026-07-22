import type { WhoWeArePageContent, WhoWeArePageSection } from '@s-class/types/home'

export const WHO_WE_ARE_PAGE_SECTION = 'who_we_are_page'

export const DEFAULT_WHO_WE_ARE_PAGE_CONTENT: WhoWeArePageContent = {
  eyebrow: 'Who We Are',
  title: 'A focused board exam review program',
  sections: [
    {
      id: 'who-are-we',
      title: 'Who Are We',
      body:
        'S Class Review is a focused board exam review program for Filipino ' +
        'mechanical engineering candidates. We pair printed reviewer books with ' +
        'an always-on online platform — daily problem solutions, weekly drills, ' +
        'and topnotcher-led catch-up sessions — so reviewers can keep momentum ' +
        'whether they study at home, on a commute, or between work shifts.',
      sortOrder: 0,
    },
    {
      id: 'review-philosophy',
      title: 'Review Philosophy',
      body:
        'Pass rates rise when reviewers practise consistently, not heroically. ' +
        'Our daily MC drills, weekly mock exams, and worked solutions are designed ' +
        'around small reps that compound — six days a week, every week, until ' +
        'the board exam.',
      sortOrder: 1,
    },
    {
      id: 'mission',
      title: 'Mission',
      body:
        'To give every Filipino mechanical engineering board candidate the ' +
        'structured practice, reliable explanations, and topnotcher mentorship ' +
        'they need to walk into the exam confident.',
      sortOrder: 2,
    },
    {
      id: 'vision',
      title: 'Vision',
      body:
        'A generation of Filipino mechanical engineers who pass the boards on ' +
        'their first attempt — not because they got lucky, but because they ' +
        'were prepared.',
      sortOrder: 3,
    },
  ],
}

export const WHO_WE_ARE_PAGE_DB_KEYS = [
  'eyebrow',
  'title',
] as const

export type WhoWeArePageDbKey = typeof WHO_WE_ARE_PAGE_DB_KEYS[number]

export interface SiteContentWhoWeArePageRow {
  key: string
  value: string | null
}

const DB_KEY_TO_FIELD: Record<WhoWeArePageDbKey, 'eyebrow' | 'title'> = {
  eyebrow: 'eyebrow',
  title:   'title',
}

const FIELD_TO_DB_KEY: Record<'eyebrow' | 'title', WhoWeArePageDbKey> = {
  eyebrow: 'eyebrow',
  title:   'title',
}

function isWhoWeArePageDbKey(key: string): key is WhoWeArePageDbKey {
  return (WHO_WE_ARE_PAGE_DB_KEYS as readonly string[]).includes(key)
}

export function mergeWhoWeArePageRows(
  rows: SiteContentWhoWeArePageRow[],
  sections: WhoWeArePageSection[] = DEFAULT_WHO_WE_ARE_PAGE_CONTENT.sections,
): WhoWeArePageContent {
  const content: WhoWeArePageContent = {
    eyebrow: DEFAULT_WHO_WE_ARE_PAGE_CONTENT.eyebrow,
    title: DEFAULT_WHO_WE_ARE_PAGE_CONTENT.title,
    sections: sections.map((section) => ({ ...section })),
  }

  for (const row of rows) {
    if (!isWhoWeArePageDbKey(row.key)) continue
    const value = row.value?.trim()
    if (!value) continue
    content[DB_KEY_TO_FIELD[row.key]] = value
  }

  return content
}

export function whoWeArePageContentToRows(
  content: Pick<WhoWeArePageContent, 'eyebrow' | 'title'>,
) {
  return (Object.keys(FIELD_TO_DB_KEY) as Array<keyof typeof FIELD_TO_DB_KEY>).map((field) => ({
    section: WHO_WE_ARE_PAGE_SECTION,
    key:     FIELD_TO_DB_KEY[field],
    value:   content[field].trim(),
  }))
}

import type { WhoWeArePageContent } from '@s-class/types/home'

export const WHO_WE_ARE_PAGE_SECTION = 'who_we_are_page'

export const DEFAULT_WHO_WE_ARE_PAGE_CONTENT: WhoWeArePageContent = {
  eyebrow: 'Who We Are',
  title: 'A focused board exam review program',
  whoAreWeLabel: 'Who Are We',
  whoAreWeBody:
    'S Class Review is a focused board exam review program for Filipino ' +
    'mechanical engineering candidates. We pair printed reviewer books with ' +
    'an always-on online platform — daily problem solutions, weekly drills, ' +
    'and topnotcher-led catch-up sessions — so reviewers can keep momentum ' +
    'whether they study at home, on a commute, or between work shifts.',
  reviewPhilosophyLabel: 'Review Philosophy',
  reviewPhilosophyBody:
    'Pass rates rise when reviewers practise consistently, not heroically. ' +
    'Our daily MC drills, weekly mock exams, and worked solutions are designed ' +
    'around small reps that compound — six days a week, every week, until ' +
    'the board exam.',
  missionLabel: 'Mission',
  missionBody:
    'To give every Filipino mechanical engineering board candidate the ' +
    'structured practice, reliable explanations, and topnotcher mentorship ' +
    'they need to walk into the exam confident.',
  visionLabel: 'Vision',
  visionBody:
    'A generation of Filipino mechanical engineers who pass the boards on ' +
    'their first attempt — not because they got lucky, but because they ' +
    'were prepared.',
}

export const WHO_WE_ARE_PAGE_DB_KEYS = [
  'eyebrow',
  'title',
  'who_are_we_label',
  'who_are_we_body',
  'review_philosophy_label',
  'review_philosophy_body',
  'mission_label',
  'mission_body',
  'vision_label',
  'vision_body',
] as const

export type WhoWeArePageDbKey = typeof WHO_WE_ARE_PAGE_DB_KEYS[number]

export interface SiteContentWhoWeArePageRow {
  key: string
  value: string | null
}

const DB_KEY_TO_FIELD: Record<WhoWeArePageDbKey, keyof WhoWeArePageContent> = {
  eyebrow:                 'eyebrow',
  title:                   'title',
  who_are_we_label:        'whoAreWeLabel',
  who_are_we_body:         'whoAreWeBody',
  review_philosophy_label: 'reviewPhilosophyLabel',
  review_philosophy_body:  'reviewPhilosophyBody',
  mission_label:           'missionLabel',
  mission_body:            'missionBody',
  vision_label:            'visionLabel',
  vision_body:             'visionBody',
}

const FIELD_TO_DB_KEY: Record<keyof WhoWeArePageContent, WhoWeArePageDbKey> = {
  eyebrow:               'eyebrow',
  title:                 'title',
  whoAreWeLabel:         'who_are_we_label',
  whoAreWeBody:          'who_are_we_body',
  reviewPhilosophyLabel: 'review_philosophy_label',
  reviewPhilosophyBody:  'review_philosophy_body',
  missionLabel:          'mission_label',
  missionBody:           'mission_body',
  visionLabel:           'vision_label',
  visionBody:            'vision_body',
}

function isWhoWeArePageDbKey(key: string): key is WhoWeArePageDbKey {
  return (WHO_WE_ARE_PAGE_DB_KEYS as readonly string[]).includes(key)
}

export function mergeWhoWeArePageRows(
  rows: SiteContentWhoWeArePageRow[],
): WhoWeArePageContent {
  const content = { ...DEFAULT_WHO_WE_ARE_PAGE_CONTENT }

  for (const row of rows) {
    if (!isWhoWeArePageDbKey(row.key)) continue
    const value = row.value?.trim()
    if (!value) continue
    content[DB_KEY_TO_FIELD[row.key]] = value
  }

  return content
}

export function whoWeArePageContentToRows(content: WhoWeArePageContent) {
  return (Object.keys(FIELD_TO_DB_KEY) as Array<keyof WhoWeArePageContent>).map((field) => ({
    section: WHO_WE_ARE_PAGE_SECTION,
    key:     FIELD_TO_DB_KEY[field],
    value:   content[field].trim(),
  }))
}

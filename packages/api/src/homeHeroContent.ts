import type { HomeHeroContent } from '@s-class/types/home'

export const HOME_HERO_SECTION = 'home_hero'

export const DEFAULT_HOME_HERO: HomeHeroContent = {
  eyebrow:         'S Class Review',
  title:           'Pass the boards on your first attempt.',
  description:     'Daily multiple-choice drills, weekly catch-up sessions with a board topnotcher, and printed reviewers shipped nationwide. Six months of structured prep, one transparent plan.',
  primaryButton:   'Enroll Now',
  secondaryButton: 'Log in',
}

export const HOME_HERO_DB_KEYS = [
  'eyebrow',
  'title',
  'description',
  'primary_button',
  'secondary_button',
] as const

export type HomeHeroDbKey = typeof HOME_HERO_DB_KEYS[number]

export interface SiteContentHeroRow {
  key: string
  value: string | null
}

const DB_KEY_TO_FIELD: Record<HomeHeroDbKey, keyof HomeHeroContent> = {
  eyebrow:          'eyebrow',
  title:            'title',
  description:      'description',
  primary_button:   'primaryButton',
  secondary_button: 'secondaryButton',
}

const FIELD_TO_DB_KEY: Record<keyof HomeHeroContent, HomeHeroDbKey> = {
  eyebrow:         'eyebrow',
  title:           'title',
  description:     'description',
  primaryButton:   'primary_button',
  secondaryButton: 'secondary_button',
}

function isHomeHeroDbKey(key: string): key is HomeHeroDbKey {
  return (HOME_HERO_DB_KEYS as readonly string[]).includes(key)
}

export function mergeHomeHeroRows(rows: SiteContentHeroRow[]): HomeHeroContent {
  const content = { ...DEFAULT_HOME_HERO }

  for (const row of rows) {
    if (!isHomeHeroDbKey(row.key)) continue
    const value = row.value?.trim()
    if (!value) continue
    content[DB_KEY_TO_FIELD[row.key]] = value
  }

  return content
}

export function homeHeroContentToRows(content: HomeHeroContent) {
  return (Object.keys(FIELD_TO_DB_KEY) as Array<keyof HomeHeroContent>).map((field) => ({
    section: HOME_HERO_SECTION,
    key:     FIELD_TO_DB_KEY[field],
    value:   content[field].trim(),
  }))
}

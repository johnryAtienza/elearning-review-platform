import type { LandingContactCtaContent } from '@s-class/types/home'

export const LANDING_CONTACT_CTA_SECTION = 'landing_contact_cta'

export const DEFAULT_LANDING_CONTACT_CTA: LandingContactCtaContent = {
  title: 'Contact us',
  description:
    'Contact us for inquiries and payment instructions. ' +
    'We confirm enrolment within one business day and ship books nationwide.',
  buttonLabel: 'Enroll Now',
}

export const LANDING_CONTACT_CTA_DB_KEYS = [
  'title',
  'description',
  'button_label',
] as const

export type LandingContactCtaDbKey = typeof LANDING_CONTACT_CTA_DB_KEYS[number]

export interface SiteContentContactCtaRow {
  key: string
  value: string | null
}

const DB_KEY_TO_FIELD: Record<LandingContactCtaDbKey, keyof LandingContactCtaContent> = {
  title:        'title',
  description:  'description',
  button_label: 'buttonLabel',
}

const FIELD_TO_DB_KEY: Record<keyof LandingContactCtaContent, LandingContactCtaDbKey> = {
  title:       'title',
  description: 'description',
  buttonLabel: 'button_label',
}

function isLandingContactCtaDbKey(key: string): key is LandingContactCtaDbKey {
  return (LANDING_CONTACT_CTA_DB_KEYS as readonly string[]).includes(key)
}

export function mergeLandingContactCtaRows(
  rows: SiteContentContactCtaRow[],
): LandingContactCtaContent {
  const content = { ...DEFAULT_LANDING_CONTACT_CTA }

  for (const row of rows) {
    if (!isLandingContactCtaDbKey(row.key)) continue
    const value = row.value?.trim()
    if (!value) continue
    content[DB_KEY_TO_FIELD[row.key]] = value
  }

  return content
}

export function landingContactCtaContentToRows(content: LandingContactCtaContent) {
  return (Object.keys(FIELD_TO_DB_KEY) as Array<keyof LandingContactCtaContent>).map((field) => ({
    section: LANDING_CONTACT_CTA_SECTION,
    key:     FIELD_TO_DB_KEY[field],
    value:   content[field].trim(),
  }))
}

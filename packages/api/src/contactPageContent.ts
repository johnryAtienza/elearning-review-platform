import type { ContactPageContent } from '@s-class/types/home'

export const CONTACT_PAGE_SECTION = 'contact_page'

export const DEFAULT_CONTACT_PAGE_CONTENT: ContactPageContent = {
  heroEyebrow: 'Contact us',
  heroTitle: 'Talk to a S Class reviewer',
  heroDescription:
    'Questions about enrolment, books, or the platform? Reach out via any of the channels ' +
    'below — we read every message and reply within one business day.',
  email: {
    label: 'Email us',
    value: 'hello@class-s.ph',
    helper: 'We reply within one business day.',
    href: 'mailto:hello@class-s.ph',
  },
  phone: {
    label: 'Call us',
    value: '+63 917 000 0000',
    helper: 'Mon–Sat, 9:00 AM – 6:00 PM (PHT).',
    href: 'tel:+639170000000',
  },
  messenger: {
    label: 'Facebook Messenger',
    value: 'm.me/classsreview',
    helper: 'Fastest channel for quick questions.',
    href: 'https://m.me/classsreview',
  },
  businessHours: {
    weekdays: '9:00 AM – 6:00 PM',
    saturday: '9:00 AM – 1:00 PM',
    sunday: 'Closed',
  },
}

export const CONTACT_PAGE_DB_KEYS = [
  'hero_eyebrow',
  'hero_title',
  'hero_description',
  'email_label',
  'email_value',
  'email_helper',
  'email_href',
  'phone_label',
  'phone_value',
  'phone_helper',
  'phone_href',
  'messenger_label',
  'messenger_value',
  'messenger_helper',
  'messenger_href',
  'business_hours_weekdays',
  'business_hours_saturday',
  'business_hours_sunday',
] as const

export type ContactPageDbKey = typeof CONTACT_PAGE_DB_KEYS[number]

export interface SiteContentContactPageRow {
  key: string
  value: string | null
}

function cloneDefaultContactPageContent(): ContactPageContent {
  return {
    heroEyebrow: DEFAULT_CONTACT_PAGE_CONTENT.heroEyebrow,
    heroTitle: DEFAULT_CONTACT_PAGE_CONTENT.heroTitle,
    heroDescription: DEFAULT_CONTACT_PAGE_CONTENT.heroDescription,
    email: { ...DEFAULT_CONTACT_PAGE_CONTENT.email },
    phone: { ...DEFAULT_CONTACT_PAGE_CONTENT.phone },
    messenger: { ...DEFAULT_CONTACT_PAGE_CONTENT.messenger },
    businessHours: { ...DEFAULT_CONTACT_PAGE_CONTENT.businessHours },
  }
}

function isContactPageDbKey(key: string): key is ContactPageDbKey {
  return (CONTACT_PAGE_DB_KEYS as readonly string[]).includes(key)
}

function applyContactPageValue(
  content: ContactPageContent,
  key: ContactPageDbKey,
  value: string,
) {
  switch (key) {
    case 'hero_eyebrow':
      content.heroEyebrow = value
      return
    case 'hero_title':
      content.heroTitle = value
      return
    case 'hero_description':
      content.heroDescription = value
      return
    case 'email_label':
      content.email.label = value
      return
    case 'email_value':
      content.email.value = value
      return
    case 'email_helper':
      content.email.helper = value
      return
    case 'email_href':
      content.email.href = value
      return
    case 'phone_label':
      content.phone.label = value
      return
    case 'phone_value':
      content.phone.value = value
      return
    case 'phone_helper':
      content.phone.helper = value
      return
    case 'phone_href':
      content.phone.href = value
      return
    case 'messenger_label':
      content.messenger.label = value
      return
    case 'messenger_value':
      content.messenger.value = value
      return
    case 'messenger_helper':
      content.messenger.helper = value
      return
    case 'messenger_href':
      content.messenger.href = value
      return
    case 'business_hours_weekdays':
      content.businessHours.weekdays = value
      return
    case 'business_hours_saturday':
      content.businessHours.saturday = value
      return
    case 'business_hours_sunday':
      content.businessHours.sunday = value
      return
  }
}

export function mergeContactPageRows(rows: SiteContentContactPageRow[]): ContactPageContent {
  const content = cloneDefaultContactPageContent()

  for (const row of rows) {
    if (!isContactPageDbKey(row.key)) continue
    const value = row.value?.trim()
    if (!value) continue
    applyContactPageValue(content, row.key, value)
  }

  return content
}

export function contactPageContentToRows(content: ContactPageContent) {
  return [
    { key: 'hero_eyebrow', value: content.heroEyebrow },
    { key: 'hero_title', value: content.heroTitle },
    { key: 'hero_description', value: content.heroDescription },
    { key: 'email_label', value: content.email.label },
    { key: 'email_value', value: content.email.value },
    { key: 'email_helper', value: content.email.helper },
    { key: 'email_href', value: content.email.href },
    { key: 'phone_label', value: content.phone.label },
    { key: 'phone_value', value: content.phone.value },
    { key: 'phone_helper', value: content.phone.helper },
    { key: 'phone_href', value: content.phone.href },
    { key: 'messenger_label', value: content.messenger.label },
    { key: 'messenger_value', value: content.messenger.value },
    { key: 'messenger_helper', value: content.messenger.helper },
    { key: 'messenger_href', value: content.messenger.href },
    { key: 'business_hours_weekdays', value: content.businessHours.weekdays },
    { key: 'business_hours_saturday', value: content.businessHours.saturday },
    { key: 'business_hours_sunday', value: content.businessHours.sunday },
  ].map((row) => ({
    section: CONTACT_PAGE_SECTION,
    key: row.key,
    value: row.value.trim(),
  }))
}

import type {
  ContactChannelIcon,
  ContactPageChannelContent,
  ContactPageContent,
} from '@s-class/types/home'

export const CONTACT_PAGE_SECTION = 'contact_page'

export const CONTACT_CHANNEL_ICONS = [
  'email',
  'phone',
  'messenger',
  'facebook',
  'link',
] as const satisfies readonly ContactChannelIcon[]

export const DEFAULT_CONTACT_PAGE_CONTENT: ContactPageContent = {
  heroEyebrow: 'Contact us',
  heroTitle: 'Talk to a S Class reviewer',
  heroDescription:
    'Questions about enrolment, books, or the platform? Reach out via any of the channels ' +
    'below — we read every message and reply within one business day.',
  channels: [
    {
      id: '66666666-6666-4666-8666-666666666661',
      label: 'Email us',
      value: 'hello@class-s.ph',
      helper: 'We reply within one business day.',
      href: 'mailto:hello@class-s.ph',
      icon: 'email',
      sortOrder: 0,
    },
    {
      id: '66666666-6666-4666-8666-666666666662',
      label: 'Call us',
      value: '+63 917 000 0000',
      helper: 'Mon–Sat, 9:00 AM – 6:00 PM (PHT).',
      href: 'tel:+639170000000',
      icon: 'phone',
      sortOrder: 1,
    },
    {
      id: '66666666-6666-4666-8666-666666666663',
      label: 'Facebook Messenger',
      value: 'm.me/classsreview',
      helper: 'Fastest channel for quick questions.',
      href: 'https://m.me/classsreview',
      icon: 'messenger',
      sortOrder: 2,
    },
  ],
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
    channels: DEFAULT_CONTACT_PAGE_CONTENT.channels.map((channel) => ({ ...channel })),
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

export function isContactChannelIcon(icon: string): icon is ContactChannelIcon {
  return (CONTACT_CHANNEL_ICONS as readonly string[]).includes(icon)
}

export function normalizeContactChannelIcon(icon: string | null | undefined): ContactChannelIcon {
  return icon && isContactChannelIcon(icon) ? icon : 'link'
}

export function mergeContactPageRows(
  rows: SiteContentContactPageRow[],
  channels?: ContactPageChannelContent[],
): ContactPageContent {
  const content = cloneDefaultContactPageContent()
  if (channels !== undefined) {
    content.channels = channels.map((channel) => ({ ...channel }))
  }

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
    { key: 'business_hours_weekdays', value: content.businessHours.weekdays },
    { key: 'business_hours_saturday', value: content.businessHours.saturday },
    { key: 'business_hours_sunday', value: content.businessHours.sunday },
  ].map((row) => ({
    section: CONTACT_PAGE_SECTION,
    key: row.key,
    value: row.value.trim(),
  }))
}

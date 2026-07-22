import type { FaqCategory, FaqGroup, FaqItem, FaqPageContent, FaqPageData } from '@s-class/types/home'

export const FAQ_PAGE_SECTION = 'faq_page'

export const DEFAULT_FAQ_PAGE_CONTENT: FaqPageContent = {
  eyebrow: 'FAQ',
  title: 'Frequently asked questions',
  description: 'Quick answers about enrolment, content access, books, and your account.',
  ctaTitle: 'Still have questions?',
  ctaDescription: 'We reply within one business day across email, phone, and Messenger.',
  ctaButtonLabel: 'Contact us',
}

export const DEFAULT_FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: '77777777-7777-4777-8777-777777777751',
    name: 'Enrollment',
    sortOrder: 0,
  },
  {
    id: '77777777-7777-4777-8777-777777777752',
    name: 'Access & content',
    sortOrder: 1,
  },
  {
    id: '77777777-7777-4777-8777-777777777753',
    name: 'Books & shipping',
    sortOrder: 2,
  },
  {
    id: '77777777-7777-4777-8777-777777777754',
    name: 'Payments',
    sortOrder: 3,
  },
  {
    id: '77777777-7777-4777-8777-777777777755',
    name: 'Account & devices',
    sortOrder: 4,
  },
]

export const DEFAULT_FAQS: FaqItem[] = [
  {
    id: '77777777-7777-4777-8777-777777777701',
    category: 'Enrollment',
    question: 'How do I enrol in a S Class review?',
    answer:
      'Pick a package on the Home page, click Enroll Now, and complete payment via GCash, Maya, or card. ' +
      "Your online access is activated immediately; printed books ship within 5 business days.",
    sortOrder: 0,
  },
  {
    id: '77777777-7777-4777-8777-777777777702',
    category: 'Enrollment',
    question: 'How long is the online access valid?',
    answer:
      'Every standard package includes 6 months of online access from the date of activation. ' +
      'Renewing before your access expires stacks the new months on top — no days lost.',
    sortOrder: 1,
  },
  {
    id: '77777777-7777-4777-8777-777777777703',
    category: 'Enrollment',
    question: 'Can I switch packages after enrolling?',
    answer:
      'Yes — message us via the Contact Us page and we will arrange the upgrade. Any unused time on your ' +
      'current package carries over.',
    sortOrder: 2,
  },
  {
    id: '77777777-7777-4777-8777-777777777704',
    category: 'Access & content',
    question: 'What is included on Day 1 of each course?',
    answer:
      'Day 1 of every course is fully open to all logged-in users — full-length video, full PDF, and the ' +
      'quiz — so you can sample the experience before subscribing.',
    sortOrder: 3,
  },
  {
    id: '77777777-7777-4777-8777-777777777705',
    category: 'Access & content',
    question: 'Why am I blocked on Day 2 onwards?',
    answer:
      'Day 2 onwards is part of the Standard package. Click Enroll Now on any locked Day card to subscribe ' +
      'and unlock the full curriculum.',
    sortOrder: 4,
  },
  {
    id: '77777777-7777-4777-8777-777777777706',
    category: 'Access & content',
    question: 'Are quiz answers reviewed after I submit?',
    answer:
      'Yes — Standard plan members see the correct answer and explanation after submitting each quiz. ' +
      'Free users see their score only.',
    sortOrder: 5,
  },
  {
    id: '77777777-7777-4777-8777-777777777707',
    category: 'Books & shipping',
    question: 'Do you ship outside Metro Manila?',
    answer: 'Yes — we ship to all PH provinces within 5 business days of payment confirmation.',
    sortOrder: 6,
  },
  {
    id: '77777777-7777-4777-8777-777777777708',
    category: 'Books & shipping',
    question: 'What if my book arrives damaged?',
    answer:
      'Email us photos of the damage within 7 days of delivery and we will arrange a replacement at no cost.',
    sortOrder: 7,
  },
  {
    id: '77777777-7777-4777-8777-777777777709',
    category: 'Books & shipping',
    question: 'Can I buy a book without enrolling in the review?',
    answer: 'Yes — printed books can be purchased separately from the Books tab.',
    sortOrder: 8,
  },
  {
    id: '77777777-7777-4777-8777-777777777710',
    category: 'Payments',
    question: 'What payment methods do you accept?',
    answer:
      'GCash, Maya, and major credit/debit cards (Visa, Mastercard, JCB) — all processed securely through PayMongo.',
    sortOrder: 9,
  },
  {
    id: '77777777-7777-4777-8777-777777777711',
    category: 'Payments',
    question: 'Is there a refund policy?',
    answer:
      'Online access is non-refundable once activated. Unopened books may be returned within 7 days for a refund of the book price (shipping is non-refundable).',
    sortOrder: 10,
  },
  {
    id: '77777777-7777-4777-8777-777777777712',
    category: 'Account & devices',
    question: 'Can I log in on multiple devices?',
    answer:
      'Yes — one mobile device and one laptop/desktop per account. If you try to log in on a third device, ' +
      'you will be asked to sign out from one of your existing devices first.',
    sortOrder: 11,
  },
  {
    id: '77777777-7777-4777-8777-777777777713',
    category: 'Account & devices',
    question: 'I forgot my password — what do I do?',
    answer:
      'Click "Log in" → "Forgot password?". Enter your email and we will send a reset link.',
    sortOrder: 12,
  },
]

export const DEFAULT_FAQ_PAGE: FaqPageData = {
  page: DEFAULT_FAQ_PAGE_CONTENT,
  groups: groupFaqsByCategory(DEFAULT_FAQS),
}

export const FAQ_PAGE_DB_KEYS = [
  'eyebrow',
  'title',
  'description',
  'cta_title',
  'cta_description',
  'cta_button_label',
] as const

export type FaqPageDbKey = typeof FAQ_PAGE_DB_KEYS[number]

export interface SiteContentFaqPageRow {
  key: string
  value: string | null
}

const DB_KEY_TO_FIELD: Record<FaqPageDbKey, keyof FaqPageContent> = {
  eyebrow:          'eyebrow',
  title:            'title',
  description:      'description',
  cta_title:        'ctaTitle',
  cta_description:  'ctaDescription',
  cta_button_label: 'ctaButtonLabel',
}

const FIELD_TO_DB_KEY: Record<keyof FaqPageContent, FaqPageDbKey> = {
  eyebrow:        'eyebrow',
  title:          'title',
  description:    'description',
  ctaTitle:       'cta_title',
  ctaDescription: 'cta_description',
  ctaButtonLabel: 'cta_button_label',
}

function isFaqPageDbKey(key: string): key is FaqPageDbKey {
  return (FAQ_PAGE_DB_KEYS as readonly string[]).includes(key)
}

export function groupFaqsByCategory(
  faqs: FaqItem[],
  categories: FaqCategory[] = DEFAULT_FAQ_CATEGORIES,
): FaqGroup[] {
  const groups = new Map<string, FaqItem[]>()
  const categoryOrder = new Map(
    categories.map((category) => [category.name.toLocaleLowerCase(), category.sortOrder]),
  )

  for (const faq of [...faqs].sort((a, b) => {
    const aCategoryOrder = categoryOrder.get(a.category.toLocaleLowerCase()) ?? Number.MAX_SAFE_INTEGER
    const bCategoryOrder = categoryOrder.get(b.category.toLocaleLowerCase()) ?? Number.MAX_SAFE_INTEGER

    return (
      aCategoryOrder - bCategoryOrder ||
      a.category.localeCompare(b.category) ||
      a.sortOrder - b.sortOrder ||
      a.id.localeCompare(b.id)
    )
  })) {
    const category = faq.category.trim()
    if (!category) continue
    groups.set(category, [...(groups.get(category) ?? []), faq])
  }

  return Array.from(groups, ([category, items]) => ({ category, items }))
}

export function mergeFaqPageRows(rows: SiteContentFaqPageRow[]): FaqPageContent {
  const content = { ...DEFAULT_FAQ_PAGE_CONTENT }

  for (const row of rows) {
    if (!isFaqPageDbKey(row.key)) continue
    const value = row.value?.trim()
    if (!value) continue
    content[DB_KEY_TO_FIELD[row.key]] = value
  }

  return content
}

export function faqPageContentToRows(content: FaqPageContent) {
  return (Object.keys(FIELD_TO_DB_KEY) as Array<keyof FaqPageContent>).map((field) => ({
    section: FAQ_PAGE_SECTION,
    key:     FIELD_TO_DB_KEY[field],
    value:   content[field].trim(),
  }))
}

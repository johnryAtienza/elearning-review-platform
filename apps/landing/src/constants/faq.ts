import { DEFAULT_FAQ_PAGE } from '@s-class/api/faqApi'

export interface FaqItem {
  question: string
  answer: string
}

export interface FaqGroup {
  heading: string
  items: FaqItem[]
}

export const FAQ_GROUPS: FaqGroup[] = DEFAULT_FAQ_PAGE.groups.map((group) => ({
  heading: group.category,
  items: group.items.map((item) => ({
    question: item.question,
    answer: item.answer,
  })),
}))

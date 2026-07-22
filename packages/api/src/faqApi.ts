import config from '@s-class/config'
import { DEFAULT_FAQ_PAGE } from './faqContent'
import * as faqService from './faq.service'
import type { FaqPageData } from '@s-class/types/home'

export {
  DEFAULT_FAQ_CATEGORIES,
  DEFAULT_FAQ_PAGE,
  DEFAULT_FAQ_PAGE_CONTENT,
  DEFAULT_FAQS,
} from './faqContent'

export const faqApi = {
  async getFaqPage(): Promise<FaqPageData> {
    if (config.api.useMock) return DEFAULT_FAQ_PAGE

    if (config.auth.provider === 'supabase') {
      try {
        return await faqService.getPublicFaqPage()
      } catch (err) {
        console.warn('[faqApi] falling back to default FAQ page', err)
        return DEFAULT_FAQ_PAGE
      }
    }

    return DEFAULT_FAQ_PAGE
  },
}

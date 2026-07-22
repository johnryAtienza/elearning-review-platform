import config from '@s-class/config'
import { DEFAULT_REVIEW_CLASSES } from './reviewClassesContent'
import * as reviewPackages from './reviewPackages.service'
import type { ReviewClassesContent } from '@s-class/types/home'

export { DEFAULT_REVIEW_CLASSES } from './reviewClassesContent'

export const reviewPackagesApi = {
  async getReviewClassesContent(): Promise<ReviewClassesContent> {
    if (config.api.useMock) return DEFAULT_REVIEW_CLASSES

    if (config.auth.provider === 'supabase') {
      try {
        return await reviewPackages.getPublicReviewClassesContent()
      } catch (err) {
        console.warn('[reviewPackagesApi] falling back to default review packages', err)
        return DEFAULT_REVIEW_CLASSES
      }
    }

    return DEFAULT_REVIEW_CLASSES
  },
}

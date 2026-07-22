import config from '@s-class/config'
import { DEFAULT_TESTIMONIALS_CONTENT } from './testimonialsContent'
import * as testimonials from './testimonials.service'
import type { TestimonialsContent } from '@s-class/types/home'

export { DEFAULT_TESTIMONIALS_CONTENT } from './testimonialsContent'

export const testimonialsApi = {
  async getTestimonialsContent(): Promise<TestimonialsContent> {
    if (config.api.useMock) return DEFAULT_TESTIMONIALS_CONTENT

    if (config.auth.provider === 'supabase') {
      try {
        return await testimonials.getPublicTestimonialsContent()
      } catch (err) {
        console.warn('[testimonialsApi] falling back to default testimonials', err)
        return DEFAULT_TESTIMONIALS_CONTENT
      }
    }

    return DEFAULT_TESTIMONIALS_CONTENT
  },
}

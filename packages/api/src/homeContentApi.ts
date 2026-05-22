/**
 * homeContentApi.ts
 *
 * Provider-routed reader for the homepage CMS (announcements + welcome video).
 *
 * Mock mode returns the static fallback content so the entire app can run
 * offline. Supabase mode hits the *_public views. REST mode is a no-op.
 */

import config from '@s-class/config'
import * as homeContent from './homeContent.service'
import { MOCK_ANNOUNCEMENTS, MOCK_WELCOME_VIDEO } from './data/homeMock'
import type { Announcement, WelcomeVideo } from '@s-class/types/home'

export const homeContentApi = {
  async getAnnouncements(): Promise<Announcement[]> {
    if (config.api.useMock)                  return MOCK_ANNOUNCEMENTS
    if (config.auth.provider === 'supabase') return homeContent.getPublicAnnouncements()
    return []
  },

  async getWelcomeVideo(): Promise<WelcomeVideo | null> {
    if (config.api.useMock)                  return MOCK_WELCOME_VIDEO
    if (config.auth.provider === 'supabase') return homeContent.getActiveWelcomeVideo()
    return null
  },
}

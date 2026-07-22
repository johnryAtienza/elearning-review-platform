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
import { DEFAULT_HOME_HERO } from './homeHeroContent'
import { DEFAULT_CONTACT_PAGE_CONTENT } from './contactPageContent'
import { DEFAULT_LANDING_CONTACT_CTA } from './contactCtaContent'
import { MOCK_ANNOUNCEMENTS, MOCK_WELCOME_VIDEO } from './data/homeMock'
import type {
  Announcement,
  ContactPageContent,
  HomeHeroContent,
  LandingContactCtaContent,
  WelcomeVideo,
} from '@s-class/types/home'

export { DEFAULT_HOME_HERO } from './homeHeroContent'
export { DEFAULT_CONTACT_PAGE_CONTENT } from './contactPageContent'
export { DEFAULT_LANDING_CONTACT_CTA } from './contactCtaContent'

export const homeContentApi = {
  async getHomeHero(): Promise<HomeHeroContent> {
    if (config.api.useMock)                  return DEFAULT_HOME_HERO
    if (config.auth.provider === 'supabase') return homeContent.getPublicHomeHero()
    return DEFAULT_HOME_HERO
  },

  async getLandingContactCta(): Promise<LandingContactCtaContent> {
    if (config.api.useMock)                  return DEFAULT_LANDING_CONTACT_CTA
    if (config.auth.provider === 'supabase') return homeContent.getPublicLandingContactCta()
    return DEFAULT_LANDING_CONTACT_CTA
  },

  async getContactPage(): Promise<ContactPageContent> {
    if (config.api.useMock)                  return DEFAULT_CONTACT_PAGE_CONTENT
    if (config.auth.provider === 'supabase') return homeContent.getPublicContactPage()
    return DEFAULT_CONTACT_PAGE_CONTENT
  },

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

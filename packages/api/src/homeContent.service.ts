/**
 * homeContent.service.ts
 *
 * Supabase queries for the public homepage CMS:
 *   - announcements_public  → timeline cards
 *   - welcome_videos_public → welcome video card
 *   - site_content          → text-only homepage copy
 *
 * Both views are anon-readable (granted in the migration). They already
 * filter for enabled = true (and, for announcements, published_at <= now).
 */

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import {
  HOME_HERO_DB_KEYS,
  HOME_HERO_SECTION,
  mergeHomeHeroRows,
  type SiteContentHeroRow,
} from './homeHeroContent'
import {
  CONTACT_PAGE_DB_KEYS,
  CONTACT_PAGE_SECTION,
  mergeContactPageRows,
  type SiteContentContactPageRow,
} from './contactPageContent'
import {
  LANDING_CONTACT_CTA_DB_KEYS,
  LANDING_CONTACT_CTA_SECTION,
  mergeLandingContactCtaRows,
  type SiteContentContactCtaRow,
} from './contactCtaContent'
import type {
  Announcement,
  ContactPageContent,
  HomeHeroContent,
  LandingContactCtaContent,
  WelcomeVideo,
} from '@s-class/types/home'

// ── Raw DB row shapes ────────────────────────────────────────────────────────

interface AnnouncementRow {
  id:            string
  title:         string
  body:          string
  published_at:  string
  cta_label:     string | null
  cta_href:      string | null
  icon:          string | null
  category:      string | null
  display_order: number
}

interface WelcomeVideoRow {
  id:            string
  title:         string
  description:   string
  video_url:     string | null
  thumbnail_url: string | null
  cta_label:     string | null
  cta_href:      string | null
  display_order: number
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function toAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id:           row.id,
    title:        row.title,
    body:         row.body,
    publishedAt:  row.published_at,
    ctaLabel:     row.cta_label,
    ctaHref:      row.cta_href,
    icon:         row.icon,
    category:     row.category,
    displayOrder: row.display_order,
  }
}

function toWelcomeVideo(row: WelcomeVideoRow): WelcomeVideo {
  return {
    id:           row.id,
    title:        row.title,
    description:  row.description,
    videoUrl:     row.video_url,
    thumbnailUrl: row.thumbnail_url,
    ctaLabel:     row.cta_label,
    ctaHref:      row.cta_href,
    displayOrder: row.display_order,
  }
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getPublicAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements_public')
    .select('id, title, body, published_at, cta_label, cta_href, icon, category, display_order')
    .order('display_order', { ascending: true })
    .order('published_at', { ascending: false })

  if (error) throw new ApiError(500, 'ANNOUNCEMENTS_FETCH_FAILED', error.message)
  return (data as AnnouncementRow[]).map(toAnnouncement)
}

export async function getPublicHomeHero(): Promise<HomeHeroContent> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', HOME_HERO_SECTION)
    .in('key', Array.from(HOME_HERO_DB_KEYS))

  if (error) throw new ApiError(500, 'HOME_HERO_FETCH_FAILED', error.message)
  return mergeHomeHeroRows(data as SiteContentHeroRow[])
}

export async function getPublicLandingContactCta(): Promise<LandingContactCtaContent> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', LANDING_CONTACT_CTA_SECTION)
    .in('key', Array.from(LANDING_CONTACT_CTA_DB_KEYS))

  if (error) throw new ApiError(500, 'LANDING_CONTACT_CTA_FETCH_FAILED', error.message)
  return mergeLandingContactCtaRows(data as SiteContentContactCtaRow[])
}

export async function getPublicContactPage(): Promise<ContactPageContent> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', CONTACT_PAGE_SECTION)
    .in('key', Array.from(CONTACT_PAGE_DB_KEYS))

  if (error) throw new ApiError(500, 'CONTACT_PAGE_FETCH_FAILED', error.message)
  return mergeContactPageRows(data as SiteContentContactPageRow[])
}

/** Returns at most one welcome video — the top-of-order row. */
export async function getActiveWelcomeVideo(): Promise<WelcomeVideo | null> {
  const { data, error } = await supabase
    .from('welcome_videos_public')
    .select('id, title, description, video_url, thumbnail_url, cta_label, cta_href, display_order')
    .order('display_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new ApiError(500, 'WELCOME_VIDEO_FETCH_FAILED', error.message)
  return data ? toWelcomeVideo(data as WelcomeVideoRow) : null
}

/**
 * homeContent.service.ts
 *
 * Supabase queries for the public homepage CMS:
 *   - announcements_public  → timeline cards
 *   - welcome_videos_public → welcome video card
 *
 * Both views are anon-readable (granted in the migration). They already
 * filter for enabled = true (and, for announcements, published_at <= now).
 */

import { supabase } from './supabaseClient'
import { ApiError } from './ApiError'
import type { Announcement, WelcomeVideo } from '@/features/home/types'

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
  video_url:     string
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

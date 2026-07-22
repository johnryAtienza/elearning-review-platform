/**
 * Public-facing shapes for the homepage CMS content.
 *
 * These mirror what the *_public Supabase views return — never the
 * admin-only fields (enabled, created_at, updated_at).
 */

export interface Announcement {
  id: string
  title: string
  body: string
  /** ISO timestamp. Used both for sorting and for display. */
  publishedAt: string
  ctaLabel: string | null
  ctaHref: string | null
  icon: string | null
  category: string | null
  displayOrder: number
}

export interface WelcomeVideo {
  id: string
  title: string
  description: string
  /** Null means: don't render a player — show the thumbnail as a static card. */
  videoUrl: string | null
  thumbnailUrl: string | null
  ctaLabel: string | null
  ctaHref: string | null
  displayOrder: number
}

export interface HomeHeroContent {
  eyebrow: string
  title: string
  description: string
  primaryButton: string
  secondaryButton: string
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, Mail, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { HeroBlock } from '../features/home/components/HeroBlock'
import { TestimonialsSection } from '../features/home/components/TestimonialsSection'
import { homeContentApi } from '@s-class/api/homeContentApi'
import type { Announcement, WelcomeVideo } from '../features/home/types'
import { OFFERINGS, CONTACT_BLURB, type Offering } from '../constants/offerings'
import { ROUTES } from '@/constants/routes'
import { getAbsoluteUrl } from '@s-class/constants/urls'
import { CanonicalLink } from '@/components/CanonicalLink'
import { cn } from '@/utils/cn'

/**
 * Public Home page (S Class Review).
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────┐
 *   │ HERO — Enroll Now + Log in                       │
 *   ├──────────────────────────┬──────────────────────┤
 *   │ ANNOUNCEMENTS            │ Welcome Video         │
 *   ├──────────────────────────┴──────────────────────┤
 *   │ REVIEW CLASSES OFFERED   (the offering cards)    │
 *   ├──────────────────────────────────────────────────┤
 *   │ TESTIMONIALS                                     │
 *   ├──────────────────────────────────────────────────┤
 *   │ Contact us                                       │
 *   └──────────────────────────────────────────────────┘
 *
 * Content sources:
 *   - Announcements / Welcome video: DB-backed via homeContentApi
 *     (admin-editable under /admin/announcements + /admin/welcome-videos).
 *   - Offerings:    src/constants/offerings.ts (incl. CONTACT_BLURB)
 *   - Testimonials: src/constants/testimonials.ts
 */
export function HomePage() {
  return (
    <div className="container mx-auto px-4 py-10 space-y-12 max-w-6xl">

      <CanonicalLink path={ROUTES.HOME} owner="landing" />

      {/* ── Hero (Enroll Now + Log in) ── */}
      <HeroBlock />

      {/* ── Top row: Announcements + Welcome video ── */}
      <HomeContentRow />

      {/* ── Review classes offered ── */}
      <section className="space-y-5">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Review classes offered
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Pick the package that fits your reviewer
          </h2>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          {OFFERINGS.map((offering) => (
            <OfferingCard key={offering.id} offering={offering} />
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <TestimonialsSection />

      {/* ── Contact ── */}
      <section className="rounded-xl border bg-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/15 p-2 shrink-0">
            <Mail className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Contact us</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">{CONTACT_BLURB}</p>
          </div>
        </div>
        <Button asChild size="lg" variant="outline" className="shrink-0">
          <a href={getAbsoluteUrl(ROUTES.REGISTER)}>Enroll Now</a>
        </Button>
      </section>
    </div>
  )
}

// ── Announcements + welcome video row ────────────────────────────────────────

function HomeContentRow() {
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null)
  const [welcomeVideo,  setWelcomeVideo]  = useState<WelcomeVideo | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    homeContentApi.getAnnouncements()
      .then((data) => { if (!cancelled) setAnnouncements(data) })
      .catch(() => { if (!cancelled) setAnnouncements([]) })
    homeContentApi.getWelcomeVideo()
      .then((data) => { if (!cancelled) setWelcomeVideo(data) })
      .catch(() => { if (!cancelled) setWelcomeVideo(null) })
    return () => { cancelled = true }
  }, [])

  const isLoading      = announcements === null || welcomeVideo === undefined
  const showAnnouncements = isLoading || (announcements?.length ?? 0) > 0
  const showVideo         = isLoading || welcomeVideo !== null

  // Both sections empty + finished loading → render nothing.
  if (!isLoading && !showAnnouncements && !showVideo) return null

  return (
    <section
      className={cn(
        'grid gap-6 items-start',
        showAnnouncements && showVideo ? 'lg:grid-cols-[2fr_3fr]' : '',
      )}
    >
      {showAnnouncements && <AnnouncementsBlock items={announcements} />}
      {showVideo         && <WelcomeVideoBlock video={welcomeVideo === undefined ? null : welcomeVideo} loading={welcomeVideo === undefined} />}
    </section>
  )
}

// ── Announcements ────────────────────────────────────────────────────────────

function AnnouncementsBlock({ items }: { items: Announcement[] | null }) {
  return (
    <div className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="size-4 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Announcements
        </h2>
      </div>

      {items === null ? (
        <AnnouncementsSkeleton />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <ol className="space-y-4">
          {items.map((a) => (
            <li key={a.id} className="flex flex-col gap-1.5 border-l-2 border-primary/40 pl-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                <time dateTime={a.publishedAt}>{formatDate(a.publishedAt)}</time>
              </div>
              <h3 className="text-sm font-semibold leading-snug">{a.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.body}</p>
              {a.ctaLabel && a.ctaHref && (
                <Link
                  to={a.ctaHref}
                  className="text-xs font-medium text-primary hover:underline w-fit mt-1"
                >
                  {a.ctaLabel} →
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function AnnouncementsSkeleton() {
  return (
    <ol className="space-y-4">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex flex-col gap-1.5 border-l-2 border-muted pl-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </li>
      ))}
    </ol>
  )
}

// ── Welcome video ────────────────────────────────────────────────────────────

function WelcomeVideoBlock({ video, loading }: { video: WelcomeVideo | null; loading: boolean }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <VideoFrame video={video} loading={loading} />
      <div className="p-4 space-y-1">
        {loading ? (
          <>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full mt-2" />
            <Skeleton className="h-3 w-5/6" />
          </>
        ) : video ? (
          <>
            <h3 className="text-sm font-semibold">{video.title}</h3>
            {video.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {video.description}
              </p>
            )}
            {video.ctaLabel && video.ctaHref && (
              <Link
                to={video.ctaHref}
                className="text-xs font-medium text-primary hover:underline w-fit inline-block mt-1"
              >
                {video.ctaLabel} →
              </Link>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

function VideoFrame({ video, loading }: { video: WelcomeVideo | null; loading: boolean }) {
  if (loading) {
    return <Skeleton className="aspect-video w-full" />
  }
  if (!video) {
    return (
      <div className="aspect-video bg-muted relative flex items-center justify-center">
        <PlayCircle className="size-12 text-muted-foreground/40" />
      </div>
    )
  }

  // No video URL yet → static card with the thumbnail (e.g. site logo).
  if (!video.videoUrl) {
    return (
      <div className="aspect-video bg-muted relative flex items-center justify-center">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="max-h-[70%] max-w-[70%] object-contain"
          />
        ) : (
          <PlayCircle className="size-12 text-muted-foreground/40" />
        )}
      </div>
    )
  }

  const embed = toEmbedUrl(video.videoUrl)
  if (embed) {
    return (
      <div className="aspect-video bg-black">
        <iframe
          src={embed}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    )
  }

  return (
    <div className="aspect-video bg-muted">
      <video
        src={video.videoUrl}
        poster={video.thumbnailUrl ?? undefined}
        autoPlay
        loop
        muted
        playsInline
        controls
        className="w-full h-full object-cover"
      />
    </div>
  )
}

/**
 * Returns a YouTube/Vimeo embed URL for the given watch URL, or null if it
 * looks like a direct media file (the <video> tag handles those).
 */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    // youtube.com/watch?v=ID  or  youtu.be/ID
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
      // /shorts/<id> or /embed/<id>
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts[0] === 'shorts' && parts[1]) return `https://www.youtube.com/embed/${parts[1]}`
      if (parts[0] === 'embed'  && parts[1]) return url
    }
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '')
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    // vimeo.com/<id>  →  player.vimeo.com/video/<id>
    if (host === 'vimeo.com') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    }
    if (host === 'player.vimeo.com') return url
  } catch {
    // not a URL — fall through
  }
  return null
}

// ── Offering card ────────────────────────────────────────────────────────────

function OfferingCard({ offering }: { offering: Offering }) {
  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-5 h-full">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold leading-snug">{offering.title}</h3>
          {offering.badge && <Badge variant="pro" className="shrink-0">{offering.badge}</Badge>}
        </div>
        {offering.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {offering.description}
          </p>
        )}
      </div>

      {/* Single-headline package */}
      {offering.inclusions && (
        <InclusionList inclusions={offering.inclusions} />
      )}

      {/* Variant options */}
      {offering.options && (
        <div className="space-y-4">
          {offering.options.map((opt) => (
            <div key={opt.label} className="rounded-lg border bg-background/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{opt.label}</p>
                <span className="text-sm font-bold text-primary tabular-nums">{opt.priceLabel}</span>
              </div>
              <InclusionList inclusions={opt.inclusions} dense />
            </div>
          ))}
        </div>
      )}

      {/* Footer: access + headline price (if present) + CTA */}
      <div className="mt-auto pt-4 border-t flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          Online access: <span className="font-medium text-foreground">{offering.accessFor}</span>
        </span>
        {offering.priceLabel && (
          <span className="text-lg font-bold text-primary tabular-nums">
            {offering.priceLabel}
          </span>
        )}
      </div>
    </div>
  )
}

function InclusionList({ inclusions, dense = false }: { inclusions: string[]; dense?: boolean }) {
  return (
    <ul className={cn('space-y-1.5', dense && 'space-y-1')}>
      {inclusions.map((inc) => (
        <li key={inc} className={cn('flex items-start gap-2', dense ? 'text-xs' : 'text-sm')}>
          <Check className={cn('shrink-0 text-primary mt-0.5', dense ? 'size-3.5' : 'size-4')} />
          <span className="text-foreground/90 leading-relaxed">{inc}</span>
        </li>
      ))}
    </ul>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

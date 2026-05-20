import { Link } from 'react-router-dom'
import { Bell, Check, Mail, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HeroBlock } from '@/features/home/components/HeroBlock'
import { TestimonialsSection } from '@/features/home/components/TestimonialsSection'
import { ANNOUNCEMENTS, type Announcement } from '@/constants/announcements'
import { OFFERINGS, CONTACT_BLURB, type Offering } from '@/constants/offerings'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'

/**
 * Public Home page (S Class Review).
 *
 * Phase D layout (Enroll Now hero + testimonials added for conversion):
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
 *   - Announcements: src/constants/announcements.ts
 *   - Offerings:     src/constants/offerings.ts (incl. CONTACT_BLURB)
 *   - Testimonials:  src/constants/testimonials.ts
 *   - Welcome video: VITE_HOME_WELCOME_VIDEO_URL (optional)
 */
export function HomePage() {
  return (
    <div className="container mx-auto px-4 py-10 space-y-12 max-w-6xl">

      {/* ── Hero (Enroll Now + Log in) ── */}
      <HeroBlock />

      {/* ── Top row: Announcements + Welcome video ── */}
      <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <AnnouncementsBlock items={ANNOUNCEMENTS} />
        <WelcomeVideoBlock />
      </section>

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
          <Link to={ROUTES.REGISTER}>Enroll Now</Link>
        </Button>
      </section>
    </div>
  )
}

// ── Announcements ────────────────────────────────────────────────────────────

function AnnouncementsBlock({ items }: { items: Announcement[] }) {
  return (
    <div className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="size-4 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Announcements
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <ol className="space-y-4">
          {items.map((a) => (
            <li key={a.date + a.title} className="flex flex-col gap-1.5 border-l-2 border-primary/40 pl-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                <time dateTime={a.date}>{formatDate(a.date)}</time>
              </div>
              <h3 className="text-sm font-semibold leading-snug">{a.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.body}</p>
              {a.cta && (
                <Link
                  to={a.cta.href}
                  className="text-xs font-medium text-primary hover:underline w-fit mt-1"
                >
                  {a.cta.label} →
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// ── Welcome video placeholder ────────────────────────────────────────────────
// Renders a 16:9 placeholder until a real video URL is wired up.
// Reads from import.meta.env.VITE_HOME_WELCOME_VIDEO_URL when present.

function WelcomeVideoBlock() {
  const url = import.meta.env.VITE_HOME_WELCOME_VIDEO_URL as string | undefined

  return (
    <div className="rounded-xl border bg-card overflow-hidden lg:w-[360px] lg:shrink-0">
      <div className="aspect-video bg-muted relative flex items-center justify-center">
        {url ? (
          <video
            src={url}
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <PlayCircle className="size-12 text-muted-foreground/40" />
            <span className="absolute bottom-2 left-2 text-[10px] text-muted-foreground/60 uppercase tracking-wide">
              Welcome video
            </span>
          </>
        )}
      </div>
      <div className="p-4 space-y-1">
        <h3 className="text-sm font-semibold">Why S Class?</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Watch a short intro on how the program works and what's included
          with every package.
        </p>
      </div>
    </div>
  )
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

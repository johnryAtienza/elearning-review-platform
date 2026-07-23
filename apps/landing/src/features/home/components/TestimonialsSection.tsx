import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DEFAULT_TESTIMONIALS_CONTENT,
  testimonialsApi,
} from '@s-class/api/testimonialsApi'
import type { Testimonial, TestimonialsContent } from '@s-class/types/home'
import { cn } from '@/utils/cn'

/**
 * Testimonials section for the Home page.
 *
 * Mobile-first grid: 1 col → 2 col (sm) → 3 col (lg). When the array has
 * fewer than 3 items, the section still renders sensibly. When empty,
 * the whole section is suppressed.
 */
export function TestimonialsSection() {
  const [content, setContent] =
    useState<TestimonialsContent | null>(null)

  useEffect(() => {
    let cancelled = false

    testimonialsApi.getTestimonialsContent()
      .then((nextContent) => { if (!cancelled) setContent(nextContent) })
      .catch(() => { if (!cancelled) setContent(DEFAULT_TESTIMONIALS_CONTENT) })

    return () => { cancelled = true }
  }, [])

  if (content === null) return <TestimonialsSectionSkeleton />
  if (content.testimonials.length === 0) return null

  return (
    <section className="space-y-6">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {content.eyebrow}
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {content.heading}
        </h2>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {content.testimonials.map((t) => (
          <TestimonialCard key={t.id} testimonial={t} />
        ))}
      </div>
    </section>
  )
}

function TestimonialsSectionSkeleton() {
  return (
    <section className="space-y-6">
      <header className="space-y-2 text-center sm:text-left">
        <Skeleton className="h-3 w-48 mx-auto sm:mx-0 bg-primary/20" />
        <Skeleton className="h-7 sm:h-8 w-full max-w-md mx-auto sm:mx-0" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <TestimonialCardSkeleton key={i} />
        ))}
      </div>
    </section>
  )
}

function TestimonialCardSkeleton() {
  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6 h-full min-h-52">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-4 rounded-sm bg-primary/20" />
        ))}
      </div>

      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <footer className="flex items-center gap-3 pt-2 border-t">
        <Skeleton className="size-10 shrink-0 rounded-full bg-primary/20" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48 max-w-full" />
          <Skeleton className="h-3 w-36 max-w-full" />
        </div>
      </footer>
    </article>
  )
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const stars = clampRating(testimonial.rating)
  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6 h-full">
      {/* Rating */}
      <div className="flex items-center gap-0.5" aria-label={`${stars} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'size-4',
              i < stars ? 'fill-primary text-primary' : 'text-muted-foreground/30',
            )}
          />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-sm leading-relaxed text-foreground/90 flex-1">
        “{testimonial.quote}”
      </blockquote>

      {/* Attribution */}
      <footer className="flex items-center gap-3 pt-2 border-t">
        <Avatar name={testimonial.name} initials={testimonial.initials} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{testimonial.name}</p>
          <p className="text-xs text-muted-foreground leading-tight truncate">
            {testimonial.title}
          </p>
          {testimonial.affiliation && (
            <p className="text-[11px] text-muted-foreground/70 leading-tight truncate mt-0.5">
              {testimonial.affiliation}
            </p>
          )}
        </div>
      </footer>
    </article>
  )
}

function clampRating(rating: number): number {
  if (!Number.isFinite(rating)) return 5
  return Math.min(5, Math.max(1, Math.trunc(rating)))
}

function Avatar({ name, initials }: { name: string; initials: string }) {
  const fallbackInitials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground select-none">
      {initials.trim() || fallbackInitials}
    </span>
  )
}

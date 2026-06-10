import { Star } from 'lucide-react'
import { TESTIMONIALS, type Testimonial } from '../../../constants/testimonials'
import { cn } from '@/utils/cn'

/**
 * Testimonials section for the Home page.
 *
 * Mobile-first grid: 1 col → 2 col (sm) → 3 col (lg). When the array has
 * fewer than 3 items, the section still renders sensibly. When empty,
 * the whole section is suppressed.
 */
export function TestimonialsSection() {
  if (TESTIMONIALS.length === 0) return null

  return (
    <section className="space-y-6">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          What our reviewers say
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Real results from real candidates
        </h2>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} testimonial={t} />
        ))}
      </div>
    </section>
  )
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const stars = testimonial.rating ?? 5
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
        <Avatar name={testimonial.name} avatarUrl={testimonial.avatarUrl} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">{testimonial.name}</p>
          <p className="text-xs text-muted-foreground leading-tight truncate">
            {testimonial.role}
          </p>
          {testimonial.school && (
            <p className="text-[11px] text-muted-foreground/70 leading-tight truncate mt-0.5">
              {testimonial.school}
            </p>
          )}
        </div>
      </footer>
    </article>
  )
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="size-10 rounded-full object-cover border bg-muted shrink-0"
      />
    )
  }
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground select-none">
      {initials}
    </span>
  )
}

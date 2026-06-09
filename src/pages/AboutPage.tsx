import { ABOUT_SECTIONS } from '@/constants/aboutCopy'
import { ROUTES } from '@/constants/routes'
import { CanonicalLink } from '@/components/CanonicalLink'

/**
 * Public "Who we are" page.
 * Renders the four narrative sections (Who are we / Philosophy / Mission /
 * Vision) from src/constants/aboutCopy.ts in a single column.
 *
 * v1: copy is hardcoded, no admin editor. See aboutCopy.ts for how to
 * promote this to a DB-backed editor when needed.
 */
export function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <CanonicalLink path={ROUTES.ABOUT} owner="landing" />
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          Who we are
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          A focused board exam review program
        </h1>
      </header>

      <div className="space-y-12">
        {ABOUT_SECTIONS.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {section.heading}
            </h2>
            {section.body.split('\n').map((para, i) => (
              <p key={i} className="text-base leading-relaxed text-foreground/90">
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

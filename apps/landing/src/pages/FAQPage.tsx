import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DEFAULT_FAQ_PAGE, faqApi } from '@s-class/api/faqApi'
import type { FaqItem, FaqPageData } from '@s-class/types/home'
import { ROUTES } from '@/constants/routes'
import { CanonicalLink } from '@/components/CanonicalLink'

/**
 * Public FAQ page.
 *
 * Uses native <details>/<summary> for the accordion so we don't add a
 * new dependency. Each group renders as a section with its own list of
 * collapsible Q&A items.
 */
export function FAQPage() {
  const [content, setContent] = useState<FaqPageData>(DEFAULT_FAQ_PAGE)

  useEffect(() => {
    let cancelled = false

    faqApi.getFaqPage()
      .then((nextContent) => { if (!cancelled) setContent(nextContent) })
      .catch(() => { if (!cancelled) setContent(DEFAULT_FAQ_PAGE) })

    return () => { cancelled = true }
  }, [])

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-10">
      <CanonicalLink path={ROUTES.FAQ} owner="landing" />
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {content.page.eyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {content.page.title}
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto sm:mx-0">
          {content.page.description}
        </p>
      </header>

      {content.groups.map((group) => (
        <section key={group.category} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {group.category}
          </h2>
          <ul className="space-y-2">
            {group.items.map((item) => (
              <FaqAccordion key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}

      {/* Footer CTA */}
      <section className="rounded-xl border bg-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">{content.page.ctaTitle}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {content.page.ctaDescription}
          </p>
        </div>
        <Link
          to={ROUTES.CONTACT}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0"
        >
          {content.page.ctaButtonLabel}
          <ChevronRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

function FaqAccordion({ item }: { item: FaqItem }) {
  return (
    <li>
      <details className="group rounded-xl border bg-card open:bg-card/80 transition-colors">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-4 px-5 py-4 select-none">
          <span className="text-sm font-medium leading-snug">{item.question}</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>
        <div className="px-5 pb-5 pt-1 text-sm text-foreground/90 leading-relaxed space-y-2">
          {item.answer.split('\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </details>
    </li>
  )
}

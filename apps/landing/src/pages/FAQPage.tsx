import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FAQ_GROUPS, type FaqItem } from '../constants/faq'
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
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-10">
      <CanonicalLink path={ROUTES.FAQ} owner="landing" />
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          FAQ
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Frequently asked questions
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto sm:mx-0">
          Quick answers about enrolment, content access, books, and your account.
        </p>
      </header>

      {FAQ_GROUPS.map((group) => (
        <section key={group.heading} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {group.heading}
          </h2>
          <ul className="space-y-2">
            {group.items.map((item, i) => (
              <FaqAccordion key={`${group.heading}-${i}`} item={item} />
            ))}
          </ul>
        </section>
      ))}

      {/* Footer CTA */}
      <section className="rounded-xl border bg-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">Still have questions?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            We reply within one business day across email, phone, and Messenger.
          </p>
        </div>
        <Link
          to={ROUTES.CONTACT}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0"
        >
          Contact us
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

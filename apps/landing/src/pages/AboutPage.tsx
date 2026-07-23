import { useEffect, useState } from 'react'
import {
  DEFAULT_WHO_WE_ARE_PAGE_CONTENT,
  homeContentApi,
} from '@s-class/api/homeContentApi'
import type { WhoWeArePageContent } from '@s-class/types/home'
import { ROUTES } from '@/constants/routes'
import { CanonicalLink } from '@/components/CanonicalLink'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Public "Who we are" page.
 * Renders admin-editable copy with static defaults so the page remains intact
 * if the CMS rows are missing or unavailable.
 */
export function AboutPage() {
  const [content, setContent] =
    useState<WhoWeArePageContent | null>(null)

  useEffect(() => {
    let cancelled = false

    homeContentApi.getWhoWeArePage()
      .then((nextContent) => { if (!cancelled) setContent(nextContent) })
      .catch(() => { if (!cancelled) setContent(DEFAULT_WHO_WE_ARE_PAGE_CONTENT) })

    return () => { cancelled = true }
  }, [])

  if (content === null) return <AboutPageSkeleton />

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <CanonicalLink path={ROUTES.ABOUT} owner="landing" />
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          {content.eyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {content.title}
        </h1>
      </header>

      <div className="space-y-12">
        {content.sections.map((section) => (
          <section key={section.id} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {section.title}
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

function AboutPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <CanonicalLink path={ROUTES.ABOUT} owner="landing" />
      <header className="mb-10">
        <Skeleton className="h-3 w-28 bg-primary/20 mb-4" />
        <Skeleton className="h-9 sm:h-11 w-full max-w-2xl" />
      </header>

      <div className="space-y-12">
        {[0, 1, 2, 3].map((section) => (
          <section key={section} className="space-y-3">
            <Skeleton className="h-3 w-36" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
              {section < 2 && <Skeleton className="h-5 w-9/12" />}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

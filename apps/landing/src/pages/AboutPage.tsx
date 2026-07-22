import { useEffect, useState } from 'react'
import {
  DEFAULT_WHO_WE_ARE_PAGE_CONTENT,
  homeContentApi,
} from '@s-class/api/homeContentApi'
import type { WhoWeArePageContent } from '@s-class/types/home'
import { ROUTES } from '@/constants/routes'
import { CanonicalLink } from '@/components/CanonicalLink'

/**
 * Public "Who we are" page.
 * Renders admin-editable copy with static defaults so the page remains intact
 * if the CMS rows are missing or unavailable.
 */
export function AboutPage() {
  const [content, setContent] =
    useState<WhoWeArePageContent>(DEFAULT_WHO_WE_ARE_PAGE_CONTENT)

  useEffect(() => {
    let cancelled = false

    homeContentApi.getWhoWeArePage()
      .then((nextContent) => { if (!cancelled) setContent(nextContent) })
      .catch(() => { if (!cancelled) setContent(DEFAULT_WHO_WE_ARE_PAGE_CONTENT) })

    return () => { cancelled = true }
  }, [])

  const sections = [
    {
      id: 'who-are-we',
      heading: content.whoAreWeLabel,
      body: content.whoAreWeBody,
    },
    {
      id: 'review-philosophy',
      heading: content.reviewPhilosophyLabel,
      body: content.reviewPhilosophyBody,
    },
    {
      id: 'mission',
      heading: content.missionLabel,
      body: content.missionBody,
    },
    {
      id: 'vision',
      heading: content.visionLabel,
      body: content.visionBody,
    },
  ]

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
        {sections.map((section) => (
          <section key={section.id} className="space-y-3">
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

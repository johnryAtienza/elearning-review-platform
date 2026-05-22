/**
 * Static fallback content for VITE_USE_MOCK=true.
 * Mirrors the seed rows in the homepage_cms migration so the offline UI
 * looks identical to a freshly-migrated production database.
 */

import type { Announcement, WelcomeVideo } from '@s-class/types/home'

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id:           'mock-ann-1',
    title:        'May intake now open',
    body:         'Enrol any time in May. Daily MC drills and weekly catch-up sessions start the day after your subscription is activated.',
    publishedAt:  '2026-05-01T00:00:00Z',
    ctaLabel:     null,
    ctaHref:      null,
    icon:         null,
    category:     null,
    displayOrder: 0,
  },
  {
    id:           'mock-ann-2',
    title:        'New: Power & Industrial Plant track',
    body:         'Five-week curriculum covering thermodynamics, fuels, boilers, turbines, and refrigeration — now available as part of the Full Mechanical Engineering Review.',
    publishedAt:  '2026-04-22T00:00:00Z',
    ctaLabel:     null,
    ctaHref:      null,
    icon:         null,
    category:     null,
    displayOrder: 0,
  },
  {
    id:           'mock-ann-3',
    title:        'Hard-copy books shipping nationwide',
    body:         'Engineering Mathematics, Machine Design, and Power & Industrial Plant Engineering reviewers are printed and ready. We ship to all PH provinces within 5 business days.',
    publishedAt:  '2026-04-08T00:00:00Z',
    ctaLabel:     null,
    ctaHref:      null,
    icon:         null,
    category:     null,
    displayOrder: 0,
  },
]

export const MOCK_WELCOME_VIDEO: WelcomeVideo | null = {
  id:           'mock-welcome',
  title:        'Why S Class?',
  description:  "Watch a short intro on how the program works and what's included with every package.",
  videoUrl:     null,
  thumbnailUrl: '/elearning-logo-transparent.png',
  ctaLabel:     null,
  ctaHref:      null,
  displayOrder: 0,
}

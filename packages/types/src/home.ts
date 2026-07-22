/**
 * Public-facing shapes for the homepage CMS content.
 *
 * These mirror what the *_public Supabase views return — never the
 * admin-only fields (enabled, created_at, updated_at).
 */

export interface Announcement {
  id: string
  title: string
  body: string
  /** ISO timestamp. Used both for sorting and for display. */
  publishedAt: string
  ctaLabel: string | null
  ctaHref: string | null
  icon: string | null
  category: string | null
  displayOrder: number
}

export interface WelcomeVideo {
  id: string
  title: string
  description: string
  /** Null means: don't render a player — show the thumbnail as a static card. */
  videoUrl: string | null
  thumbnailUrl: string | null
  ctaLabel: string | null
  ctaHref: string | null
  displayOrder: number
}

export interface HomeHeroContent {
  eyebrow: string
  title: string
  description: string
  primaryButton: string
  secondaryButton: string
}

export interface LandingContactCtaContent {
  title: string
  description: string
  buttonLabel: string
}

export interface ContactPageChannelContent {
  label: string
  value: string
  helper: string
  href: string
}

export interface ContactPageBusinessHoursContent {
  weekdays: string
  saturday: string
  sunday: string
}

export interface ContactPageContent {
  heroEyebrow: string
  heroTitle: string
  heroDescription: string
  email: ContactPageChannelContent
  phone: ContactPageChannelContent
  messenger: ContactPageChannelContent
  businessHours: ContactPageBusinessHoursContent
}

export interface WhoWeArePageContent {
  eyebrow: string
  title: string
  whoAreWeLabel: string
  whoAreWeBody: string
  reviewPhilosophyLabel: string
  reviewPhilosophyBody: string
  missionLabel: string
  missionBody: string
  visionLabel: string
  visionBody: string
}

export interface FaqPageContent {
  eyebrow: string
  title: string
  description: string
  ctaTitle: string
  ctaDescription: string
  ctaButtonLabel: string
}

export interface FaqCategory {
  id: string
  name: string
  sortOrder: number
}

export interface FaqItem {
  id: string
  category: string
  question: string
  answer: string
  sortOrder: number
}

export interface FaqGroup {
  category: string
  items: FaqItem[]
}

export interface FaqPageData {
  page: FaqPageContent
  groups: FaqGroup[]
}

export interface ReviewPackageOption {
  id: string
  title: string
  price: string
  sortOrder: number
  features: string[]
}

export interface ReviewPackage {
  id: string
  title: string
  description: string
  badge: string | null
  /** Null means the package price is represented by its options. */
  price: string | null
  onlineAccessMonths: number
  sortOrder: number
  features: string[]
  options: ReviewPackageOption[]
}

export interface ReviewClassesContent {
  eyebrow: string
  heading: string
  packages: ReviewPackage[]
}

export interface Testimonial {
  id: string
  name: string
  initials: string
  title: string
  affiliation: string
  quote: string
  rating: number
  sortOrder: number
}

export interface TestimonialsContent {
  eyebrow: string
  heading: string
  testimonials: Testimonial[]
}

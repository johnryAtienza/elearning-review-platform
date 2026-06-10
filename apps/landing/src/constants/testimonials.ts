/**
 * Hardcoded testimonials shown on the Home page.
 *
 * v1: copy lives here so the client can publish on day one without
 * shipping an admin editor. When testimonials need DB-backed editing,
 * promote to a `testimonials` table with the same field shape.
 *
 * Display order: as listed here (most impressive first).
 */

export interface Testimonial {
  /** Reviewer name shown under the quote. */
  name: string
  /** Role / accomplishment (e.g. "Mechanical Engineering Topnotcher 2025"). */
  role: string
  /** Optional school affiliation. */
  school?: string
  /** The quoted text. Keep it under ~240 chars for grid balance. */
  quote: string
  /** Optional avatar URL. When absent, the card shows initials. */
  avatarUrl?: string
  /** Optional star rating shown above the quote. 1-5. Default 5. */
  rating?: 1 | 2 | 3 | 4 | 5
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name:   'Juan Dela Cruz',
    role:   'Mechanical Engineering Board Topnotcher 2025',
    school: 'University of the Philippines — Diliman',
    quote:
      'The daily MC drills and topnotcher catch-up sessions kept me sharp every single week. ' +
      'Walking into the boards I felt prepared, not anxious.',
    rating: 5,
  },
  {
    name:   'Maria Santos',
    role:   'Mechanical Engineering Licensee, April 2025',
    school: 'Mapua University',
    quote:
      "I struggled with Engineering Math for years. S Class's video explainers finally made the " +
      'concepts click — and the printed reviewer is dog-eared from how often I used it.',
    rating: 5,
  },
  {
    name:   'Andrew Reyes',
    role:   'Mechanical Engineering Licensee, October 2024',
    school: 'Technological Institute of the Philippines',
    quote:
      'Six months of structured review beats six months of cramming. The weekly exams kept me ' +
      'accountable; the catch-up sessions filled every gap I had.',
    rating: 5,
  },
]
